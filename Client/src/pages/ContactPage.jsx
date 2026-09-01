import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Clock, Send, Globe, Star } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import Footer from '../components/Footer';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Contact Us — Billu Bazaar';
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      return toast.error('Please fill in all required fields.');
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/contact-enquiries', formData);
      if (res.data?.success) {
        toast.success(res.data.message || 'Thank you! Your message has been sent successfully.', {
          duration: 5000,
          style: {
            border: '1px solid #C58837',
            padding: '16px',
            color: '#111111',
            fontFamily: 'Montserrat, sans-serif',
          },
        });
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: 'General Inquiry',
          message: ''
        });
      }
    } catch (err) {
      console.error('Contact submit error:', err);
      toast.error(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main id="main-content" className="min-h-screen bg-brand-bg">
      {/* Breadcrumb banner */}
      <div className="bg-brand-light/30 border-y border-brand-light py-8">
        <div className="max-w-site mx-auto px-6 md:px-8">
          <nav className="text-xs text-brand-grey mb-2" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-brand-gold transition-colors">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-brand-text">Contact Us</span>
          </nav>
          <h1 className="font-playfair text-3xl md:text-4xl font-bold text-brand-text">Contact Us</h1>
          <p className="text-brand-grey text-sm mt-1">Get in touch with our luxury concierge desk.</p>
        </div>
      </div>

      <div className="max-w-site mx-auto px-6 md:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Contact info */}
          <div className="lg:col-span-5 space-y-8">
            <div>
              <span className="text-xs font-semibold text-brand-gold tracking-widest uppercase block mb-2">Our Boutique</span>
              <h2 className="font-playfair text-2xl md:text-3xl font-bold text-brand-text mb-4">Visit Billu Bazaar</h2>
              <p className="text-brand-grey text-sm leading-relaxed">
                Step into a world where heritage meets luxury. Explore our curated collections of Indian bridal couture, fine jewelry, rare perfumes, and accessories in person at our flagship boutique.
              </p>
            </div>

            <div className="space-y-6">
              {/* Address */}
              <div className="flex gap-4">
                <div className="w-10 h-10 border border-brand-light flex items-center justify-center flex-shrink-0 text-brand-gold">
                  <MapPin size={18} />
                </div>
                <div>
                  <h4 className="font-playfair text-base font-semibold text-brand-text mb-1">Flagship Boutique</h4>
                  <p className="text-brand-grey text-sm leading-relaxed">
                    14 Linking Road, Bandra West,<br />
                    Mumbai, Maharashtra 400050
                  </p>
                </div>
              </div>

              {/* Call */}
              <div className="flex gap-4">
                <div className="w-10 h-10 border border-brand-light flex items-center justify-center flex-shrink-0 text-brand-gold">
                  <Phone size={18} />
                </div>
                <div>
                  <h4 className="font-playfair text-base font-semibold text-brand-text mb-1">Concierge Phone</h4>
                  <p className="text-brand-grey text-sm">
                    <a href="tel:+919999999999" className="hover:text-brand-gold transition-colors">+91 99999 99999</a>
                  </p>
                  {/* <p className="text-xs text-brand-grey/80 mt-0.5">Toll-free within India</p> */}
                </div>
              </div>

              {/* Email */}
              <div className="flex gap-4">
                <div className="w-10 h-10 border border-brand-light flex items-center justify-center flex-shrink-0 text-brand-gold">
                  <Mail size={18} />
                </div>
                <div>
                  <h4 className="font-playfair text-base font-semibold text-brand-text mb-1">Email Inquiries</h4>
                  <p className="text-brand-grey text-sm">
                    <a href="mailto:hello@billubazaar.com" className="hover:text-brand-gold transition-colors">hello@billubazaar.com</a>
                  </p>
                  <p className="text-brand-grey text-sm">
                    <a href="mailto:concierge@billubazaar.com" className="hover:text-brand-gold transition-colors">concierge@billubazaar.com</a>
                  </p>
                </div>
              </div>

              {/* Working Hours */}
              {/* <div className="flex gap-4">
                <div className="w-10 h-10 border border-brand-light flex items-center justify-center flex-shrink-0 text-brand-gold">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="font-playfair text-base font-semibold text-brand-text mb-1">Working Hours</h4>
                  <p className="text-brand-grey text-sm">Monday – Saturday: 10:00 AM – 8:00 PM IST</p>
                  <p className="text-brand-grey text-sm">Sunday: Closed</p>
                </div>
              </div> */}
            </div>

            {/* Premium Note */}
            <div className="border border-brand-light p-6 bg-brand-light/10">
              <div className="flex items-center gap-1 text-brand-gold mb-2">
                <Star size={14} className="fill-brand-gold" />
                <Star size={14} className="fill-brand-gold" />
                <Star size={14} className="fill-brand-gold" />
                <Star size={14} className="fill-brand-gold" />
                <Star size={14} className="fill-brand-gold" />
              </div>
              <h4 className="font-playfair text-sm font-semibold text-brand-text mb-1">Private Styling Consultations</h4>
              <p className="text-brand-grey text-xs leading-relaxed">
                Book a one-on-one session with our master stylists. Reach out via email or call us directly to schedule a private gallery viewing.
              </p>
            </div>
          </div>

          {/* Right Column: Contact form */}
          <div className="lg:col-span-7 bg-white border border-brand-light p-8 md:p-10 shadow-sm">
            <div>
              <h3 className="font-playfair text-xl md:text-2xl font-semibold text-brand-text mb-2">Send Us a Message</h3>
              <p className="text-brand-grey text-sm mb-8">
                Please complete the form below. Our customer experience team will respond to your inquiry within 24 business hours.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-grey mb-2" htmlFor="name">
                    Full Name <span className="text-brand-gold">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Aarav Mehta"
                    className="w-full border border-brand-light px-4 py-3 text-sm focus:outline-none focus:border-brand-gold bg-transparent transition-colors placeholder-brand-grey/40"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-grey mb-2" htmlFor="email">
                    Email Address <span className="text-brand-gold">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. aarav@example.com"
                    className="w-full border border-brand-light px-4 py-3 text-sm focus:outline-none focus:border-brand-gold bg-transparent transition-colors placeholder-brand-grey/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-grey mb-2" htmlFor="phone">
                    Phone Number <span className="text-brand-gold">*</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full border border-brand-light px-4 py-3 text-sm focus:outline-none focus:border-brand-gold bg-transparent transition-colors placeholder-brand-grey/40"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-grey mb-2" htmlFor="subject">
                    Inquiry Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full border border-brand-light px-4 py-3 text-sm focus:outline-none focus:border-brand-gold bg-transparent transition-colors text-brand-text"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Order Status">Order & Shipping Status</option>
                    <option value="Styling Consultation">Styling Consultation</option>
                    <option value="Custom Couture Designs">Custom Couture Designs</option>
                    <option value="Return / Exchange">Return & Exchange</option>
                    <option value="Partnership / Affiliate">Partnership & Affiliates</option>
                  </select>
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-brand-grey mb-2" htmlFor="message">
                  Your Message <span className="text-brand-gold">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="How can we assist you today? Please provide as much detail as possible..."
                  className="w-full border border-brand-light px-4 py-3 text-sm focus:outline-none focus:border-brand-gold bg-transparent transition-colors placeholder-brand-grey/40 resize-y"
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full md:w-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                id="contact-submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending Inquiry...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Send Message
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* Map Section */}
      <div className="max-w-site mx-auto px-6 md:px-8 pb-10 mt-6">
        <div className="w-full h-[300px] md:h-[450px] overflow-hidden grayscale contrast-[1.08] hover:grayscale-0 transition-all duration-700 ease-in-out border border-brand-light shadow-sm">
          <iframe
            title="Billu Bazaar Bandra West Location Map"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3771.1895080060934!2d72.8335017!3d19.0554907!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c9115c4d6dfd%3A0xe543e2646dcb001f!2sLinking%20Rd%2C%20Bandra%20West%2C%20Mumbai%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            aria-label="Google Maps showing Linking Road, Bandra West, Mumbai"
          />
        </div>
      </div>

      <Footer />
    </main>
  );
};

export default ContactPage;
