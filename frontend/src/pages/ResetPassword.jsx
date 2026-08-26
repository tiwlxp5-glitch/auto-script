import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const errorRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (error && errorRef.current) {
      const y = errorRef.current.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, [error]);

  // Handle the hash fragment from Supabase auth reset flow
  useEffect(() => {
    // If there's an error in the hash (e.g., link expired)
    const hash = window.location.hash;
    if (hash && hash.includes('error_description=')) {
      const errorMsg = new URLSearchParams(hash.substring(1)).get('error_description');
      setError(decodeURIComponent(errorMsg).replace(/\+/g, ' '));
    }
    
    // Supabase PKCE flow auto-exchanges the token and establishes the session.
    // We just wait for the user to submit a new password.
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // รหัสผ่านอัปเดตสำเร็จ ส่งกลับไปหน้า login หรือ create
      alert('เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่');
      // Sign out to force re-login just to be clean
      await supabase.auth.signOut();
      navigate('/login');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-center text-slate-900 mb-6">ตั้งรหัสผ่านใหม่</h2>
      
      {!error && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg text-sm mb-6 shadow-sm">
          <p className="font-semibold mb-1">✅ ยืนยันตัวตนสำเร็จ!</p>
          <p>ระบบได้เข้าสู่ระบบให้คุณชั่วคราวแล้ว <br/> <strong>กรุณาตั้งรหัสผ่านใหม่ด้านล่างทันที</strong> เพื่อใช้ในการเข้าสู่ระบบครั้งต่อไปครับ</p>
        </div>
      )}

      {error && (
        <div ref={errorRef} className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleUpdatePassword} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">รหัสผ่านใหม่</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="ตั้งรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร"
            minLength={6}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ยืนยันรหัสผ่านใหม่</label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="กรอกรหัสผ่านอีกครั้ง"
            minLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className={`w-full py-2 rounded-lg text-white font-medium transition-colors ${
            (loading || !password || !confirmPassword) ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
        </button>
      </form>
    </div>
  );
}

export default ResetPassword;
