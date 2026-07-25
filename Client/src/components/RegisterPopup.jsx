import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift } from 'lucide-react';
import api from '../services/api';

const POPUP_DISMISSED_KEY = 'bb_reg_popup_dismissed';

const RegisterPopup = () => {
  const { isAuthenticated } = useSelector(s => s.auth);
  const navigate = useNavigate();

  const [visible, setVisible] = useState(false);
  const [signupPoints, setSignupPoints] = useState(50);
  const [pointsLoaded, setPointsLoaded] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(POPUP_DISMISSED_KEY, '1');
  }, []);

  const handleRegister = useCallback(() => {
    dismiss();
    navigate('/account?view=register');
  }, [dismiss, navigate]);

  useEffect(() => {
    if (isAuthenticated) return;
    if (localStorage.getItem(POPUP_DISMISSED_KEY)) return;

    const fetchPoints = async () => {
      try {
        const res = await api.get('/settings/loyalty');
        if (res.data?.success && res.data?.data) {
          const pts = Number(res.data.data.signupPoints);
          const enabled = res.data.data.signupPointsEnabled !== false;
          if (enabled && pts > 0) {
            setSignupPoints(pts);
          } else if (!enabled) {
            return;
          }
        }
      } catch {
        // fallback to default 50 points
      }
      setPointsLoaded(true);
    };

    fetchPoints();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!pointsLoaded) return;
    if (isAuthenticated) return;
    if (localStorage.getItem(POPUP_DISMISSED_KEY)) return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, [pointsLoaded, isAuthenticated]);

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            key="reg-popup-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={dismiss}
            className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          <motion.div
            key="reg-popup-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reg-popup-title"
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center px-4 pointer-events-none"
          >
            <div
              className="relative pointer-events-auto bg-white w-full max-w-[360px] rounded-lg shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
              style={{ fontFamily: 'Montserrat, Inter, sans-serif' }}
            >
              <div
                className="h-1 w-full"
                style={{ background: 'linear-gradient(90deg, #C58837 0%, #e8c07a 50%, #C58837 100%)' }}
              />
              <button
                onClick={dismiss}
                className="absolute top-3 right-3 w-8 h-8 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:border-neutral-400 transition-colors z-10"
                aria-label="Close popup"
                id="reg-popup-close-btn"
              >
                <X size={15} strokeWidth={2} />
              </button>
              <div className="px-8 pt-8 pb-7 flex flex-col items-center text-center">
                <div
                  className="w-[72px] h-[72px] rounded-full flex items-center justify-center mb-5"
                  style={{ border: '1.5px solid #e0d0b0', background: '#fdfaf4' }}
                >
                  <Gift size={32} strokeWidth={1.4} style={{ color: '#8B1A1A' }} />
                </div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1"
                  style={{ color: '#C58837' }}
                >
                  Exclusive Welcome Gift
                </p>
                <div
                  className="w-12 mb-4"
                  style={{ height: '1.5px', background: 'linear-gradient(90deg, transparent, #C58837, transparent)' }}
                />
                <h2
                  id="reg-popup-title"
                  className="text-[22px] font-bold leading-snug mb-1"
                  style={{ color: '#111111' }}
                >
                  Register now and get
                </h2>
                <p
                  className="text-[22px] font-bold leading-snug mb-4"
                  style={{ color: '#111111' }}
                >
                  <span style={{ color: '#8B1A1A' }}>{signupPoints} Loyalty Points</span>
                  {' '}on us!
                </p>
                <p className="text-[12px] text-neutral-500 mb-6 leading-relaxed">
                  Join free. Points are added instantly to your account upon signup.
                </p>
                <button
                  onClick={handleRegister}
                  id="reg-popup-register-btn"
                  className="w-full py-3.5 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] rounded-sm mb-3"
                  style={{ background: '#8B1A1A' }}
                >
                  Register Now
                </button>
                <button
                  onClick={dismiss}
                  id="reg-popup-guest-btn"
                  className="text-[11px] font-medium uppercase tracking-[0.15em] text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  Continue as Guest
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default RegisterPopup;
