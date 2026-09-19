import { useState, useEffect } from 'react';
import { getUsers, updateUser, deleteUser } from '../../api/admin';
import { register } from '../../api/auth';
import LoadingSpinner from '../../components/LoadingSpinner';
import toast from 'react-hot-toast';

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700',
  supplier: 'bg-blue-100 text-blue-700',
  customer: 'bg-green-100 text-green-700',
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Create user form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('customer');
  const [creating, setCreating] = useState(false);

  const fetchUsers = () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    getUsers(params)
      .then(res => setUsers(res.data?.data || []))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [search, roleFilter]);

  const handleToggleActive = async (user) => {
    try {
      await updateUser(user.id, { name: user.name, role: user.role, is_active: user.is_active ? 0 : 1 });
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch {
      toast.error('Failed to update user');
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await updateUser(editUser.id, { name: editUser.name, role: editUser.role, is_active: editUser.is_active });
      toast.success('User updated');
      setEditUser(null);
      fetchUsers();
    } catch {
      toast.error('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPassword) return toast.error('Please fill all fields');
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    
    setCreating(true);
    try {
      // Create user using the auth register endpoint
      await register({ name: newName, email: newEmail, password: newPassword, role: newRole });
      toast.success('User created successfully');
      setShowCreate(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('customer');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-navy-700">Manage Users</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm px-4 py-2">
          + Add User
        </button>
      </div>

      <div className="card overflow-x-auto">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search by name or email..."
            className="input flex-1"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="input w-full sm:w-40" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="supplier">Supplier</option>
            <option value="customer">Customer</option>
          </select>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : users.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No users found.</p>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 font-medium">Phone</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Joined</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-cream-50 transition">
                  <td className="py-3 font-medium text-navy-700">{u.name}</td>
                  <td className="py-3 text-gray-600">{u.email}</td>
                  <td className="py-3">
                    <span className={`badge text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-700'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500">{u.phone || '—'}</td>
                  <td className="py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 text-gray-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditUser({ ...u })}
                        className="text-xs text-navy-600 hover:underline font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`text-xs font-semibold hover:underline ${u.is_active ? 'text-red-500' : 'text-green-600'}`}
                      >
                        {u.is_active ? 'Suspend' : 'Unsuspend'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-4 text-xs text-gray-400">{users.length} user(s) found</div>
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="font-bold text-lg text-navy-700 mb-4">Edit User</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Name</label>
                <input
                  className="input"
                  value={editUser.name}
                  onChange={e => setEditUser(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Role</label>
                <select
                  className="input"
                  value={editUser.role}
                  onChange={e => setEditUser(prev => ({ ...prev, role: e.target.value }))}
                >
                  <option value="customer">Customer</option>
                  <option value="supplier">Supplier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  className="input"
                  value={editUser.is_active}
                  onChange={e => setEditUser(prev => ({ ...prev, is_active: parseInt(e.target.value) }))}
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={handleSaveEdit} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditUser(null)} className="btn-outline flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="font-bold text-lg text-navy-700 mb-4">Add New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="label">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="input"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  className="input"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Password <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  className="input"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="label">Role <span className="text-red-500">*</span></label>
                <select
                  className="input"
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                >
                  <option value="customer">Customer</option>
                  <option value="supplier">Supplier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating} className="btn-primary flex-1">
                  {creating ? 'Creating...' : 'Create User'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-outline flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}