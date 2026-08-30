-- =============================================================================
-- Migration: Credit Ledger System (Transactional Saga Pattern)
-- Created:   2026-08-30
-- Purpose:   แก้ปัญหาข้อ 1 จาก Expert Architecture Audit
--            เครดิตที่ถูกหักแล้วจะไม่หายไปฟรี แม้ Cloudflare Edge Function
--            จะ Crash/OOM/Timeout ระหว่างรอ Gemini API ตอบกลับ
--            pg_cron จะเป็น "ช่างซ่อมอัตโนมัติ" คืนเครดิต pending นานเกิน 5 นาที
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: สร้างตาราง credit_transactions (สมุดบัญชีเครดิต)
-- -----------------------------------------------------------------------------
-- คำอธิบาย: ตารางนี้ทำหน้าที่เป็น "สมุดบัญชีธนาคาร" ของระบบ
-- ทุกครั้งที่ user กดสร้างสคริปต์ จะมีแถวใหม่สถานะ 'pending' เกิดขึ้น
-- และจะเปลี่ยนเป็น 'completed' หรือ 'refunded' เมื่องานเสร็จหรือล้มเหลว
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ⚠️ NOTE: FK → auth.users (ไม่ใช่ profiles) เพื่อการ Integrity ระดับ Auth system
  -- ON DELETE CASCADE: ถ้า user ถูกลบออกจากระบบ ประวัติ transaction จะถูกลบตามอัตโนมัติ
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- จำนวนเครดิตที่เปลี่ยนแปลง: ลบ = -1 (ตัด), บวก = +1 (คืน)
  amount        INTEGER NOT NULL,

  -- สถานะ lifecycle ของแต่ละ transaction
  -- 'pending'   = หักเครดิตแล้ว แต่ยังรอ Gemini ตอบกลับอยู่ (อันตราย! ถ้าค้างนาน = Crash)
  -- 'completed' = ทุกอย่างสำเร็จ สคริปต์ถูกบันทึกลง DB แล้ว
  -- 'refunded'  = มีข้อผิดพลาด และระบบได้คืนเครดิตกลับให้ user แล้ว
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'completed', 'refunded')),

  -- metadata สำหรับการ debug และ observability
  -- เก็บ mode ไว้เพื่อรู้ว่า transaction นี้เกิดจากการสร้างสคริปต์แบบไหน
  mode          TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index สำหรับ pg_cron ที่จะ query หา 'pending' transaction ที่ค้างนาน
-- และสำหรับ Frontend ที่อาจจะแสดงประวัติ transaction ในอนาคต
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_status
  ON public.credit_transactions (user_id, status);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_pending_old
  ON public.credit_transactions (status, created_at)
  WHERE status = 'pending';

-- RLS: เปิดใช้งาน Row Level Security — ป้องกัน user ดูของคนอื่น
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: User เห็นได้เฉพาะ transaction ของตัวเอง
CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: ห้าม user INSERT/UPDATE/DELETE โดยตรง — ทำได้ผ่าน RPC (SECURITY DEFINER) เท่านั้น
-- (ไม่สร้าง INSERT/UPDATE policy ทำให้ client ทำไม่ได้ — ต้องผ่าน function เท่านั้น)


