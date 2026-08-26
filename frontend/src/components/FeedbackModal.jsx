import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// ─── Sentiment Keywords ───────────────────────────────────────────────────────
// คำที่บ่งบอกว่า comment เชิง "บวก" (ชื่นชม / ประทับใจ)
const POSITIVE_KEYWORDS = [
  'ดี', 'ดีมาก', 'เยี่ยม', 'เยี่ยมมาก', 'ชอบ', 'ชอบมาก', 'ประทับใจ', 'สุดยอด',
  'เพอร์เฟ็ค', 'เลิศ', 'โคตรดี', 'ปัง', 'ปังมาก', 'ใช้งานง่าย', 'สะดวก',
  'คุ้มค่า', 'คุ้มมาก', 'แจ่ม', 'เจ๋ง', 'น่าใช้', 'ครบ', 'ครบมาก',
  'มีประโยชน์', 'ช่วยได้มาก', 'พอใจ', 'พอใจมาก', 'รัก', 'รักเลย',
  'ขอบคุณ', 'ขอบคุณมาก', 'ขอบใจ', 'ได้ผล', 'ใช้ได้ดี', 'ฉลาด',
  'น่าทึ่ง', 'ทึ่ง', 'ประหลาดใจ', 'เกินคาด', 'เกินความคาดหมาย', 'perfect',
  'great', 'good', 'love', 'awesome', 'excellent', 'amazing', 'wow', 'helpful',
];

// คำที่บ่งบอกว่า comment เชิง "ลบ" (ติชม / ปัญหา)
const NEGATIVE_KEYWORDS = [
  'แย่', 'แย่มาก', 'ห่วย', 'ห่วยมาก', 'ไม่ดี', 'ไม่โอเค', 'ไม่ชอบ',
  'ผิดหวัง', 'ผิดหวังมาก', 'บั๊ก', 'bug', 'error', 'ผิดพลาด', 'พัง',
  'ใช้ไม่ได้', 'ใช้ยาก', 'งง', 'งงมาก', 'ช้า', 'ช้ามาก', 'แพง', 'แพงมาก',
  'ไม่คุ้ม', 'เสียเงิน', 'เสียดาย', 'เสียใจ', 'โกรธ', 'หัวร้อน',
  'น่าหัวเสีย', 'น่าหัวร้อน', 'ฉิบหาย', 'ห่า', 'บ้า', 'ไร้สาระ',
  'ปัญหา', 'ไม่ work', 'work ไม่ได้', 'หน้าขาว', 'ค้าง', 'หยุด',
  'ไม่พอใจ', 'ไม่พอ', 'อยากให้แก้', 'ควรปรับ', 'ควรแก้', 'ขอให้ปรับ',
  'ต้องแก้', 'terrible', 'bad', 'awful', 'worst', 'broken', 'useless', 'hate',
  'disappointed', 'poor', 'slow', 'expensive',
];

/**
 * วิเคราะห์ sentiment ของ comment โดยนับ keyword เชิงบวก/ลบ
 * @returns 'positive' | 'negative' | 'neutral'
 */
function detectSentiment(text) {
  if (!text || text.trim().length < 5) return 'neutral';
  const lower = text.toLowerCase();
  let posScore = 0;
  let negScore = 0;
  POSITIVE_KEYWORDS.forEach((kw) => { if (lower.includes(kw.toLowerCase())) posScore++; });
  NEGATIVE_KEYWORDS.forEach((kw) => { if (lower.includes(kw.toLowerCase())) negScore++; });
  if (posScore === 0 && negScore === 0) return 'neutral';
  return posScore >= negScore ? 'positive' : 'negative';
}

