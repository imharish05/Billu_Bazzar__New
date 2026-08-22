import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion';
import { Eye, Target, Compass, Award, Sparkles, Users, Instagram, Package, Heart, ChevronRight, ArrowRight } from 'lucide-react';
import Footer from '../components/Footer';
import api from '../services/api';

// Count-Up Animation Component
const Counter = ({ value }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  // Extract number and suffix (like "K" or "+")
  const numStr = value.replace(/[^0-9]/g, '');
  const num = parseInt(numStr, 10) || 0;
  const suffix = value.replace(/[0-9]/g, '');

  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => {
    return Math.floor(latest).toLocaleString();
  });

  useEffect(() => {
    if (inView) {
      const controls = animate(motionValue, num, {
        duration: 2.2,
        ease: 'easeOut',
      });
      return controls.stop;
    }
  }, [inView, motionValue, num]);

  return (
    <span ref={ref} className="font-playfair text-4xl md:text-5xl font-bold text-brand-gold tracking-tight">
      <motion.span>{rounded}</motion.span>
      <span>{suffix}</span>
    </span>
  );
};

const defaultAboutSettings = {
  hero: {
    subtitle: 'Est. 2019',
    title: 'Your Premium\nLifestyle Destination',
    description: 'Bringing you a meticulously curated selection of cutting-edge electronics, fashion apparel, home styling, beauty, and outdoor sports.',
  },
  story: {
    subtitle: 'Our Legacy',
    title: 'Curation For The\nModern Connoisseur',
    description1: 'Billu Bazaar was established in 2019 with a singular, clear objective: to redefine how you shop for life\'s essentials. We believed that shopping for premium tech shouldn\'t feel separate from buying designer apparel or selecting elegant home furnishings. By bringing these diverse categories together, we created a unified, luxury-tier marketplace.',
    description2: 'Today, our catalog is divided into six pillars: Electronics & Gadgets, Apparel & Fashion, Home & Living, Beauty & Personal Care, Sports & Outdoors, and Toys, Hobbies & Media. We verify and partner directly with top manufacturers and authorized brands, filtering out the noise to bring you only products that pass our strict design and quality audits.',
    feature1Title: 'Authentic Sourcing',
    feature1Desc: 'We guarantee 100% original products sourced directly from brands or authorized global distributors.',
    feature2Title: 'Global Standard',
    feature2Desc: 'Our products are selected based on strict criteria: build quality, performance, aesthetics, and user reviews.',
    qualityOathTitle: 'Our Quality Oath',
    qualityOathDesc: 'Every gadget, garment, and home accent is hand-inspected for quality before shipping.',
    imageUrl: '/about-story-general.png',
  },
  stats: [
    { value: '50000+', label: 'Happy Patrons', sub: 'Verified satisfied customers' },
    { value: '200000+', label: 'Social Family', sub: 'Engaged lifestyle community' },
    { value: '150000+', label: 'Orders Delivered', sub: 'Safely packed & shipped items' },
    { value: '150+', label: 'Curated Brands', sub: 'Top-tier verified partners' },
  ],
  values: [
    { title: 'Our Vision', accent: 'Modern Curation', description: 'To create a single, curated lifestyle ecosystem where cutting-edge electronics, designer fashion, premium home goods, and health essentials seamlessly converge into a single, high-end marketplace.' },
    { title: 'Our Mission', accent: 'Authenticity & Trust', description: 'To source and deliver strictly authentic, certified products across all categories, ensuring our customers experience top-tier quality, transparent pricing, and concierge-level customer care.' },
    { title: 'Our Goal', accent: 'Curated Excellence', description: 'To bridge the gap between verified global manufacturers and design-conscious shoppers, offering an unparalleled catalog of curated electronics, apparel, home decor, beauty, and hobbies.' },
  ],
  philosophy: {
    subtitle: 'Our Philosophy',
    title: 'Pillars of Excellence',
    description: 'Our foundations are built on sourcing authentic products, providing seamless digital solutions, and earning long-term customer loyalty.',
  },
  concierge: {
    subtitle: 'Need Assistance?',
    title: 'We are Here to Help',
    description: 'Whether you need product recommendations, order tracking help, or bulk procurement support across our catalog, our concierge team is always available.',
  },
  marqueeWords: ['ELECTRONICS', 'APPAREL', 'HOME', 'BEAUTY', 'SPORTS', 'TOYS', 'EXCLUSIVITY', 'QUALITY', 'CRAFTSMANSHIP']
};

