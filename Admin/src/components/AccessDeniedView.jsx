import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const AccessDeniedView = ({ path = '' }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-lg w-full bg-white rounded-3xl p-8 md:p-10 shadow-xl border border-rose-100 text-center relative overflow-hidden"
      >
        {/* Top Decorative Glow Accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Shield Icon Badge */}
        <div className="relative z-10 w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200/60 text-rose-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
          <ShieldAlert size={40} strokeWidth={1.5} />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow">
            <Lock size={14} />
          </div>
        </div>

        {/* Status Badge */}
        <div className="inline-block px-3.5 py-1 rounded-full bg-rose-100/80 text-rose-800 text-xs font-extrabold uppercase tracking-wider mb-4 border border-rose-200/80">
          403 Access Restricted
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-neutral-900 tracking-tight mb-3">
          Access Denied
        </h2>

        {/* Message */}
        <p className="text-xs md:text-sm text-neutral-600 leading-relaxed mb-6">
          You do not have the required role permissions to view or manage the requested resource{' '}
          {path ? <span className="font-mono bg-neutral-100 text-rose-700 px-1.5 py-0.5 rounded font-semibold">{path}</span> : ''}.
          <br />
          If you believe this is an error, please reach out to your system Administrator.
        </p>

        {/* Action Button */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold px-6 py-3 rounded-2xl shadow-md transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            id="access-denied-dashboard-btn"
          >
            <ArrowLeft size={16} /> Return to Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AccessDeniedView;
