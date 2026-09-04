import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Youtube, Twitter, Mail, Phone } from 'lucide-react';
import Logo from './Logo';
import api from '../services/api';



const Footer = () => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories/tree');
        if (res.data?.success && res.data.categories?.length > 0) {
          const activeCategories = res.data.categories.filter(c => c.isActive);
          setCategories(activeCategories);
        }
      } catch (err) {
        console.error('Error fetching footer categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const displayCategories = categories.length > 0 
    ? categories.slice(0, 7).map(c => ({ name: c.name, to: `/category/${c.slug}` }))
    : [
        { name: 'Party Wear', to: '/category/party-wear' },
        { name: 'Jewelry', to: '/category/jewelry' },
        { name: 'Perfumes', to: '/category/perfumes' },
        { name: 'Accessories', to: '/category/accessories' },
        { name: 'Footwear', to: '/category/footwear' },
        { name: 'New Arrivals', to: '/category/new-arrivals' },
        { name: 'Best Sellers', to: '/category/best-sellers' }
      ];

  return (
    <footer className="bg-brand-text text-white" role="contentinfo">
      {/* Main Footer Grid */}
      <div className="max-w-site mx-auto px-4 sm:px-6 md:px-8 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand */}
        <div>
          <Logo size="lg" className="mb-4" />
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            Curating India's finest luxury fashion, jewelry, perfumes and accessories since 2019. Where heritage meets modernity.
          </p>
          <div className="flex gap-3">
            {[Instagram, Facebook, Youtube, Twitter].map((Icon, i) => (
              <a key={i} href="#" className="w-9 h-9 border border-white/20 flex items-center justify-center hover:border-brand-gold hover:text-brand-gold transition-all duration-200 focus-visible:outline-white" aria-label={`Social link ${i+1}`}>
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <h3 className="font-playfair text-lg font-semibold text-white mb-5">Categories</h3>
          <ul className="space-y-3">
            {displayCategories.map(cat => (
              <li key={cat.name}>
                <Link to={cat.to} className="text-white/60 text-sm hover:text-brand-gold transition-colors focus-visible:outline-brand-gold">
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Customer Service */}
        <div>
          <h3 className="font-playfair text-lg font-semibold text-white mb-5">Help & Info</h3>
          <ul className="space-y-3">
            {[
              { label: 'About', to: '/about' },
              { label: 'Privacy', to: '/privacy' },
              { label: 'Terms & Conditions', to: '/terms' },
              { label: 'Shipping', to: '/shipping' },
              { label: 'Cancellation', to: '/cancellation' },
              { label: 'Returns and Refunds', to: '/returns' },
              { label: 'Contact Us', to: '/contact' }
            ].map(link => (
              <li key={link.label}>
                <Link to={link.to} className="text-white/60 text-sm hover:text-brand-gold transition-colors focus-visible:outline-brand-gold">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="font-playfair text-lg font-semibold text-white mb-5">Contact Us</h3>
          <ul className="space-y-3">
            <li className="flex gap-2.5 text-white/60 text-sm">
              <Phone size={15} className="text-brand-gold mt-0.5 flex-shrink-0" />
              <a href="tel:+919999999999" className="hover:text-brand-gold transition-colors">+91 99999 99999</a>
            </li>
            <li className="flex gap-2.5 text-white/60 text-sm">
              <Mail size={15} className="text-brand-gold mt-0.5 flex-shrink-0" />
              <a href="mailto:hello@billubazaar.com" className="hover:text-brand-gold transition-colors">hello@billubazaar.com</a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-site mx-auto px-4 sm:px-6 md:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-white/40 text-xs">
          <p>© {new Date().getFullYear()} Billu Bazaar. All rights reserved.</p>
          <p>
            Developed by{' '}
            <a
              href="https://saitechnosolutions.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 hover:text-brand-gold transition-colors underline underline-offset-2"
            >
              Sai Techno Solutions
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
