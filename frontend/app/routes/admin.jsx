import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// ─── Tab: Users ─────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [granting, setGranting] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_list_users', { p_limit: 100, p_offset: 0 });
    if (error) {
      setErrorMsg('ไม่สามารถโหลดรายชื่อผู้ใช้: ' + error.message);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleGrantCredits = async (e) => {
    e.preventDefault();
    if (!selectedUser || !amount || !reason) return;

    setGranting(true);
    setMessage(null);
    setErrorMsg(null);

    const { data, error } = await supabase.rpc('admin_grant_credits', {
      p_target_user_id: selectedUser.id,
      p_amount: parseInt(amount, 10),
      p_reason: reason
    });

    if (error) {
      setErrorMsg('ไม่สำเร็จ: ' + error.message);
    } else if (data?.success) {
      setMessage(`เพิ่ม ${amount} เครดิต ให้ ${selectedUser.email} สำเร็จ!`);
      setSelectedUser(null);
      setAmount('');
      setReason('');
      fetchUsers();
    }
    setGranting(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {message && <div className="md:col-span-3 p-3 bg-green-50 text-green-700 rounded-xl border border-green-200 text-sm">{message}</div>}
      {errorMsg && <div className="md:col-span-3 p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">{errorMsg}</div>}

      {/* Users Table */}
      <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 overflow-hidden">
        <h2 className="text-lg font-bold mb-4 text-slate-800">รายชื่อผู้ใช้</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-700">
              <tr>
                <th className="p-3">Email</th>
                <th className="p-3">Tier</th>
                <th className="p-3">Credits</th>
                <th className="p-3">Role</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="5" className="p-6 text-center text-slate-400">กำลังโหลด...</td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-3 max-w-[160px] truncate">{u.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                      u.tier === 'pro' ? 'bg-orange-100 text-orange-700' 
                      : u.tier === 'plus' ? 'bg-blue-100 text-blue-700' 
                      : 'bg-slate-100 text-slate-600'
                    }`}>
                      {u.tier.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-slate-900">{u.credits}</td>
                  <td className="p-3">
                    <span className={`text-xs font-medium ${u.role === 'admin' ? 'text-red-600' : 'text-slate-400'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => setSelectedUser(u)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      ปรับเครดิต
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Credits Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-bold mb-4 text-slate-800">ปรับเครดิต</h2>
        {!selectedUser ? (
          <p className="text-sm text-slate-400">เลือกผู้ใช้จากตารางซ้ายมือ</p>
        ) : (
          <form onSubmit={handleGrantCredits} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">ผู้ใช้</label>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm truncate">{selectedUser.email}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">จำนวน (+ หรือ -)</label>
              <input
                type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="เช่น 50 หรือ -10" required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">เหตุผล (Audit Log)</label>
              <textarea
                value={reason} onChange={(e) => setReason(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="เหตุผลในการปรับ..." rows="3" required
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={granting} className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 text-sm">
                {granting ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
              </button>
              <button type="button" onClick={() => { setSelectedUser(null); setAmount(''); setReason(''); }}
                className="flex-1 bg-slate-100 text-slate-700 py-2 px-4 rounded-lg font-semibold hover:bg-slate-200 text-sm">
                ยกเลิก
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Featured Reviews ───────────────────────────────────────────────────
function ReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null); // ID of the currently-toggling review
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_admin_feedbacks', { p_limit: 100, p_offset: 0 });
    if (error) {
      setErrorMsg('ไม่สามารถโหลดรีวิว: ' + error.message);
    } else {
      setReviews(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleToggle = async (feedbackId, currentFeatured) => {
    setToggling(feedbackId);
    setMessage(null);
    setErrorMsg(null);

    const { data, error } = await supabase.rpc('toggle_feedback_featured', {
      p_feedback_id: feedbackId
    });

    if (error) {
      setErrorMsg('เกิดข้อผิดพลาด: ' + error.message);
    } else if (data?.success) {
      const nowFeatured = data.is_featured;
      setMessage(nowFeatured ? '✅ เพิ่มรีวิวนี้ขึ้นหน้าแรกแล้ว!' : '🔕 ซ่อนรีวิวนี้จากหน้าแรกแล้ว');
      // Optimistic update: no need to refetch
      setReviews(prev => prev.map(r =>
        r.id === feedbackId ? { ...r, is_featured: nowFeatured } : r
      ));
    }

    setToggling(null);
  };

  const featuredCount = reviews.filter(r => r.is_featured).length;

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2 text-sm font-semibold text-yellow-700">
          ⭐ {featuredCount} รีวิวที่กำลังแสดงบนหน้าแรก
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-500">
          ทั้งหมด {reviews.length} รีวิว (4-5 ดาว)
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl border border-green-200 text-sm">
          {message}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">กำลังโหลดรีวิว...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <p className="text-slate-400">ยังไม่มีรีวิว 4-5 ดาวในระบบ</p>
          <p className="text-sm text-slate-300 mt-1">รอให้ผู้ใช้ส่งคำติชมผ่านปุ่ม "ส่งคำติชม" ในเว็บก่อน</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className={`bg-white rounded-2xl border p-5 transition-all ${
                review.is_featured
                  ? 'border-yellow-300 shadow-md ring-2 ring-yellow-100'
                  : 'border-slate-100 shadow-sm'
              }`}
            >
              {/* Stars */}
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <svg key={s} className={`w-4 h-4 ${s <= review.rating ? 'text-yellow-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69L9.049 2.927z" />
                  </svg>
                ))}
                {review.is_featured && (
                  <span className="ml-auto text-xs font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                    กำลังแสดง
                  </span>
                )}
              </div>

              {/* Comment */}
              <p className="text-sm text-slate-700 leading-relaxed line-clamp-4 mb-4 flex-1">
                "{review.comment || <span className="text-slate-300 italic">ไม่มีความคิดเห็น</span>}"
              </p>

              {/* Reviewer + Date */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {review.reviewer.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{review.reviewer}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(review.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Toggle Button */}
              <button
                onClick={() => handleToggle(review.id, review.is_featured)}
                disabled={toggling === review.id}
                className={`w-full py-2 px-4 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                  review.is_featured
                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100'
                    : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {toggling === review.id ? (
                  'กำลังดำเนินการ...'
                ) : review.is_featured ? (
                  '🔕 ซ่อนออกจากหน้าแรก'
                ) : (
                  '⭐ แสดงบนหน้าแรก'
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Dashboard ────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('reviews'); // Default to reviews tab

  useEffect(() => {
    // Redirect if not admin (after profile has loaded)
    if (!loading && profile && profile.role !== 'admin') {
      navigate('/');
    }
    // Redirect if not authenticated at all
    if (!loading && !profile) {
      navigate('/login');
    }
  }, [profile, loading, navigate]);

  // Show nothing while profile is loading (avoids flash of content)
  if (loading || !profile || profile.role !== 'admin') {
    return null;
  }

  const tabs = [
    { id: 'reviews', label: '⭐ รีวิว (หน้าแรก)', icon: null },
    { id: 'users', label: '👥 จัดการผู้ใช้', icon: null },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-lg">ADMIN</span>
            <h1 className="text-2xl font-extrabold text-slate-900">Dashboard</h1>
          </div>
          <p className="text-sm text-slate-400">เข้าถึงได้เฉพาะ Admin เท่านั้น</p>
        </div>
        <Link to="/" className="text-sm text-slate-500 hover:text-blue-600 font-medium flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          กลับหน้าแรก
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'reviews' && <ReviewsTab />}
      {activeTab === 'users' && <UsersTab />}
    </div>
  );
}
