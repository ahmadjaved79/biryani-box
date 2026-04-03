import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Edit2, Trash2, X, Save, Loader, ShieldCheck,
  ChefHat, UserCheck, User, Truck, Eye, EyeOff, ToggleLeft, ToggleRight
} from 'lucide-react';
import { staffAPI } from '../api/index.js';

const roleIcons = { owner: ShieldCheck, manager: UserCheck, captain: User, cook: ChefHat, delivery: Truck };
const roleColors = {
  owner:    'text-primary   bg-primary/10   border-primary/30',
  manager:  'text-blue-400  bg-blue-500/10  border-blue-500/30',
  captain:  'text-green-400 bg-green-500/10 border-green-500/30',
  cook:     'text-orange-400 bg-orange-500/10 border-orange-500/30',
  delivery: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'captain', phone: '' };

const StaffManagement = ({ currentUser }) => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const isOwner = currentUser.role === 'owner';
  const isManager = currentUser.role === 'manager';

  // Manager can only edit captain/cook
  const canEdit = (member) => {
    if (member.role === 'owner') return false;
    if (isOwner) return true;
    if (isManager) return ['captain', 'cook'].includes(member.role);
    return false;
  };

  // Only owner can delete
  const canDelete = (member) => isOwner && member.role !== 'owner';

  // Roles available when creating/editing
  const availableRoles = isOwner
    ? ['manager', 'captain', 'cook', 'delivery']
    : ['captain', 'cook'];

  const load = () => {
    setLoading(true);
    staffAPI.getAll()
      .then(r => { setStaff(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, role: availableRoles[0] });
    setError('');
    setShowModal(true);
  };

  const openEdit = (member) => {
    setEditing(member);
    setForm({ name: member.name, email: member.email, password: '', role: member.role, phone: member.phone || '' });
    setError('');
    setShowModal(true);
  };

  const openDelete = (member) => {
    setDeleteTarget(member);
    setShowDeleteModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) { setError('Name and email are required.'); return; }
    if (!editing && !form.password) { setError('Password is required for new staff.'); return; }
    setSaving(true); setError('');
    try {
      if (editing) {
        const update = { name: form.name, phone: form.phone };
        if (isOwner) update.role = form.role;
        if (form.password) update.password = form.password;
        await staffAPI.update(editing.id, update);
      } else {
        await staffAPI.create({
          name: form.name, email: form.email,
          password: form.password, role: form.role, phone: form.phone
        });
      }
      await load();
      setShowModal(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await staffAPI.delete(deleteTarget.id);
      await load();
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    } finally { setDeleting(false); }
  };

  const handleToggleActive = async (id) => {
    if (!isOwner) return;
    await staffAPI.toggleActive(id);
    await load();
  };

  const filtered = staff.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || s.role === filterRole;
    return matchSearch && matchRole;
  });

  const ic = "w-full bg-bg-main border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary";

  if (loading) return <div className="flex justify-center py-20"><Loader className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-white">Staff Management</h2>
          <p className="text-text-muted text-sm">{staff.length} team members · {staff.filter(s => s.is_active).length} active</p>
        </div>
        {(isOwner || isManager) && (
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold uppercase hover:bg-primary-hover transition-all">
            <Plus size={16} /> Add Staff
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email..."
          className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary" />
        <div className="flex gap-2 flex-wrap">
          {['all', 'owner', 'manager', 'captain', 'cook', 'delivery'].map(r => (
            <button key={r} onClick={() => setFilterRole(r)}
              className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${filterRole === r ? 'bg-primary text-white' : 'bg-white/5 border border-white/10 text-text-muted hover:text-white'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(member => {
          const RoleIcon = roleIcons[member.role] || User;
          return (
            <motion.div key={member.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`bg-white/3 border rounded-2xl p-5 transition-all ${member.is_active ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${roleColors[member.role] || 'border-white/20 bg-white/10 text-white'}`}>
                    <RoleIcon size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{member.name}</p>
                    <p className="text-text-muted text-xs">{member.email}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${roleColors[member.role] || ''}`}>{member.role}</span>
              </div>

              {member.phone && <p className="text-text-muted text-xs mb-3">📞 {member.phone}</p>}

              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${member.is_active ? 'border-green-500/30 text-green-400 bg-green-500/10' : 'border-red-500/30 text-red-400 bg-red-500/10'}`}>
                  {member.is_active ? 'Active' : 'Inactive'}
                </span>
                <div className="flex gap-2">
                  {canEdit(member) && (
                    <button onClick={() => openEdit(member)}
                      className="p-2 bg-white/5 border border-white/10 rounded-lg text-text-muted hover:text-primary hover:border-primary/30 transition-all">
                      <Edit2 size={13} />
                    </button>
                  )}
                  {isOwner && member.role !== 'owner' && (
                    <button onClick={() => handleToggleActive(member.id)}
                      className={`p-2 border rounded-lg transition-all ${member.is_active ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20' : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'}`}>
                      {member.is_active ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                    </button>
                  )}
                  {canDelete(member) && (
                    <button onClick={() => openDelete(member)}
                      className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:bg-red-500/20 transition-all">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-main border border-white/10 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">{editing ? 'Edit Staff Member' : 'Add New Staff'}</h3>
                <button onClick={() => setShowModal(false)}><X size={18} className="text-text-muted hover:text-white" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Full Name *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Arjun Singh" className={ic} />
                </div>
                {!editing && (
                  <div>
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Email *</label>
                    <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="staff@spiceroute.com" className={ic} />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1-555-0100" className={ic} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Role *</label>
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    disabled={isManager && editing}
                    className={`${ic} ${isManager && editing ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    {availableRoles.map(r => <option key={r} value={r} className="bg-gray-900">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                  {isManager && <p className="text-text-muted text-xs mt-1">Managers can create/edit Captains and Cooks only</p>}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">
                    {editing ? 'New Password (leave blank to keep current)' : 'Password *'}
                  </label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder={editing ? 'Leave blank to keep current' : 'Min 6 characters'} className={`${ic} pr-11`} />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mt-4">{error}</div>}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 border border-white/20 rounded-xl text-xs font-bold text-text-muted hover:bg-white/5">Cancel</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-3 bg-primary text-white rounded-xl text-xs font-bold uppercase hover:bg-primary-hover flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Staff'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {showDeleteModal && deleteTarget && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-main border border-red-500/20 rounded-2xl p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Delete Staff Member</h3>
                <button onClick={() => setShowDeleteModal(false)}><X size={18} className="text-text-muted hover:text-white" /></button>
              </div>
              <p className="text-text-muted text-sm mb-2">Are you sure you want to permanently delete:</p>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
                <p className="font-bold text-white">{deleteTarget.name}</p>
                <p className="text-text-muted text-xs">{deleteTarget.email} · {deleteTarget.role}</p>
              </div>
              <p className="text-red-400 text-xs mb-5">This action cannot be undone. The user account will be permanently removed.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 border border-white/20 rounded-xl text-xs font-bold text-text-muted hover:bg-white/5">Cancel</button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-60">
                  {deleting ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StaffManagement;
