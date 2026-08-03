import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import InfluencerCarouselMobile from '../components/InfluencerCarouselMobile';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Star, ArrowRight, Clock, Truck, Award, Lock, Headphones } from 'lucide-react';
import { fetchProducts, fetchFeatured, fetchNewArrivals, fetchBestSellers } from '../redux/slices/productsSlice';
import { fetchCategories } from '../redux/slices/categoriesSlice';
import { fetchBanners } from '../redux/slices/bannersSlice';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import HeroBanner from '../components/HeroBanner';
import Footer from '../components/Footer';
import CircularGallery from '../components/CircularGallery';

/* ── Countdown Timer hook ─────────────────────────────────────────────────── */
const useCountdown = (targetDate) => {
  const calc = useCallback(() => {
    if (!targetDate) return { d: 0, h: 0, m: 0, s: 0 };
    const diff = new Date(targetDate) - new Date();
    if (isNaN(diff) || diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };
    return {
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    };
  }, [targetDate]);

  const [time, setTime] = useState(() => calc());

  useEffect(() => {
    setTime(calc());
    if (!targetDate) return;
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [targetDate, calc]);

  return time;
};

/* ── Scroll-reveal wrapper (Vengeance UI pattern — manual impl w/ Framer Motion + IntersectionObserver) */
const ScrollReveal = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '200px 0px 200px 0px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ── Countdown Unit ──────────────────────────────────────────────────────── */
const CountUnit = ({ value, label }) => (
  <div className="flex flex-col items-center">
    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 bg-neutral-900 border border-white/10 flex items-center justify-center rounded-lg shadow-inner">
      <span className="font-playfair text-base sm:text-xl md:text-2xl lg:text-3xl font-bold text-white">{String(value).padStart(2,'0')}</span>
    </div>
    <span className="text-[9px] sm:text-[11px] md:text-xs text-brand-grey mt-1.5 uppercase tracking-widest font-semibold">{label}</span>
  </div>
);

/* ── Section Header ──────────────────────────────────────────────────────── */
const SectionHeader = ({ eyebrow, title, subtitle, centered = true, className = 'mb-12' }) => (
  <div className={`${className} ${centered ? 'text-center' : ''}`}>
    {eyebrow && <p className="text-brand-gold text-xs font-bold tracking-[0.2em] uppercase mb-3">{eyebrow}</p>}
    <h2 className="font-playfair text-h2-sm md:text-h2 font-bold text-brand-text">{title}</h2>
    {subtitle && <p className="text-brand-grey mt-3 text-base max-w-xl mx-auto">{subtitle}</p>}
  </div>
);

/* ── Brand logos ─────────────────────────────────────────────────────────── */
const brandLogos = [
  { name: 'Sabyasachi', abbr: 'SB' }, { name: 'Manish Malhotra', abbr: 'MM' },
  { name: 'Tarun Tahiliani', abbr: 'TT' }, { name: 'Abu Jani Sandeep', abbr: 'AJ' },
  { name: 'Ritu Kumar', abbr: 'RK' }, { name: 'Raw Mango', abbr: 'RM' },
  { name: 'Anita Dongre', abbr: 'AD' }, { name: 'Gaurav Gupta', abbr: 'GG' },
];

/* ── Influencer data ──────────────────────────────────────────────────────── */
const influencers = [
  { name: 'Meera Kapoor', handle: '@meerakapoor_style', img: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400', products: 12, followers: '2.1M' },
  { name: 'Riya Ahuja', handle: '@bystyleria', img: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400', products: 8, followers: '890K' },
  { name: 'Priya Fashion', handle: '@priyafashionofficial', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', products: 19, followers: '3.4M' },
  { name: 'Sana Glam', handle: '@sanaglam_india', img: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400', products: 6, followers: '560K' },
];

/* ── Blog/Editorial Teasers ──────────────────────────────────────────────── */
const editorials = [
  { title: 'The Art of Draping: 7 Saree Styles for Every Occasion', category: 'Style Guide', date: 'June 28, 2025', img: 'https://images.unsplash.com/photo-1596783074918-c84cb06531ca?w=600', readTime: '5 min read' },
  { title: 'Fragrance Notes Decoded: Building Your Signature Scent', category: 'Perfumery', date: 'June 20, 2025', img: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=600', readTime: '4 min read' },
  { title: 'From Bazaar to Runway: How Indian Craft Goes Global', category: 'Fashion', date: 'June 14, 2025', img: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600', readTime: '7 min read' },
];

/* ── Testimonials ─────────────────────────────────────────────────────────── */
const testimonials = [
  { name: 'Priya N., Mumbai', rating: 5, text: 'The Rose Gold Lehenga Set was even more stunning in person. Received so many compliments at the wedding. Packaging was luxurious too!' },
  { name: 'Anjali S., Delhi', rating: 5, text: 'Absolutely love the Oud Royale perfume — it lasts all day and gets me compliments wherever I go. Will definitely order again.' },
  { name: 'Kavya R., Hyderabad', rating: 5, text: 'The Kundan Polki Necklace Set is a work of art. My mother cried when she saw it. Worth every rupee.' },
];

/* ══════════════════════════════════════════════════════════════════════════
 * HOME PAGE — 11 sections
 * ══════════════════════════════════════════════════════════════════════════ */
const HomePage = () => {
  const dispatch = useDispatch();
  const { items: products, featured, newArrivals, bestSellers, loading } = useSelector(s => s.products);
  const { items: categories } = useSelector(s => s.categories);
  const { items: banners } = useSelector(s => s.banners);
  const [mainTab, setMainTab] = useState('bestsellers');
  const carouselScrollRef = useRef(null);
  const [showCarouselLeftArrow, setShowCarouselLeftArrow] = useState(false);
  const [showCarouselRightArrow, setShowCarouselRightArrow] = useState(false);
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

  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handleChange = (e) => setIsMobileViewport(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const [currentExclusiveSlide, setCurrentExclusiveSlide] = useState(0);
  const [currentPromoSlide, setCurrentPromoSlide] = useState(0);

  const exclusiveBanners = useMemo(() => {
    return banners.filter(b => b.type === 'EXCLUSIVE_DEAL' && b.isActive);
  }, [banners]);

  const promoBanners = useMemo(() => {
    return banners.filter(b => b.type === 'PROMO' && b.isActive);
  }, [banners]);

  useEffect(() => {
    const maxIdx = isMobileViewport ? exclusiveBanners.length - 1 : exclusiveBanners.length - 2;
    if (maxIdx <= 0 || isScrolling) {
      if (maxIdx <= 0) setCurrentExclusiveSlide(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentExclusiveSlide(prev => prev >= maxIdx ? 0 : prev + 1);
    }, 6500);
    return () => clearInterval(interval);
  }, [exclusiveBanners.length, isMobileViewport, isScrolling]);

  useEffect(() => {
    const maxIdx = isMobileViewport ? exclusiveBanners.length - 1 : exclusiveBanners.length - 2;
    if (maxIdx < 0) {
      setCurrentExclusiveSlide(0);
      return;
    }
    if (currentExclusiveSlide > maxIdx) {
      setCurrentExclusiveSlide(maxIdx);
    }
  }, [isMobileViewport, exclusiveBanners.length, currentExclusiveSlide]);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [dbInfluencers, setDbInfluencers] = useState([]);
  const [activeInfluencerIndex, setActiveInfluencerIndex] = useState(0);
  const influencerGalleryItems = useMemo(
    () => dbInfluencers.map(inf => ({ image: inf.img, text: inf.name })),
    [dbInfluencers]
  );
  const handleActiveInfluencerChange = useCallback((idx) => {
    setActiveInfluencerIndex(idx);
  }, []);
  const galleryRef = useRef(null);


  // Category Carousel State & Refs
  const catScrollRef = useRef(null);
  const catSectionRef = useRef(null);
  const catTickingRef = useRef(false);
  const carouselTickingRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isCatVisible, setIsCatVisible] = useState(false);
  const [autoplayResetTrigger, setAutoplayResetTrigger] = useState(0);

  // Pause category autoplay when the carousel is off-screen — otherwise the
  // setInterval below keeps queuing smooth-scroll animations while the user
  // is reading the footer, and they all land on the main thread at once
  // (stutter + image pop) the moment the user scrolls back up.
  useEffect(() => {
    const el = catSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCatVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const parentCategories = categories.filter(c => !c.parentId).slice(0, 8);
  const fallbackCategories = [
    { id: 1, name: 'Party Wear', slug: 'party-wear', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300' },
    { id: 2, name: 'Fashion', slug: 'fashion', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300' },
    { id: 3, name: 'Accessories', slug: 'accessories', image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=300' },
    { id: 4, name: 'Perfumes', slug: 'perfumes', image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=300' },
    { id: 5, name: 'Jewelry', slug: 'jewelry', image: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=300' },
    { id: 6, name: 'Footwear', slug: 'footwear', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300' },
  ];
  const categoriesList = parentCategories.length ? parentCategories : fallbackCategories;

  const updateCatScrollState = useCallback(() => {
    const el = catScrollRef.current;
    if (!el || catTickingRef.current) return;
    catTickingRef.current = true;
    window.requestAnimationFrame(() => {
      if (el) {
        const nextLeft = el.scrollLeft > 2;
        const nextRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 4;
        setCanScrollLeft(prev => prev !== nextLeft ? nextLeft : prev);
        setCanScrollRight(prev => prev !== nextRight ? nextRight : prev);
      }
      catTickingRef.current = false;
    });
  }, []);

  useEffect(() => {
    updateCatScrollState();
    window.addEventListener('resize', updateCatScrollState);
    return () => {
      window.removeEventListener('resize', updateCatScrollState);
    };
  }, [updateCatScrollState, categoriesList.length]);

  const scrollCategories = useCallback((dir) => {
    const el = catScrollRef.current;
    if (!el) return;
    let gap = 16;
    if (window.innerWidth >= 1024) gap = 32;
    else if (window.innerWidth >= 768) gap = 24;
    const scrollAmount = el.clientWidth + gap;
    el.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
    setAutoplayResetTrigger(prev => prev + 1);
  }, []);

  const handleCatTouchStart = () => {
    setAutoplayResetTrigger(prev => prev + 1);
  };

  // Category Autoplay scroller
  useEffect(() => {
    if (categoriesList.length <= 3 || !isCatVisible || isScrolling) return;
    const interval = setInterval(() => {
      const el = catScrollRef.current;
      if (!el) return;
      const isAtEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 10;
      if (isAtEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        let gap = 16;
        if (window.innerWidth >= 1024) gap = 32;
        else if (window.innerWidth >= 768) gap = 24;
        // Scroll by 2 card widths instead of the entire page width to make it much smoother
        const cardWidth = el.clientWidth / (window.innerWidth >= 1024 ? 6 : window.innerWidth >= 768 ? 4 : 3);
        el.scrollBy({ left: cardWidth * 2 + gap, behavior: 'smooth' });
      }
    }, 7500);
    return () => clearInterval(interval);
  }, [categoriesList.length, autoplayResetTrigger, isCatVisible, isScrolling]);

  const countdownBanner = banners.find(b => b.type === 'COUNTDOWN');
  const countdown = useCountdown(countdownBanner?.countdown);
  const isExpired = countdownBanner?.countdown ? (new Date(countdownBanner.countdown) - new Date() <= 0) : false;
  const promoBanner = banners.find(b => b.type === 'PROMO' && b.isActive);

  useEffect(() => {
    dispatch(fetchProducts({ limit: 16 }));
    dispatch(fetchFeatured());
    dispatch(fetchNewArrivals(16));
    dispatch(fetchBestSellers(16));
    dispatch(fetchCategories());
    dispatch(fetchBanners());
    
    // Fetch active affiliates
    api.get('/affiliates')
      .then(res => {
        const active = (res.data.affiliates || []).filter(a => a.isActive);
        if (active.length) {
          const mapped = active.map((aff, i) => ({
            name: aff.name,
            handle: aff.handle || `@${aff.referralCode.toLowerCase()}_style`,
            img: aff.avatar || (
              i === 0 ? 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400'
                : i === 1 ? 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400'
                : i === 2 ? 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400'
                : 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400'
            ),
            products: parseInt(aff.productsCurated) || 0,
            followers: aff.followers && aff.followers !== '0' ? aff.followers.trim() : '',
          }));
          setDbInfluencers(mapped);
        }
      })
      .catch(err => console.error(err));

    // SEO meta
    document.title = 'Billu Bazaar — India\'s Luxury Fashion Destination';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'Discover luxury party wear, jewelry, perfumes and accessories at Billu Bazaar. Handcrafted, curated, and delivered with love across India.');
  }, [dispatch]);

  useEffect(() => {
    if (isExpired && countdownBanner) {
      dispatch(fetchBanners());
    }
  }, [isExpired, countdownBanner, dispatch]);

  const updateCarouselArrows = useCallback(() => {
    const el = carouselScrollRef.current;
    if (!el || carouselTickingRef.current) return;
    carouselTickingRef.current = true;
    window.requestAnimationFrame(() => {
      if (el) {
        const nextLeft = el.scrollLeft > 5;
        const nextRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 5;
        setShowCarouselLeftArrow(prev => prev !== nextLeft ? nextLeft : prev);
        setShowCarouselRightArrow(prev => prev !== nextRight ? nextRight : prev);
      }
      carouselTickingRef.current = false;
    });
  }, []);

  const productsToRender = useMemo(() => {
    let list = [];
    if (mainTab === 'bestsellers') {
      list = bestSellers.length ? bestSellers : products.filter(p => p.isBestSeller);
    } else {
      list = newArrivals.length ? newArrivals : products.filter(p => p.isNewArrival);
    }
    return list.length ? list : products.slice(0, 8);
  }, [mainTab, bestSellers, newArrivals, products]);

  useEffect(() => {
    const el = carouselScrollRef.current;
    if (!el) return;
    updateCarouselArrows();
    el.addEventListener('scroll', updateCarouselArrows, { passive: true });
    window.addEventListener('resize', updateCarouselArrows);
    return () => {
      el.removeEventListener('scroll', updateCarouselArrows);
      window.removeEventListener('resize', updateCarouselArrows);
    };
  }, [updateCarouselArrows, productsToRender]);

  const scrollCarousel = (direction) => {
    const el = carouselScrollRef.current;
    if (!el) return;
    const cardWidth = el.clientWidth / (window.innerWidth >= 1024 ? 4 : window.innerWidth >= 768 ? 3 : 2);
    el.scrollBy({ left: direction * cardWidth * 2, behavior: 'smooth' });
  };



  return (
    <main id="main-content">
      {/* ── SECTION 1: Hero Banner Carousel ──────────────────────────────── */}
      <HeroBanner />

      {/* ── SECTION 2: Category Quick-Nav Carousel ──────────────────────── */}
      <section ref={catSectionRef} className="py-10 md:py-18 bg-brand-bg overflow-hidden" aria-label="Browse categories">
        <div className="max-w-site mx-auto px-6 md:px-8">
          <ScrollReveal>
            <SectionHeader eyebrow="Shop by Category" title="Curated for Every Occasion" />
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="relative">
              {/* Scroll Buttons */}
              <button
                onClick={() => scrollCategories(-1)}
                className={`absolute left-1 md:-left-4 top-[40%] -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/95 border border-neutral-200/80 flex items-center justify-center text-brand-text shadow-lg hover:shadow-xl transition-all duration-300 focus-visible:outline-brand-gold ${
                  canScrollLeft ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
                }`}
                aria-label="Scroll categories left"
                id="cat-scroll-left"
              >
                <ChevronLeft size={16} className="md:w-5 md:h-5" strokeWidth={1.5} />
              </button>

              <button
                onClick={() => scrollCategories(1)}
                className={`absolute right-1 md:-right-4 top-[40%] -translate-y-1/2 z-10 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/95 border border-neutral-200/80 flex items-center justify-center text-brand-text shadow-lg hover:shadow-xl transition-all duration-300 focus-visible:outline-brand-gold ${
                  canScrollRight ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
                }`}
                aria-label="Scroll categories right"
                id="cat-scroll-right"
              >
                <ChevronRight size={16} className="md:w-5 md:h-5" strokeWidth={1.5} />
              </button>

              {/* Carousel Container */}
              <div
                ref={catScrollRef}
                className="flex gap-4 md:gap-6 lg:gap-8 overflow-x-auto scrollbar-hide pb-4"
                onScroll={updateCatScrollState}
                onTouchStart={handleCatTouchStart}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {categoriesList.map((cat, i) => (
                  <div key={cat.id} className="flex-shrink-0 w-[calc((100%-32px)/3)] md:w-[calc((100%-72px)/4)] lg:w-[calc((100%-160px)/6)]">
                    <Link
                      to={`/products?category=${cat.slug}`}
                      className="group flex flex-col items-center gap-3 focus-visible:outline-2 focus-visible:outline-brand-gold focus-visible:rounded-lg"
                      id={`cat-nav-${cat.id}`}
                    >
                      <div className="relative w-full aspect-square rounded-full overflow-hidden border-2 border-transparent group-hover:border-brand-gold transition-colors duration-300 shadow-sm">
                        <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 transform-gpu" loading="lazy" decoding="async" />
                      </div>
                      <span className="font-inter text-xs font-medium text-brand-text text-center group-hover:text-brand-gold transition-colors">
                        {cat.name}
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── SECTION 3: Countdown / Deal of the Month Banner ────────────── */}
      {countdownBanner && !isExpired && (
        <section className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 py-10 md:py-14 overflow-hidden border-y border-white/10" aria-label="Deal of the month countdown">
          <div className="max-w-site mx-auto px-4 sm:px-6 md:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center justify-items-center">
            {/* Text & Action */}
            <div className="text-center lg:text-left flex flex-col items-center lg:items-start max-w-md">
              {countdownBanner.badgeText && (
                <span className="bg-brand-gold text-white text-[10px] sm:text-xs font-bold px-3.5 py-1 tracking-wider uppercase rounded-sm shadow-sm mb-3">
                  {countdownBanner.badgeText}
                </span>
              )}
              <h2 className="font-playfair text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-2">{countdownBanner.title}</h2>
              {countdownBanner.subtitle && (
                <p className="text-white/70 text-xs sm:text-sm lg:text-base max-w-sm mb-5">
                  {countdownBanner.subtitle}
                </p>
              )}
              {isExpired ? (
                <button
                  className="px-8 py-3 bg-neutral-800 text-neutral-500 font-semibold uppercase tracking-wider cursor-not-allowed border border-neutral-700/80 rounded"
                  disabled
                  id="deal-cta"
                >
                  Deal Expired
                </button>
              ) : (
                <Link to={countdownBanner.ctaLink || '/products'} className="btn-primary-hero inline-flex items-center gap-2" id="deal-cta">
                  {countdownBanner.ctaText || 'Grab the Deal'}
                </Link>
              )}
            </div>

            {/* Product Preview (Visible on all devices including iPad Air/Mini & Mobile) */}
            <div className="relative w-44 h-44 sm:w-56 sm:h-56 lg:w-64 lg:h-64 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-neutral-900 group">
              <img
                src={countdownBanner.image}
                alt={countdownBanner.title || 'Deal of the week'}
                className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
            </div>

            {/* Countdown */}
            <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
              <p className="text-brand-gold text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2">
                <Clock size={14} className="animate-pulse text-brand-gold" /> Offer Ends In
              </p>
              <div className="flex items-center gap-2 sm:gap-3 justify-center">
                <CountUnit value={countdown.d} label="Days" />
                <span className="text-brand-gold text-xl sm:text-2xl font-bold mb-4">:</span>
                <CountUnit value={countdown.h} label="Hours" />
                <span className="text-brand-gold text-xl sm:text-2xl font-bold mb-4">:</span>
                <CountUnit value={countdown.m} label="Min" />
                <span className="text-brand-gold text-xl sm:text-2xl font-bold mb-4">:</span>
                <CountUnit value={countdown.s} label="Sec" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 4: Bestsellers & New Arrivals Carousel ──────────────── */}
      <section className="py-10 bg-white" aria-label="Bestsellers and New Arrivals">
        <div className="max-w-site mx-auto px-6 md:px-8">
          <ScrollReveal>
            <div className="text-center mb-12">
              <p className="text-brand-gold text-xs font-bold tracking-[0.2em] uppercase mb-3">Fresh In</p>
              <h2 className="font-playfair text-lg sm:text-2xl md:text-h2 font-bold text-brand-text flex items-center justify-center gap-2 sm:gap-4 uppercase tracking-[0.05em] select-none border-b border-neutral-100 pb-6 max-w-xl mx-auto whitespace-nowrap flex-nowrap">
                <button
                  type="button"
                  onClick={() => setMainTab('bestsellers')}
                  className={`transition-colors duration-200 focus-visible:outline-brand-gold ${
                    mainTab === 'bestsellers' ? 'text-neutral-950 font-bold' : 'text-neutral-300 hover:text-neutral-400'
                  }`}
                >
                  Best Sellers
                </button>
                <span className="text-neutral-300 font-light font-sans">|</span>
                <button
                  type="button"
                  onClick={() => setMainTab('new-arrivals')}
                  className={`transition-colors duration-200 focus-visible:outline-brand-gold ${
                    mainTab === 'new-arrivals' ? 'text-neutral-950 font-bold' : 'text-neutral-300 hover:text-neutral-400'
                  }`}
                >
                  New Arrivals
                </button>
              </h2>
            </div>
          </ScrollReveal>

          {/* Product grid / Carousel */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white shadow-sm skeleton-card">
                  <div className="skeleton aspect-[3/4]" />
                  <div className="p-4 space-y-2">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-4 w-1/2" />
                    <div className="skeleton h-5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="relative group/carousel px-4">
              {/* Left Arrow Button */}
              {showCarouselLeftArrow && (
                <button
                  type="button"
                  onClick={() => scrollCarousel(-1)}
                  className="absolute -left-2 sm:left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 flex items-center justify-center active:scale-95 transition-all shadow-md hover:text-brand-gold cursor-pointer"
                  aria-label="Previous products"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {/* Scroll Track */}
              <div
                ref={carouselScrollRef}
                className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide py-4 px-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {productsToRender.map((product, i) => (
                  <div
                    key={product.id || i}
                    className="w-[calc(50%-8px)] md:w-[calc(33.333%-16px)] lg:w-[calc(20%-15px)] flex-shrink-0"
                  >
                    <ProductCard product={product} index={i} />
                  </div>
                ))}
              </div>

              {/* Right Arrow Button */}
              {showCarouselRightArrow && (
                <button
                  type="button"
                  onClick={() => scrollCarousel(1)}
                  className="absolute -right-2 sm:right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 flex items-center justify-center active:scale-95 transition-all shadow-md hover:text-brand-gold cursor-pointer"
                  aria-label="Next products"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          )}

          {/* Centered VIEW ALL button at the bottom */}
          <div className="flex justify-center mt-5">
            <Link
              to={mainTab === 'bestsellers' ? '/products?bestSeller=true' : '/products?newArrival=true'}
              className="px-10 py-3 border border-neutral-800 text-neutral-800 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-all font-inter text-xs font-semibold uppercase tracking-widest"
              id="carousel-view-all-btn"
            >
              View All
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: Curated Collection Editorial Banner (PROMO Carousel) ── */}
      {promoBanners.length > 0 && (
        <section className="py-8 bg-brand-light" aria-label="Curated collection">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
            {promoBanners.length === 1 ? (
              <div className="grid md:grid-cols-2 gap-0 shadow-xl rounded-2xl overflow-hidden md:h-[340px] bg-brand-text">
                <div className="relative h-64 md:h-full bg-neutral-950 overflow-hidden">
                  <img
                    src={promoBanners[0].image}
                    alt={promoBanners[0].title || "Promo Banner"}
                    className="w-full h-full object-cover object-center"
                    loading="lazy"
                  />
                </div>
                <ScrollReveal className="bg-brand-text flex items-center p-6 md:p-10">
                  <div>
                    {promoBanners[0].badgeText && (
                      <p className="text-brand-gold text-xs tracking-[0.2em] uppercase mb-2 font-semibold">
                        {promoBanners[0].badgeText}
                      </p>
                    )}
                    {promoBanners[0].title && (
                      <h2 className="font-playfair text-2xl md:text-3xl font-bold text-white leading-snug mb-3">
                        {promoBanners[0].title}
                      </h2>
                    )}
                    {promoBanners[0].subtitle && (
                      <p className="text-white/75 text-xs md:text-sm leading-relaxed mb-5 line-clamp-2 max-w-md">
                        {promoBanners[0].subtitle}
                      </p>
                    )}
                    <div className="flex flex-col items-start gap-2.5">
                      <Link to={promoBanners[0].ctaLink || "/products"} className="btn-primary py-2 px-5 text-xs" id="bridal-cta">
                        {promoBanners[0].ctaText || "Explore Collection"}
                      </Link>
                      <p className="text-white/40 text-[11px] mt-1">Personal styling consultation — <Link to="/account/personal-shopper" className="underline hover:text-brand-gold transition-colors">Book Now</Link></p>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            ) : (
              <div className="relative shadow-xl rounded-2xl overflow-hidden bg-brand-text group/promo md:h-[340px]">
                <div className="relative overflow-hidden h-full">
                  <div
                    className="flex transition-transform duration-500 ease-out h-full"
                    style={{ transform: `translateX(-${currentPromoSlide * 100}%)` }}
                  >
                    {promoBanners.map((promo, idx) => (
                      <div key={promo.id || idx} className="w-full flex-shrink-0 grid md:grid-cols-2 gap-0 h-full">
                        <div className="relative h-64 md:h-full bg-neutral-950 overflow-hidden">
                          <img
                            src={promo.image}
                            alt={promo.title || "Promo Banner"}
                            className="w-full h-full object-cover object-center"
                            loading="lazy"
                          />
                        </div>
                        <div className="bg-brand-text flex items-center p-6 md:p-10 h-full">
                          <div>
                            {promo.badgeText && (
                              <p className="text-brand-gold text-xs tracking-[0.2em] uppercase mb-2 font-semibold">
                                {promo.badgeText}
                              </p>
                            )}
                            {promo.title && (
                              <h2 className="font-playfair text-2xl md:text-3xl font-bold text-white leading-snug mb-3">
                                {promo.title}
                              </h2>
                            )}
                            {promo.subtitle && (
                              <p className="text-white/75 text-xs md:text-sm leading-relaxed mb-5 line-clamp-2 max-w-md">
                                {promo.subtitle}
                              </p>
                            )}
                            <div className="flex flex-col items-start gap-2.5">
                              <Link to={promo.ctaLink || "/products"} className="btn-primary py-2 px-5 text-xs" id={`promo-cta-${promo.id}`}>
                                {promo.ctaText || "Explore Collection"}
                              </Link>
                              <p className="text-white/40 text-[11px] mt-1">Personal styling consultation — <Link to="/account/personal-shopper" className="underline hover:text-brand-gold transition-colors">Book Now</Link></p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Left/Right Carousel Controls */}
                <button
                  type="button"
                  onClick={() => setCurrentPromoSlide(prev => prev === 0 ? promoBanners.length - 1 : prev - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-brand-gold hover:text-black transition-colors"
                  aria-label="Previous promo"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPromoSlide(prev => prev >= promoBanners.length - 1 ? 0 : prev + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-brand-gold hover:text-black transition-colors"
                  aria-label="Next promo"
                >
                  <ChevronRight size={18} />
                </button>

                {/* Indicators */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {promoBanners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPromoSlide(idx)}
                      className={`h-1.5 rounded-full transition-all ${currentPromoSlide === idx ? 'w-6 bg-brand-gold' : 'w-1.5 bg-white/40'}`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── PARALLAX SECTION A: The Art of Curated Living ── */}
      <section 
        className="relative min-h-[50vh] md:min-h-[60vh] flex items-center bg-black overflow-hidden bg-cover bg-center bg-scroll md:bg-fixed py-10"
        style={{ backgroundImage: `url('/home-luxury-lifestyle.png')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
        <div className="relative max-w-site mx-auto px-6 md:px-8 z-10 w-full">
          <ScrollReveal>
            <div className="max-w-xl space-y-4 md:space-y-6 text-left">
              <span className="text-[11px] font-bold text-brand-gold tracking-[0.25em] uppercase block">Lifestyle Philosophy</span>
              <h2 className="font-playfair text-3xl md:text-5xl font-bold text-white leading-tight">
                The Art of <br />Curated Living
              </h2>
              <p className="text-white/70 text-xs md:text-sm font-light leading-relaxed max-w-md">
                We believe that true elegance is a harmony of parts. The devices you connect with, the garments you express yourself in, and the items that shape your home—they all write the story of who you are. Our selection is curated to elevate every chapter of your modern life.
              </p>
              <div className="pt-2">
                <Link to="/products" className="inline-flex items-center gap-2 text-xs font-semibold text-brand-gold tracking-widest uppercase hover:text-white transition-colors group">
                  Explore Curation <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── SECTION 8: Dual Promo Tiles / Exclusive Collection Banner ───── */}
      {exclusiveBanners.length === 1 && (
        <section className="py-10 bg-white" aria-label="Promotional offers">
          <div className="max-w-site mx-auto px-6 md:px-8 flex justify-center">
            <ScrollReveal className="relative overflow-hidden w-full max-w-5xl aspect-[16/9] sm:aspect-[2.5/1] md:aspect-[3/1] shadow-lg group">
              <img
                src={exclusiveBanners[0].image}
                alt={exclusiveBanners[0].title || 'Exclusive Collection'}
                className="w-full h-full object-cover object-center transform-gpu"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent pointer-events-none" />
              <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-12 promo-card-overlay pointer-events-auto">
                {exclusiveBanners[0].badgeText && (
                  <span className="bg-brand-gold text-white text-[10px] md:text-sm font-bold px-2 py-1 md:px-3 self-start mb-2 md:mb-3">
                    {exclusiveBanners[0].badgeText}
                  </span>
                )}
                {exclusiveBanners[0].title && (
                  <h3 className="font-playfair text-xl md:text-4xl font-bold text-white mb-1 md:mb-2 max-w-2xl line-clamp-2">
                    {exclusiveBanners[0].title}
                  </h3>
                )}
                {exclusiveBanners[0].subtitle && (
                  <p className="text-white/70 text-xs md:text-base mb-3 md:mb-6 max-w-xl line-clamp-2">
                    {exclusiveBanners[0].subtitle}
                  </p>
                )}
                {exclusiveBanners[0].ctaText && (
                  <Link
                    to={exclusiveBanners[0].ctaLink || '/products'}
                    className="text-brand-gold font-medium text-xs md:text-base flex items-center gap-1.5 md:gap-2 hover:gap-3 transition-all focus-visible:outline-white self-start"
                    id={`promo-deal-${exclusiveBanners[0].id}`}
                  >
                    {exclusiveBanners[0].ctaText} <ArrowRight size={14} className="md:w-4 md:h-4" />
                  </Link>
                )}
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {exclusiveBanners.length >= 2 && (
        <section className="py-10 bg-white overflow-hidden" aria-label="Promotional offers">
          <div className="max-w-site mx-auto px-6 md:px-8">
            <ScrollReveal className="relative group/carousel">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-brand-gold text-xs font-medium tracking-[0.2em] uppercase mb-2">Limited Offers</p>
                  <h2 className="font-playfair text-2xl md:text-3xl font-bold text-brand-text">Exclusive Deals</h2>
                </div>
                
                {(isMobileViewport ? exclusiveBanners.length > 1 : exclusiveBanners.length > 2) && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentExclusiveSlide(prev => {
                        const maxIdx = isMobileViewport ? exclusiveBanners.length - 1 : exclusiveBanners.length - 2;
                        return prev === 0 ? maxIdx : prev - 1;
                      })}
                      className="p-2 border border-brand-text text-brand-text hover:bg-brand-text hover:text-white transition-colors active:scale-95"
                      aria-label="Previous deal"
                    >
                      <ChevronLeft size={18} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => setCurrentExclusiveSlide(prev => {
                        const maxIdx = isMobileViewport ? exclusiveBanners.length - 1 : exclusiveBanners.length - 2;
                        return prev >= maxIdx ? 0 : prev + 1;
                      })}
                      className="p-2 border border-brand-text text-brand-text hover:bg-brand-text hover:text-white transition-colors active:scale-95"
                      aria-label="Next deal"
                    >
                      <ChevronRight size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </div>

              <div className="overflow-hidden -mx-2 px-2">
                <div
                  className="flex transition-transform duration-500 ease-out gap-6"
                  style={{
                    transform: isMobileViewport
                      ? `translateX(calc(-${currentExclusiveSlide} * (100% + 24px)))`
                      : `translateX(calc(-${currentExclusiveSlide} * (50% + 12px)))`
                  }}
                >
                  {exclusiveBanners.map((banner) => (
                    <div
                      key={banner.id}
                      className="w-full md:w-[calc(50%-12px)] flex-shrink-0 relative overflow-hidden aspect-[16/9] group"
                    >
                      <img
                        src={banner.image}
                        alt={banner.title || 'Exclusive Collection'}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 transform-gpu"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                      <div className="absolute inset-0 flex flex-col justify-end p-4 pb-6 md:p-8 md:pb-10 promo-card-overlay">
                        {banner.badgeText && (
                          <span className="bg-brand-gold text-white text-[10px] md:text-sm font-bold px-2 py-1 md:px-3 self-start mb-2 md:mb-3">
                            {banner.badgeText}
                          </span>
                        )}
                        {banner.title && (
                          <h3 className="font-playfair text-xl md:text-3xl font-bold text-white mb-1 md:mb-2 line-clamp-2">
                            {banner.title}
                          </h3>
                        )}
                        {banner.subtitle && (
                          <p className="text-white/70 text-xs md:text-sm mb-2 md:mb-4 line-clamp-2">
                            {banner.subtitle}
                          </p>
                        )}
                        <Link
                          to={banner.ctaLink}
                          className="group/btn inline-flex items-center gap-1.5 md:gap-2 px-4 py-2 md:px-5 md:py-2.5 border border-brand-gold/60 hover:border-brand-gold bg-black/40 hover:bg-brand-gold text-brand-gold hover:text-neutral-950 text-[10px] md:text-xs font-semibold uppercase tracking-widest transition-all duration-300 rounded-none self-start mt-1"
                          id={`promo-deal-${banner.id}`}
                        >
                          <span>{banner.ctaText || 'Shop Now'}</span>
                          <ArrowRight size={12} className="md:w-3.5 md:h-3.5 transform transition-transform duration-300 group-hover/btn:translate-x-1" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {(isMobileViewport ? exclusiveBanners.length > 1 : exclusiveBanners.length > 2) && (
                <div className="flex justify-center gap-1.5 mt-8">
                  {exclusiveBanners.slice(0, isMobileViewport ? exclusiveBanners.length : exclusiveBanners.length - 1).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentExclusiveSlide(idx)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        currentExclusiveSlide === idx ? 'bg-brand-gold w-4' : 'bg-brand-light w-2 hover:bg-brand-text'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ── SECTION 9: Influencer Showcase ──────────────────────────────── */}
      {/* {dbInfluencers.length > 0 && (
        <section className="py-10 bg-brand-bg border-t border-brand-light" aria-label="Style influencers">
          <div className="max-w-site mx-auto px-6 md:px-8">
            <ScrollReveal>
              <SectionHeader eyebrow="As Seen On" title="Style Diaries" subtitle="Drag or scroll to explore our favorite curators wearing Billu Bazaar" />
            </ScrollReveal>

            {isMobileViewport ? (
              <div className="mt-6 mb-8">
                <InfluencerCarouselMobile
                  items={dbInfluencers}
                  onChangeActiveIndex={handleActiveInfluencerChange}
                />
              </div>
            ) : (
              dbInfluencers[activeInfluencerIndex] && (
                <div className="max-w-6xl mx-auto mt-6 mb-8 bg-white border border-brand-light/60 rounded-2xl shadow-sm overflow-hidden">
                  <div className="relative h-[300px] lg:h-[340px] w-full" style={{ background: 'transparent' }}>
                    <CircularGallery
                      ref={galleryRef}
                      items={influencerGalleryItems}
                      bend={2}
                      textColor="#C58837"
                      borderRadius={0.04}
                      scrollEase={0.07}
                      scrollSpeed={1.2}
                      fontUrl="https://fonts.googleapis.com/css2?family=Cinzel:wght@700&display=swap"
                      font="bold 26px Cinzel"
                      onChangeActiveIndex={handleActiveInfluencerChange}
                    />
                    <button
                      type="button"
                      onClick={() => galleryRef.current?.prev()}
                      aria-label="Previous curator"
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-brand-text active:scale-90 transition-transform"
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <button
                      type="button"
                      onClick={() => galleryRef.current?.next()}
                      aria-label="Next curator"
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center text-brand-text active:scale-90 transition-transform"
                    >
                      <ChevronRight size={22} />
                    </button>
                  </div>

                  <div className="text-center p-6 md:p-8 border-t border-brand-light/60 transition-all duration-300">
                    <span className="text-brand-gold text-xs font-bold uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full border border-amber-200/50 mb-3 inline-block font-inter">
                      Featured Curator
                    </span>
                    <h3 className="font-playfair text-2xl font-bold text-brand-text mb-1">
                      {dbInfluencers[activeInfluencerIndex].name}
                    </h3>
                    <p className="text-brand-gold text-sm font-semibold mb-3 font-inter">
                      {dbInfluencers[activeInfluencerIndex].handle}
                    </p>
                    {(dbInfluencers[activeInfluencerIndex].followers || dbInfluencers[activeInfluencerIndex].products > 0) && (
                      <p className="text-brand-grey text-xs mb-6 font-medium font-inter">
                        {dbInfluencers[activeInfluencerIndex].followers && (
                          <span>{dbInfluencers[activeInfluencerIndex].followers} followers</span>
                        )}
                        {dbInfluencers[activeInfluencerIndex].followers && dbInfluencers[activeInfluencerIndex].products > 0 && (
                          <span> · </span>
                        )}
                        {dbInfluencers[activeInfluencerIndex].products > 0 && (
                          <span>{dbInfluencers[activeInfluencerIndex].products} products curated</span>
                        )}
                      </p>
                    )}
                    <Link
                      to={`/products?referral=${dbInfluencers[activeInfluencerIndex].handle.replace('@', '')}`}
                      className="btn-primary max-w-md mx-auto w-full flex items-center justify-center gap-2 group hover:scale-[1.02] transition-transform font-inter"
                      id="shop-her-look-btn"
                    >
                      Shop {dbInfluencers[activeInfluencerIndex].name}'s Look <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      )} */}

      {/* ── PARALLAX SECTION B: Our Commitment to Conscious Luxury ── */}
      <section 
        className="relative min-h-[50vh] md:min-h-[60vh] flex items-center justify-end bg-black overflow-hidden bg-cover bg-center bg-scroll md:bg-fixed py-10"
        style={{ backgroundImage: `url('/home-luxury-conscious.png')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/40 to-transparent" />
        <div className="relative max-w-site mx-auto px-6 md:px-8 z-10 w-full">
          <ScrollReveal>
            <div className="max-w-xl space-y-4 md:space-y-6 text-right ml-auto">
              <span className="text-[11px] font-bold text-brand-gold tracking-[0.25em] uppercase block">Our Guarantee</span>
              <h2 className="font-playfair text-3xl md:text-5xl font-bold text-white leading-tight">
                Conscious Sourcing <br />& Luxury
              </h2>
              <p className="text-white/70 text-xs md:text-sm font-light leading-relaxed max-w-md ml-auto">
                Luxury is meaningless without responsibility. Every item in our catalog—from bio-sourced skincare to certified components and organic apparel—undergoes rigorous verification. We deal exclusively with makers who honor fair work standards, sustainable packaging, and uncompromising excellence.
              </p>
              <div className="pt-2">
                <Link to="/about" className="inline-flex items-center gap-2 text-xs font-semibold text-brand-gold tracking-widest uppercase hover:text-white transition-colors group">
                  Our Oath <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── SECTION 11: Best Sellers + Testimonials ─────────────────────── */}
      <section className="py-10 bg-brand-light" aria-label="Best sellers and testimonials">
        <div className="max-w-site mx-auto px-6 md:px-8">
          <ScrollReveal>
            <SectionHeader eyebrow="Customer Favourites" title="Most Loved Pieces" />
          </ScrollReveal>

          {/* Featured items — top 5 */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6 mb-5">
            {(featured.length
              ? featured.slice(0, 5)
              : products.filter(p => p.isFeatured).slice(0, 5).length
                ? products.filter(p => p.isFeatured).slice(0, 5)
                : products.slice(0, 5)
            ).map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 12: Trust Badges Row ────────────────────────────────── */}
      <section className="py-10 bg-[#FDFDFB] border-t border-neutral-100" aria-label="Trust and security badges">
        <div className="max-w-site mx-auto px-6 md:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Card 1: Shipping */}
            <ScrollReveal className="h-full">
              <div className="bg-white border border-neutral-200/60 rounded-xl p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 h-full">
                <div className="w-14 h-14 rounded-full bg-neutral-950 flex items-center justify-center text-brand-gold flex-shrink-0">
                  <Truck size={22} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm tracking-wide">Complimentary Shipping</h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">Insured delivery</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Card 2: Satisfaction */}
            <ScrollReveal delay={0.08} className="h-full">
              <div className="bg-white border border-neutral-200/60 rounded-xl p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 h-full">
                <div className="w-14 h-14 rounded-full bg-neutral-950 flex items-center justify-center text-brand-gold flex-shrink-0">
                  <Award size={22} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm tracking-wide">Artisan Authenticity</h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">Quality guarantee on every piece</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Card 3: Payments */}
            <ScrollReveal delay={0.16} className="h-full">
              <div className="bg-white border border-neutral-200/60 rounded-xl p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 h-full">
                <div className="w-14 h-14 rounded-full bg-neutral-950 flex items-center justify-center text-brand-gold flex-shrink-0">
                  <Lock size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm tracking-wide">Secured Transactions</h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">Safe and encrypted checkout</p>
                </div>
              </div>
            </ScrollReveal>

            {/* Card 4: Support */}
            <ScrollReveal delay={0.24} className="h-full">
              <div className="bg-white border border-neutral-200/60 rounded-xl p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 h-full">
                <div className="w-14 h-14 rounded-full bg-neutral-950 flex items-center justify-center text-brand-gold flex-shrink-0">
                  <Headphones size={22} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm tracking-wide">Dedicated Concierge</h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">Expert assistance at your service</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default HomePage;