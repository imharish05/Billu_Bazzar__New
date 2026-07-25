import { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { formatPrice } from '../utils/currency';

const SCROLL_AMOUNT = 320;

const ExclusiveCollection = () => {
  const { items: products, featured, loading } = useSelector(s => s.products);
  const { code: currencyCode, rate: currencyRate } = useSelector(s => s.currency);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const collectionProducts = (featured.length ? featured : products).filter(p => p.isFeatured || p.isBestSeller).slice(0, 10);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [updateScrollState, collectionProducts.length]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * SCROLL_AMOUNT, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <section className="py-16 md:py-15 bg-white" aria-label="Exclusive collection loading">
        <div className="max-w-site mx-auto px-6 md:px-8">
          <div className="skeleton h-8 w-64 mb-8" />
          <div className="flex gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-72 w-52 flex-shrink-0" />)}
          </div>
        </div>
      </section>
    );
  }

  if (collectionProducts.length === 0) return null;

  return (
    <section className="py-16 md:py-18 bg-white overflow-hidden" aria-label="Exclusive collection">
      <div className="max-w-site mx-auto px-6 md:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-brand-gold text-xs font-medium tracking-[0.2em] uppercase mb-3">Curated Luxury</p>
            <h2 className="font-playfair text-h2-sm md:text-h2 font-semibold text-brand-text">
              Exclusive Collection
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scroll(-1)}
              disabled={!canScrollLeft}
              className={`p-2 border transition-colors focus-visible:outline-brand-gold ${
                canScrollLeft
                  ? 'border-brand-text text-brand-text hover:bg-brand-text hover:text-white'
                  : 'border-brand-light text-brand-light cursor-not-allowed'
              }`}
              aria-label="Scroll left"
              id="exclusive-scroll-left"
            >
              <ChevronLeft size={18} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => scroll(1)}
              disabled={!canScrollRight}
              className={`p-2 border transition-colors focus-visible:outline-brand-gold ${
                canScrollRight
                  ? 'border-brand-text text-brand-text hover:bg-brand-text hover:text-white'
                  : 'border-brand-light text-brand-light cursor-not-allowed'
              }`}
              aria-label="Scroll right"
              id="exclusive-scroll-right"
            >
              <ChevronRight size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto scrollbar-hide pb-4 -mx-6 md:-mx-8 px-6 md:px-8"
          onScroll={updateScrollState}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {collectionProducts.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="flex-shrink-0 w-52 md:w-60 group"
            >
              <Link to={`/products/${product.slug}`} className="block focus-visible:outline-brand-gold">
                <div className="relative aspect-[3/4] overflow-hidden bg-brand-light mb-3">
                  {(product.defaultProductImage || product.images?.[0]) ? (
                    <img
                      src={product.defaultProductImage || product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-brand-grey text-xs">No image</div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white font-medium text-xs px-4 py-2 border border-white bg-black/20 backdrop-blur-sm">
                      Quick View
                    </span>
                  </div>
                  {product.discountPercent > 0 && (
                    <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5">
                      -{product.discountPercent}%
                    </span>
                  )}
                </div>
                <h3 className="font-inter text-sm font-medium text-brand-text truncate group-hover:text-brand-gold transition-colors">
                  {product.name}
                </h3>
                <p className="text-brand-gold font-semibold text-sm mt-1">
                  {formatPrice(product.price, currencyCode, currencyRate)}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link to="/products?featured=true" className="btn-outline inline-flex items-center gap-2" id="exclusive-view-all">
            View All <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ExclusiveCollection;
