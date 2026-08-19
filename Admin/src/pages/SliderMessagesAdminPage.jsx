import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Edit2, Trash2, MessageSquare, Sparkles } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import AdminLayout from '../components/AdminLayout';
import Switch from '../components/Switch';
import SortableRow from '../components/SortableRow';
import api from '../services/api';
import toast from 'react-hot-toast';
import { checkPermission } from '../utils/rbac';

const SliderMessagesAdminPage = () => {
  const { admin } = useSelector((s) => s.auth);
  const canAddMessage = checkPermission(admin, 'add_slider_message');
  const canDeleteMessage = checkPermission(admin, 'delete_slider_message');
  const canShowActions = canAddMessage || canDeleteMessage;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ message: '', position: 1, isActive: true });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

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

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = messages.findIndex((m) => m.id === active.id);
    const newIndex = messages.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(messages, oldIndex, newIndex).map((m, idx) => ({
      ...m,
      position: idx + 1,
    }));

    setMessages(reordered);

    try {
      await api.patch('/marketing-messages/reorder', {
        items: reordered.map((m, idx) => ({ id: m.id, position: idx + 1 })),
      });
      toast.success('Order updated!');
    } catch (err) {
      toast.error('Failed to save order');
      load();
    }
  };

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
    const previousState = msg.isActive;
    const nextState = !previousState;

    // 1. Optimistic UI update — instant transition with zero lag/flicker
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isActive: nextState } : m))
    );

    try {
      // 2. Silent background sync
      await api.put(`/marketing-messages/${msg.id}`, {
        message: msg.message,
        position: msg.position,
        isActive: nextState,
      });
      toast.success(`Message marked as ${nextState ? 'Active' : 'Inactive'}`);
    } catch (err) {
      // 3. Rollback if network/server fails
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isActive: previousState } : m))
      );
      toast.error(err.response?.data?.message || 'Failed to update status');
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
             Header Slider Announcement Messages
          </h1>
          <p className="text-xs text-brand-grey mt-1">
            Manage revolving marquee text messages displayed at the very top bar of the storefront website. Drag rows or edit position to reorder.
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
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-12 w-full rounded-lg bg-brand-light" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="p-12 text-center text-brand-grey font-medium">
              <MessageSquare size={36} className="mx-auto mb-3 opacity-30 text-brand-grey" />
              No slider messages found. Click 'Add Message' to configure.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <table className="w-full text-sm text-left text-brand-text" aria-label="Slider messages table">
                <thead>
                  <tr className="bg-brand-light/40 text-brand-grey border-b border-brand-light">
                    <th className="pl-3 pr-1 py-4 w-8"></th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider w-24">Position</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider">Message Text</th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider w-36">Status</th>
                    {canShowActions && (
                      <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider w-28 text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <SortableContext
                  items={messages.map((m) => m.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {messages.map((msg) => (
                      <SortableRow key={msg.id} id={msg.id}>
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
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
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
                      </SortableRow>
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          )}
        </div>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light">
                <h2 className="font-playfair text-lg font-semibold text-brand-text flex items-center gap-2">
                  {/* <Sparkles size={18} className="text-brand-gold" /> */}
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
                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
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
                      onChange={(e) => setForm((p) => ({ ...p, position: parseInt(e.target.value, 10) || 1 }))}
                      required
                      min={1}
                      className="w-full border border-brand-light bg-white px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-gold transition-colors rounded-lg font-mono"
                    />
                    <p className="text-[11px] text-brand-grey mt-1">
                      Existing items at this position will automatically shift down.
                    </p>
                  </div>
                  <div className="flex flex-col justify-start pt-6">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-brand-text select-none" htmlFor="sm-active">
                      <Switch
                        id="sm-active"
                        checked={form.isActive}
                        onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
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
