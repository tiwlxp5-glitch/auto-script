import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { translateError } from '../utils/translateError';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const errorRef = useRef(null);

  useEffect(() => {
    if (error && errorRef.current) {
      const y = errorRef.current.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, [error]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // 1. ตรวจสอบว่าอีเมลมีอยู่ในระบบหรือไม่ (ป้องกัน email enumeration)
    const { data: emailExists, error: rpcError } = await supabase.rpc('check_email_exists', {
      p_email: email
    });

    if (rpcError) {
      console.error('Error checking email:', rpcError);
      setError('เกิดข้อผิดพลาดในการตรวจสอบอีเมล กรุณาลองใหม่อีกครั้ง');
      setLoading(false);
      return;
    }

    if (!emailExists) {
      setError('อีเมลไม่ถูกต้อง');
      setLoading(false);
      return;
    }

    // 2. ถ้ามีอีเมลอยู่จริง ค่อยส่งลิงก์รีเซ็ต
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(translateError(error.message));
    } else {
      setMessage('ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบกล่องข้อความ (หรือโฟลเดอร์ขยะ)');
      setEmail('');
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-center text-slate-900 mb-6">ลืมรหัสผ่าน</h2>
      
      {error && (
        <div ref={errorRef} className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {message && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-4">
          {message}
        </div>
      )}

      <p className="text-sm text-slate-600 mb-6 text-center">
        กรุณากรอกอีเมลที่ใช้สมัครบัญชี เราจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปให้คุณทางอีเมล
      </p>

      <form onSubmit={handleResetPassword} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">อีเมล</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="your@email.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className={`w-full py-2 rounded-lg text-white font-medium transition-colors ${
            (loading || !email) ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'กำลังส่งลิงก์...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link to="/login" className="text-sm text-blue-600 hover:underline font-medium">
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    </div>
  );
}

export default ForgotPassword;
