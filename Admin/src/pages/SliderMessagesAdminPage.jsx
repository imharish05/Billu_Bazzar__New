import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Edit2, Trash2, MessageSquare, Sparkles, ToggleLeft, ToggleRight } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import Switch from '../components/Switch';
import api from '../services/api';
import toast from 'react-hot-toast';
import { checkPermission } from '../utils/rbac';

const SliderMessagesAdminPage = () => {
  const { admin } = useSelector((s) => s.auth);
  const canAddMessage = checkPermission(admin, 'add_slider_message');
  const canDeleteMessage = checkPermission(admin, 'delete_slider_message');
  const canShowActions = canAddMessage || canDeleteMessage;

  const sliderHeaders = ['Position', 'Message Text', 'Status'];
  if (canShowActions) sliderHeaders.push('Actions');

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ message: '', position: 0, isActive: true });

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/marketing-messages?all=true');
      setMessages(res.data?.messages || []);
    } catch (err) {
      toast.error('Failed to load slider messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({ message: '', position: messages.length + 1, isActive: true });
    setModalOpen(true);
  };

  const handleOpenEdit = (msg) => {
    setEditingId(msg.id);
    setForm({ message: msg.message, position: msg.position, isActive: msg.isActive });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) {
      toast.error('Message text is required');
      return;
    }
    try {
      if (editingId) {
        await api.put(`/marketing-messages/${editingId}`, form);
        toast.success('Slider message updated!');
      } else {
        await api.post('/marketing-messages', form);
        toast.success('Slider message created!');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save slider message');
    }
  };

  const handleToggleActive = async (msg) => {
    try {
      await api.put(`/marketing-messages/${msg.id}`, {
        message: msg.message,
        position: msg.position,
        isActive: !msg.isActive,
      });
      toast.success('Status updated');
      load();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const executeDelete = async (id) => {
    try {
      await api.delete(`/marketing-messages/${id}`);
      toast.success('Slider message deleted', { position: 'top-center' });
      load();
    } catch (err) {
      toast.error('Failed to delete slider message', { position: 'top-center' });
    }
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="flex flex-col items-center text-center gap-2 p-1 min-w-[240px]">
        <p className="text-sm font-semibold text-brand-text">Confirm Deletion</p>
        <p className="text-xs text-brand-grey">Are you sure you want to delete this slider message?</p>
        <div className="flex justify-center items-center gap-3 mt-2 w-full">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              executeDelete(id);
            }}
            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold uppercase tracking-wider transition-colors rounded shadow-sm"
          >
            Yes, Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-brand-text text-xs font-semibold uppercase tracking-wider transition-colors rounded border border-brand-light"
          >
            Cancel
          </button>
        </div>
      </div>
    ), { position: 'top-center', duration: 6000 });
  };

  return (
    <AdminLayout title="Slider Messages">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-brand-text flex items-center gap-2">
            <Sparkles size={20} className="text-brand-gold" /> Header Slider Announcement Messages
          </h1>
          <p className="text-xs text-brand-grey mt-1">
            Manage revolving marquee text messages displayed at the very top bar of the storefront website.
          </p>
        </div>
        {canAddMessage && (
          <button
            onClick={handleOpenAdd}
            className="btn-primary flex items-center gap-2"
            id="add-message-btn"
          >
            <Plus size={16} /> Add Message
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-brand-light">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-brand-text" aria-label="Slider messages table">
            <thead>
              <tr className="bg-brand-light/40 text-brand-grey border-b border-brand-light">
                {sliderHeaders.map(h => (
                  <th key={h} className="px-5 py-4 text-xs font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-brand-light">
                    {[...Array(sliderHeaders.length)].map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="skeleton h-5 w-24 bg-brand-light" /></td>
                    ))}
                  </tr>
                ))
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={sliderHeaders.length} className="px-5 py-12 text-center text-brand-grey font-medium">
                    <MessageSquare size={36} className="mx-auto mb-3 opacity-30 text-brand-grey" />
                    No slider messages found. Click 'Add Message' to configure.
                  </td>
                </tr>
              ) : (
                messages.map(msg => (
                  <tr key={msg.id} className="border-b border-brand-light hover:bg-brand-light/20 transition-colors">
                    <td className="px-5 py-4 font-mono text-brand-gold font-bold">{msg.position}</td>
                    <td className="px-5 py-4 font-medium text-brand-text max-w-md truncate">{msg.message}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={msg.isActive}
                          disabled={!canAddMessage}
                          onChange={() => canAddMessage && handleToggleActive(msg)}
                          id={`toggle-status-${msg.id}`}
                        />
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${msg.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {msg.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    {canShowActions && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {canAddMessage && (
                            <button
                              onClick={() => handleOpenEdit(msg)}
                              className="p-1.5 text-brand-grey hover:text-brand-gold hover:bg-brand-light rounded transition-all"
                              aria-label="Edit message"
                              id={`edit-btn-${msg.id}`}
                            >
                              <Edit2 size={15} />
                            </button>
                          )}
                          {canDeleteMessage && (
                            <button
                              onClick={() => handleDelete(msg.id)}
                              className="p-1.5 text-brand-grey hover:text-red-500 hover:bg-brand-light rounded transition-all"
                              aria-label="Delete message"
                              id={`delete-btn-${msg.id}`}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light">
                <h2 className="font-playfair text-lg font-semibold text-brand-text flex items-center gap-2">
                  <Sparkles size={18} className="text-brand-gold" />
                  {editingId ? 'Edit Slider Message' : 'Add Slider Message'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 text-brand-grey hover:text-brand-gold hover:bg-brand-light rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="msg-text">
                    Message Text *
                  </label>
                  <textarea
                    id="msg-text"
                    value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    required
                    rows={3}
                    className="w-full border border-brand-light bg-white px-3 py-2 text-sm text-brand-text placeholder-brand-grey focus:outline-none focus:border-brand-gold transition-colors rounded-lg font-sans"
                    placeholder="e.g. Free shipping on orders above ₹1499 · Use code WELCOME20 for 20% off"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-grey mb-1.5" htmlFor="msg-pos">
                      Position
                    </label>
                    <input
                      id="msg-pos"
                      type="number"
                      value={form.position}
                      onChange={e => setForm(p => ({ ...p, position: parseInt(e.target.value) || 0 }))}
                      required
                      min={0}
                      className="w-full border border-brand-light bg-white px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold transition-colors rounded-lg font-mono"
                    />
                  </div>
                  <div className="flex flex-col justify-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-brand-text select-none" htmlFor="sm-active">
                      <Switch
                        id="sm-active"
                        checked={form.isActive}
                        onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
                      />
                      <span>Active Message</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-brand-light">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn-outline flex-1 rounded-lg text-brand-text border-brand-text hover:bg-brand-light"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1 rounded-lg"
                  >
                    Save Message
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default SliderMessagesAdminPage;
