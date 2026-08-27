import { createClient } from '@supabase/supabase-js';

// .trim() ป้องกัน trailing whitespace จาก Cloudflare env vars ที่ทำให้ URL invalid
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
