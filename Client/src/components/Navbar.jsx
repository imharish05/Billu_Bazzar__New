import { useState, useEffect, useRef, useCallback } from 'react';
import anime from 'animejs';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ShoppingBag, Heart, Search, Menu, X, User, ArrowRight, TrendingUp, ChevronLeft, ChevronRight, Phone, Mail, Twitter, Instagram, Facebook, Youtube } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from './Logo';
import { toggleCart } from '../redux/slices/cartSlice';
import { toggleMobileMenu, closeMobileMenu } from '../redux/slices/uiSlice';
import { logout } from '../redux/slices/authSlice';
import { setCurrency } from '../redux/slices/currencySlice';
import {
  fetchAutocomplete,
  fetchTrending,
  trackSearch,
  setQuery,
  setDropdownOpen,
  clearSearch
} from '../redux/slices/searchSlice';
import { formatPrice } from '../utils/currency';
import api from '../services/api';

/* Glass surface 1: Navbar — rgba(250,250,248,0.72) + blur(12px) + 1px border */
const DEFAULT_NAV_LINKS = [
  { to: '/category/new-arrivals', label: 'New Arrivals', slug: 'new-arrivals' },
  { to: '/category/party-wear', label: 'Party Wear', slug: 'party-wear' },
  { to: '/category/jewelry', label: 'Jewelry', slug: 'jewelry' },
  { to: '/category/perfumes', label: 'Perfumes', slug: 'perfumes' },
  { to: '/category/accessories', label: 'Accessories', slug: 'accessories' },
  { to: '/category/sale', label: 'Sale', highlight: true, slug: 'sale' },
];