-- -----------------------------------------------------------------------------
-- STEP 2: RPC start_generation_tx — เริ่ม Transaction (แทน increment_credits เดิม)
-- -----------------------------------------------------------------------------
-- คำอธิบาย: ฟังก์ชันนี้ทำงาน 2 อย่างพร้อมกัน (Atomic) ใน 1 DB transaction:
--   1. หักเครดิตออกจาก profiles ทันที (เหมือน increment_credits เดิม)
--   2. สร้างแถวใหม่ใน credit_transactions ด้วยสถานะ 'pending'
-- Backend จะได้ transaction_id กลับมา เพื่อใช้อ้างอิงในขั้นตอนถัดไป
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_generation_tx(
  p_user_id UUID,
  p_amount  INTEGER,   -- จำนวนเครดิตที่จะหัก (ส่งมาเป็น integer บวก เช่น 1 หรือ 2)
  p_mode    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- ทำงานด้วยสิทธิ์ DB owner, ไม่ใช่สิทธิ์ User (ป้องกัน RLS bypass)
SET search_path = public  -- hardcode schema ป้องกัน search_path injection
AS $$
DECLARE
  v_profile         RECORD;
  v_new_credits     INTEGER;
  v_transaction_id  UUID;
BEGIN
  -- ล็อก Row ของ profile ป้องกัน Race Condition (concurrent button clicks)
  -- เหมือนเดิมกับ increment_credits แต่เพิ่ม ledger step เข้ามา
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;  -- ← นี่คือกุญแจสำคัญ: ล็อก row นี้ไว้จนกว่า transaction DB นี้จะ commit

  IF NOT FOUND THEN
    -- ป้องกัน user ที่ไม่มี profile (ไม่ควรเกิดขึ้น แต่ป้องกันไว้)
    RETURN jsonb_build_object('error', 'profile_not_found', 'credits', -1);
  END IF;

  -- ตรวจสอบว่าเครดิตมีพอหรือไม่
  -- ส่ง p_amount เป็น integer บวก (เช่น 1, 2) แล้ว backend ตัดเองที่ฐาน
  IF coalesce(v_profile.credits, 0) < p_amount THEN
    -- เครดิตไม่พอ → คืนค่า -1 ให้ Backend ส่ง 402 ได้เหมือนเดิม
    RETURN jsonb_build_object('error', 'insufficient_credits', 'credits', -1);
  END IF;

  -- ✅ เครดิตพอ: หักออกจาก profiles
  UPDATE public.profiles
  SET credits = credits - p_amount
  WHERE id = p_user_id
  RETURNING credits INTO v_new_credits;

  -- ✅ สร้าง Ledger Entry (pending) พร้อมกัน ใน DB transaction เดียวกัน
  -- ถ้า INSERT นี้ล้มเหลว credits จะ rollback กลับด้วย (Atomic!)
  INSERT INTO public.credit_transactions (user_id, amount, status, mode)
  VALUES (p_user_id, -p_amount, 'pending', p_mode)
  RETURNING id INTO v_transaction_id;

  -- ส่งคืนทั้ง transaction_id และ credits ที่เหลือ
  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'credits',        v_new_credits
  );
END;
$$;


