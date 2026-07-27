import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import QuickViewModal from './components/QuickViewModal';
import RegisterPopup from './components/RegisterPopup';
import HomePage from './pages/HomePage';
import ProductListingPage from './pages/ProductListingPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderConfirmationPage from './pages/OrderConfirmationPage';
import AccountLayout from './pages/account/AccountLayout';
import ProfilePage from './pages/account/ProfilePage';
import OrdersPage from './pages/account/OrdersPage';
import OrderDetailPage from './pages/account/OrderDetailPage';
import WishlistPage from './pages/account/WishlistPage';
import LoyaltyPage from './pages/account/LoyaltyPage';
import PersonalShopperPage from './pages/account/PersonalShopperPage';
import SupportPage from './pages/account/SupportPage';
import MyReviewsPage from './pages/account/MyReviewsPage';
import NotFoundPage from './pages/NotFoundPage';
import LoaderPreviewPage from './pages/LoaderPreviewPage';
import ContactPage from './pages/ContactPage';
import AboutPage from './pages/AboutPage';
import PrivacyPage from './pages/PrivacyPage';
import ShippingPage from './pages/ShippingPage';
import CancellationPage from './pages/CancellationPage';
import ReturnsPage from './pages/ReturnsPage';
import api from './services/api';
import { fetchProfile } from './redux/slices/authSlice';
import { fetchWishlist } from './redux/slices/wishlistSlice';
import { getAccessToken } from './utils/tokenStorage';

const App = () => {
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    let scrollTimeout;
    let ticking = false;
    // rAF-throttled to match Navbar's scroll listener — this used to run its
    // classList work on every single 'scroll' event (which can fire dozens
    // of times per frame), doubling up on layout work alongside Navbar's own
    // handler and contributing to the scroll "lag".
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        if (!document.body.classList.contains('disable-hover')) {
          document.body.classList.add('disable-hover');
        }
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          document.body.classList.remove('disable-hover');
        }, 150); // 150ms debounce
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  // ── Bootstrap: fetch profile whenever a token exists ────────────────────────
  // Runs once on mount. If a token is in localStorage, call /getme to load
  // fresh customer data into Redux — covers page refresh, new tab, etc.
  // ── Bootstrap: fetch profile & wishlist whenever a token exists ─────────────
  useEffect(() => {
    if (getAccessToken()) {
      dispatch(fetchProfile());
      dispatch(fetchWishlist());
    }
  }, [dispatch]);

  const trackedRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refCode = params.get('referral') || params.get('ref');
    if (refCode) {
      const sanitized = refCode.trim();
      const sessionKey = `bb_tracked_ref_${sanitized}`;

      // Deduplicate to prevent double tracking on React StrictMode or double renders
      if (sessionStorage.getItem(sessionKey) || trackedRef.current === sanitized) {
        return;
      }

      trackedRef.current = sanitized;
      sessionStorage.setItem(sessionKey, 'true');

      // Track click on the backend before storing
      api.get(`/affiliates/track?ref=${encodeURIComponent(sanitized)}`)
        .then(res => {
          if (res.data?.success) {
            localStorage.setItem('bb_referral', sanitized);
            console.log('[Referral] Tracked click successfully:', res.data);
          }
        })
        .catch(err => {
          localStorage.removeItem('bb_referral');
          sessionStorage.removeItem(sessionKey);
          trackedRef.current = null;
          const isDisabled = err.response?.data?.disabled;
          const msg = err.response?.data?.message || 'This affiliate referral link is no longer active.';
          if (isDisabled) {
            toast.error(msg, { id: 'affiliate-inactive-toast' });
          }
          console.warn('[Referral] Link inactive or invalid:', msg);
        });
    }
  }, [location.search]);

  return (
    <>
      <ScrollToTop />
      <Navbar />
      <CartDrawer />
      <QuickViewModal />
      <RegisterPopup />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { fontFamily: 'Inter, sans-serif', fontSize: 14, borderRadius: 0, border: '1px solid #F0EEE8' },
          success: { iconTheme: { primary: '#C9A24B', secondary: 'white' } },
        }}
      />
      {/* Page fade transitions — Framer Motion */}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductListingPage />} />
          <Route path="/category/:slug" element={<ProductListingPage />} />
          <Route path="/category/:slug/:sub" element={<ProductListingPage />} />
          <Route path="/category/:slug/:sub/:subsub" element={<ProductListingPage />} />
          <Route path="/products/:slug" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
           <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
          <Route path="/loader-preview" element={<LoaderPreviewPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/shipping" element={<ShippingPage />} />
          <Route path="/cancellation" element={<CancellationPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/forgot-password" element={<Navigate to="/account?view=forgot" replace />} />
          <Route path="/account" element={<AccountLayout />}>
            <Route index element={<ProfilePage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="wishlist" element={<WishlistPage />} />
            <Route path="loyalty" element={<LoyaltyPage />} />
            <Route path="personal-shopper" element={<PersonalShopperPage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="reviews" element={<MyReviewsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AnimatePresence>
    </>
  );
};

export default App;