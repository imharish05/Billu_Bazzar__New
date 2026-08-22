import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCcw, HelpCircle, FileText, CheckCircle2 } from 'lucide-react';
import Footer from '../components/Footer';

const ReturnsPage = () => {
  useEffect(() => {
    document.title = 'Returns & Refunds Policy — Billu Bazaar';
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
            <span className="text-brand-text">Returns & Refunds</span>
          </nav>
          <h1 className="font-playfair text-h2 font-bold text-brand-text">Returns & Refunds</h1>
          <p className="text-brand-grey text-sm mt-1">Our 24-hour return policy for damaged, incorrect, or mismatched orders.</p>
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
            <span className="text-xs font-semibold text-brand-gold tracking-widest uppercase block">Our Guarantee</span>
            <h2 className="font-playfair text-3xl font-bold text-brand-text">Returns & Refunds Policy</h2>
            <p className="text-brand-grey text-sm md:text-base leading-relaxed text-left">
              We are committed to delivering products of the highest standard. If any product in your order arrives damaged, defective, or mismatched, you can request an <strong>individual product return</strong> within a strict 24-hour window from delivery.
            </p>
          </motion.div>

          {/* Mandatory Unboxing Video Highlight Alert */}
          <div className="bg-amber-500/10 border-2 border-brand-gold/40 rounded-xl p-6 relative overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-brand-gold/20 text-brand-gold rounded-xl shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Mandatory</span>
                  <h3 className="font-playfair text-lg font-bold text-brand-text">Compulsory Unboxing Video Requirement</h3>
                </div>
                <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
                  To prevent fraudulent claims and ensure swift replacement or refund processing, <strong>a continuous, uncut parcel opening (unboxing) video is strictly compulsory</strong> for all return and damaged item claims.
                </p>
                <ul className="text-xs text-neutral-600 space-y-1 list-disc list-inside mt-2">
                  <li>Record the video starting before the courier parcel seal/tape is cut or opened.</li>
                  <li>Show all four sides of the outer packaging and ensure the shipping label with tracking ID is clearly visible.</li>
                  <li>Record the unboxing and reveal of the product without pauses, edits, or camera angle cuts.</li>
                  <li>Return requests submitted without unboxing video proof cannot be approved.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 border-y border-brand-light py-8 my-10 text-center md:text-left">
            <div className="space-y-2">
              <RefreshCcw className="text-brand-gold w-8 h-8 mx-auto md:mx-0" />
              <h4 className="font-playfair text-sm font-semibold text-brand-text">24-Hour Window</h4>
              <p className="text-brand-grey text-xs">Initiate a return request within 24 hours of successful delivery.</p>
            </div>
            <div className="space-y-2">
              <CheckCircle2 className="text-brand-gold w-8 h-8 mx-auto md:mx-0" />
              <h4 className="font-playfair text-sm font-semibold text-brand-text">Individual Item Returns</h4>
              <p className="text-brand-grey text-xs">Return specific products from multi-item orders without returning the whole order.</p>
            </div>
            <div className="space-y-2">
              <FileText className="text-brand-gold w-8 h-8 mx-auto md:mx-0" />
              <h4 className="font-playfair text-sm font-semibold text-brand-text">Compulsory Video</h4>
              <p className="text-brand-grey text-xs">Upload uncut unboxing video proof during the return submission.</p>
            </div>
            <div className="space-y-2">
              <HelpCircle className="text-brand-gold w-8 h-8 mx-auto md:mx-0" />
              <h4 className="font-playfair text-sm font-semibold text-brand-text">5-7 Day Refunds</h4>
              <p className="text-brand-grey text-xs">Refunds are credited back to the source account or bank account after inspection.</p>
            </div>
          </div>

          <div className="space-y-8">
            <section className="space-y-3">
              <h3 className="font-playfair text-xl font-semibold text-brand-text">1. Return Eligibility & Individual Product Returns</h3>
              <p className="text-brand-grey text-xs md:text-sm leading-relaxed text-left">
                We offer a strict 24-hour return window from the date and time of delivery. You may request returns for <strong>individual items</strong> in your order directly from your <strong>Delivered Orders</strong> page. Returns are accepted if an item is physically damaged upon arrival, defective, wrong product delivered, or mismatched with description. Each request requires an uncut opening video of the parcel.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-playfair text-xl font-semibold text-brand-text">2. Exclusions & Non-Returnable Items</h3>
              <p className="text-brand-grey text-xs md:text-sm leading-relaxed font-light text-left">
                Products are ineligible for return under any of the following conditions: if the product has been used, altered, or if the original Billu Bazaar security seal is broken; if the original packaging, brand tags, instruction manuals, or accessories are missing; if no continuous unboxing video is provided; or if the item belongs to a non-returnable category for hygiene reasons (such as perfumes, innerwear, and personal care products).
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-playfair text-xl font-semibold text-brand-text">3. Return Pickup & Logistics</h3>
              <p className="text-brand-grey text-xs md:text-sm leading-relaxed text-left">
                Once your return request is validated and approved, our logistics team will coordinate reverse collection directly from your delivery address. Please pack the item securely in its original packaging along with all documentation.
              </p>
            </section>

            <section className="space-y-3">
              <h3 className="font-playfair text-xl font-semibold text-brand-text">4. Refund Processing & Timelines</h3>
              <p className="text-brand-grey text-xs md:text-sm leading-relaxed text-left">
                After the returned product is received and inspected at our warehouse, refunds are initiated within 5 to 7 business days. Pre-paid orders are refunded back to the original payment source. For Cash on Delivery (COD) orders, refunds are transferred via NEFT/UPI to the bank account details provided during the return request.
              </p>
            </section>

            <div className="pt-6 border-t border-brand-light flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-brand-text">Need to return an item or check status?</p>
                <p className="text-xs text-brand-grey">Track active return requests in your account dashboard.</p>
              </div>
              <Link to="/account/returns" className="btn-primary text-xs py-2.5 px-6 shrink-0">
                View Returns & Refunds
              </Link>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  );
};

export default ReturnsPage;
