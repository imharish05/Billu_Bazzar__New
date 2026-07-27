import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, MapPin, CreditCard, Package, ChevronRight, Eye, EyeOff, Tag, Sparkles } from 'lucide-react';
import { placeOrder } from '../redux/slices/ordersSlice';
import { clearLocal, syncCart, clearBuyNowItem, fetchCart } from '../redux/slices/cartSlice';
import { loginCustomer, registerCustomer, fetchProfile } from '../redux/slices/authSlice';
import { setCurrency } from '../redux/slices/currencySlice';
import api from '../services/api';
import Footer from '../components/Footer';
import { formatPrice } from '../utils/currency';
import toast from 'react-hot-toast';
import { validatePhoneNumber } from '../utils/validation';

const STEPS = [
  { id: 1, label: 'Delivery', icon: MapPin },
  { id: 2, label: 'Payment', icon: CreditCard },
  { id: 3, label: 'Review', icon: Package },
];

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep',
  'Puducherry',
];

const CheckoutPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isBuyNowMode = searchParams.get('mode') === 'buynow';

  const { items: cartItems, subtotal: cartSubtotal, buyNowItem } = useSelector(s => s.cart);
  const { isAuthenticated, customer } = useSelector(s => s.auth);
  const { code: currencyCode, rate: currencyRate } = useSelector(s => s.currency);

  const items = isBuyNowMode && buyNowItem ? [buyNowItem] : cartItems;
  const orderCompletedRef = useRef(false);

  const subtotal = items.reduce((sum, item) => {
    const price = parseFloat(item.priceAtAdd || item.price || item.product?.price || 0);
    return sum + (price * (item.quantity || 1));
  }, 0);

  // Login panel state
  const [showLoginPanel, setShowLoginPanel] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Create account state
  const [createAccount, setCreateAccount] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  // Checkout state
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);

  // Admin-configurable OTP threshold settings (Default: INR 20,000 / AED 800)
  const [otpSettings, setOtpSettings] = useState({
    inrThreshold: 20000,
    aedThreshold: 800,
    requireCodOtp: true,
  });

  // Loyalty Settings & Auto-Apply state
  const [loyaltySettings, setLoyaltySettings] = useState({
    earnRate: 20,
    redeemRate: 0.2,
    maxRedeemAmount: 500
  });

  const [redeemPoints, setRedeemPoints] = useState(
    location.state?.redeemPoints !== undefined
      ? Boolean(location.state.redeemPoints)
      : true
  );

  useEffect(() => {
    if (location.state?.redeemPoints === undefined && customer && customer.loyaltyPoints > 0) {
      setRedeemPoints(true);
    }
  }, [customer, location.state?.redeemPoints]);

  useEffect(() => {
    api.get('/settings/otp_threshold')
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setOtpSettings({
            inrThreshold: Number(res.data.data.inrThreshold) || 20000,
            aedThreshold: Number(res.data.data.aedThreshold) || 800,
            requireCodOtp: res.data.data.requireCodOtp !== false,
          });
        }
      })
      .catch(err => {
        console.warn('[Checkout] Using default OTP thresholds (INR 20,000 / AED 800):', err.message);
      });

    api.get('/site-settings/loyalty')
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setLoyaltySettings({
            earnRate: Number(res.data.data.earnRate) || 20,
            redeemRate: Number(res.data.data.redeemRate) || 0.2,
            maxRedeemAmount: Number(res.data.data.maxRedeemAmount) || 500
          });
        }
      })
      .catch(err => console.warn('[Checkout] Failed to fetch loyalty settings', err));
  }, []);

  const getItemDetails = (item) => {
    const name = item.product?.name || item.productName || item.name || 'Luxury Product';

    // Resolve image URL
    let rawImg = item.image || item.productImage || item.product?.image || (item.product?.images && item.product.images[0]);
    if (!rawImg || rawImg === 'undefined') {
      rawImg = 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=160';
    } else if (typeof rawImg === 'string' && rawImg.startsWith('/') && !rawImg.startsWith('//')) {
      rawImg = `http://localhost:5000${rawImg}`;
    }

    // Variant details
    let variantText = null;
    const rawVar = item.selectedVariant || item.variant;
    if (rawVar) {
      let parsedVar = rawVar;
      if (typeof rawVar === 'string') {
        try { parsedVar = JSON.parse(rawVar); } catch { parsedVar = null; }
      }
      if (parsedVar && typeof parsedVar === 'object') {
        const entries = Object.entries(parsedVar).filter(([k, v]) => v !== undefined && v !== null && v !== '' && k !== 'id');
        if (entries.length > 0) {
          variantText = entries.map(([k, v]) => `${k}: ${v}`).join(' · ');
        }
      } else if (typeof rawVar === 'string' && rawVar !== '{}') {
        variantText = rawVar;
      }
    }

    const price = parseFloat(item.priceAtAdd || item.price || item.unitPrice || item.product?.price || 0);

    return { name, image: rawImg, variantText, price };
  };

  const handleTriggerFraudCheck = async () => {
    const targetEmail = (billingAddress.email || customer?.email || '').trim();
    if (!targetEmail) {
      toast.error('Please provide a valid email address for order verification.');
      return;
    }
    setOtp('');
    setOtpLoading(true);
    try {
      await api.post('/auth/send-checkout-otp', {
        email: targetEmail,
        name: billingAddress.fullName || customer?.name || 'Customer'
      });
      setOtpSent(true);
      toast.success(`Verification OTP sent to ${targetEmail}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send verification email. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyFraudOtp = async (codeValue) => {
    const code = codeValue || otp;
    if (code.length < 6) {
      toast.error('Please enter the full 6-digit code.');
      return;
    }
    const targetEmail = (billingAddress.email || customer?.email || '').trim();
    setVerifyingOtp(true);
    try {
      await api.post('/auth/verify-checkout-otp', {
        email: targetEmail,
        otp: code
      });
      setIsVerified(true);
      setOtpSent(false);
      toast.success('Security verification successful!');
      handlePlaceOrder();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const fmt = (v) => formatPrice(v, currencyCode, currencyRate);

  const getEstimatedDeliveryRange = (pincode) => {
    let minDays = 3, maxDays = 5;
    if (pincode && pincode.trim().length === 6) {
      const fd = pincode.trim()[0];
      if (['1', '4', '5', '6'].includes(fd)) { minDays = 2; maxDays = 3; }
      else { minDays = 4; maxDays = 7; }
    }
    const today = new Date();
    const minDate = new Date(); minDate.setDate(today.getDate() + minDays);
    const maxDate = new Date(); maxDate.setDate(today.getDate() + maxDays);
    const opts = { weekday: 'short', day: 'numeric', month: 'short' };
    return `${minDate.toLocaleDateString('en-US', opts)} — ${maxDate.toLocaleDateString('en-US', opts)}`;
  };

  const emptyAddr = {
    fullName: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    flatHouse: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
  };

  const [billingAddress, setBillingAddress] = useState({ ...emptyAddr });
  const [deliverySameAsBilling, setDeliverySameAsBilling] = useState(true);
  const [address, setAddress] = useState({ ...emptyAddr });
  const [paymentMethod, setPaymentMethod] = useState('Credit / Debit Card');

  const handleToggleDeliverySame = (checked) => {
    setDeliverySameAsBilling(checked);
    if (!checked) setAddress({ ...billingAddress });
  };

  // Auto-suggest AED currency when UAE shipping country is entered
  useEffect(() => {
    const activeAddress = deliverySameAsBilling ? billingAddress : address;
    const country = (activeAddress.country || '').trim().toLowerCase();
    const isUaeCountry = ['uae', 'united arab emirates', 'dubai', 'abu dhabi', 'sharjah'].includes(country);
    if (isUaeCountry && currencyCode !== 'AED') {
      dispatch(setCurrency('AED'));
    }
  }, [billingAddress.country, address.country, deliverySameAsBilling, currencyCode, dispatch]);

  // Delivery Zone Pincode Lookup for Dynamic Shipping Charge
  const [pincodeZoneData, setPincodeZoneData] = useState(null);
  const activePincode = (deliverySameAsBilling ? billingAddress.pincode : address.pincode || '').toString().trim();

  useEffect(() => {
    if (!activePincode || activePincode.length < 3) {
      setPincodeZoneData(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/delivery-zones/check/${activePincode}`);
        if (res.data && res.data.success && res.data.deliverable) {
          setPincodeZoneData(res.data);
        } else if (res.data && res.data.deliverable === false) {
          setPincodeZoneData({ deliverable: false, message: res.data.message });
        } else {
          setPincodeZoneData(null);
        }
      } catch (err) {
        setPincodeZoneData(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [activePincode]);

  // Guard: don't let an empty cart sit on checkout (unless order was just completed and navigating to confirmation)
  useEffect(() => {
    if (items.length === 0 && !orderCompletedRef.current) {
      toast.error('Your cart is empty. Add something before checking out.');
      navigate('/cart', { replace: true });
    }
  }, [items, navigate]);

  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const saved = localStorage.getItem('bb_applied_coupon');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await api.get('/coupons');
        if (res.data?.success) {
          const active = (res.data.coupons || []).filter(c => c.isActive);
          setAvailableCoupons(active);
        }
      } catch (err) {
        console.error('Failed to load coupons:', err);
      }
    };
    fetchCoupons();
  }, []);

  const [userDiscountChoice, setUserDiscountChoice] = useState(null); // 'COUPON' | 'LOYALTY' | null

  const getCouponDiscount = (coupon, totalVal) => {
    if (!coupon) return 0;
    if (totalVal < Number(coupon.minOrderValue || 0)) return 0;
    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) return 0;
    if (coupon.validUntil && new Date(coupon.validUntil) < now) return 0;

    const value = Number(coupon.value || 0);
    if (coupon.type === 'PERCENT') {
      const maxD = Number(coupon.maxDiscount || Infinity);
      return Math.min((totalVal * value) / 100, maxD);
    }
    if (coupon.type === 'FLAT') {
      return Math.min(value, totalVal);
    }
    return 0;
  };

  // ── AUTO-APPLY BEST DISCOUNT ENGINE [NEW - PREMIUM] ──
  // Calculate potential savings for both discount options
  const potentialLoyaltyDisc = (customer && customer.loyaltyPoints > 0)
    ? Math.min(customer.loyaltyPoints * loyaltySettings.redeemRate, loyaltySettings.maxRedeemAmount, subtotal)
    : 0;

  const rawCouponDisc = appliedCoupon ? getCouponDiscount(appliedCoupon, subtotal) : 0;

  // Resolve active discount type based on best discount algorithm or user choice
  let activeDiscountType = null; // 'COUPON' | 'LOYALTY' | null
  let couponDiscount = 0;
  let loyaltyDiscountVal = 0;

  if (userDiscountChoice === 'COUPON' && appliedCoupon && rawCouponDisc > 0) {
    activeDiscountType = 'COUPON';
    couponDiscount = rawCouponDisc;
  } else if (userDiscountChoice === 'LOYALTY' && potentialLoyaltyDisc > 0) {
    activeDiscountType = 'LOYALTY';
    loyaltyDiscountVal = potentialLoyaltyDisc;
  } else {
    // Auto-select whichever yields HIGHER savings
    if (rawCouponDisc > potentialLoyaltyDisc && rawCouponDisc > 0) {
      activeDiscountType = 'COUPON';
      couponDiscount = rawCouponDisc;
    } else if (potentialLoyaltyDisc > 0) {
      activeDiscountType = 'LOYALTY';
      loyaltyDiscountVal = potentialLoyaltyDisc;
    }
  }

  // Synchronize redeemPoints boolean for placeOrder payload
  const effectiveRedeemPoints = activeDiscountType === 'LOYALTY';

  const handleApplyCheckoutCoupon = async (overrideCode = null) => {
    const code = (typeof overrideCode === 'string' ? overrideCode : couponCodeInput).trim().toUpperCase();
    if (!code) return;
    setValidatingCoupon(true);
    try {
      const res = await api.post('/coupons/validate', { code, subtotal });
      if (res.data?.success && res.data?.valid) {
        setAppliedCoupon(res.data.coupon);
        localStorage.setItem('bb_applied_coupon', JSON.stringify(res.data.coupon));
        setUserDiscountChoice('COUPON');
        setRedeemPoints(false);
        toast.success(`Coupon ${res.data.coupon.code} applied! (Loyalty points unapplied as only 1 discount is allowed)`);
        setCouponCodeInput('');
      } else {
        toast.error(res.data?.message || 'Invalid coupon code');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid coupon code');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCheckoutCoupon = () => {
    setAppliedCoupon(null);
    localStorage.removeItem('bb_applied_coupon');
    setUserDiscountChoice(null);
    toast.success('Coupon removed.');
  };

  const handleToggleLoyaltyPoints = (checked) => {
    if (checked) {
      setRedeemPoints(true);
      setAppliedCoupon(null);
      localStorage.removeItem('bb_applied_coupon');
      setUserDiscountChoice('LOYALTY');
      toast.success(`Loyalty points applied! (Coupon unapplied as only 1 discount is allowed)`);
    } else {
      setRedeemPoints(false);
      setUserDiscountChoice(null);
    }
  };

  const isGiftWrap = Boolean(location.state?.giftWrap);
  const giftWrapPrice = isGiftWrap ? Number(location.state?.giftWrapPrice || 99) : 0;
  let shipping = 0;
  let shippingStatus = 'PENDING'; // 'PENDING' | 'DELIVERABLE' | 'NOT_DELIVERABLE'

  if (!activePincode || activePincode.trim().length < 3) {
    shippingStatus = 'PENDING';
    shipping = 0;
  } else if (pincodeZoneData) {
    if (pincodeZoneData.deliverable) {
      shippingStatus = 'DELIVERABLE';
      if (pincodeZoneData.minOrderAmountForFreeDelivery !== null && pincodeZoneData.minOrderAmountForFreeDelivery !== undefined && subtotal >= pincodeZoneData.minOrderAmountForFreeDelivery) {
        shipping = 0;
      } else {
        shipping = parseFloat(pincodeZoneData.deliveryCharge || 0);
      }
    } else {
      shippingStatus = 'NOT_DELIVERABLE';
      shipping = 0;
    }
  } else {
    shippingStatus = 'PENDING';
    shipping = 0;
  }
  const taxableSubtotal = Math.max(0, subtotal - (couponDiscount + loyaltyDiscountVal));
  const tax = Math.round((taxableSubtotal * 5) / 105);

  const total = taxableSubtotal + shipping + giftWrapPrice;

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) { toast.error('Enter your email and password'); return; }
    setLoginLoading(true);
    try {
      await dispatch(loginCustomer({ email: loginEmail, password: loginPassword })).unwrap();
      toast.success('Logged in successfully!');
      setShowLoginPanel(false);
    } catch (err) {
      toast.error(err || 'Login failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!billingAddress.fullName?.trim()) {
      toast.error('Please enter your Full Name in the Billing Address section above.');
      return;
    }
    if (!billingAddress.email?.trim()) {
      toast.error('Please enter your Email Address in the Billing Address section above.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingAddress.email.trim())) {
      toast.error('Please enter a valid email address in the Billing Address section.');
      return;
    }
    if (!billingAddress.phone?.trim()) {
      toast.error('Please enter your Mobile Number in the Billing Address section above.');
      return;
    }
    const phoneValidation = validatePhoneNumber(billingAddress.phone);
    if (!phoneValidation.isValid) {
      toast.error('Billing Phone: ' + phoneValidation.message);
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setRegisterLoading(true);
    try {
      await dispatch(registerCustomer({
        name: billingAddress.fullName.trim(),
        email: billingAddress.email.trim().toLowerCase(),
        password: newPassword,
        phone: billingAddress.phone.trim()
      })).unwrap();
      toast.success('Account created and logged in successfully!');
    } catch (err) {
      toast.error(err || 'Registration failed. Please check your details.');
    } finally {
      setRegisterLoading(false);
    }
  };

  // Helper to dynamically load Razorpay checkout script
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to your account to place an order.');
      setStep(1);
      setShowLoginPanel(true);
      return;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty. Add something before checking out.');
      navigate('/cart');
      return;
    }
    setPlacing(true);
    try {
      // 1. Sync the client's current cart list to the server database first (concurrency & tampering protection)
      const itemsToSync = items.map(i => ({
        productId: i.productId,
        variantId: i.variantId || i.selectedVariant?.id || null,
        quantity: i.quantity,
        selectedVariant: i.selectedVariant || {}
      }));
      await dispatch(syncCart(itemsToSync)).unwrap();

      // 2. Proceed with order placement using server-side cart database truth
      const referralCode = localStorage.getItem('bb_referral') || undefined;
      const order = await dispatch(placeOrder({
        shippingAddress: deliverySameAsBilling ? billingAddress : address,
        billingAddress: billingAddress,
        paymentMethod, referralCode,
        couponCode: effectiveRedeemPoints ? undefined : (appliedCoupon ? appliedCoupon.code : undefined),
        redeemPoints: effectiveRedeemPoints,
      })).unwrap();

      const finishOrderClear = () => {
        orderCompletedRef.current = true;
        localStorage.removeItem('bb_referral');
        localStorage.removeItem('bb_applied_coupon');
        dispatch(clearBuyNowItem());
        dispatch(clearLocal());
        dispatch(fetchCart());
        dispatch(fetchProfile());
      };

      // 3. COD: skip payment gateway entirely, go straight to confirmation
      const isCod = paymentMethod === 'Cash on Delivery (COD)';
      if (isCod) {
        finishOrderClear();
        if (customer) toast.success('Reward points added for this order!');
        navigate(`/order-confirmation?gateway=cod&orderId=${order.id}&status=success`, { replace: true });
        return;
      }

      // 4. Initiate payment gateway transaction (Razorpay for INR, Telr for AED)
      const initRes = await api.post('/payments/initiate', { orderId: order.id });
      if (!initRes.data?.success) {
        throw new Error(initRes.data?.message || 'Failed to initialize payment details from gateway.');
      }

      const paymentData = initRes.data;

      if (paymentData.gateway === 'telr') {
        // Telr: redirect to hosted payment page
        finishOrderClear();
        window.location.href = paymentData.redirectUrl;

      } else if (paymentData.gateway === 'razorpay') {
        // Razorpay: load SDK and open checkout overlay
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          toast.error('Failed to load Razorpay SDK. Please check your internet connection.');
          setPlacing(false);
          return;
        }

        const options = {
          key: paymentData.key,
          amount: paymentData.amount,
          currency: paymentData.currency,
          name: paymentData.name,
          description: paymentData.description,
          order_id: paymentData.order_id,
          handler: async function (response) {
            setPlacing(true);
            try {
              const verifyRes = await api.post('/payments/verify', {
                orderId: order.id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
              });
              if (verifyRes.data?.success) {
                finishOrderClear();
                if (customer) toast.success('Reward points added for this order!');
                navigate(`/order-confirmation?gateway=razorpay&orderId=${order.id}&status=success`, { replace: true });
              } else {
                toast.error(verifyRes.data?.message || 'Payment verification failed. Please contact support.');
              }
            } catch (err) {
              console.error('Payment verification failed:', err);
              toast.error(err.response?.data?.message || 'Failed to verify payment with server.');
            } finally {
              setPlacing(false);
            }
          },
          prefill: {
            name: billingAddress.fullName,
            email: billingAddress.email,
            contact: billingAddress.phone,
          },
          theme: {
            color: '#C9A24B',
          },
          modal: {
            ondismiss: function () {
              toast.error('Payment process was cancelled.');
              setPlacing(false);
            }
          }
        };

        // Stop the main spinner — Razorpay overlay handles UI from here
        setPlacing(false);
        const rzp = new window.Razorpay(options);
        rzp.open();

      } else {
        throw new Error('Unknown payment gateway returned from server.');
      }

    } catch (err) {
      console.error('Order failed:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to place order. Please try again.');
      setPlacing(false);
    }
  };


  const validateStep1 = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to your account to continue to payment.');
      setShowLoginPanel(true);
      setTimeout(() => {
        const loginEl = document.getElementById('toggle-login-panel');
        if (loginEl) {
          loginEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return false;
    }
    const requiredFields = [
      { key: 'fullName', label: 'Full Name' },
      { key: 'phone', label: 'Mobile Number' },
      { key: 'email', label: 'Email Address' },
      { key: 'flatHouse', label: 'Street / House No.' },
      { key: 'city', label: 'City' },
      { key: 'state', label: 'State / Province' },
      { key: 'pincode', label: 'Postal / Zip code' },
      { key: 'country', label: 'Country' },
    ];
    for (const f of requiredFields) {
      if (!billingAddress[f.key]?.trim()) {
        toast.error(`Please enter ${f.label}`);
        return false;
      }
    }
    const phoneValidation = validatePhoneNumber(billingAddress.phone);
    if (!phoneValidation.isValid) {
      toast.error(phoneValidation.message);
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingAddress.email.trim())) {
      toast.error('Please enter a valid email address');
      return false;
    }
    if (billingAddress.pincode.trim().length < 3) {
      toast.error('Please enter a valid postal or zip code');
      return false;
    }
    if (!deliverySameAsBilling) {
      for (const f of requiredFields) {
        if (!address[f.key]?.trim()) {
          toast.error(`Please enter delivery ${f.label}`);
          return false;
        }
      }
      const delPhoneValidation = validatePhoneNumber(address.phone);
      if (!delPhoneValidation.isValid) {
        toast.error('Delivery Phone: ' + delPhoneValidation.message);
        return false;
      }
    }
    if (createAccount && newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const inputCls = 'w-full border border-neutral-200 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/20 transition-colors placeholder-neutral-400 bg-white';
  const labelCls = 'block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5';

  return (
    <main id="main-content">
      <div className="max-w-site mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 className="font-playfair text-2xl md:text-3xl font-bold mb-2">Secure Checkout</h1>

        {/* Returning customer panel */}
        {!isAuthenticated && (
          <div className="mb-6">
            <p className="text-sm text-neutral-500 mb-3">
              Returning customer?{' '}
              <button
                onClick={() => setShowLoginPanel(v => !v)}
                className="text-brand-gold font-semibold hover:underline focus:outline-none"
                id="toggle-login-panel"
              >
                Click here to login
              </button>
            </p>

            <AnimatePresence>
              {showLoginPanel && (
                <motion.div
                  key="login-panel"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <form
                    onSubmit={handleLogin}
                    className="bg-neutral-50 border border-neutral-200 rounded-lg p-5 mb-4"
                  >
                    <p className="text-xs text-neutral-500 mb-4">
                      If you have shopped with us before, please enter your login details below.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls} htmlFor="login-email">Email Address</label>
                        <input
                          id="login-email"
                          type="email"
                          value={loginEmail}
                          onChange={e => setLoginEmail(e.target.value)}
                          placeholder="your@email.com"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls} htmlFor="login-password">Password</label>
                        <div className="relative">
                          <input
                            id="login-password"
                            type={showLoginPw ? 'text' : 'password'}
                            value={loginPassword}
                            onChange={e => setLoginPassword(e.target.value)}
                            placeholder="Your password"
                            className={`${inputCls} pr-10`}
                          />
                          <button type="button" onClick={() => setShowLoginPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                            {showLoginPw ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <button type="submit" disabled={loginLoading} className="btn-primary px-6 py-2 text-sm" id="login-btn">
                        {loginLoading ? 'Logging in…' : 'Login'}
                      </button>
                      <Link
                        to={`/account?view=forgot${loginEmail ? `&email=${encodeURIComponent(loginEmail.trim())}` : ''}`}
                        className="text-xs text-brand-gold hover:underline"
                        id="checkout-forgot-password-link"
                      >
                        Forgot password?
                      </Link>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Checkout steps */}
        <div className="glass-step-pill flex items-center justify-center gap-0 mb-8 p-1 px-2 sm:p-2 sm:px-5 rounded-full w-fit mx-auto" aria-label="Checkout progress">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => step > s.id && setStep(s.id)}
                className={`flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-4 sm:py-2 rounded-full text-[10px] sm:text-xs md:text-sm font-semibold tracking-wider uppercase transition-all ${step === s.id ? 'bg-brand-gold text-white' : step > s.id ? 'text-brand-gold cursor-pointer hover:bg-brand-light' : 'text-brand-grey cursor-default'}`}
                aria-current={step === s.id ? 'step' : undefined}
                id={`step-${s.id}`}
              >
                {step > s.id ? <Check size={10} className="sm:w-3.5 sm:h-3.5" /> : <s.icon size={10} className="sm:w-3.5 sm:h-3.5" />}
                <span>
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight size={10} className="text-brand-grey mx-0.5 sm:mx-1 sm:w-3.5 sm:h-3.5" />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8 md:gap-10">
          {/* Form area */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">

              {/* ── Step 1: Delivery ── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div className="bg-white border border-neutral-200 rounded-lg p-5 md:p-6">
                    <h2 className="font-playfair text-xl font-semibold mb-1">Billing Address</h2>
                    <p className="text-xs text-neutral-400 mb-5">All fields marked * are required</p>



                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls} htmlFor="full-name">Full Name <span className="text-red-400">*</span></label>
                          <input id="full-name" type="text" value={billingAddress.fullName}
                            onChange={e => setBillingAddress(p => ({ ...p, fullName: e.target.value }))}
                            placeholder="Enter your full name" className={inputCls} required />
                        </div>
                        <div>
                          <label className={labelCls} htmlFor="mobile">Mobile Number <span className="text-red-400">*</span></label>
                          <input id="mobile" type="tel" value={billingAddress.phone}
                            onChange={e => setBillingAddress(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                            placeholder="10-digit mobile" maxLength={10} className={inputCls} required />
                        </div>
                      </div>

                      {/* Email */}
                      <div className="sm:col-span-2">
                        <label className={labelCls} htmlFor="email-addr">Email Address <span className="text-red-400">*</span></label>
                        <input id="email-addr" type="email" value={billingAddress.email}
                          onChange={e => setBillingAddress(p => ({ ...p, email: e.target.value }))}
                          placeholder="your@email.com" className={inputCls} required />
                      </div>

                      {/* Street */}
                      <div className="sm:col-span-2">
                        <label className={labelCls} htmlFor="flat-house">Street / House No. <span className="text-red-400">*</span></label>
                        <input id="flat-house" type="text" value={billingAddress.flatHouse}
                          onChange={e => setBillingAddress(p => ({ ...p, flatHouse: e.target.value }))}
                          placeholder="House / flat no., road name" className={inputCls} required />
                      </div>

                      {/* Landmark (optional) */}
                      <div className="sm:col-span-2">
                        <label className={labelCls} htmlFor="landmark">Apartment / Landmark <span className="text-neutral-300">(optional)</span></label>
                        <input id="landmark" type="text" value={billingAddress.landmark}
                          onChange={e => setBillingAddress(p => ({ ...p, landmark: e.target.value }))}
                          placeholder="Building name, floor, landmark" className={inputCls} />
                      </div>

                      {/* City */}
                      <div>
                        <label className={labelCls} htmlFor="city">City <span className="text-red-400">*</span></label>
                        <input id="city" type="text" value={billingAddress.city}
                          onChange={e => setBillingAddress(p => ({ ...p, city: e.target.value }))}
                          placeholder="City" className={inputCls} required />
                      </div>

                      {/* State Input */}
                      <div>
                        <label className={labelCls} htmlFor="state">State / Province / Region <span className="text-red-400">*</span></label>
                        <input id="state" type="text" value={billingAddress.state}
                          onChange={e => setBillingAddress(p => ({ ...p, state: e.target.value }))}
                          placeholder="State / Province / Region" className={inputCls} required />
                      </div>

                      {/* Pincode / Zipcode */}
                      <div>
                        <label className={labelCls} htmlFor="pincode">Pincode / Zipcode <span className="text-red-400">*</span></label>
                        <input id="pincode" type="text" value={billingAddress.pincode}
                          onChange={e => setBillingAddress(p => ({ ...p, pincode: e.target.value }))}
                          placeholder="Postal / Zip code" className={inputCls} required />
                        {(!billingAddress.pincode || billingAddress.pincode.trim().length < 3) && deliverySameAsBilling && (
                          <p className="text-[11px] text-neutral-400 mt-1 italic">
                            Enter pincode to calculate shipping charge
                          </p>
                        )}
                        {pincodeZoneData && deliverySameAsBilling && billingAddress.pincode.trim().length >= 3 && (
                          pincodeZoneData.deliverable ? (
                            <p className="text-[12px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                              📍 Delivery Available ({pincodeZoneData.zoneName}) — {
                                shipping === 0 ? (
                                  pincodeZoneData.minOrderAmountForFreeDelivery !== null
                                    ? `FREE Delivery (Order above ₹${pincodeZoneData.minOrderAmountForFreeDelivery})!`
                                    : 'FREE Delivery!'
                                ) : (
                                  `Shipping Fee: ₹${shipping}${pincodeZoneData.minOrderAmountForFreeDelivery !== null ? ` (Free on orders above ₹${pincodeZoneData.minOrderAmountForFreeDelivery})` : ''}`
                                )
                              }
                            </p>
                          ) : (
                            <p className="text-[12px] text-red-500 mt-1 font-semibold">
                              ⚠️ {pincodeZoneData.message || 'Delivery not available for this pincode'}
                            </p>
                          )
                        )}
                      </div>

                      {/* Country */}
                      <div>
                        <label className={labelCls} htmlFor="country">Country <span className="text-red-400">*</span></label>
                        <input id="country" type="text" value={billingAddress.country}
                          onChange={e => setBillingAddress(p => ({ ...p, country: e.target.value }))}
                          placeholder="Country" className={inputCls} required />
                      </div>
                    </div>

                    {/* Same delivery toggle */}
                    <div className="mt-5 flex items-center gap-3">
                      <input id="same-delivery" type="checkbox" checked={deliverySameAsBilling}
                        onChange={e => handleToggleDeliverySame(e.target.checked)}
                        className="w-4 h-4 accent-brand-gold cursor-pointer" />
                      <label htmlFor="same-delivery" className="text-sm font-medium text-brand-text cursor-pointer select-none">
                        Delivery address is same as billing address
                      </label>
                    </div>

                    {/* Separate delivery address */}
                    <AnimatePresence initial={false}>
                      {!deliverySameAsBilling && (
                        <motion.div
                          key="delivery-section"
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }} className="overflow-hidden"
                        >
                          <h3 className="font-playfair text-lg font-semibold mt-6 mb-4 border-t border-neutral-100 pt-5">Delivery Address</h3>
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className={labelCls} htmlFor="d-fullname">Full Name *</label>
                                <input id="d-fullname" type="text" value={address.fullName} onChange={e => setAddress(p => ({...p, fullName: e.target.value}))} placeholder="Full name" className={inputCls} />
                              </div>
                              <div>
                                <label className={labelCls} htmlFor="d-phone">Mobile *</label>
                                <input id="d-phone" type="tel" value={address.phone} onChange={e => setAddress(p => ({...p, phone: e.target.value.replace(/\D/g,'').slice(0,10)}))} placeholder="Mobile number" className={inputCls} />
                              </div>
                            </div>
                            <div className="sm:col-span-2">
                              <label className={labelCls} htmlFor="d-email">Email *</label>
                              <input id="d-email" type="email" value={address.email} onChange={e => setAddress(p => ({...p, email: e.target.value}))} placeholder="your@email.com" className={inputCls} />
                            </div>
                            <div className="sm:col-span-2">
                              <label className={labelCls} htmlFor="d-flat">Street / House No. *</label>
                              <input id="d-flat" type="text" value={address.flatHouse} onChange={e => setAddress(p => ({...p, flatHouse: e.target.value}))} placeholder="House / flat no., road name" className={inputCls} />
                            </div>
                            <div className="sm:col-span-2">
                              <label className={labelCls} htmlFor="d-landmark">Apartment / Landmark</label>
                              <input id="d-landmark" type="text" value={address.landmark} onChange={e => setAddress(p => ({...p, landmark: e.target.value}))} placeholder="Building name, floor, landmark" className={inputCls} />
                            </div>
                            <div>
                              <label className={labelCls} htmlFor="d-city">City *</label>
                              <input id="d-city" type="text" value={address.city} onChange={e => setAddress(p => ({...p, city: e.target.value}))} placeholder="City" className={inputCls} />
                            </div>
                            <div>
                              <label className={labelCls} htmlFor="d-state">State / Province / Region *</label>
                              <input id="d-state" type="text" value={address.state} onChange={e => setAddress(p => ({...p, state: e.target.value}))} placeholder="State / Province / Region" className={inputCls} />
                            </div>
                            <div>
                              <label className={labelCls} htmlFor="d-pincode">Pincode / Zipcode *</label>
                              <input id="d-pincode" type="text" value={address.pincode} onChange={e => setAddress(p => ({...p, pincode: e.target.value}))} placeholder="Postal / Zip code" className={inputCls} />
                              {(!address.pincode || address.pincode.trim().length < 3) && !deliverySameAsBilling && (
                                <p className="text-[11px] text-neutral-400 mt-1 italic">
                                  Enter pincode to calculate shipping charge
                                </p>
                              )}
                              {pincodeZoneData && !deliverySameAsBilling && address.pincode.trim().length >= 3 && (
                                pincodeZoneData.deliverable ? (
                                  <p className="text-[12px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                                    📍 Delivery Available ({pincodeZoneData.zoneName}) — {
                                      shipping === 0 ? (
                                        pincodeZoneData.minOrderAmountForFreeDelivery !== null
                                          ? `FREE Delivery (Order above ₹${pincodeZoneData.minOrderAmountForFreeDelivery})!`
                                          : 'FREE Delivery!'
                                      ) : (
                                        `Shipping Fee: ₹${shipping}${pincodeZoneData.minOrderAmountForFreeDelivery !== null ? ` (Free on orders above ₹${pincodeZoneData.minOrderAmountForFreeDelivery})` : ''}`
                                      )
                                    }
                                  </p>
                                ) : (
                                  <p className="text-[12px] text-red-500 mt-1 font-semibold">
                                    ⚠️ {pincodeZoneData.message || 'Delivery not available for this pincode'}
                                  </p>
                                )
                              )}
                            </div>
                            <div>
                              <label className={labelCls} htmlFor="d-country">Country *</label>
                              <input id="d-country" type="text" value={address.country}
                                onChange={e => setAddress(p => ({...p, country: e.target.value}))}
                                placeholder="Country" className={inputCls} />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Create account optional */}
                  {!isAuthenticated && (
                    <div className="bg-white border border-neutral-200 rounded-lg p-5 md:p-6">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input type="checkbox" checked={createAccount}
                          onChange={e => setCreateAccount(e.target.checked)}
                          className="w-4 h-4 accent-brand-gold rounded cursor-pointer" id="create-account-chk" />
                        <span className="font-semibold text-sm text-brand-text">Create an account?</span>
                      </label>

                      <AnimatePresence initial={false}>
                        {createAccount && (
                          <motion.div
                            key="create-account"
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }} className="overflow-hidden mt-4"
                          >
                            <div>
                              <label className={labelCls} htmlFor="new-password">Password (min. 6 characters)</label>
                              <div className="flex flex-col sm:flex-row gap-3 max-w-md items-start sm:items-center">
                                <div className="relative flex-1 w-full">
                                  <input
                                    id="new-password"
                                    type={showNewPw ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Create a password"
                                    className={`${inputCls} pr-10`}
                                    minLength={6}
                                  />
                                  <button type="button" onClick={() => setShowNewPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                                    {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleRegister}
                                  disabled={registerLoading}
                                  className="btn-primary py-2.5 px-5 text-sm font-semibold whitespace-nowrap h-[42px] flex items-center justify-center min-w-[120px]"
                                  id="register-btn"
                                >
                                  {registerLoading ? 'Registering...' : 'Register'}
                                </button>
                              </div>
                              <p className="text-xs text-neutral-400 mt-2">
                                Fill in your name, email, and phone under Billing Address, choose a password, and click <strong>Register</strong> to create your account instantly.
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!createAccount && (
                        <div className="mt-4 bg-yellow-50 border border-yellow-200/70 rounded-md p-3 flex items-start gap-2">
                          <span className="text-base mt-0.5">💡</span>
                          <p className="text-xs text-neutral-600 leading-relaxed">
                            <strong>Note:</strong> Log in or check <strong className="text-brand-gold">"Create an account?"</strong> above to track your order history and receive delivery updates!
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <button onClick={() => { if (validateStep1()) setStep(2); }}
                    className="btn-primary w-full py-3 text-sm font-semibold" id="step1-next">
                    Continue to Payment
                  </button>
                </motion.div>
              )}

              {/* ── Step 2: Payment ── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white border border-neutral-200 rounded-lg p-5 md:p-6"
                >
                  <h2 className="font-playfair text-xl font-semibold mb-1">Payment Method</h2>
                  <p className="text-xs text-neutral-400 mb-5">All transactions are secure and encrypted.</p>
                  <div className="space-y-2.5">
                    {(currencyCode === 'AED'
                      ? [
                          { label: 'Credit / Debit Card', icon: '💳', badge: null },
                          { label: 'Apple Pay', icon: '', badge: 'Recommended' },
                          { label: 'Net Banking', icon: '🏦', badge: null },
                          { label: 'Wallets', icon: '👛', badge: null },
                        ]
                      : [
                          { label: 'Credit / Debit Card', icon: '💳', badge: null },
                          { label: 'Net Banking', icon: '🏦', badge: null },
                          { label: 'UPI', icon: '📱', badge: 'Recommended' },
                          { label: 'Wallets', icon: '👛', badge: null },
                        ]
                    ).map(({ label, icon, badge }) => (
                      <label key={label}
                        className={`flex items-center gap-3 p-4 rounded-md border cursor-pointer transition-all ${
                          paymentMethod === label
                            ? 'border-brand-gold bg-brand-gold/5'
                            : 'border-neutral-200 hover:border-brand-gold/40 bg-white'
                        }`}
                        id={`pay-${label.replace(/[\\/\s()]/g, '-')}`}>
                        <input type="radio" name="paymentMethod" value={label}
                          checked={paymentMethod === label}
                          onChange={() => setPaymentMethod(label)}
                          className="accent-brand-gold" />
                        <span className="text-lg">{icon}</span>
                        <span className="font-medium text-sm text-brand-text flex-1">{label}</span>
                        {badge && <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">{badge}</span>}
                      </label>
                    ))}
                    {/* Cash on Delivery (COD) — temporarily unavailable */}
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
                    <button onClick={() => setStep(1)} className="btn-outline flex-1 py-3 text-sm font-semibold" id="step2-back">Back</button>
                    <button onClick={() => setStep(3)} className="btn-primary flex-1 py-3 text-sm font-semibold" id="step2-next">Review Order</button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Review ── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white border border-neutral-200 rounded-lg p-5 md:p-6 space-y-6"
                >
                  <h2 className="font-playfair text-xl font-semibold">Review Your Order</h2>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="bg-neutral-50 rounded-md p-4">
                      <h3 className="font-semibold text-xs text-neutral-400 uppercase tracking-wider mb-2">Billing Address</h3>
                      <p className="text-sm font-medium text-brand-text">{billingAddress.fullName}</p>
                      <p className="text-xs text-brand-grey">{billingAddress.phone} · {billingAddress.email}</p>
                      <p className="text-xs text-brand-grey mt-1">{billingAddress.flatHouse}{billingAddress.landmark && `, ${billingAddress.landmark}`}</p>
                      <p className="text-xs text-brand-grey">{billingAddress.city}, {billingAddress.state} {billingAddress.pincode}</p>
                    </div>
                    <div className="bg-neutral-50 rounded-md p-4">
                      <h3 className="font-semibold text-xs text-neutral-400 uppercase tracking-wider mb-2">Delivery Address</h3>
                      {deliverySameAsBilling ? (
                        <p className="text-xs text-brand-grey italic">Same as billing address</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-brand-text">{address.fullName}</p>
                          <p className="text-xs text-brand-grey">{address.phone}</p>
                          <p className="text-xs text-brand-grey mt-1">{address.flatHouse}{address.landmark && `, ${address.landmark}`}</p>
                          <p className="text-xs text-brand-grey">{address.city}, {address.state} {address.pincode}</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-neutral-50 rounded-md p-4">
                    <h3 className="font-semibold text-xs text-neutral-400 uppercase tracking-wider mb-2">Payment Method</h3>
                    <p className="text-sm text-brand-text font-medium">{paymentMethod}</p>
                  </div>

                  {/* Items in Order Breakdown */}
                  <div className="bg-neutral-50 rounded-md p-4">
                    <h3 className="font-semibold text-xs text-neutral-400 uppercase tracking-wider mb-3">
                      Items in Order ({items.length})
                    </h3>
                    <div className="space-y-3">
                      {items.map((item, idx) => {
                        const details = getItemDetails(item);
                        return (
                          <div key={item.productId || item.id || idx} className="flex gap-3 items-center py-2 border-b border-neutral-200/60 last:border-0">
                            <img
                              src={details.image}
                              alt={details.name}
                              className="w-12 h-14 object-cover rounded border border-neutral-200 bg-white flex-shrink-0"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=160';
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-neutral-900 truncate">{details.name}</p>
                              {details.variantText && (
                                <p className="text-[11px] text-brand-gold font-medium mt-0.5">{details.variantText}</p>
                              )}
                              <p className="text-[11px] text-neutral-500 mt-0.5">Qty: {item.quantity} × {fmt(details.price)}</p>
                            </div>
                            <span className="text-xs font-bold text-neutral-900">{fmt(details.price * item.quantity)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delivery estimate banner */}
                  <div className="flex items-center gap-3 p-4 bg-brand-light/30 border border-brand-gold/20 rounded-md">
                    <span className="text-xl">🚚</span>
                    <div>
                      <p className="text-xs font-semibold text-brand-text">Estimated Delivery Window</p>
                      <p className="text-xs text-brand-grey mt-0.5">{getEstimatedDeliveryRange(billingAddress.pincode)}</p>
                    </div>
                  </div>


                  <div className="flex flex-col-reverse sm:flex-row gap-3">
                    <button onClick={() => setStep(2)} className="btn-outline flex-1 py-3 text-sm font-semibold" id="step3-back">Back</button>
                    <button
                      onClick={() => {
                        const inrLimit = otpSettings.inrThreshold || 20000;
                        const aedLimit = otpSettings.aedThreshold || 800;
                        const isCod = paymentMethod === 'Cash on Delivery (COD)';

                        const isHighValue = currencyCode === 'AED'
                          ? total >= aedLimit
                          : total >= inrLimit;

                        const requiresOtp = isHighValue || (isCod && otpSettings.requireCodOtp !== false);

                        if (requiresOtp && !isVerified) {
                          handleTriggerFraudCheck();
                        } else {
                          handlePlaceOrder();
                        }
                      }}
                      disabled={placing || otpLoading}
                      className="btn-primary flex-1 py-3 text-sm font-semibold" id="place-order-btn"
                    >
                      {placing ? 'Placing Order…' : otpLoading ? 'Sending Security Code…' : `Place Order — ${fmt(total)}`}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Order Summary Sidebar ── */}
          <div className="lg:col-span-1 bg-white border border-neutral-200 rounded-lg p-5 md:p-6 self-start sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-playfair text-lg font-semibold">Order Summary</h2>
              <div className="flex items-center gap-1 text-xs bg-neutral-100 p-1 rounded-full border border-neutral-200">
                <button
                  type="button"
                  onClick={() => dispatch(setCurrency('INR'))}
                  className={`px-2 py-0.5 rounded-full font-bold transition-all ${currencyCode === 'INR' ? 'bg-brand-gold text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}`}
                >
                  INR ₹
                </button>
                <button
                  type="button"
                  onClick={() => dispatch(setCurrency('AED'))}
                  className={`px-2 py-0.5 rounded-full font-bold transition-all ${currencyCode === 'AED' ? 'bg-brand-gold text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}`}
                >
                  AED
                </button>
              </div>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-brand-grey">Subtotal ({items.length} items)</span><span>{fmt(subtotal)}</span></div>
              {appliedCoupon && couponDiscount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span className="flex items-center gap-1"><Tag size={12} /> Coupon ({appliedCoupon.code})</span>
                  <span>-{fmt(couponDiscount)}</span>
                </div>
              )}
              {loyaltyDiscountVal > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span className="flex items-center gap-1">Loyalty Discount</span>
                  <span>-{fmt(loyaltyDiscountVal)}</span>
                </div>
              )}
              {isGiftWrap && (
                <div className="flex justify-between text-brand-text font-medium">
                  <span>Gift Wrapping</span>
                  <span>{fmt(giftWrapPrice)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-brand-grey">Shipping</span>
                <span>
                  {shippingStatus === 'PENDING' ? (
                    <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 text-xs font-medium">
                      Enter Pincode
                    </span>
                  ) : shippingStatus === 'NOT_DELIVERABLE' ? (
                    <span className="text-red-600 font-semibold text-xs bg-red-50 px-2 py-0.5 rounded border border-red-200/80">
                      Not Deliverable
                    </span>
                  ) : shipping === 0 ? (
                    <span className="text-green-600 font-bold">Free</span>
                  ) : (
                    fmt(shipping)
                  )}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-brand-grey">GST (5% Included)</span><span>{fmt(tax)}</span></div>
              <div className="border-t border-neutral-100 pt-3 flex justify-between font-bold text-base">
                <span>Total</span><span className="text-brand-gold">{fmt(total)}</span>
              </div>
            </div>



            {/* Loyalty Points Section */}
            {isAuthenticated && customer && customer.loyaltyPoints > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <div className={`border rounded-md p-3 transition-all ${activeDiscountType === 'LOYALTY' ? 'bg-amber-50/80 border-amber-300' : 'bg-neutral-50/50 border-neutral-200 opacity-75'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-700 font-semibold text-xs flex items-center gap-1">👑 Loyalty Points</span>
                      <span className="text-[11px] bg-amber-200/60 text-amber-900 px-1.5 py-0.5 rounded font-semibold">{customer.loyaltyPoints} pts</span>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeDiscountType === 'LOYALTY'}
                        onChange={(e) => handleToggleLoyaltyPoints(e.target.checked)}
                        className="w-4 h-4 accent-brand-gold rounded border-brand-light cursor-pointer"
                        id="checkout-auto-loyalty"
                      />
                      <span className="text-xs text-neutral-700 font-medium">{activeDiscountType === 'LOYALTY' ? 'Applied' : 'Apply'}</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-neutral-600 mt-1.5">
                    {activeDiscountType === 'LOYALTY' ? (
                      <span className="text-green-700 font-medium">✓ Auto-applied discount: -{fmt(loyaltyDiscountVal)}</span>
                    ) : (
                      <span className="text-neutral-500">Check to apply loyalty points (will un-apply coupon)</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Coupon Section */}
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <h3 className="font-playfair text-base font-semibold flex items-center gap-2 mb-3">
                <Tag size={16} className="text-brand-gold" /> Apply Coupon
              </h3>

              {!appliedCoupon && availableCoupons.length > 0 && (
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1 mb-4">
                  {availableCoupons.map(coupon => {
                    const discountAmt = getCouponDiscount(coupon, subtotal);
                    const isApplicable = discountAmt > 0;
                    
                    return (
                      <div 
                        key={coupon.id} 
                        onClick={() => isApplicable && handleApplyCheckoutCoupon(coupon.code)}
                        className={`p-3 border rounded-sm transition-all flex flex-col justify-between relative overflow-hidden ${
                          isApplicable 
                            ? 'border-brand-light hover:border-brand-gold/50 cursor-pointer bg-white' 
                            : 'border-neutral-100 bg-neutral-50/50 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-xs font-bold text-[#0F2942] bg-brand-light px-2.5 py-0.5 rounded-sm">
                            {coupon.code}
                          </span>
                          <span className="text-[10px] text-brand-gold font-semibold uppercase">
                            {coupon.type === 'PERCENT' ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
                          </span>
                        </div>
                        <p className="text-[10px] text-brand-grey mt-1.5 leading-relaxed">
                          Min Order: ₹{coupon.minOrderValue || 0}
                          {coupon.maxDiscount ? ` · Max Disc: ₹${coupon.maxDiscount}` : ''}
                          {` · ${coupon.usageLimit ? `Limit: ${coupon.usageLimit}/person` : 'Unlimited'}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {!appliedCoupon && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCodeInput}
                    onChange={e => setCouponCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="flex-1 border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:border-brand-gold uppercase font-mono rounded"
                    aria-label="Coupon code"
                  />
                  <button onClick={() => handleApplyCheckoutCoupon()} disabled={validatingCoupon} className="bg-neutral-950 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 transition-colors focus-visible:outline-brand-gold rounded">
                    {validatingCoupon ? '...' : 'Apply'}
                  </button>
                </div>
              )}
              
              {appliedCoupon && (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 p-2.5 rounded text-xs mt-2">
                  <div className="flex items-center gap-1.5 font-medium text-green-700">
                    <Tag size={14} />
                    <span>Coupon <strong>{appliedCoupon.code}</strong> Applied!</span>
                  </div>
                  <button onClick={handleRemoveCheckoutCoupon} className="text-red-500 hover:underline font-semibold text-[11px]">Remove</button>
                </div>
              )}
            </div>

            {/* Delivery estimate in sidebar */}
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-text mb-1">
                <Package size={13} className="text-brand-gold" />
                Estimated Delivery
              </div>
              <p className="text-xs text-brand-grey font-medium">{getEstimatedDeliveryRange(billingAddress.pincode)}</p>
            </div>

          </div>
        </div>
      </div>

      {/* ── OTP Fraud-Check Modal ── */}
      <AnimatePresence>
        {otpSent && !isVerified && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-xl max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-5 bg-brand-gold rounded-full"></span>
                <h3 className="font-playfair text-lg font-bold text-brand-text">🔒 Security Verification</h3>
              </div>
              <p className="text-xs text-brand-grey leading-relaxed">
                For security reasons, high-value orders (exceeding {currencyCode === 'AED' ? `AED ${otpSettings.aedThreshold}` : `₹${otpSettings.inrThreshold.toLocaleString('en-IN')}`}) and Cash on Delivery (COD) orders require email verification. We've sent a 6-digit code to <strong className="text-brand-text font-semibold">{billingAddress.email || customer?.email}</strong>.
              </p>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-semibold text-neutral-500 uppercase tracking-wider" htmlFor="fraud-otp">
                    Enter 6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={handleTriggerFraudCheck}
                    disabled={otpLoading}
                    className="text-xs text-brand-gold hover:underline font-semibold"
                    id="resend-fraud-otp"
                  >
                    {otpLoading ? 'Resending…' : 'Resend Email'}
                  </button>
                </div>
                <input
                  id="fraud-otp" type="text" value={otp}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '');
                    setOtp(val);
                    if (val.length === 6) { handleVerifyFraudOtp(val); }
                  }}
                  placeholder="0  0  0  0  0  0" maxLength={6}
                  disabled={verifyingOtp}
                  className="w-full border border-neutral-200 rounded-md px-4 py-3 text-center text-xl font-mono tracking-[0.5em] focus:outline-none focus:border-brand-gold bg-neutral-50"
                  aria-label="OTP Code"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button onClick={() => setOtpSent(false)} disabled={verifyingOtp} className="btn-outline flex-1 py-3 text-sm font-semibold">Cancel</button>
                <button
                  onClick={() => handleVerifyFraudOtp()}
                  disabled={verifyingOtp || otp.length < 6}
                  className="btn-primary flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {verifyingOtp ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Confirm & Place Order'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <Footer />
    </main>
  );
};

export default CheckoutPage;