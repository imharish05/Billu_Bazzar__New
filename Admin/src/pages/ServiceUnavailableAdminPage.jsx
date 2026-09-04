import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RotateCcw, Home, ShieldAlert } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

const ServiceUnavailableAdminPage = () => {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <AdminLayout title="Service Unavailable">
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-lg w-full flex flex-col items-center"
        >
          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-bold uppercase tracking-wider mb-4">
            <ShieldAlert size={14} className="text-[#C9A24B]" />
            <span>503 Service Unavailable / Access Denied</span>
          </div>

          <motion.h1
            className="font-playfair text-[100px] md:text-[140px] font-bold leading-none select-none"
            style={{ color: 'transparent', WebkitTextStroke: '2px #C9A24B' }}
          >
            503
          </motion.h1>

          <h2 className="font-playfair text-2xl md:text-3xl font-bold text-neutral-900 mt-2 mb-3">
            Service Temporarily Unavailable
          </h2>

          <p className="text-xs md:text-sm text-neutral-600 max-w-md mx-auto mb-8 leading-relaxed">
            The server is currently unable to handle the request due to maintenance, overload, or restricted access. Please try reloading or check back shortly.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleReload}
              className="btn-primary flex items-center gap-2"
              id="admin-503-retry"
            >
              <RotateCcw size={16} /> Try Again
            </button>
            <Link
              to="/dashboard"
              className="btn-outline flex items-center gap-2 border border-neutral-300 text-neutral-700 hover:bg-neutral-50 px-4 py-2 text-xs font-semibold"
              id="admin-503-dashboard"
            >
              <Home size={16} /> Back to Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default ServiceUnavailableAdminPage;
