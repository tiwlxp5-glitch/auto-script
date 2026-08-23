import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // ส่งคำสั่งไปบอก Supabase ให้สร้างผู้ใช้ใหม่
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // บางครั้ง Supabase จะให้ยืนยันอีเมล แต่เพื่อความง่าย เราจะให้สมัครผ่านเลย
      setSuccess(true);
      setTimeout(() => {
        navigate('/create');
      }, 2000);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-2xl font-bold text-center text-slate-900 mb-6">สมัครสมาชิกใหม่</h2>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
          เกิดข้อผิดพลาด: {error}
        </div>
      )}

      {success ? (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg text-center">
          <p className="font-bold mb-2">สมัครสมาชิกสำเร็จ! 🎉</p>
          <p className="text-sm">กำลังพากลับไปหน้าสร้างสคริปต์...</p>
        </div>
      ) : (
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
              ฉันยอมรับ <a href="#" className="text-blue-600 hover:underline">เงื่อนไขการให้บริการ (Terms of Service)</a> และ <a href="#" className="text-blue-600 hover:underline">นโยบายความเป็นส่วนตัว (Privacy Policy)</a>
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
