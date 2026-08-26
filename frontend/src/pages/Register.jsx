import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { translateError } from '../utils/translateError';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const errorRef = useRef(null);
  const [success, setSuccess] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (error && errorRef.current) {
      const y = errorRef.current.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, [error]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/create`
      }
    });

    if (error) {
      setError(translateError(error.message));
    } else {
      setResendCooldown(60);
      alert('ส่งอีเมลยืนยันตัวตนใหม่อีกครั้งแล้ว กรุณาเช็คกล่องข้อความของคุณ');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // ส่งคำสั่งไปบอก Supabase ให้สร้างผู้ใช้ใหม่
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/create`
      }
    });

    if (error) {
      setError(translateError(error.message));
      setLoading(false);
    } else {
      if (data?.user && data?.session === null) {
        // Supabase requires email verification
        setSuccess(true);
        setNeedsEmailVerification(true);
        setLoading(false);
      } else {
        // Auto logged in (Email verification is OFF in Supabase)
        setSuccess(true);
        setTimeout(() => {
          navigate('/create');
        }, 2000);
      }
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/create`
      }
    });

    if (error) {
      setError(translateError(error.message));
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-center text-slate-900 mb-6">สมัครสมาชิกใหม่</h2>
      
      {error && (
        <div ref={errorRef} className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {success ? (
        needsEmailVerification ? (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-6 rounded-xl text-center">
            <div className="flex justify-center mb-4">
              <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
            </div>
            <h3 className="text-xl font-bold mb-2">เช็คอีเมลของคุณ! 📧</h3>
            <p className="text-sm mb-4">เราได้ส่งลิงก์ยืนยันตัวตนไปที่ <br/><strong className="text-blue-900">{email}</strong><br/> กรุณากดลิงก์ในอีเมลเพื่อเข้าสู่ระบบ</p>
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm font-semibold flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              สำคัญ: ถ้าไม่เจอให้ลองหาใน "จดหมายขยะ (Spam)" ดูนะครับ
            </div>
            <p className="text-sm font-semibold text-blue-700 bg-blue-100 py-2 px-3 rounded-lg mt-4 flex flex-wrap justify-center gap-x-1">
              <span>เมื่อยืนยันแล้ว</span>
              <span>สามารถกลับมาล็อกอินได้เลย</span>
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button 
                onClick={() => navigate('/login')}
                className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                ฉันยืนยันอีเมลแล้ว (ไปเข้าสู่ระบบ)
              </button>
              <button 
                onClick={handleResendVerification}
                disabled={resendCooldown > 0}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${resendCooldown > 0 ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-50'}`}
              >
                {resendCooldown > 0 ? `รอส่งอีเมลใหม่อีกครั้ง (${resendCooldown}s)` : 'ส่งอีเมลยืนยันตัวตนใหม่อีกครั้ง'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg text-center">
            <p className="font-bold mb-2">สมัครสมาชิกสำเร็จ! 🎉</p>
            <p className="text-sm">กำลังพากลับไปหน้าสร้างสคริปต์...</p>
          </div>
        )
      ) : (
        <>
          {/* Google Login Button */}
          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition-colors mb-6 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            สมัครด้วย Google
          </button>

          <div className="relative flex items-center py-2 mb-4">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">หรือใช้อีเมล</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่าน (ขั้นต่ำ 6 ตัวอักษร)</label>
            <input
              type="password"
              required
              minLength="6"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-start mt-4">
            <input
              id="privacy"
              name="privacy"
              type="checkbox"
              required
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded mt-1 cursor-pointer"
            />
            <label htmlFor="privacy" className="ml-2 block text-sm text-slate-600 cursor-pointer">
              ฉันยอมรับ{' '}
              <Link to="/legal" className="text-blue-600 hover:underline">
                เงื่อนไขการให้บริการ (Terms of Service)
              </Link>{' '}
              และ{' '}
              <Link to="/legal" className="text-blue-600 hover:underline">
                นโยบายความเป็นส่วนตัว (Privacy Policy)
              </Link>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg text-white font-medium transition-colors ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'กำลังสร้างบัญชี...' : 'สมัครสมาชิก'}
          </button>
        </form>
        </>
      )}

      {!success && (
        <p className="mt-6 text-center text-sm text-slate-600">
          มีบัญชีอยู่แล้ว?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            เข้าสู่ระบบ
          </Link>
        </p>
      )}
    </div>
  );
}

export default Register;