const VALUE_ICONS = [
  <Eye className="w-8 h-8 text-brand-gold" />,
  <Target className="w-8 h-8 text-brand-gold" />,
  <Compass className="w-8 h-8 text-brand-gold" />
];

const STAT_ICONS = [
  <Users className="w-6 h-6 text-brand-gold" />,
  <Instagram className="w-6 h-6 text-brand-gold" />,
  <Package className="w-6 h-6 text-brand-gold" />,
  <Award className="w-6 h-6 text-brand-gold" />
];

const AboutPage = () => {
  const [data, setData] = useState(defaultAboutSettings);

  useEffect(() => {
    document.title = 'Our Story — Billu Bazaar';
    window.scrollTo(0, 0);

    const fetchData = async () => {
      try {
        const res = await api.get('/site-settings/about');
        if (res.data && res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching site settings for about page:', err);
      }
    };
    fetchData();
  }, []);

  const renderFormattedText = (text) => {
    if (!text) return null;
    const parts = text.split('**');
    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        return <strong key={idx} className="font-semibold text-brand-text">{part}</strong>;
      }
      return part;
    });
  };

  const values = (data.values || []).map((val, idx) => ({
    ...val,
    icon: VALUE_ICONS[idx] || <Sparkles className="w-8 h-8 text-brand-gold" />
  }));

  const stats = (data.stats || []).map((stat, idx) => ({
    ...stat,
    icon: STAT_ICONS[idx] || <Users className="w-6 h-6 text-brand-gold" />
  }));

  const marqueeWords = data.marqueeWords && data.marqueeWords.length > 0
    ? data.marqueeWords
    : defaultAboutSettings.marqueeWords;

  return (
    <main id="main-content" className="min-h-screen bg-brand-bg text-brand-text overflow-x-hidden">
      
      {/* Hero Section */}
      <section className="relative h-[65vh] md:h-[80vh] flex items-center justify-center bg-black overflow-hidden">
        {/* Luxury Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transform transition-transform duration-10000 ease-out opacity-60"
          style={{ backgroundImage: `url('/about-luxury-bg.png')` }}
        />
        {/* Dark Radial Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/70 to-brand-text" />
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

        <div className="relative max-w-site mx-auto px-6 md:px-8 text-center z-10 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-4"
          >
            <span className="text-xs font-semibold tracking-widest text-brand-gold uppercase block">{data.hero.subtitle}</span>
            <h1 className="font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white max-w-4xl leading-tight">
              {data.hero.titleMain} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-yellow-400 to-brand-gold">
                {data.hero.titleGold}
              </span>
            </h1>
            <p className="text-white/70 max-w-2xl mx-auto text-sm md:text-base font-light leading-relaxed text-center">
              {data.hero.description}
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-8"
          >
            <div className="w-[1px] h-16 bg-gradient-to-b from-brand-gold to-transparent animate-pulse" />
          </motion.div>
        </div>
      </section>

      {/* Brand Story Section */}
      <section className="py-12 md:py-20 max-w-site mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left: Text Contents of the Company */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-7 space-y-6"
          >
            <span className="text-xs font-semibold tracking-widest text-brand-gold uppercase block">{data.story.subtitle}</span>
            <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-bold text-brand-text leading-tight">
              {data.story.titleMain} <br />
              {data.story.titleSub}
            </h2>
            <div className="h-[2px] w-20 bg-brand-gold" />
            
            <p className="text-brand-grey text-sm md:text-base leading-relaxed text-left">
              {renderFormattedText(data.story.description1)}
            </p>
            
            <p className="text-brand-grey text-sm md:text-base leading-relaxed text-left">
              {renderFormattedText(data.story.description2)}
            </p>

            <div className="pt-4 grid grid-cols-2 gap-6 border-t border-brand-light">
              <div>
                <h4 className="font-playfair text-lg font-semibold text-brand-text mb-1">{data.story.feature1Title}</h4>
                <p className="text-xs text-brand-grey leading-relaxed">
                  {data.story.feature1Desc}
                </p>
              </div>
              <div>
                <h4 className="font-playfair text-lg font-semibold text-brand-text mb-1">{data.story.feature2Title}</h4>
                <p className="text-xs text-brand-grey leading-relaxed">
                  {data.story.feature2Desc}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right: Premium General Boutique Display Image */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-5 relative"
          >
            <div className="absolute -inset-4 border border-brand-gold/20 translate-x-2 translate-y-2 pointer-events-none rounded-sm" />
            <div className="relative bg-neutral-100 border border-brand-light shadow-lg overflow-hidden group">
              <img 
                src={data.story.imageUrl || '/about-story-general.png'} 
                alt="Premium multi-category lifestyle curation showroom display" 
                className="w-full h-[280px] sm:h-[350px] md:h-[450px] object-cover filter contrast-[1.03] transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Floating badge inside image */}
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm border border-brand-light p-4 shadow-xl max-w-[180px] z-10 rounded-sm">
                <span className="text-[10px] text-brand-gold font-semibold uppercase block mb-1">{data.story.qualityOathTitle}</span>
                <p className="text-[9px] text-brand-grey leading-normal">
                  {data.story.qualityOathDesc}
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* Stats Counter Section (with Wavy pattern) */}
      <section className="relative bg-brand-text text-white py-12 md:py-20 my-8 overflow-hidden">
        
        {/* Wave Top */}
        <div className="absolute top-0 left-0 w-full overflow-hidden leading-none select-none pointer-events-none">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative block w-full h-[30px] md:h-[50px]">
            <path d="M0,32L120,42.7C240,53,480,75,720,74.7C960,75,1200,53,1320,42.7L1440,32L1440,0L1320,0C1200,0,960,0,720,0C480,0,240,0,120,0L0,0Z" className="fill-brand-bg"></path>
          </svg>
        </div>

        {/* Decorative background glow */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 rounded-full bg-brand-gold/10 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-yellow-600/5 blur-[150px] pointer-events-none" />

        <div className="relative max-w-site mx-auto px-6 md:px-8 z-10">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-semibold tracking-widest text-brand-gold uppercase block">By The Numbers</span>
            <h3 className="font-playfair text-3xl md:text-4xl font-bold text-white">Our Growing Footprint</h3>
            <p className="text-white/60 text-xs md:text-sm leading-relaxed">
              From high-end electronics to designer outerwear and sports gear, our numbers reflect our commitment to excellence.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 lg:gap-12">
            {stats.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center text-center p-6 bg-white/5 border border-white/10 rounded-sm hover:border-brand-gold/30 hover:bg-white/10 transition-all duration-300 group"
              >
                <div className="w-12 h-12 border border-brand-gold/20 flex items-center justify-center mb-4 rounded-full bg-black/40 group-hover:border-brand-gold/50 transition-colors">
                  {item.icon}
                </div>
                <Counter value={item.value} />
                <h5 className="font-playfair text-sm font-semibold text-white mt-3 mb-1">
                  {item.label}
                </h5>
                <p className="text-white/50 text-[11px] leading-tight">
                  {item.sub}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Slider/Marquee section */}
          <div className="mt-20 border-t border-b border-white/10 py-6 overflow-hidden relative select-none">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-brand-text to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-brand-text to-transparent z-10" />
            
            <motion.div 
              className="flex whitespace-nowrap gap-16 text-sm font-semibold tracking-[0.3em] text-white/40"
              animate={{ x: [0, -1000] }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: 'loop',
                  duration: 25,
                  ease: 'linear',
                },
              }}
            >
              {/* Render twice for continuous loop */}
              {[...marqueeWords, ...marqueeWords, ...marqueeWords].map((word, idx) => (
                <div key={idx} className="flex items-center gap-6">
                  <span>{word}</span>
                  <span className="w-1.5 h-1.5 bg-brand-gold rounded-full" />
                </div>
              ))}
            </motion.div>
          </div>

        </div>

        {/* Wave Bottom */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none select-none pointer-events-none">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative block w-full h-[30px] md:h-[50px] transform rotate-180">
            <path d="M0,32L120,42.7C240,53,480,75,720,74.7C960,75,1200,53,1320,42.7L1440,32L1440,0L1320,0C1200,0,960,0,720,0C480,0,240,0,120,0L0,0Z" className="fill-brand-bg"></path>
          </svg>
        </div>

      </section>

      {/* Core Values Section (Premium Cards) */}
      <section className="py-12 md:py-20 max-w-site mx-auto px-6 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-semibold tracking-widest text-brand-gold uppercase block">{data.philosophy.subtitle}</span>
          <h2 className="font-playfair text-3xl md:text-4xl lg:text-5xl font-bold text-brand-text">{data.philosophy.title}</h2>
          <div className="h-[2px] w-20 bg-brand-gold mx-auto" />
          <p className="text-brand-grey text-sm max-w-lg mx-auto text-center">
            {data.philosophy.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {values.map((val, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
              className="bg-white border border-brand-light p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-lg hover:border-brand-gold/30 transition-all duration-300 relative overflow-hidden group"
            >
              {/* Decorative Corner Gold accent */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-brand-gold/10 to-transparent transform rotate-45 translate-x-8 -translate-y-8 group-hover:translate-x-6 group-hover:-translate-y-6 transition-all duration-300" />
              
              <div className="space-y-6">
                <div className="w-16 h-16 border border-brand-light flex items-center justify-center bg-brand-muted/50 rounded-sm group-hover:border-brand-gold/40 group-hover:bg-white transition-all duration-300">
                  {val.icon}
                </div>
                <div>
                  <span className="text-[10px] text-brand-gold font-semibold uppercase tracking-wider block mb-1">
                    {val.accent}
                  </span>
                  <h4 className="font-playfair text-xl font-bold text-brand-text mb-3">
                    {val.title}
                  </h4>
                  <p className="text-brand-grey text-xs md:text-sm leading-relaxed text-left">
                    {val.description}
                  </p>
                </div>
              </div>

              {/* Bottom decorative bar */}
              <div className="h-[2px] w-0 bg-brand-gold mt-8 group-hover:w-full transition-all duration-500" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* Private Concierge CTA Section */}
      <section className="bg-brand-muted/50 border-t border-b border-brand-light py-12 md:py-16 text-center">
        <div className="max-w-xl mx-auto px-6 space-y-6">
          <span className="text-xs font-semibold tracking-widest text-brand-gold uppercase block">{data.concierge.subtitle}</span>
          <h3 className="font-playfair text-2xl font-bold text-brand-text">
            {data.concierge.title}
          </h3>
          <p className="text-brand-grey text-sm leading-relaxed text-center">
            {data.concierge.description}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link 
              to="/contact" 
              className="btn-primary flex items-center gap-2 group w-full sm:w-auto justify-center"
              id="about-contact-btn"
            >
              Contact Support <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              to="/products" 
              className="px-6 py-3 border border-brand-light text-brand-text text-sm font-semibold hover:border-brand-gold transition-colors w-full sm:w-auto justify-center inline-flex"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default AboutPage;
