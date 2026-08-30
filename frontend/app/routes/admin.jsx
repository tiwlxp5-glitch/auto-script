import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [granting, setGranting] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    // 1. Frontend Protection
    if (!loading && profile && profile.role !== 'admin') {
      navigate('/');
    }
  }, [profile, loading, navigate]);

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchUsers();
    }
  }, [profile]);

  const fetchUsers = async () => {
    setLoading(true);
    // 2. RPC Authorization (Least Privilege)
    const { data, error } = await supabase.rpc('admin_list_users', { p_limit: 100, p_offset: 0 });
    
    if (error) {
      setErrorMsg('Failed to load users: ' + error.message);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const handleGrantCredits = async (e) => {
    e.preventDefault();
    if (!selectedUser || !amount || !reason) return;

    setGranting(true);
    setMessage(null);
    setErrorMsg(null);
    
    // 3. Admin Grant RPC (Strict Validation)
    const { data, error } = await supabase.rpc('admin_grant_credits', {
      p_target_user_id: selectedUser.id,
      p_amount: parseInt(amount, 10),
      p_reason: reason
    });

    if (error) {
      setErrorMsg('Failed to grant credits: ' + error.message);
    } else if (data?.success) {
      setMessage(`Successfully granted ${amount} credits!`);
      setSelectedUser(null);
      setAmount('');
      setReason('');
      fetchUsers(); // Refresh the list
    }

    setGranting(false);
  };

  if (!profile || profile.role !== 'admin') {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded border border-green-200">{message}</div>}
      {errorMsg && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200">{errorMsg}</div>}
      
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Users List */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-hidden">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-700">
                <tr>
                  <th className="p-3">Email</th>
                  <th className="p-3">Tier</th>
                  <th className="p-3">Credits</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="5" className="p-4 text-center">Loading...</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${u.tier === 'pro' ? 'bg-purple-100 text-purple-700' : u.tier === 'plus' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                        {u.tier.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-gray-900">{u.credits}</td>
                    <td className="p-3">{u.role}</td>
                    <td className="p-3">
                      <button 
                        onClick={() => setSelectedUser(u)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Adjust Credits
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Adjust Credits Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Adjust Credits</h2>
          
          {!selectedUser ? (
            <p className="text-sm text-gray-500">Select a user from the list to adjust their credits.</p>
          ) : (
            <form onSubmit={handleGrantCredits} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target User</label>
                <div className="p-2 bg-gray-50 border border-gray-200 rounded text-sm truncate">
                  {selectedUser.email}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (+ / -)</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 50 or -10"
                  required 
                />
                <p className="text-xs text-gray-500 mt-1">Positive to grant, negative to deduct.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Audit Log)</label>
                <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Reason for this adjustment..."
                  rows="3"
                  required
                ></textarea>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="submit" 
                  disabled={granting}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {granting ? 'Processing...' : 'Confirm'}
                </button>
                <button 
                  type="button"
                  onClick={() => { setSelectedUser(null); setAmount(''); setReason(''); }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