-- -----------------------------------------------------------------------------
-- STEP 3: RPC commit_generation_tx — จบ Transaction สำเร็จ (แทน scripts insert + ไม่ต้องคืน credit)
-- -----------------------------------------------------------------------------
-- คำอธิบาย: เรียกหลังจาก Gemini ตอบกลับสำเร็จ + Output Moderation ผ่าน
-- ทำ 2 อย่างพร้อมกัน (Atomic):
--   1. INSERT script ลงตาราง scripts
--   2. เปลี่ยนสถานะ transaction จาก 'pending' → 'completed'
-- ถ้าอย่างใดอย่างหนึ่งล้มเหลว → ทั้งคู่ rollback → pg_cron จะคืนเครดิตทีหลัง
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.commit_generation_tx(
  p_transaction_id  UUID,
  p_user_id         UUID,
  p_product_name    TEXT,
  p_product_details TEXT,
  p_mode            TEXT,
  p_content         TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
BEGIN
  -- ดึง transaction และล็อก row เพื่อป้องกัน double-commit
  SELECT * INTO v_tx
  FROM public.credit_transactions
  WHERE id = p_transaction_id
    AND user_id = p_user_id  -- ⚠️ CRITICAL: ตรวจสอบ user_id ตรงกัน (ป้องกัน IDOR)
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    -- transaction ไม่มี, ผิด user, หรือถูก refund/complete ไปแล้ว (pg_cron ทำก่อน)
    -- ในกรณีนี้: script จะไม่ถูกบันทึก แต่เครดิตก็ไม่สูญหาย (pg_cron คืนให้ไปแล้ว)
    RETURN jsonb_build_object('error', 'transaction_not_found_or_already_processed');
  END IF;

  -- INSERT script history
  INSERT INTO public.scripts (user_id, product_name, product_details, mode, content)
  VALUES (p_user_id, p_product_name, p_product_details, p_mode, p_content);

  -- เปลี่ยนสถานะ transaction → 'completed'
  UPDATE public.credit_transactions
  SET status = 'completed', updated_at = now()
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- -----------------------------------------------------------------------------
-- STEP 4: RPC refund_generation_tx — คืนเครดิต (กรณี Gemini ล่ม, Output blocked)
-- -----------------------------------------------------------------------------
-- คำอธิบาย: เรียกใน catch block ของ generate.js เมื่อ Backend จับ Error ได้ทัน
-- ทำ 2 อย่างพร้อมกัน (Atomic):
--   1. คืนเครดิตกลับใส่ profiles
--   2. เปลี่ยนสถานะ transaction จาก 'pending' → 'refunded'
-- ป้องกัน double-refund ด้วยการ lock row ก่อนทำ
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refund_generation_tx(
  p_transaction_id  UUID,
  p_user_id         UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
BEGIN
  -- ดึง transaction และล็อก row เพื่อป้องกัน double-refund
  -- (ป้องกันกรณีที่ Backend refund แล้ว pg_cron ก็วิ่งมา refund ซ้ำ)
  SELECT * INTO v_tx
  FROM public.credit_transactions
  WHERE id = p_transaction_id
    AND user_id = p_user_id  -- ⚠️ CRITICAL: ตรวจสอบ user_id ตรงกันเสมอ (ป้องกัน IDOR)
    AND status = 'pending'   -- ← เงื่อนไขสำคัญ: refund ได้เฉพาะ 'pending' เท่านั้น
  FOR UPDATE;

  IF NOT FOUND THEN
    -- ไม่พบ transaction หรือถูก refund/complete ไปแล้ว → ไม่ทำอะไร (Safe no-op)
    RETURN jsonb_build_object('skipped', true, 'reason', 'not_pending_or_wrong_user');
  END IF;

  -- คืนเครดิต: amount ใน ledger เป็นค่าลบ (เช่น -1) → นำมา * -1 เพื่อบวกกลับ
  UPDATE public.profiles
  SET credits = credits + (v_tx.amount * -1)
  WHERE id = p_user_id;

  -- เปลี่ยนสถานะ transaction → 'refunded'
  UPDATE public.credit_transactions
  SET status = 'refunded', updated_at = now()
  WHERE id = p_transaction_id;

  RETURN jsonb_build_object('success', true, 'refunded_amount', v_tx.amount * -1);
END;
$$;


-- -----------------------------------------------------------------------------
-- STEP 5: pg_cron Self-Healing Job — Auto-Refund Crashed Transactions
-- -----------------------------------------------------------------------------
-- คำอธิบาย: นี่คือ "หัวใจสำคัญ" ที่แก้ปัญหา Cloudflare Crash
-- pg_cron วิ่งทุก 5 นาที ค้นหา transaction ที่ค้างสถานะ 'pending' เกิน 5 นาที
-- (แปลว่า Cloudflare Edge Function ดับไปกลางคัน Backend ไม่ได้ refund)
-- แล้ว DB จะคืนเครดิตกลับให้ user เองอัตโนมัติ — ไม่มี "เครดิตหายฟรี" อีกต่อไป
-- -----------------------------------------------------------------------------

-- เปิดใช้งาน pg_cron extension (ต้องการ Supabase Pro หรือ pg_cron enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ลบ job เก่าก่อน (ป้องกัน duplicate jobs เมื่อ re-run migration)
SELECT cron.unschedule('auto_refund_stuck_transactions')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto_refund_stuck_transactions'
);

-- สร้าง pg_cron job ใหม่: วิ่งทุก 5 นาที
SELECT cron.schedule(
  'auto_refund_stuck_transactions',  -- ชื่อ job
  '*/5 * * * *',                     -- cron expression: ทุก 5 นาที
  $$
    -- คืนเครดิตสำหรับทุก transaction ที่ค้างสถานะ 'pending' เกิน 5 นาที
    -- (5 นาที = เวลาที่มากกว่า Cloudflare edge timeout ทุก case)
    WITH stuck_txs AS (
      SELECT id, user_id, amount
      FROM public.credit_transactions
      WHERE status = 'pending'
        AND created_at < now() - interval '5 minutes'
      FOR UPDATE SKIP LOCKED  -- ป้องกัน pg_cron กับ Backend ทำงานชนกัน
    ),
    -- คืนเครดิตกลับให้ profiles ทั้งหมดใน batch
    refunded AS (
      UPDATE public.profiles p
      SET credits = p.credits + (st.amount * -1)
      FROM stuck_txs st
      WHERE p.id = st.user_id
      RETURNING st.id
    )
    -- เปลี่ยนสถานะเป็น 'refunded'
    UPDATE public.credit_transactions ct
    SET status = 'refunded', updated_at = now()
    FROM stuck_txs st
    WHERE ct.id = st.id;
  $$
);

-- -----------------------------------------------------------------------------
-- STEP 6: Grant permissions (SECURITY DEFINER functions ไม่ต้องการ grant แต่กำหนดชัดเจนไว้)
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.start_generation_tx(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_generation_tx(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_generation_tx(UUID, UUID) TO authenticated;

-- service_role (ที่ Backend ใช้) มีสิทธิ์ execute อยู่แล้วโดย default
-- แต่กำหนดชัดเจนไว้เพื่อ documentation
GRANT EXECUTE ON FUNCTION public.start_generation_tx(UUID, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_generation_tx(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_generation_tx(UUID, UUID) TO service_role;
