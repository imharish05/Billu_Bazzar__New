import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Premium Luxury Preloader for Billu Bazaar
 * Features:
 * - Ambient obsidian & golden radial glow backdrop
 * - Dual gold geometric orbit rings with spark accents
 * - Pulsing gold brand emblem
 * - Shimmering Cinzel serif typography
 * - Smooth liquid gold progress bar & percentage counter
 * - Silky smooth exit transition
 */
const Preloader = ({ onFinish, minimumDuration = 1800, autoHide = true }) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Smooth progress simulation that ramps up to 100%
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / minimumDuration) * 100), 100);

      // Non-linear easing (starts smooth, speeds through mid, pauses momentarily near end)
      setProgress((prev) => {
        if (pct >= 100) {
          clearInterval(interval);
          return 100;
        }
        return Math.max(prev, pct);
      });
    }, 25);

    return () => clearInterval(interval);
  }, [minimumDuration]);

  useEffect(() => {
    if (progress === 100 && autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onFinish) onFinish();
      }, 400); // Brief pause at 100% for satisfying visual completion
      return () => clearTimeout(timer);
    }
  }, [progress, autoHide, onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="billu-bazaar-preloader"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: 'blur(10px)',
            transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] }
          }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#070708] select-none overflow-hidden"
          style={{ cursor: 'wait' }}
        >
          {/* Ambient Golden Radial Glow behind the center */}
          <div
            className="absolute w-[500px] h-[500px] rounded-full pointer-events-none opacity-35 blur-[120px]"
            style={{
              background: 'radial-gradient(circle, rgba(201,162,75,0.4) 0%, rgba(184,134,11,0.15) 50%, transparent 70%)'
            }}
          />

          {/* Center Luxury Emblem Container */}
          <div className="relative flex items-center justify-center w-48 h-48 md:w-56 md:h-56 mb-8">
            {/* Outer Golden Dashed Orbit Ring */}
            <svg
              className="absolute inset-0 w-full h-full animate-orbit"
              viewBox="0 0 200 200"
              fill="none"
            >
              <circle
                cx="100"
                cy="100"
                r="92"
                stroke="url(#goldGradientOuter)"
                strokeWidth="1.2"
                strokeDasharray="8 6"
                opacity="0.75"
              />
              <circle
                cx="100"
                cy="8"
                r="3"
                fill="#F2D98D"
                filter="drop-shadow(0 0 6px #F2D98D)"
              />
              <defs>
                <linearGradient id="goldGradientOuter" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C9A24B" />
                  <stop offset="50%" stopColor="#FFF3C4" />
                  <stop offset="100%" stopColor="#8A6820" />
                </linearGradient>
              </defs>
            </svg>

            {/* Inner Counter-Rotating Orbit Ring */}
            <svg
              className="absolute inset-3 w-[calc(100%-24px)] h-[calc(100%-24px)] animate-orbit-reverse"
              viewBox="0 0 200 200"
              fill="none"
            >
              <circle
                cx="100"
                cy="100"
                r="90"
                stroke="url(#goldGradientInner)"
                strokeWidth="1"
                strokeDasharray="4 12"
                opacity="0.6"
              />
              <circle
                cx="190"
                cy="100"
                r="2.5"
                fill="#C9A24B"
                filter="drop-shadow(0 0 4px #C9A24B)"
              />
              <defs>
                <linearGradient id="goldGradientInner" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8A6820" />
                  <stop offset="50%" stopColor="#F2D98D" />
                  <stop offset="100%" stopColor="#C9A24B" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center Logo with Breathing Glow Effect */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="relative z-10 w-24 h-24 md:w-28 md:h-28 flex items-center justify-center animate-pulse-glow"
            >
              <img
                src="/logo.png"
                alt="Billu Bazaar"
                className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(201,162,75,0.5)]"
                onError={(e) => {
                  // Elegant SVG monogram fallback if logo.png is loading
                  e.currentTarget.style.display = 'none';
                }}
              />
            </motion.div>
          </div>

          {/* Brand Name Typography with Gold Shimmer */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-center space-y-2 z-10"
          >
            <h1
              className="text-2xl md:text-3xl font-bold tracking-[0.3em] uppercase text-gold-shimmer"
              style={{ fontFamily: '"Cinzel", Georgia, serif' }}
            >
              BILLU BAZAAR
            </h1>
            <p
              className="text-[10px] md:text-[11px] font-medium tracking-[0.45em] text-neutral-400 uppercase"
              style={{ fontFamily: '"Montserrat", sans-serif' }}
            >
              Curated Luxury & Lifestyle
            </p>
          </motion.div>

          {/* Liquid Gold Progress Bar & Percentage */}
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="w-60 md:w-72 mt-8 space-y-2.5 z-10"
          >
            {/* Progress Track */}
            <div className="relative h-[2px] w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #8A6820 0%, #C9A24B 50%, #FFF3C4 100%)',
                  boxShadow: '0 0 10px rgba(201,162,75,0.8)'
                }}
                transition={{ ease: 'easeOut', duration: 0.1 }}
              />
            </div>

            {/* Percentage & Status Label */}
            <div className="flex items-center justify-between text-[10px] font-mono tracking-widest text-neutral-500 uppercase">
              <span className="text-neutral-400 font-sans tracking-[0.2em] text-[9px]">
                {progress < 100 ? 'Loading...' : 'Welcome'}
              </span>
              <span className="text-[#C9A24B] font-semibold">{progress}%</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Preloader;
