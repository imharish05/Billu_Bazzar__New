import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

const AUTOPLAY_INTERVAL = 6500;

const HeroBanner = () => {
  const { items: allBanners, loading } = useSelector(s => s.banners);
  const banners = allBanners.filter(b => b.type === 'HERO');
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    let timeoutId;
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  // Pause autoplay + looping animations when banner scrolled out of view —
  // prevents timers/transitions queuing work off-screen that all lands at
  // once (jank + image pop) when the user scrolls back up.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const goTo = useCallback((index) => {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  }, [current]);

  const next = useCallback(() => {
    if (banners.length < 2) return;
    setDirection(1);
    setCurrent(prev => (prev + 1) % banners.length);
  }, [banners.length]);

  const prev = useCallback(() => {
    if (banners.length < 2) return;
    setDirection(-1);
    setCurrent(prev => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length < 2 || !isVisible || isScrolling) return;
    const timer = setInterval(() => {
      next();
    }, AUTOPLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [banners.length, next, isVisible, isScrolling]);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e) => { touchEndX.current = e.touches[0].clientX; };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
  };

  if (loading) {
    return (
      <section ref={sectionRef} className="hero-banner-section relative w-full flex flex-col justify-center bg-brand-light" aria-label="Hero banner loading">
        <div className="absolute inset-0 skeleton" />
      </section>
    );
  }

  if (banners.length === 0) {
    return (
      <section ref={sectionRef} className="hero-banner-section relative w-full flex flex-col justify-center bg-brand-text" aria-label="Hero banner">
        <div className="relative z-10 max-w-site mx-auto px-6 md:px-16 w-full py-10 md:py-0">
          <div className="hero-content-wrapper max-w-2xl lg:max-w-3xl xl:max-w-4xl p-6 md:p-8">
            <p className="text-brand-gold text-xs tracking-[0.25em] uppercase mb-4">Billu Bazaar</p>
            <h1 className="font-playfair text-3xl sm:text-4xl md:text-6xl font-bold text-white leading-tight mb-6">Luxury Redefined</h1>
            <p className="text-white/80 text-base md:text-lg mb-8 max-w-lg">Discover handcrafted elegance from India's finest artisans.</p>
            <Link to="/products" className="btn-primary" id="hero-cta-fallback">Explore Collection</Link>
          </div>
        </div>
      </section>
    );
  }

  const banner = banners[current];
  const hasTextContent = !!(
    (banner?.badgeText && banner.badgeText.trim()) ||
    (banner?.title && banner.title.trim()) ||
    (banner?.subtitle && banner.subtitle.trim()) ||
    (banner?.ctaText && banner.ctaText.trim())
  );

  return (
    <section
      ref={sectionRef}
      className="hero-banner-section relative w-full flex flex-col justify-center"
      aria-label="Hero banner carousel"
      role="region"
      aria-roledescription="carousel"
    >
      {/* Background images — overflow-hidden lives HERE only, so the sliding
          x-transform never bleeds outside, but text below can never be
          clipped even if a long title needs more height than the image. */}
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={banner.id || current}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 200 : -200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -200 : 200 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {hasTextContent ? (
              <>
                <img
                  src={getImageUrl(banner.image)}
                  alt={banner.title || "Hero banner"}
                  className="w-full h-full object-cover"
                  fetchpriority={current === 0 ? 'high' : 'auto'}
                  loading={current === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
              </>
            ) : (
              <Link to={banner.ctaLink || '/products'} className="block w-full h-full cursor-pointer" id={`hero-link-${current}`}>
                <img
                  src={getImageUrl(banner.image)}
                  alt={banner.title || "Hero banner"}
                  className="w-full h-full object-cover"
                  fetchpriority={current === 0 ? 'high' : 'auto'}
                  loading={current === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </Link>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Content Overlay */}
      {hasTextContent && (
        <div className="relative z-10 max-w-site mx-auto px-6 md:px-16 w-full py-6 md:py-0 lg:pt-36">
          <AnimatePresence mode="wait">
            <motion.div
              key={banner.id || current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="hero-content-wrapper max-w-2xl md:max-w-3xl lg:max-w-4xl p-4 sm:p-8"
            >
              {banner.badgeText && banner.badgeText.trim() && (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-brand-gold text-white text-[10px] font-bold px-3 py-1 inline-block mb-3 md:mb-4 tracking-wider uppercase"
                >
                  {banner.badgeText}
                </motion.span>
              )}
              {banner.title && banner.title.trim() && (
                <motion.h1
                  className="font-playfair text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 md:mb-6 break-words"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  {banner.title.split(' ').map((word, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 + i * 0.08 }}
                      className="inline-block mr-2 sm:mr-3"
                    >
                      {word}
                    </motion.span>
                  ))}
                </motion.h1>
              )}
              {banner.subtitle && banner.subtitle.trim() && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-white/80 text-sm md:text-lg mb-6 md:mb-8 max-w-sm sm:max-w-md md:max-w-xl"
                >
                  {banner.subtitle}
                </motion.p>
              )}
              {banner.ctaText && banner.ctaText.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <Link to={banner.ctaLink || '/products'} className="btn-primary-hero" id={`hero-cta-${current}`}>
                    {banner.ctaText}
                  </Link>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
 
      {/* Navigation arrows — desktop only (centered in the visible content space below the header) */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="hidden md:flex absolute left-4 top-1/2 lg:top-[calc(50%+54px)] -translate-y-1/2 z-20 w-12 h-12 items-center justify-center bg-white/10 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white transition-all duration-200 focus-visible:outline-white"
            aria-label="Previous banner"
            id="hero-arrow-prev"
          >
            <ChevronLeft size={22} strokeWidth={1.5} />
          </button>
          <button
            onClick={next}
            className="hidden md:flex absolute right-4 top-1/2 lg:top-[calc(50%+54px)] -translate-y-1/2 z-20 w-12 h-12 items-center justify-center bg-white/10 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white transition-all duration-200 focus-visible:outline-white"
            aria-label="Next banner"
            id="hero-arrow-next"
          >
            <ChevronRight size={22} strokeWidth={1.5} />
          </button>
        </>
      )}
 
      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2" role="tablist" aria-label="Banner slides">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              role="tab"
              aria-selected={current === i}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 focus-visible:outline-white ${
                current === i ? 'bg-brand-gold w-6' : 'bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
 
      {/* Scroll indicator */}
      <motion.div
        className="hidden md:flex absolute bottom-20 md:bottom-16 left-1/2 -translate-x-1/2 flex-col items-center gap-2 z-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        aria-hidden="true"
      >
        <div className="w-px h-10 bg-white/40" />
        <span className="text-white/50 text-[10px] uppercase tracking-widest">Scroll</span>
      </motion.div>
    </section>
  );
};

export default HeroBanner;