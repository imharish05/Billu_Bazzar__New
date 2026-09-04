import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, RotateCcw, ShieldAlert, Headphones } from 'lucide-react';
import Footer from '../components/Footer';

const ServiceUnavailablePage = ({
  code = '503',
  title = 'Service Unavailable',
  subtitle = 'Access Denied / Service Temporarily Unavailable',
  message = "Our servers are temporarily restricted or undergoing scheduled maintenance. Access cannot be granted right now. Please refresh the page or check back in a few moments."
}) => {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <main id="main-content" className="min-h-screen flex flex-col bg-[#FDFBF7]">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl mx-auto flex flex-col items-center"
        >
          {/* Status badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold tracking-wider uppercase mb-4 shadow-sm">
            <ShieldAlert size={14} className="text-[#C9A24B]" />
            <span>HTTP {code} &bull; {subtitle}</span>
          </div>

          {/* 503 large display matching 404 text stroke */}
          <h1
            className="font-playfair font-bold text-[110px] sm:text-[140px] md:text-[180px] leading-none select-none tracking-tight"
            style={{ color: 'transparent', WebkitTextStroke: '2px #C9A24B' }}
            aria-label={`${code} ${title}`}
          >
            {code}
          </h1>

          <h2 className="font-playfair text-2xl md:text-3xl font-semibold text-brand-text mt-2 mb-3">
            {title}
          </h2>

          <p className="text-brand-grey text-sm md:text-base max-w-md mx-auto mb-8 leading-relaxed">
            {message}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-center w-full max-w-md">
            <button
              type="button"
              onClick={handleReload}
              className="btn-primary flex items-center justify-center gap-2 px-6 py-3"
              id="503-refresh"
            >
              <RotateCcw size={16} /> Try Again
            </button>
            <Link
              to="/"
              className="btn-outline flex items-center justify-center gap-2 px-6 py-3"
              id="503-home"
            >
              <Home size={16} /> Back to Home
            </Link>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="btn-outline flex items-center justify-center gap-2 px-6 py-3"
              id="503-back"
            >
              <ArrowLeft size={16} /> Go Back
            </button>
          </div>

          {/* Quick links & Support */}
          <div className="mt-12 pt-8 border-t border-[#EAE6DF] w-full">
            <div className="flex items-center justify-center gap-2 mb-3 text-brand-text font-medium text-sm">
              <Headphones size={16} className="text-[#C9A24B]" />
              <span>Need immediate assistance? <Link to="/contact" className="text-brand-gold underline font-semibold hover:text-brand-gold/80">Contact Support</Link></span>
            </div>
            <p className="text-brand-grey text-xs mb-3">You might also be interested in:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {['New Arrivals', 'Party Wear', 'Jewelry', 'Perfumes', 'My Account'].map((link) => (
                <Link
                  key={link}
                  to="/products"
                  className="text-brand-gold text-xs sm:text-sm hover:underline focus-visible:outline-brand-gold font-medium"
                >
                  {link}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </main>
  );
};

export default ServiceUnavailablePage;