export default function FeedbackModal({ isOpen, onClose }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);
  // warning แสดงเฉพาะเมื่อ sentiment กับ rating ไม่สอดคล้องกัน
  const [ratingWarning, setRatingWarning] = useState(null);

  if (!isOpen) return null;

  // ─── ตรวจสอบความสอดคล้องระหว่าง rating กับ comment ───────────────────────
  const checkConsistency = useCallback((currentRating, currentComment) => {
    const sentiment = detectSentiment(currentComment);
    if (sentiment === 'neutral') { setRatingWarning(null); return; }

    // กด 4-5 ดาว แต่ comment เชิงลบ
    if (currentRating >= 4 && sentiment === 'negative') {
      setRatingWarning({
        type: 'lower',
        message: '⚠️ ดูเหมือนว่าคุณมีข้อติชมหรือพบปัญหาอยู่นะครับ — ลองปรับดาวให้ต่ำกว่า 3 ดาวได้เลย',
        reason: 'เพื่อให้ทีมพัฒนาเห็นว่ามีปัญหาจริง และ prioritize แก้ไขให้เร็วขึ้นครับ ⚡',
      });
      return;
    }

    // กด 1-2 ดาว แต่ comment เชิงบวก
    if (currentRating <= 2 && sentiment === 'positive') {
      setRatingWarning({
        type: 'higher',
        message: '⭐ ดูเหมือนคุณประทับใจในตัวแอปนะครับ — ลองปรับดาวเป็น 3-5 ดาวได้เลย',
        reason: 'คะแนนดาวที่สูงขึ้นช่วยให้ทีมรู้ว่าฟีเจอร์ไหนทำได้ดี และช่วยสนับสนุนการพัฒนาต่อยอดครับ 💙',
      });
      return;
    }

    setRatingWarning(null);
  }, []);

  // เรียก checkConsistency ทุกครั้งที่เปลี่ยน rating หรือออกจาก textarea
  const handleRatingChange = (star) => {
    setRating(star);
    checkConsistency(star, comment);
  };

  const handleCommentBlur = () => {
    if (rating > 0) checkConsistency(rating, comment);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError('กรุณาให้คะแนนอย่างน้อย 1 ดาวครับ');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ rating, comment })
      });

      if (!res.ok) {
        throw new Error('เกิดข้อผิดพลาดในการส่งข้อมูล');
      }

      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setRating(0);
        setComment('');
        setRatingWarning(null);
      }, 2500);

    } catch (err) {
      setError(err.message || 'ระบบขัดข้อง กรุณาลองใหม่ครับ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl transition-all">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">💬 ให้คำติชม / เสนอแนะ</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isSuccess ? (
          <div className="text-center py-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">ขอบคุณสำหรับ Feedback ครับ!</h3>
            <p className="text-gray-600">ข้อความของคุณส่งตรงถึงทีมผู้พัฒนาเรียบร้อยแล้ว</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-2 flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingChange(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <svg 
                    className={`w-10 h-10 ${(hoverRating || rating) >= star ? 'text-yellow-400' : 'text-gray-300'}`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>

            {/* ─── Smart Rating Warning ─── */}
            {ratingWarning && (
              <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
                <p className="font-semibold text-amber-800">{ratingWarning.message}</p>
                <p className="mt-1 text-amber-700">{ratingWarning.reason}</p>
              </div>
            )}

            <div className="mb-4 mt-4">
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                มีอะไรให้เราปรับปรุง หรือประทับใจส่วนไหน พิมพ์บอกเราได้เลยครับ
              </label>
              <textarea
                id="comment"
                rows="4"
                className="w-full rounded-xl border border-gray-300 p-3 focus:border-blue-500 focus:ring-blue-500 text-sm resize-none"
                placeholder="เช่น ใช้งานง่ายมากเลยครับ, อยากให้มีฟีเจอร์นี้เพิ่มหน่อย..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onBlur={handleCommentBlur}
                maxLength={1000}
              ></textarea>
            </div>

            {error && (
              <p className="text-red-500 text-sm mb-4 text-center bg-red-50 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งคำติชม'}
            </button>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
