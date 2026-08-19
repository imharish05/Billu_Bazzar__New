import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Plus, Search, Edit3, Trash2, X, RefreshCw, CheckCircle2, XCircle, ShieldCheck, Eye, EyeOff, Copy, Check
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import AccessDeniedView from '../components/AccessDeniedView';
import api from '../services/api';
import toast from 'react-hot-toast';
import { checkPermission } from '../utils/rbac';

const AdminUsersAdminPage = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    roleId: '',
    isActive: true,
  });

  const handleCopyPassword = (pwd) => {
    if (!pwd) {
      toast.error('Please enter a password to copy');
      return;
    }
    navigator.clipboard.writeText(pwd);
    setCopied(true);
    toast.success('Password copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const fetchUsersAndRoles = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/admin-users').catch((err) => {
          console.error('Error fetching admin users:', err);
          return err?.response || null;
        }),
        api.get('/roles').catch((err) => {
          console.error('Error fetching roles:', err);
          return err?.response || null;
        })
      ]);

      if (usersRes?.data) {
        const rawUsers = usersRes.data.users || usersRes.data.data || usersRes.data.adminUsers || (Array.isArray(usersRes.data) ? usersRes.data : []);
        setUsers(Array.isArray(rawUsers) ? rawUsers : []);
      }

      if (rolesRes?.data) {
        const rawRoles = rolesRes.data.roles || rolesRes.data.data || (Array.isArray(rolesRes.data) ? rolesRes.data : []);
        setRoles(Array.isArray(rawRoles) ? rawRoles : []);
      }
    } catch (err) {
      console.warn('Failed to load admin users or roles:', err);
      toast.error('Failed to load admin users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const userName = u.name || '';
      const userEmail = u.email || '';
      const matchesSearch = !search.trim() || 
        userName.toLowerCase().includes(search.toLowerCase()) || 
        userEmail.toLowerCase().includes(search.toLowerCase());
      const userRoleId = u.roleId ?? u.role?.id;
      const matchesRole = roleFilter === 'ALL' || String(userRoleId) === String(roleFilter);
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const handleAddUserSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.roleId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/admin-users', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        roleId: Number(form.roleId),
        isActive: form.isActive
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Admin user created successfully!');
        setShowAddModal(false);
        setForm({ name: '', email: '', password: '', roleId: '', isActive: true });
        fetchUsersAndRoles();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        roleId: Number(form.roleId),
        isActive: form.isActive,
      };
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      const res = await api.put(`/admin-users/${selectedUser.id}`, payload);
      if (res.data.success) {
        toast.success(res.data.message || 'Admin user updated successfully!');
        setShowEditModal(false);
        setSelectedUser(null);
        fetchUsersAndRoles();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (u) => {
    const previousStatus = u.isActive;
    const newStatus = !previousStatus;

    // 1. Optimistic UI update
    setUsers((prev) => prev.map((usr) => (usr.id === u.id ? { ...usr, isActive: newStatus } : usr)));

    try {
      // 2. Silent backend sync
      const res = await api.put(`/admin-users/${u.id}`, { isActive: newStatus });
      if (res.data.success) {
        toast.success(`User status updated to ${newStatus ? 'Active' : 'Inactive'}`);
      }
    } catch (err) {
      // 3. Rollback on error
      setUsers((prev) => prev.map((usr) => (usr.id === u.id ? { ...usr, isActive: previousStatus } : usr)));
      toast.error(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!selectedUser) return;
    try {
      const res = await api.delete(`/admin-users/${selectedUser.id}`);
      if (res.data.success) {
        toast.success(res.data.message || 'User deleted successfully');
        setShowDeleteModal(false);
        setSelectedUser(null);
        fetchUsersAndRoles();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const openEditModal = (u) => {
    setSelectedUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      roleId: String(u.roleId || (u.role?.id) || ''),
      isActive: u.isActive
    });
    setShowPassword(false);
    setShowEditModal(true);
  };

  const getRoleBadge = (roleName) => {
    const normalized = String(roleName || '').toLowerCase().replace(/[\s_-]/g, '');
    if (normalized === 'superadmin' || normalized === 'admin') {
      return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    if (normalized === 'storeadmin') {
      return 'bg-blue-100 text-blue-800 border-blue-200';
    }
    if (normalized === 'warehousemanager') {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-neutral-100 text-neutral-800 border-neutral-200';
  };

  const { admin: loggedAdmin } = useSelector(s => s.auth);
  const canViewAdminUsers = checkPermission(loggedAdmin, 'view_admin_users');
  const canManageAdminUsers = checkPermission(loggedAdmin, 'manage_admin_users');

  if (loggedAdmin && !canViewAdminUsers) {
    return (
      <AdminLayout title="Access Denied">
        <AccessDeniedView path="/admin-users" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Admin Users">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Admin Users</h1>
          <p className="text-xs text-neutral-500 mt-1">Manage staff user accounts and assigned operational roles.</p>
        </div>

        {canManageAdminUsers && (
          <button
            onClick={() => {
              setForm({ name: '', email: '', password: '', roleId: roles[0]?.id || '', isActive: true });
              setShowPassword(false);
              setShowAddModal(true);
            }}
            className="bg-brand-gold hover:bg-yellow-500 text-neutral-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow flex items-center gap-2 transition-colors self-start sm:self-auto"
          >
            <Plus size={16} /> Add Admin User
          </button>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-brand-gold text-neutral-800 bg-white"
              />
            </div>

            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white text-neutral-700 focus:outline-none focus:border-brand-gold"
            >
              <option value="ALL">All Roles</option>
              {roles.map(r => (
                <option key={r.id || r.name} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="text-xs text-neutral-500 font-medium">
            Total Users: <span className="font-bold text-neutral-900">{filteredUsers.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto border border-neutral-200 rounded-2xl">
          <table className="w-full text-left text-xs text-neutral-700">
            <thead className="bg-neutral-50 text-[11px] font-bold uppercase text-neutral-500 tracking-wider border-b border-neutral-200">
              <tr>
                <th className="py-3.5 px-4">Admin User</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                {canManageAdminUsers && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={canManageAdminUsers ? 5 : 4} className="py-12 text-center text-xs text-neutral-400">
                    <RefreshCw size={18} className="animate-spin text-brand-gold mx-auto mb-2" />
                    Loading admin users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={canManageAdminUsers ? 5 : 4} className="py-12 text-center text-xs text-neutral-400">
                    No admin users found.
                  </td>
                </tr>
              ) : filteredUsers.map(u => {
                const roleObj = typeof u.role === 'object' ? u.role : roles.find(r => Number(r.id) === Number(u.roleId));
                const roleName = typeof u.role === 'string' ? u.role : (roleObj?.name || 'Staff User');

                return (
                  <tr key={u.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-gold/20 text-brand-gold font-bold flex items-center justify-center text-xs">
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="font-semibold text-neutral-900">{u.name}</div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-neutral-600">{u.email}</td>

                    <td className="py-3.5 px-4">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${getRoleBadge(roleName)}`}>
                        {roleName}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => canManageAdminUsers && handleToggleStatus(u)}
                        disabled={!canManageAdminUsers}
                        className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors flex items-center gap-1 mx-auto ${
                          canManageAdminUsers ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'
                        } ${
                          u.isActive 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                        }`}
                      >
                        {u.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {u.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {canManageAdminUsers && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100 rounded-lg"
                            title="Edit User"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => { setSelectedUser(u); setShowDeleteModal(true); }}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            title="Delete User"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-neutral-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <h3 className="text-base font-bold text-neutral-900">Add Admin User</h3>
                <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddUserSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sales Manager"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900 focus:border-brand-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@billubazaar.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900 focus:border-brand-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1">Password *</label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full border border-neutral-300 rounded-xl p-2.5 pr-16 text-xs text-neutral-900 focus:border-brand-gold focus:outline-none"
                    />
                    <div className="absolute right-2.5 flex items-center gap-1 text-neutral-400">
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(form.password)}
                        className="p-1 hover:text-neutral-700 focus:outline-none cursor-pointer"
                        title="Copy password to clipboard"
                      >
                        {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="p-1 hover:text-neutral-700 focus:outline-none cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1">Assigned Role *</label>
                  <select
                    required
                    value={form.roleId}
                    onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}
                    className="w-full border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900 focus:border-brand-gold focus:outline-none bg-white cursor-pointer"
                  >
                    <option value="">-- Select Role --</option>
                    {roles.map(r => (
                      <option key={r.id || r.name} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                      className="w-4 h-4 accent-brand-gold rounded cursor-pointer"
                    />
                    Activate user account immediately
                  </label>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-brand-gold hover:bg-yellow-500 rounded-xl shadow flex items-center gap-2"
                  >
                    {saving && <RefreshCw size={14} className="animate-spin" />}
                    Create Admin User
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT USER MODAL */}
      <AnimatePresence>
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-neutral-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <h3 className="text-base font-bold text-neutral-900">Edit Admin User</h3>
                <button onClick={() => setShowEditModal(false)} className="text-neutral-400 hover:text-neutral-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEditUserSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900 focus:border-brand-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900 focus:border-brand-gold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1">New Password (optional)</label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter new password to reset"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full border border-neutral-300 rounded-xl p-2.5 pr-16 text-xs text-neutral-900 focus:border-brand-gold focus:outline-none"
                    />
                    <div className="absolute right-2.5 flex items-center gap-1 text-neutral-400">
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(form.password)}
                        className="p-1 hover:text-neutral-700 focus:outline-none cursor-pointer"
                        title="Copy password to clipboard"
                      >
                        {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="p-1 hover:text-neutral-700 focus:outline-none cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-800 mb-1">Assigned Role *</label>
                  <select
                    required
                    value={form.roleId}
                    onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}
                    className="w-full border border-neutral-300 rounded-xl p-2.5 text-xs text-neutral-900 focus:border-brand-gold focus:outline-none bg-white cursor-pointer"
                  >
                    {roles.map(r => (
                      <option key={r.id || r.name} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                      className="w-4 h-4 accent-brand-gold rounded cursor-pointer"
                    />
                    Account is active
                  </label>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-brand-gold hover:bg-yellow-500 rounded-xl shadow flex items-center gap-2"
                  >
                    {saving && <RefreshCw size={14} className="animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE USER MODAL */}
      <AnimatePresence>
        {showDeleteModal && selectedUser && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-neutral-100"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-bold text-neutral-900">Delete User Account?</h3>
              <p className="text-xs text-neutral-500 mt-2">
                Delete user <strong>"{selectedUser.name}"</strong> ({selectedUser.email})?
              </p>

              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUserConfirm}
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AdminUsersAdminPage;