const TRENDING_KEYWORDS = ['bridal lehenga', 'party wear', 'gold jewelry', 'designer saree', 'perfume gift set'];

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const { items } = useSelector(s => s.cart);
  const { items: wishlistItems } = useSelector(s => s.wishlist);
  const { isAuthenticated, customer } = useSelector(s => s.auth);
  const { mobileMenuOpen } = useSelector(s => s.ui);
  const { code: currencyCode, rate: currencyRate } = useSelector(s => s.currency);
  const {
    query: searchQueryState,
    suggestions: autocompleteSuggestions,
    products: autocompleteProducts,
    trending: trendingSearches,
    loading: searchLoadingState,
    isDropdownOpen: searchDropdownOpenState
  } = useSelector(s => s.search);

  const [scrolled, setScrolled] = useState(false);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const [flyoutDirection, setFlyoutDirection] = useState('right');
  const [expandedLevel1, setExpandedLevel1] = useState(null);
  const [expandedLevel2, setExpandedLevel2] = useState(null);
  const [announcementHidden, setAnnouncementHidden] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [localQuery, setLocalQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef(null);
  const debounceTimer = useRef(null);
  const catScrollRef = useRef(null);
  const [catCanScrollLeft, setCatCanScrollLeft] = useState(false);
  const [catCanScrollRight, setCatCanScrollRight] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const [sliderMessages, setSliderMessages] = useState([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const fetchSliderMessages = async () => {
      try {
        const res = await api.get('/marketing-messages');
        if (res.data?.success && res.data.messages?.length > 0) {
          setSliderMessages(res.data.messages);
        }
      } catch (err) {
        console.error('Error fetching slider messages:', err);
      }
    };
    fetchSliderMessages();
  }, []);

  useEffect(() => {
    if (sliderMessages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % sliderMessages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [sliderMessages]);

  const renderMessageContent = (text) => {
    const parts = text.split(/(\b[A-Z]{3,8}\d{2,4}\b)/g);
    return parts.map((part, i) => {
      if (/^[A-Z]{3,8}\d{2,4}$/.test(part)) {
        return <span key={i} className="text-brand-gold font-bold tracking-wider">{part}</span>;
      }
      return part;
    });
  };

  // Full 3-level category tree for mega dropdown
  const [categoryTree, setCategoryTree] = useState([]);
  const [dynamicNavLinks, setDynamicNavLinks] = useState([]);

  useEffect(() => {
    const fetchHeaderCategories = async () => {
      try {
        const res = await api.get('/categories/tree');
        if (res.data?.success && res.data.categories?.length > 0) {
          const tree = res.data.categories.filter(c => c.isActive);
          setCategoryTree(tree);
          const headerLinks = tree
            .filter(c => c.showHeader)
            .map(c => ({
              to: `/category/${c.slug}`,
              label: c.name,
              slug: c.slug,
              highlight: c.slug === 'sale',
              children: (c.children || []).filter(s => s.isActive),
            }));
          if (headerLinks.length > 0) setDynamicNavLinks(headerLinks);
        }
      } catch (err) {
        console.error('Error fetching header categories:', err);
      }
    };
    fetchHeaderCategories();

    const handleFocus = () => fetchHeaderCategories();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [location.pathname]);

  const activeNavLinks = dynamicNavLinks.length > 0 ? dynamicNavLinks : DEFAULT_NAV_LINKS;

  // Mega dropdown state
  const [openDropdownSlug, setOpenDropdownSlug] = useState(null);
  const [activeSubSlug, setActiveSubSlug] = useState(null);
  const dropdownRef = useRef(null);
  const dropdownTimerRef = useRef(null);

  const openDropdown = useCallback((slug, triggerEl) => {
    clearTimeout(dropdownTimerRef.current);
    setOpenDropdownSlug(slug);
    setActiveSubSlug(null);

    if (triggerEl) {
      const parentEl = triggerEl.closest('.nav-row-2');
      if (parentEl) {
        const triggerRect = triggerEl.getBoundingClientRect();
        const parentRect = parentEl.getBoundingClientRect();
        const leftPos = triggerRect.left - parentRect.left;
        setDropdownLeft(leftPos);

        const screenWidth = window.innerWidth;
        if (triggerRect.left + 200 + 180 > screenWidth) {
          setFlyoutDirection('left');
        } else {
          setFlyoutDirection('right');
        }
      }
    }
  }, []);

  const closeDropdown = useCallback(() => {
    dropdownTimerRef.current = setTimeout(() => {
      setOpenDropdownSlug(null);
      setActiveSubSlug(null);
    }, 150);
  }, []);

  const keepDropdown = useCallback(() => {
    clearTimeout(dropdownTimerRef.current);
  }, []);

  // Animate dropdown panel in using anime.js
  useEffect(() => {
    if (openDropdownSlug && dropdownRef.current) {
      anime({
        targets: dropdownRef.current,
        opacity: [0, 1],
        translateY: [-8, 0],
        duration: 220,
        easing: 'easeOutCubic',
      });
    }
  }, [openDropdownSlug]);

  useEffect(() => {
    let prevScrollY = window.scrollY;
    let scrollAccumulator = 0;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const delta = currentScrollY - prevScrollY;

          // If scrolled, close search dropdown and blur input to hide mobile keyboard
          if (Math.abs(delta) > 5) {
            dispatch(setDropdownOpen(false));
            if (
              document.activeElement &&
              (document.activeElement.id === 'nav-search-input-desktop' ||
                document.activeElement.id === 'nav-search-input-mobile')
            ) {
              document.activeElement.blur();
            }
          }

          // Accumulate scroll distance. Reset accumulator if direction changes.
          if ((delta > 0 && scrollAccumulator < 0) || (delta < 0 && scrollAccumulator > 0)) {
            scrollAccumulator = 0;
          }
          scrollAccumulator += delta;

          // Hide header if user scrolls down past a threshold (e.g. 30px) and page is scrolled past 100px.
          // Show header if user scrolls up past a threshold (e.g. 30px) or is near the top of the page.
          const THRESHOLD = 30;
          if (scrollAccumulator > THRESHOLD && currentScrollY > 100) {
            setHeaderVisible(prev => prev !== false ? false : prev);
          } else if (scrollAccumulator < -THRESHOLD || currentScrollY <= 100) {
            setHeaderVisible(prev => prev !== true ? true : prev);
          }

          prevScrollY = currentScrollY;
          setScrolled(prev => {
            const next = currentScrollY > 20;
            return prev !== next ? next : prev;
          });
          setAnnouncementHidden(prev => {
            const next = currentScrollY > 36;
            return prev !== next ? next : prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [dispatch]);

  // Keep --header-h / --header-h-mobile in sync with the announcement bar's
  // collapsed state. HeroBanner (and anything else that sizes itself against
  // the header) reads these vars instead of a hardcoded height, so it can
  // never drift out of sync with the header's real rendered height again.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--header-h', announcementHidden ? '108px' : '144px');
    root.style.setProperty('--header-h-mobile', announcementHidden ? '120px' : '156px');
  }, [announcementHidden]);

  // Category scroll arrow visibility
  const updateCatArrows = useCallback(() => {
    const el = catScrollRef.current;
    if (!el) return;
    const overflowing = el.scrollWidth > el.clientWidth;
    setIsOverflowing(overflowing);
    setCatCanScrollLeft(el.scrollLeft > 4);
    setCatCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = catScrollRef.current;
    if (!el) return;
    updateCatArrows();
    el.addEventListener('scroll', updateCatArrows, { passive: true });
    window.addEventListener('resize', updateCatArrows);
    return () => {
      el.removeEventListener('scroll', updateCatArrows);
      window.removeEventListener('resize', updateCatArrows);
    };
  }, [updateCatArrows]);

  useEffect(() => { updateCatArrows(); }, [activeNavLinks, updateCatArrows]);

  const scrollCats = (dir) => {
    const el = catScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 200, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        dispatch(setDropdownOpen(false));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dispatch]);

  const fetchSuggestions = useCallback((q) => {
    if (!q || q.trim().length < 1) {
      dispatch(clearSearch());
      return;
    }
    dispatch(fetchAutocomplete(q.trim()));
  }, [dispatch]);

  const handleSearchInput = (e) => {
    const val = e.target.value;
    setLocalQuery(val);
    dispatch(setQuery(val));
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  const handleSearchFocus = () => {
    dispatch(setDropdownOpen(true));
    if (localQuery.trim().length === 0) {
      dispatch(fetchTrending());
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const q = localQuery.trim();
    if (!q) return;
    dispatch(setDropdownOpen(false));
    dispatch(trackSearch(q));
    navigate(`/products?search=${encodeURIComponent(q)}`);
  };

  const handleKeywordClick = (kw) => {
    setLocalQuery(kw);
    dispatch(setQuery(kw));
    dispatch(setDropdownOpen(false));
    dispatch(trackSearch(kw));
    navigate(`/products?search=${encodeURIComponent(kw)}`);
  };

  const handleSuggestionClick = (product) => {
    dispatch(setDropdownOpen(false));
    setLocalQuery('');
    dispatch(clearSearch());
    navigate(`/products/${product.slug}`);
  };

  const handleKeyDown = (e) => {
    if (!searchDropdownOpenState) return;

    const list = localQuery.trim().length === 0 ? trendingSearches : autocompleteSuggestions;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1 < list.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 >= 0 ? prev - 1 : list.length - 1));
    } else if (e.key === 'Escape') {
      dispatch(setDropdownOpen(false));
      setActiveIndex(-1);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < list.length) {
        e.preventDefault();
        handleKeywordClick(list[activeIndex]);
        setActiveIndex(-1);
      }
    }
  };

  const highlightMatch = (text, highlight) => {
    if (!highlight) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <strong key={i} className="font-extrabold text-white">{part}</strong>
          ) : (
            <span key={i} className="text-neutral-300">{part}</span>
          )
        )}
      </span>
    );
  };

  const renderDropdown = () => {
    const list = localQuery.trim().length === 0 ? (trendingSearches.length ? trendingSearches : TRENDING_KEYWORDS) : autocompleteSuggestions;
    return (
      <AnimatePresence>
        {searchDropdownOpenState && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 bg-neutral-950 border border-neutral-800 shadow-2xl mt-1 z-50 max-h-96 overflow-y-auto rounded-lg"
            role="listbox"
            aria-label="Search suggestions"
          >
            {/* Trending searches */}
            {localQuery.trim().length === 0 && (
              <div className="p-4">
                <p className="text-[10px] font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-brand-gold" /> Trending Searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {list.map((kw, i) => (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => handleKeywordClick(kw)}
                      className={`text-xs px-3 py-1.5 transition-all border rounded-full ${
                        activeIndex === i
                          ? 'bg-brand-gold border-brand-gold text-white font-semibold shadow-sm'
                          : 'bg-neutral-900 text-neutral-300 hover:text-brand-gold border-neutral-800 hover:border-brand-gold'
                      }`}
                      id={`trending-kw-${i}`}
                    >
                      {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Keyword Suggestions */}
            {localQuery.trim().length > 0 && autocompleteSuggestions.length > 0 && (
              <div className="border-b border-neutral-850 py-2">
                <p className="px-4 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider">Suggested Keywords</p>
                {autocompleteSuggestions.map((kw, i) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => handleKeywordClick(kw)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                      activeIndex === i
                        ? 'bg-neutral-800 text-brand-gold font-medium'
                        : 'hover:bg-neutral-900 text-white'
                    }`}
                    id={`suggest-kw-${i}`}
                  >
                    <span>{highlightMatch(kw, localQuery)}</span>
                    <ArrowRight size={12} className="text-white/40" />
                  </button>
                ))}
              </div>
            )}

            {/* Product Previews */}
            {localQuery.trim().length > 0 && autocompleteProducts.length > 0 && (
              <div className="py-2">
                <p className="px-4 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider">Product Matches</p>
                {autocompleteProducts.map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSuggestionClick(product)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-900 transition-colors text-left"
                  >
                    <div className="w-10 h-12 bg-neutral-900 flex-shrink-0 overflow-hidden border border-neutral-800 rounded">
                      {product.image && (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{product.name}</p>
                      <p className="text-xs text-brand-gold font-semibold mt-0.5">
                        {formatPrice(product.price, currencyCode, currencyRate)}
                        {product.comparePrice > product.price && (
                          <span className="text-neutral-400 text-[10px] line-through ml-2 font-normal">
                            {formatPrice(product.comparePrice, currencyCode, currencyRate)}
                          </span>
                        )}
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-white/60 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* No matches */}
            {localQuery.trim().length > 0 && autocompleteSuggestions.length === 0 && autocompleteProducts.length === 0 && !searchLoadingState && (
              <div className="p-6 text-center text-neutral-300 text-sm">
                No matches found for "{localQuery}"
              </div>
            )}

            {/* Submit full search */}
            {localQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={() => handleSearchSubmit()}
                className="w-full text-center py-3 text-xs font-semibold text-brand-gold border-t border-neutral-800 hover:bg-neutral-900 transition-colors uppercase tracking-wider"
              >
                View all results for "{localQuery.trim()}"
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const cartCount = items.length;
  const wishlistCount = wishlistItems?.length || 0;
  const isEmpty = localQuery.trim().length === 0;

  return (
    <>
      <header
        className={`glass-nav fixed top-0 left-0 right-0 z-50 ${headerVisible ? 'translate-y-0' : '-translate-y-full'} ${scrolled ? 'shadow-md' : ''}`}
        role="banner"
      >
        {/* Announcement bar — slides up and hides on scroll, only nav stays */}
        <div
          className={`bg-white text-neutral-950 font-inter tracking-widest uppercase text-[10px] sm:text-xs overflow-hidden relative h-9 flex items-center justify-center border-b border-neutral-200 transition-all duration-300 ease-in-out ${announcementHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          style={{ marginTop: announcementHidden ? '-36px' : '0px' }}
        >
          {/* Mobile/Tablet marquee */}
          <div className="lg:hidden w-full overflow-hidden flex items-center relative h-full">
            <style>{`
              @keyframes announcementMarquee {
                0% { transform: translate3d(0, 0, 0); }
                100% { transform: translate3d(-50%, 0, 0); }
              }
              .announcement-marquee-track {
                display: flex;
                width: max-content;
                animation: announcementMarquee 150s linear infinite;
                will-change: transform;
              }
              @media (max-width: 640px) {
                .announcement-marquee-track {
                  animation-duration: 180s;
                }
              }
              @media (min-width: 641px) and (max-width: 1023px) {
                .announcement-marquee-track {
                  animation-duration: 140s;
                }
              }
              .announcement-marquee-track:hover,
              .announcement-marquee-track:active,
              .announcement-marquee-track:focus {
                animation-play-state: paused;
              }
              .announcement-marquee-item {
                display: flex;
                align-items: center;
                white-space: nowrap;
                flex-shrink: 0;
              }
            `}</style>
            <div className="announcement-marquee-track">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="announcement-marquee-item">
                  {sliderMessages.length > 0 ? (
                    sliderMessages.map((m, idx) => (
                      <span key={m.id || idx} className="inline-flex items-center">
                        {renderMessageContent(m.message)}
                        <span className="mx-6 text-brand-gold font-bold">·</span>
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center">
                      Free shipping on orders above ₹1499 <span className="mx-6 text-brand-gold font-bold">·</span> Use code <span className="text-brand-gold font-bold">WELCOME20</span> for 20% off <span className="mx-6 text-brand-gold font-bold">·</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Desktop sliding messages */}
          <div className="hidden lg:block w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentMessageIndex + (sliderMessages[currentMessageIndex]?.id || 'default')}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="px-4 text-center w-full truncate"
              >
                {sliderMessages.length > 0 ? (
                  renderMessageContent(sliderMessages[currentMessageIndex].message)
                ) : (
                  <>
                    Free shipping on orders above ₹1499 · Use code <span className="text-brand-gold font-bold">WELCOME20</span> for 20% off
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <nav className="max-w-site mx-auto" aria-label="Main navigation">
          {/* ── Desktop layout ── */}
          <div className="hidden lg:flex items-stretch">

            {/* Left side: cinematic vertical logo block spanning full header height */}
            <Link
              to="/"
              aria-label="Billu Bazaar — Home"
              className="flex-shrink-0 flex items-center justify-center px-6 border-r border-neutral-800/80 bg-black self-stretch"
              style={{ width: '140px' }}
            >
              <Logo fullHeight />
            </Link>

            {/* Right side: Row 1 (68px) and Row 2 (40px) stacked */}
            <div className="flex-1 flex flex-col min-w-0">

              {/* Row 1: Search + Actions (height 68px) */}
              <div className="flex items-center border-b border-neutral-800/50 w-full" style={{ height: '68px' }}>

              {/* Search — centered in remaining space */}
              <div className="flex-1 flex justify-center px-6">
                <div ref={searchRef} className="relative w-full max-w-lg">
                  <form onSubmit={handleSearchSubmit} role="search" className="relative">
                    <input
                      type="search"
                      value={localQuery}
                      onChange={handleSearchInput}
                      onFocus={handleSearchFocus}
                      onKeyDown={handleKeyDown}
                      placeholder="Search luxury..."
                      className="w-full border border-neutral-800 bg-neutral-900 text-white placeholder-neutral-500 px-4 py-2 pr-24 text-sm focus:outline-none focus:border-brand-gold transition-colors font-inter"
                      aria-label="Search products"
                      id="nav-search-input-desktop"
                      autoComplete="off"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {searchLoadingState && (
                        <div className="w-4 h-4 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
                      )}
                      <button
                        type="submit"
                        disabled={isEmpty}
                        className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                          isEmpty
                            ? 'bg-brand-gold/40 text-white/40 cursor-not-allowed'
                            : 'bg-brand-gold text-white hover:bg-white hover:text-black'
                        }`}
                        id="nav-search-btn-desktop"
                      >
                        Search
                      </button>
                    </div>
                  </form>
                  {renderDropdown()}
                </div>
              </div>

              {/* Actions — right */}
              <div className="flex items-center gap-2 flex-shrink-0 pr-4">
                <div className="mr-1 flex items-center">
                  <div
                    className="relative inline-flex items-center bg-neutral-900/90 hover:bg-neutral-800/80 border border-neutral-700/60 rounded-full p-[3px] h-[32px] w-[88px] cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] transition-colors select-none"
                    onClick={() => dispatch(setCurrency(currencyCode === 'INR' ? 'AED' : 'INR'))}
                    role="group"
                    aria-label="Currency Selector"
                    id="nav-currency-toggle-desktop"
                  >
                    {/* Animated Sliding Luxury Pill */}
                    <motion.div
                      className="absolute top-[3px] left-[3px] w-[40px] h-[24px] rounded-full bg-gradient-to-r from-amber-600 via-brand-gold to-amber-600 shadow-[0_2px_6px_rgba(217,119,6,0.35)] border border-amber-400/30 pointer-events-none"
                      animate={{ x: currencyCode === 'INR' ? 0 : 40 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    />
                    
                    {/* INR Option */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); dispatch(setCurrency('INR')); }}
                      className={`relative z-10 w-[40px] h-[24px] flex items-center justify-center text-[10px] font-bold tracking-widest uppercase transition-colors rounded-full focus:outline-none ${
                        currencyCode === 'INR' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                      aria-pressed={currencyCode === 'INR'}
                    >
                      INR
                    </button>

                    {/* AED Option */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); dispatch(setCurrency('AED')); }}
                      className={`relative z-10 w-[40px] h-[24px] flex items-center justify-center text-[10px] font-bold tracking-widest uppercase transition-colors rounded-full focus:outline-none ${
                        currencyCode === 'AED' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                      aria-pressed={currencyCode === 'AED'}
                    >
                      AED
                    </button>
                  </div>
                </div>
                <Link to="/account/wishlist" className="relative p-2 text-white hover:text-brand-gold transition-colors rounded-full focus-visible:outline-2 focus-visible:outline-brand-gold" aria-label={`Wishlist — ${wishlistCount} items`} id="nav-wishlist-btn">
                  <Heart size={20} strokeWidth={1.5} />
                  {wishlistCount > 0 && (
                    <motion.span key={wishlistCount} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-brand-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                    >{wishlistCount}</motion.span>
                  )}
                </Link>
                {isAuthenticated ? (
                  <div className="relative group">
                    <button className="p-2 text-white hover:text-brand-gold transition-colors rounded-full focus-visible:outline-2 focus-visible:outline-brand-gold" aria-label="Account menu" id="nav-account-btn">
                      <User size={20} strokeWidth={1.5} />
                    </button>
                    <div className="absolute right-0 top-10 w-48 bg-neutral-950 text-white shadow-xl border border-neutral-800 opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-50">
                      <div className="px-4 py-3 border-b border-neutral-800">
                        <p className="font-medium text-sm truncate">{customer?.name}</p>
                      </div>
                      <Link to="/account" className="block px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors">My Account</Link>
                      <Link to="/account/orders" className="block px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors">My Orders</Link>
                      <button onClick={() => { dispatch(logout()); navigate('/'); }} className="w-full text-left px-4 py-2 text-sm hover:bg-neutral-800 transition-colors text-red-400">Sign Out</button>
                    </div>
                  </div>
                ) : (
                  <Link to="/account" className="p-2 text-white hover:text-brand-gold transition-colors rounded-full focus-visible:outline-2 focus-visible:outline-brand-gold" aria-label="Sign in">
                    <User size={20} strokeWidth={1.5} />
                  </Link>
                )}
                {/* Cart drawer toggle commented out - redirecting directly to /cart page */}
                {/* <button onClick={() => dispatch(toggleCart())} className="relative p-2 text-white hover:text-brand-gold transition-colors rounded-full focus-visible:outline-2 focus-visible:outline-brand-gold" aria-label={`Shopping cart — ${cartCount} items`} id="nav-cart-btn"> */}
                <Link to="/cart" className="relative p-2 text-white hover:text-brand-gold transition-colors rounded-full focus-visible:outline-2 focus-visible:outline-brand-gold" aria-label={`Shopping cart — ${cartCount} items`} id="nav-cart-btn">
                  <ShoppingBag size={20} strokeWidth={1.5} />
                  {cartCount > 0 && (
                    <motion.span key={cartCount} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-brand-gold text-white text-xs font-bold rounded-full flex items-center justify-center"
                    >{cartCount}</motion.span>
                  )}
                </Link>
                {/* </button> */}
                </div>
            </div>

            <div className="nav-row-2 relative border-t border-neutral-800/20" onMouseLeave={closeDropdown}>
              {/* Category bar */}
              <div className="relative flex items-center" style={{ height: '40px' }}>
                {catCanScrollLeft && (
                  <button type="button" onClick={() => scrollCats(-1)}
                    className="absolute left-0 z-10 flex items-center justify-center h-full w-12 bg-black text-white hover:text-brand-gold transition-colors"
                    aria-label="Scroll categories left">
                    <ChevronLeft size={16} strokeWidth={2} />
                  </button>
                )}
                <ul
                  ref={catScrollRef}
                  className={`flex items-center gap-10 h-full overflow-x-auto w-full px-0 ${
                    isOverflowing ? 'justify-start' : 'justify-center'
                  }`}
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  role="list"
                >
                  {/* Left spacer element to offset items from left arrow button */}
                  <li className="w-12 h-full flex-shrink-0" aria-hidden="true" />
                  
                  {activeNavLinks.map(link => {
                    const hasChildren = link.children && link.children.length > 0;
                    const isOpen = openDropdownSlug === link.slug;
                    return (
                      <li
                        key={link.to || link.label}
                        className="flex-shrink-0 relative h-full flex items-center"
                        onMouseEnter={(e) => hasChildren ? openDropdown(link.slug, e.currentTarget) : setOpenDropdownSlug(null)}
                      >
                        <Link
                          to={link.to}
                          className={`font-inter text-[11px] font-medium tracking-widest uppercase transition-colors duration-200 hover:text-brand-gold focus-visible:outline-2 focus-visible:outline-brand-gold whitespace-nowrap pb-0.5 ${
                            isOpen ? 'text-brand-gold border-b border-brand-gold' : link.highlight ? 'text-brand-gold' : 'text-white'
                          }`}
                        >{link.label}</Link>
                      </li>
                    );
                  })}

                  {/* Right spacer element to offset items from right arrow button */}
                  <li className="w-12 h-full flex-shrink-0" aria-hidden="true" />
                </ul>
                {catCanScrollRight && (
                  <button type="button" onClick={() => scrollCats(1)}
                    className="absolute right-0 z-10 flex items-center justify-center h-full w-12 bg-black text-white hover:text-brand-gold transition-colors"
                    aria-label="Scroll categories right">
                    <ChevronRight size={16} strokeWidth={2} />
                  </button>
                )}
              </div>

              {/* Mega dropdown panel */}
              {openDropdownSlug && (() => {
                const activeLink = activeNavLinks.find(l => l.slug === openDropdownSlug);
                const subs = activeLink?.children || [];
                if (!subs.length) return null;
                const activeSub = subs.find(s => s.slug === activeSubSlug) || subs[0];
                const subSubs = (activeSub?.children || []).filter(s => s.isActive !== false);
                return (
                  <div
                    ref={dropdownRef}
                    onMouseEnter={keepDropdown}
                    onMouseLeave={closeDropdown}
                    className="absolute z-[100] bg-[#050505] shadow-[0_8px_30px_rgba(0,0,0,0.3)] py-2 px-0 border border-neutral-800"
                    style={{
                      top: '100%',
                      left: `${dropdownLeft}px`,
                      minWidth: '200px',
                      width: 'max-content',
                      opacity: 0
                    }}
                  >
                    <ul className="flex flex-col">
                      {subs.map(sub => {
                        const hasSubSubs = sub.children && sub.children.length > 0;
                        const isSubActive = activeSubSlug === sub.slug;
                        return (
                          <li
                            key={sub.id}
                            className={`relative flex items-center h-8 px-5 transition-colors hover:bg-neutral-900 ${isSubActive ? 'bg-neutral-900 text-brand-gold' : ''}`}
                            onMouseEnter={() => hasSubSubs ? setActiveSubSlug(sub.slug) : setActiveSubSlug(null)}
                          >
                            <Link
                              to={`/category/${activeLink.slug}/${sub.slug}`}
                              onClick={closeDropdown}
                              className={`flex-1 text-sm transition-all duration-200 whitespace-nowrap hover:pl-1.5 ${
                                isSubActive ? 'text-brand-gold pl-1.5 font-medium' : 'text-neutral-300 hover:text-brand-gold'
                              }`}
                            >
                              {sub.name}
                            </Link>
                            {hasSubSubs && (
                              <ChevronRight size={14} className={`ml-1 transition-colors ${isSubActive ? 'text-brand-gold' : 'text-neutral-500'}`} />
                            )}
                            
                            {/* Level 3 Dropdown (Flyout) */}
                            {hasSubSubs && isSubActive && (
                              <div
                                className="absolute top-0 z-[101] bg-[#050505] shadow-[0_8px_30px_rgba(0,0,0,0.3)] py-2 px-0 border border-neutral-800"
                                style={{
                                  minWidth: '180px',
                                  width: 'max-content',
                                  left: flyoutDirection === 'right' ? '100%' : 'auto',
                                  right: flyoutDirection === 'left' ? '100%' : 'auto'
                                }}
                              >
                                <ul className="flex flex-col">
                                  {sub.children.map(ss => (
                                    <li key={ss.id} className="flex items-center h-8 px-5 hover:bg-neutral-900 transition-colors">
                                      <Link
                                        to={`/category/${activeLink.slug}/${sub.slug}/${ss.slug}`}
                                        onClick={closeDropdown}
                                        className="flex-1 text-sm text-neutral-300 hover:text-brand-gold hover:pl-1.5 transition-all duration-200 whitespace-nowrap"
                                      >
                                        {ss.name}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}
            </div>

          </div>
        </div>

          {/* Mobile / Tablet layout */}
          <div className="lg:hidden">
            {/* Top row: logo + actions */}
            <div className="flex items-center justify-between h-16 px-4">
              <Link to="/" aria-label="Billu Bazaar — Home">
                <Logo size="sm" />
              </Link>
              <div className="flex items-center gap-1">
                <div className="mr-1 flex items-center">
                  <div
                    className="relative inline-flex items-center bg-neutral-900/90 border border-neutral-700/60 rounded-full p-[2px] h-[28px] w-[72px] cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] select-none"
                    onClick={() => dispatch(setCurrency(currencyCode === 'INR' ? 'AED' : 'INR'))}
                    role="group"
                    aria-label="Currency Selector"
                    id="nav-currency-toggle-mobile"
                  >
                    {/* Animated Sliding Luxury Pill */}
                    <motion.div
                      className="absolute top-[2px] left-[2px] w-[33px] h-[22px] rounded-full bg-gradient-to-r from-amber-600 via-brand-gold to-amber-600 shadow-[0_2px_5px_rgba(217,119,6,0.3)] border border-amber-400/30 pointer-events-none"
                      animate={{ x: currencyCode === 'INR' ? 0 : 33 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); dispatch(setCurrency('INR')); }}
                      className={`relative z-10 w-[33px] h-[22px] flex items-center justify-center text-[9px] font-bold tracking-widest uppercase transition-colors rounded-full focus:outline-none ${
                        currencyCode === 'INR' ? 'text-white' : 'text-neutral-400'
                      }`}
                      aria-pressed={currencyCode === 'INR'}
                    >
                      INR
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); dispatch(setCurrency('AED')); }}
                      className={`relative z-10 w-[33px] h-[22px] flex items-center justify-center text-[9px] font-bold tracking-widest uppercase transition-colors rounded-full focus:outline-none ${
                        currencyCode === 'AED' ? 'text-white' : 'text-neutral-400'
                      }`}
                      aria-pressed={currencyCode === 'AED'}
                    >
                      AED
                    </button>
                  </div>
                </div>
                <Link to="/account" className="p-2 text-white hover:text-brand-gold transition-colors" aria-label="Account">
                  <User size={18} strokeWidth={1.5} />
                </Link>
                <Link to="/account/wishlist" className="relative p-2 text-white hover:text-brand-gold transition-colors" aria-label={`Wishlist — ${wishlistCount} items`}>
                  <Heart size={18} strokeWidth={1.5} />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-gold text-white text-[9px] font-bold rounded-full flex items-center justify-center">{wishlistCount}</span>
                  )}
                </Link>
                {/* Cart drawer toggle commented out - redirecting directly to /cart page */}
                {/* <button onClick={() => dispatch(toggleCart())} className="relative p-2 text-white hover:text-brand-gold transition-colors" aria-label={`Shopping cart — ${cartCount} items`}> */}
                <Link to="/cart" className="relative p-2 text-white hover:text-brand-gold transition-colors" aria-label={`Shopping cart — ${cartCount} items`}>
                  <ShoppingBag size={18} strokeWidth={1.5} />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>
                  )}
                </Link>
                {/* </button> */}
                <button onClick={() => dispatch(toggleMobileMenu())} className="p-2 text-white hover:text-brand-gold transition-colors" aria-label="Toggle mobile menu" aria-expanded={mobileMenuOpen} id="nav-mobile-menu-btn">
                  {mobileMenuOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
                </button>
              </div>
            </div>
            {/* Search row — always visible under the top row on mobile */}
            <div ref={searchRef} className="relative h-14 flex items-center px-4 border-t border-neutral-800/10 w-full">
              <form onSubmit={handleSearchSubmit} role="search" className="relative w-full">
                <input
                  type="search"
                  value={localQuery}
                  onChange={handleSearchInput}
                  onFocus={handleSearchFocus}
                  onKeyDown={handleKeyDown}
                  placeholder="Search luxury..."
                  className="w-full border border-neutral-800 bg-neutral-900 text-white placeholder-neutral-500 px-3 py-2 pr-16 text-xs focus:outline-none focus:border-brand-gold transition-colors font-inter"
                  aria-label="Search products"
                  id="nav-search-input-mobile"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={isEmpty}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                    isEmpty
                      ? 'bg-brand-gold/40 text-white/40 cursor-not-allowed'
                      : 'bg-brand-gold text-white hover:bg-white hover:text-black'
                  }`}
                  id="nav-search-btn-mobile"
                >
                  Go
                </button>
              </form>

              {renderDropdown()}

            </div>
          </div>
        </nav>


      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-0 z-[1000] bg-neutral-950 text-white pt-2 px-6 flex flex-col"
            role="dialog" aria-label="Mobile menu" aria-modal="true"
          >
            {/* Top header bar in mobile menu */}
            <div className="flex items-center justify-between py-4 border-b border-neutral-800/60 mb-2 flex-shrink-0">
              <Link to="/" onClick={() => dispatch(closeMobileMenu())} aria-label="Billu Bazaar — Home">
                <Logo size="sm" />
              </Link>
              <button onClick={() => dispatch(closeMobileMenu())} className="p-2 text-white hover:text-brand-gold focus-visible:outline-brand-gold" aria-label="Close menu"><X size={24} /></button>
            </div>
            {/* 3-level accordion list */}
            <ul className="flex flex-col gap-1 mt-2 overflow-y-auto flex-1 pb-6 pr-1 scrollbar-thin">
              {activeNavLinks.map(link => {
                const hasLevel2 = link.children && link.children.length > 0;
                const isL1Expanded = expandedLevel1 === link.slug;
                
                return (
                  <li key={link.slug || link.label} className="border-b border-neutral-800/40 last:border-b-0 py-1">
                    <div className="flex items-center justify-between">
                      {hasLevel2 ? (
                        <button
                          onClick={() => setExpandedLevel1(isL1Expanded ? null : link.slug)}
                          className={`font-playfair text-lg font-medium text-left flex-1 py-2.5 flex items-center justify-between ${link.highlight ? 'text-brand-gold' : isL1Expanded ? 'text-brand-gold' : 'text-neutral-100'} hover:text-brand-gold transition-colors`}
                        >
                          <span>{link.label}</span>
                          <ChevronRight
                            size={18}
                            className={`transform transition-transform duration-200 text-neutral-400 ${isL1Expanded ? 'rotate-90 text-brand-gold' : ''}`}
                          />
                        </button>
                      ) : (
                        <Link
                          to={link.to}
                          onClick={() => dispatch(closeMobileMenu())}
                          className={`font-playfair text-lg font-medium flex-1 py-2.5 ${link.highlight ? 'text-brand-gold' : 'text-neutral-100'} hover:text-brand-gold transition-colors`}
                        >
                          {link.label}
                        </Link>
                      )}
                    </div>
                    
                    {/* Level 2 Subcategories Accordion */}
                    {hasLevel2 && isL1Expanded && (
                      <div className="pl-3 pr-1 py-1 space-y-1">
                        {/* Direct explore all for Level 1 */}
                        <Link
                          to={link.to || `/category/${link.slug}`}
                          onClick={() => dispatch(closeMobileMenu())}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-gold hover:text-amber-300 uppercase tracking-wider py-2 px-2 hover:translate-x-1 transition-transform"
                        >
                          <span>Explore All {link.label}</span>
                          <ArrowRight size={13} />
                        </Link>

                        {link.children.map(sub => {
                          const hasLevel3 = sub.children && sub.children.length > 0;
                          const isL2Expanded = expandedLevel2 === sub.slug;
                          
                          return (
                            <div key={sub.slug || sub.id} className="py-0.5">
                              <div className="flex items-center justify-between rounded-lg hover:bg-neutral-900/60 transition-colors">
                                {hasLevel3 ? (
                                  <button
                                    onClick={() => setExpandedLevel2(isL2Expanded ? null : sub.slug)}
                                    className={`text-[15px] font-medium text-left flex-1 py-2.5 px-2.5 flex items-center justify-between ${isL2Expanded ? 'text-brand-gold' : 'text-neutral-200'} hover:text-brand-gold transition-colors`}
                                  >
                                    <span>{sub.name}</span>
                                    <ChevronRight
                                      size={16}
                                      className={`transform transition-transform duration-200 text-neutral-400 ${isL2Expanded ? 'rotate-90 text-brand-gold' : ''}`}
                                    />
                                  </button>
                                ) : (
                                  <Link
                                    to={`/category/${link.slug}/${sub.slug}`}
                                    onClick={() => dispatch(closeMobileMenu())}
                                    className="text-[15px] font-medium text-neutral-200 hover:text-brand-gold flex-1 py-2.5 px-2.5"
                                  >
                                    {sub.name}
                                  </Link>
                                )}
                              </div>
                              
                              {/* Level 3 Sub-subcategories (Child Categories) */}
                              {hasLevel3 && isL2Expanded && (
                                <div className="pl-3 pr-1 py-1.5 space-y-1.5 border-l-2 border-brand-gold/30 ml-2 my-1">
                                  <Link
                                    to={`/category/${link.slug}/${sub.slug}`}
                                    onClick={() => dispatch(closeMobileMenu())}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-gold/90 hover:text-brand-gold uppercase tracking-wider py-1 px-2"
                                  >
                                    <span>View All {sub.name}</span>
                                    <ArrowRight size={11} />
                                  </Link>

                                  {sub.children.map(ss => (
                                    <Link
                                      key={ss.slug || ss.id}
                                      to={`/category/${link.slug}/${sub.slug}/${ss.slug}`}
                                      onClick={() => dispatch(closeMobileMenu())}
                                      className="flex items-center justify-between px-3.5 py-3 rounded-lg bg-neutral-900/70 hover:bg-neutral-800 active:bg-neutral-800 border border-neutral-800/60 hover:border-brand-gold/40 text-[14px] font-medium text-neutral-200 hover:text-brand-gold transition-all min-h-[44px] active:scale-[0.98] group"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-gold/70 group-hover:bg-brand-gold group-hover:scale-125 transition-all" />
                                        <span className="leading-snug">{ss.name}</span>
                                      </div>
                                      <ChevronRight size={14} className="text-neutral-500 group-hover:text-brand-gold group-hover:translate-x-0.5 transition-transform" />
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            
            <div className="mt-auto pt-6 pb-8 border-t border-neutral-800/60 flex flex-col gap-4 flex-shrink-0">
              {/* Phone number */}
              <a href="tel:+917338814319" className="flex items-center gap-3 text-neutral-300 hover:text-brand-gold transition-colors text-sm w-max">
                <span className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800/80 flex items-center justify-center text-rose-500">
                  <Phone size={14} />
                </span>
                <span>+91 9999999999</span>
              </a>

              {/* Email */}
              <a href="mailto:Kamalireturngifts@gmail.com" className="flex items-center gap-3 text-neutral-300 hover:text-brand-gold transition-colors text-sm w-max">
                <span className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800/80 flex items-center justify-center text-rose-500">
                  <Mail size={14} />
                </span>
                <span className="break-all">hello@billubazzar.com</span>
              </a>

              {/* Social media icons */}
              <div className="flex items-center gap-3 mt-2">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800/80 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all duration-200" aria-label="Twitter">
                  <Twitter size={16} />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800/80 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all duration-200" aria-label="Instagram">
                  <Instagram size={16} />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800/80 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all duration-200" aria-label="Facebook">
                  <Facebook size={16} />
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800/80 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all duration-200" aria-label="YouTube">
                  <Youtube size={16} />
                </a>
                <a href="https://wa.me/917338814319" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800/80 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-all duration-200" aria-label="WhatsApp">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.457 5.704 1.458h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer: shrinks when announcement bar hides on scroll.
          Reads the same --header-h / --header-h-mobile vars the header
          itself keeps updated, instead of a second hardcoded copy of the
          height that could fall out of sync with it. */}
      <div
        style={{ height: 'var(--header-h)', transition: 'height 0.3s ease' }}
        className={`lg:block hidden ${location.pathname === '/' ? 'lg:hidden' : ''}`}
        aria-hidden="true"
      />
      <div
        style={{ height: 'var(--header-h-mobile)', transition: 'height 0.3s ease' }}
        className="block lg:hidden"
        aria-hidden="true"
      />
    </>
  );
};

export default Navbar;