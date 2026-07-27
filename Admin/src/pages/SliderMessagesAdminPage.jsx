import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Edit2, Trash2, MessageSquare, Sparkles, ToggleLeft, ToggleRight } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import Switch from '../components/Switch';
import api from '../services/api';
import toast from 'react-hot-toast';

const SliderMessagesAdminPage = () => {
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
    setForm({ message: '', position: messages.length, isActive: true });
    setModalOpen(true);
  };

  const handleOpenEdit = (msg) => {
    setEditingId(msg.id);
    setForm({ message: msg.message, position: msg.position, isActive: msg.isActive });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/marketing-messages/${editingId}`, form);
        toast.success('Slider message updated successfully');
      } else {
        await api.post('/marketing-messages', form);
        toast.success('Slider message added successfully');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving slider message');
    }
  };

  const handleDelete = (id) => {
    toast((t) => (
      <div className="flex flex-col items-center text-center gap-2 p-1 min-w-[260px]">
        <p className="text-sm font-bold text-neutral-800">Delete this slider message?</p>
        <p className="text-xs text-neutral-500 max-w-xs">This action cannot be undone.</p>
        <div className="flex justify-center items-center gap-3 mt-2 w-full">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                await api.delete(`/marketing-messages/${id}`);
                toast.success('Slider message deleted');
                load();
              } catch (err) {
                toast.error('Failed to delete slider message');
              }
            }}
            className="px-3.5 py-1.5 text-xs bg-red-600 text-white rounded font-medium hover:bg-red-700 shadow-sm transition-colors"
          >
            Yes, Delete
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="px-3.5 py-1.5 text-xs border border-neutral-300 rounded text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    ), {
      duration: 6000,
      position: 'top-center',
      style: {
        borderRadius: '12px',
        background: '#ffffff',
        color: '#1a1a1a',
        border: '1px solid #E5E7EB',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        padding: '14px 18px',
      },
    });
  };

  const handleToggleActive = async (msg) => {
    try {
      await api.put(`/marketing-messages/${msg.id}`, { ...msg, isActive: !msg.isActive });
      toast.success(`Message status updated`);
      load();
    } catch (err) {
      toast.error('Failed to toggle status');
    }
  };

  return (
    <AdminLayout title="Slider Messages">
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-brand-grey">{messages.length} messages configured</p>
        <button
          onClick={handleOpenAdd}
          className="btn-primary flex items-center gap-2"
          id="add-message-btn"
        >
          <Plus size={16} /> Add Message
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-brand-light">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-brand-text" aria-label="Slider messages table">
            <thead>
              <tr className="bg-brand-light/40 text-brand-grey border-b border-brand-light">
                {['Position', 'Message Text', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-4 text-xs font-semibold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-brand-light">
                    {[...Array(4)].map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="skeleton h-5 w-24 bg-brand-light" /></td>
                    ))}
                  </tr>
                ))
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-brand-grey font-medium">
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
                      <div className="flex items-center">
                        <Switch
                          checked={msg.isActive}
                          onChange={() => handleToggleActive(msg)}
                          id={`toggle-status-${msg.id}`}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleOpenEdit(msg)}
                          className="p-1.5 text-brand-grey hover:text-brand-gold hover:bg-brand-light rounded transition-all"
                          aria-label="Edit message"
                          id={`edit-btn-${msg.id}`}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="p-1.5 text-brand-grey hover:text-red-500 hover:bg-brand-light rounded transition-all"
                          aria-label="Delete message"
                          id={`delete-btn-${msg.id}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
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
              <form onSubmit={handleSave} className="p-6 space-y-4">
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
