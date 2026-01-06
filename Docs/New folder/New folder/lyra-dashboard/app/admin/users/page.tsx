'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  MoreVertical,
  Eye,
  Ban,
  Shield,
  Mail,
  Calendar,
  CreditCard,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCog,
  Crown,
  Check,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  role?: string;
  is_banned: boolean;
  subscription_count: number;
  token_balance: number;
  total_spent: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users?page=${page}&limit=20`);
      const data = await response.json();
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    return user.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleBan = async (userId: string) => {
    if (!confirm('Are you sure you want to ban this user?')) return;
    try {
      await fetch(`/api/admin/users/${userId}/ban`, { method: 'POST' });
      fetchUsers();
    } catch (err) {
      console.error('Failed to ban user');
    }
  };

  const handleUnban = async (userId: string) => {
    try {
      await fetch(`/api/admin/users/${userId}/unban`, { method: 'POST' });
      fetchUsers();
    } catch (err) {
      console.error('Failed to unban user');
    }
  };

  const handleSetRole = async (userId: string, role: string) => {
    try {
      await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      fetchUsers();
    } catch (err) {
      console.error('Failed to set role');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-gray-400">View and manage platform users</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search by email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Table */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No users found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-zinc-800 text-left">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">User</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Role</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Subs</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Tokens</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Spent</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Joined</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400">Status</th>
                <th className="px-4 py-3 text-sm font-medium text-gray-400"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center">
                        {user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? (
                          <Crown className="w-4 h-4 text-yellow-400" />
                        ) : (
                          <span className="text-sm">{user.email.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="text-sm">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.role === 'SUPER_ADMIN' ? 'bg-red-500/20 text-red-400' :
                      user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' :
                      user.role === 'MODERATOR' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-zinc-800 text-gray-400'
                    }`}>
                      {user.role || 'User'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{user.subscription_count}</td>
                  <td className="px-4 py-3 text-sm">{user.token_balance.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">£{(user.total_spent / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {user.is_banned ? (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Banned</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="p-2 hover:bg-white/10 rounded-lg"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onBan={() => handleBan(selectedUser.id)}
          onUnban={() => handleUnban(selectedUser.id)}
          onSetRole={(role) => handleSetRole(selectedUser.id, role)}
        />
      )}
    </div>
  );
}

function UserDetailModal({
  user,
  onClose,
  onBan,
  onUnban,
  onSetRole,
}: {
  user: User;
  onClose: () => void;
  onBan: () => void;
  onUnban: () => void;
  onSetRole: (role: string) => void;
}) {
  const roles = ['USER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN'];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold">{user.email.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h2 className="font-bold">{user.email}</h2>
              <p className="text-sm text-gray-400">
                Joined {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <p className="text-lg font-bold">{user.subscription_count}</p>
              <p className="text-xs text-gray-500">Subs</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <p className="text-lg font-bold">{user.token_balance}</p>
              <p className="text-xs text-gray-500">Tokens</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 text-center">
              <p className="text-lg font-bold">£{(user.total_spent / 100).toFixed(0)}</p>
              <p className="text-xs text-gray-500">Spent</p>
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => onSetRole(role)}
                  className={`py-2 px-3 rounded-lg text-sm flex items-center justify-center gap-2 ${
                    user.role === role
                      ? 'bg-purple-500 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  {user.role === role && <Check className="w-4 h-4" />}
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Status</span>
            {user.is_banned ? (
              <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">Banned</span>
            ) : (
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Active</span>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg">
            Close
          </button>
          {user.is_banned ? (
            <button onClick={onUnban} className="flex-1 py-2 bg-green-500 hover:bg-green-600 rounded-lg">
              Unban User
            </button>
          ) : (
            <button onClick={onBan} className="flex-1 py-2 bg-red-500 hover:bg-red-600 rounded-lg">
              Ban User
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
