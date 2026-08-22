import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Eye, Lock, RefreshCw } from 'lucide-react';
import Footer from '../components/Footer';

const PrivacyPage = () => {
  useEffect(() => {
    document.title = 'Privacy Policy';
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
            <span className="text-brand-text">Privacy Policy</span>
          </nav>
          <h1 className="font-playfair text-h2 font-bold text-brand-text">Privacy Policy</h1>
          <p className="text-brand-grey text-sm mt-1">Our commitment to safeguarding your personal data and privacy.</p>
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
            <span className="text-xs font-semibold text-brand-gold tracking-widest uppercase block">Trust & Protection</span>
            <h2 className="font-playfair text-3xl font-bold text-brand-text">Security of Your Personal Space</h2>
            <p className="text-brand-grey text-sm md:text-base leading-relaxed text-left">
              We believe that a secure and premium shopping experience is built on a foundation of absolute trust and transparency. We are deeply committed to protecting your privacy, securing your personal data, and giving you full control over how your information is handled. This comprehensive Privacy Policy details the exact mechanisms we use to collect, process, manage, and safeguard your personal information when you interact with our platform.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-y border-brand-light py-8 my-10">
            <div className="flex gap-4">
              <Shield className="text-brand-gold w-6 h-6 flex-shrink-0" />
              <div>
                <h4 className="font-playfair text-sm font-semibold text-brand-text mb-1">Data Protection</h4>
                <p className="text-brand-grey text-xs">All sensitive account details and personal data are fully encrypted both in transit and at rest using industry-standard military-grade AES-256 protocols.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Lock className="text-brand-gold w-6 h-6 flex-shrink-0" />
              <div>
                <h4 className="font-playfair text-sm font-semibold text-brand-text mb-1">Secure Checkout</h4>
                <p className="text-brand-grey text-xs">We partner exclusively with PCI-DSS compliant payment gateways to process transactions securely, ensuring that no credit or debit card details are ever stored on our servers.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <RefreshCw className="text-brand-gold w-6 h-6 flex-shrink-0" />
              <div>
                <h4 className="font-playfair text-sm font-semibold text-brand-text mb-1">Privacy Control</h4>
                <p className="text-brand-grey text-xs">You retain complete control over your preferences, with the ability to instantly opt-out of marketing and promotional communications with a single click at any time.</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <section className="space-y-3">
              <h3 className="font-playfair text-xl font-semibold text-brand-text">1. What We Collect</h3>
              <p className="text-brand-grey text-xs md:text-sm leading-relaxed text-left">
                We only collect information that is essential for providing our services. This includes personal identifiers (such as your full name, email address, and telephone number), transactional details (including billing and shipping addresses, alongside secure payment parameters), and technical usage data (such as browser cookies and site navigation patterns) to enhance platform functionality.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-playfair text-xl font-semibold text-brand-text">2. How We Use It</h3>
              <p className="text-brand-grey text-xs md:text-sm leading-relaxed font-light text-left">
                Your information is used solely to facilitate your user journey. Key purposes include processing and delivering your orders, sending real-time shipping updates and notifications, optimizing our website design and performance based on user metrics, and dispatching curated marketing offers, which you will only receive if you have actively opted in.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-playfair text-xl font-semibold text-brand-text">3. Data Sharing</h3>
              <p className="text-brand-grey text-xs md:text-sm leading-relaxed text-left">
                We strictly adhere to a zero-selling policy: we do not sell, rent, or trade your personal data with third-party advertisers. We share your information exclusively with our trusted payment processing networks and logistics/delivery partners, and only to the minimal extent necessary to complete order fulfillment.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-playfair text-xl font-semibold text-brand-text">4. Data Storage</h3>
              <p className="text-brand-grey text-xs md:text-sm leading-relaxed text-left">
                Your personal data is housed securely on enterprise-grade, encrypted cloud servers. We implement robust logical and physical access control restrictions, continuous system monitoring, and routine security audits to protect all stored user data in full alignment with international security standards.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-playfair text-xl font-semibold text-brand-text">5. Customer Rights</h3>
              <p className="text-brand-grey text-xs md:text-sm leading-relaxed text-left">
                You possess full ownership and control over your personal records. At any time, you have the right to request comprehensive access to the data we hold, request corrections to out-of-date or inaccurate information, or request the permanent deletion of your account and associated personal history by contacting our support team.
              </p>
            </section>
          </div>

          <div className="p-6 bg-brand-light/10 border border-brand-light">
            <h4 className="font-playfair text-sm font-semibold text-brand-text mb-2">Privacy Support Desk</h4>
            <p className="text-brand-grey text-xs leading-relaxed text-left">
              If you have any questions or concerns regarding this Privacy Policy, your statutory data rights, or if you wish to request data deletion, please contact our dedicated privacy support desk directly at <a href="mailto:privacy@example.com" className="text-brand-gold hover:underline">privacy@example.com</a> or reach out through our support helpline.
            </p>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  );
};

export default PrivacyPage;
