import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, MapPin, Package, Clock } from 'lucide-react';
import Footer from '../components/Footer';

const ShippingPage = () => {
  useEffect(() => {
    document.title = 'Shipping Policy — Billu Bazaar';
    window.scrollTo(0, 0);
  }, []);

  return (
    <main id="main-content" className="min-h-screen bg-brand-bg text-brand-text">
      {/* Breadcrumb Banner */}
      <div className="bg-brand-light/30 border-y border-brand-light py-8">
        <div className="max-w-site mx-auto px-6 md:px-8">
          <nav className="text-xs text-brand-grey mb-2" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-brand-gold transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-brand-text">Shipping Policy</span>
          </nav>
          <h1 className="font-playfair text-h2 font-bold text-brand-text">Shipping & Delivery</h1>
          <p className="text-brand-grey text-sm mt-1">Our premium packaging standards and courier timelines.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-site mx-auto px-6 md:px-8 py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <span className="text-xs font-semibold text-brand-gold tracking-widest uppercase block">Global Logistics</span>
            <h2 className="font-playfair text-3xl font-bold text-brand-text">Delivering Elegance Safely</h2>
            <p className="text-brand-grey text-sm md:text-base leading-relaxed text-left">
              We understand that the anticipation of receiving your luxury items is part of the experience. Whether you ordered the latest smart home devices, premium designer outerwear, or organic beauty essentials, every item is wrapped in custom eco-friendly packaging and dispatched via premium courier networks.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-y border-brand-light py-8 my-10 text-center md:text-left">
            <div className="space-y-2">
              <Truck className="text-brand-gold w-8 h-8 mx-auto md:mx-0" />
              <h4 className="font-playfair text-sm font-semibold text-brand-text">Free Shipping</h4>
              <p className="text-brand-grey text-xs">Available for all domestic orders exceeding ₹1,499.</p>
            </div>
            <div className="space-y-2">
              <Package className="text-brand-gold w-8 h-8 mx-auto md:mx-0" />
              <h4 className="font-playfair text-sm font-semibold text-brand-text">Atelier Packaged</h4>
              <p className="text-brand-grey text-xs">Boxes double-wrapped and padded for extra security.</p>
            </div>
            <div className="space-y-2">
              <MapPin className="text-brand-gold w-8 h-8 mx-auto md:mx-0" />
              <h4 className="font-playfair text-sm font-semibold text-brand-text">Tracked Transit</h4>
              <p className="text-brand-grey text-xs">Live GPS link sent instantly upon dispatch.</p>
            </div>
            <div className="space-y-2">
              <Clock className="text-brand-gold w-8 h-8 mx-auto md:mx-0" />
              <h4 className="font-playfair text-sm font-semibold text-brand-text">Delivery Speed</h4>
              <p className="text-brand-grey text-xs">Metros: 2-4 business days. Others: 4-7 business days.</p>
            </div>
          </div>

          <div className="space-y-8">
            <section className="space-y-3">
              <h3 className="font-playfair text-xl font-semibold text-brand-text">1. Processing Timelines</h3>
              <p className="text-brand-grey text-xs md:text-sm leading-relaxed text-left">
                Standard catalog products are dispatched from our warehouses within 24 to 48 hours of payment confirmation. Custom apparel items, pre-ordered electronics, or special decor orders may require longer processing times, which will be highlighted on the product page and during checkout.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-playfair text-xl font-semibold text-brand-text">2. Shipping Charges</h3>
              <p className="text-brand-grey text-xs md:text-sm leading-relaxed text-left">
                For domestic orders within India below ₹1,499, a flat shipping fee of ₹99 is added at checkout. International shipping charges are calculated dynamically based on package weight and destination country. Duty tariffs and customs fees, if applicable, are to be borne by the recipient.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-playfair text-xl font-semibold text-brand-text">3. Transit Care & Insurance</h3>
              <p className="text-brand-grey text-xs md:text-sm leading-relaxed text-left">
                All high-value orders (specifically jewelry and electronics) are fully insured in transit by Billu Bazaar. A signature is required upon delivery to ensure that the luxury package is received safely by the rightful owner.
              </p>
            </section>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  );
};

export default ShippingPage;
