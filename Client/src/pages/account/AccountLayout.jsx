import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { User, Package, Heart, Star, Gift, Headphones, LogOut, Lock, Mail, Eye, EyeOff, Phone, ArrowLeft, CheckCircle, RefreshCw, MessageSquare } from 'lucide-react';
import Footer from '../../components/Footer';
import { loginCustomer, registerCustomer, logout, clearError, fetchProfile } from '../../redux/slices/authSlice';
import toast from 'react-hot-toast';
import { validatePhoneNumber, validateEmail, validatePassword } from '../../utils/validation';
import api from '../../services/api';

const NAV_ITEMS = [
  { to: '/account', label: 'Profile', icon: User, end: true },
  { to: '/account/orders', label: 'My Orders', icon: Package },
  { to: '/account/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/account/reviews', label: 'My Reviews', icon: MessageSquare },
  { to: '/account/loyalty', label: 'Loyalty & Cashback', icon: Star },
  { to: '/account/personal-shopper', label: 'Personal Shopper', icon: Gift },
  { to: '/account/support', label: 'Support', icon: Headphones },
];

// Auth view states
const VIEW_LOGIN         = 'login';
const VIEW_REGISTER      = 'register';
const VIEW_FORGOT_EMAIL  = 'forgot_email';   // Step 1: enter email
const VIEW_FORGOT_OTP    = 'forgot_otp';     // Step 2: enter 6-digit OTP
const VIEW_FORGOT_RESET  = 'forgot_reset';   // Step 3: set new password

const AccountLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const { isAuthenticated, customer, loading, error } = useSelector(s => s.auth);
  const otpRefs = useRef([]);

  // Auto scroll to top on account route change and refresh customer profile (loyalty points, balance, etc.)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (isAuthenticated) {
      dispatch(fetchProfile());
    }
  }, [pathname, isAuthenticated, dispatch]);

  // ── Auth form state ─────────────────────────────────────────────────────────
  const [view, setView]             = useState(VIEW_LOGIN);
  const [showPassword, setShowPw]   = useState(false);
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [errors, setErrors]         = useState({});

  // ── Forgot password state ───────────────────────────────────────────────────
  const [forgotEmail, setForgotEmail]         = useState('');
  const [forgotEmailError, setForgotEmailError] = useState('');
  const [forgotLoading, setForgotLoading]     = useState(false);

  // Step 2 — OTP
  const [otp, setOtp]           = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0); // seconds

  // Step 3 — New password
  const [resetToken, setResetToken]       = useState('');
  const [newPw, setNewPw]                 = useState('');
  const [confirmPw, setConfirmPw]         = useState('');
  const [showNewPw, setShowNewPw]         = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [newPwError, setNewPwError]       = useState('');
  const [confirmPwError, setConfirmPwError] = useState('');
  const [resetLoading, setResetLoading]   = useState(false);

  // Read URL query params for initial view & tab redirects (e.g. /account?tab=orders -> /account/orders)
  useEffect(() => {
    const viewParam = searchParams.get('view');
    const emailParam = searchParams.get('email');
    const tabParam = searchParams.get('tab');
    if (viewParam === 'forgot' || viewParam === 'forgot_email') {
      setView(VIEW_FORGOT_EMAIL);
      if (emailParam) setForgotEmail(emailParam);
    } else if (viewParam === 'register') {
      setView(VIEW_REGISTER);
    }
    if (tabParam) {
      if (tabParam === 'orders') navigate('/account/orders', { replace: true });
      else if (tabParam === 'wishlist') navigate('/account/wishlist', { replace: true });
      else if (tabParam === 'reviews') navigate('/account/reviews', { replace: true });
      else if (tabParam === 'loyalty') navigate('/account/loyalty', { replace: true });
      else if (tabParam === 'personal-shopper' || tabParam === 'shopper') navigate('/account/personal-shopper', { replace: true });
      else if (tabParam === 'support') navigate('/account/support', { replace: true });
    }
  }, [searchParams, navigate]);

  // Clear state when switching views
  useEffect(() => {
    dispatch(clearError());
    setErrors({});
    setEmail(''); setPassword(''); setName(''); setPhone('');
    setShowPw(false);
    if (view === VIEW_FORGOT_EMAIL) {
      setForgotEmailError('');
    }
    if (view === VIEW_FORGOT_OTP) {
      setOtp(['', '', '', '', '', '']); setOtpError('');
    }
    if (view === VIEW_FORGOT_RESET) {
      setNewPw(''); setConfirmPw(''); setNewPwError(''); setConfirmPwError('');
    }
  }, [view, dispatch]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ── Inline validation ───────────────────────────────────────────────────────
  const onEmailChange = v => {
    setEmail(v);
    if (errors.email) { const r = validateEmail(v); setErrors(p => ({ ...p, email: r.isValid ? '' : r.message })); }
  };
  const onPasswordChange = v => {
    setPassword(v);
    if (errors.password) {
      if (view === VIEW_REGISTER) { const r = validatePassword(v); setErrors(p => ({ ...p, password: r.isValid ? '' : r.message })); }
      else setErrors(p => ({ ...p, password: v ? '' : 'Password is required.' }));
    }
  };
  const onNameChange = v => {
    setName(v);
    if (errors.name) setErrors(p => ({ ...p, name: v.trim() ? '' : 'Full name is required.' }));
  };
  const onPhoneChange = v => {
    setPhone(v);
    if (errors.phone) { const r = validatePhoneNumber(v); setErrors(p => ({ ...p, phone: r.isValid ? '' : r.message })); }
  };

  // ── Login / Register ────────────────────────────────────────────────────────
  const handleSubmit = async e => {
    e.preventDefault();
    const errs = {};
    if (view === VIEW_REGISTER) {
      if (!name.trim()) errs.name = 'Full name is required.';
      const ev = validateEmail(email); if (!ev.isValid) errs.email = ev.message;
      const pv = validatePassword(password); if (!pv.isValid) errs.password = pv.message;
      const phv = validatePhoneNumber(phone); if (!phv.isValid) errs.phone = phv.message;
    } else {
      const ev = validateEmail(email); if (!ev.isValid) errs.email = ev.message;
      if (!password) errs.password = 'Password is required.';
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    if (view === VIEW_REGISTER) {
      const result = await dispatch(registerCustomer({ name, email, password, phone }));
      if (registerCustomer.fulfilled.match(result)) {
        toast.success(`Welcome to Billu Bazaar, ${result.payload.customer.name}!`);
      } else {
        toast.error(result.payload || 'Registration failed.');
      }
    } else {
      const result = await dispatch(loginCustomer({ email, password }));
      if (loginCustomer.fulfilled.match(result)) {
        toast.success(`Welcome back, ${result.payload.customer.name}!`);
      } else {
        toast.error(result.payload || 'Invalid email or password.');
      }
    }
  };

  // ── Step 1: Send OTP ────────────────────────────────────────────────────────
  const handleSendOtp = async e => {
    e?.preventDefault();
    const ev = validateEmail(forgotEmail);
    if (!ev.isValid) { setForgotEmailError(ev.message); return; }
    setForgotEmailError('');
    setForgotLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail.trim().toLowerCase() });
      toast.success('OTP sent! Check your inbox.');
      setView(VIEW_FORGOT_OTP);
      setResendCooldown(60); // 60s before resend allowed
    } catch (err) {
      setForgotEmailError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── OTP input handling ──────────────────────────────────────────────────────
  const handleOtpChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return; // digits only
    const next = [...otp];
    next[idx] = val.slice(-1); // keep only last digit
    setOtp(next);
    setOtpError('');
    // Auto-advance
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    // Auto-submit when all 6 filled
    if (next.every(d => d !== '') && val) handleVerifyOtp(next.join(''));
  };

  const handleOtpKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = e => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((d, i) => { next[i] = d; });
    setOtp(next);
    setOtpError('');
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
    if (pasted.length === 6) handleVerifyOtp(pasted);
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  const handleVerifyOtp = async (otpValue) => {
    const code = otpValue || otp.join('');
    if (code.length < 6) { setOtpError('Please enter all 6 digits.'); return; }
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await api.post('/auth/verify-otp', {
        email: forgotEmail.trim().toLowerCase(),
        otp: code,
      });
      setResetToken(res.data.resetToken);
      toast.success('OTP verified!');
      setView(VIEW_FORGOT_RESET);
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid OTP. Please try again.';
      setOtpError(msg);
      // Clear OTP fields on wrong code
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Step 3: Reset Password ──────────────────────────────────────────────────
  const handleResetPassword = async e => {
    e.preventDefault();
    let valid = true;
    const pv = validatePassword(newPw);
    if (!pv.isValid) { setNewPwError(pv.message); valid = false; }
    else setNewPwError('');
    if (!confirmPw) { setConfirmPwError('Please confirm your new password.'); valid = false; }
    else if (newPw !== confirmPw) { setConfirmPwError('Passwords do not match.'); valid = false; }
    else setConfirmPwError('');
    if (!valid) return;

    setResetLoading(true);
    try {
      await api.post('/auth/reset-password', { resetToken, password: newPw });
      toast.success('Password reset! Please sign in with your new password.');
      setView(VIEW_LOGIN);
    } catch (err) {
      const msg = err.response?.data?.message || 'Session expired. Please start over.';
      toast.error(msg);
      setView(VIEW_FORGOT_EMAIL);
    } finally {
      setResetLoading(false);
    }
  };

  const handleSignOut = () => { dispatch(logout()); toast.success('Signed out successfully.'); };

  // ── Unauthenticated UI ──────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <main id="main-content" className="bg-[#FDFDFB] min-h-[85vh] flex items-center justify-center py-20 px-6">
        <div className="w-full max-w-md bg-white border border-neutral-100 p-8 md:p-10 shadow-sm rounded-xl">

          {/* ════════════════════════════════════
              STEP 1 — Enter Email
          ════════════════════════════════════ */}
          {view === VIEW_FORGOT_EMAIL && (
            <>
              <button onClick={() => setView(VIEW_LOGIN)} className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 mb-6 transition-colors" id="back-to-login-btn">
                <ArrowLeft size={14} /> Back to Sign In
              </button>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full bg-neutral-950 flex items-center justify-center mx-auto mb-4 text-brand-gold">
                  <Lock size={22} strokeWidth={1.5} />
                </div>
                <h1 className="font-playfair text-2xl font-bold text-neutral-900">Forgot password?</h1>
                <p className="text-xs text-neutral-500 mt-2">Enter your email and we'll send you a 6-digit OTP.</p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="forgot-email">Email Address</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-neutral-400"><Mail size={16} /></span>
                    <input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={e => { setForgotEmail(e.target.value); if (forgotEmailError) setForgotEmailError(''); }}
                      placeholder="yourname@domain.com"
                      className={`w-full border ${forgotEmailError ? 'border-red-400 focus:border-red-500' : 'border-neutral-200/80 focus:border-brand-gold'} rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none bg-neutral-50/30 transition-colors`}
                    />
                  </div>
                  {forgotEmailError && <p className="text-xs text-red-500 mt-1">{forgotEmailError}</p>}
                </div>
                <button type="submit" disabled={forgotLoading} className="btn-primary w-full py-3 rounded-lg flex items-center justify-center font-semibold text-sm transition-transform active:scale-[0.98]" id="send-otp-btn">
                  {forgotLoading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Send OTP'}
                </button>
              </form>
            </>
          )}

          {/* ════════════════════════════════════
              STEP 2 — Enter OTP
          ════════════════════════════════════ */}
          {view === VIEW_FORGOT_OTP && (
            <>
              <button onClick={() => setView(VIEW_FORGOT_EMAIL)} className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 mb-6 transition-colors" id="back-to-email-btn">
                <ArrowLeft size={14} /> Change email
              </button>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={26} className="text-green-500" strokeWidth={1.5} />
                </div>
                <h1 className="font-playfair text-2xl font-bold text-neutral-900">Check your email</h1>
                <p className="text-xs text-neutral-500 mt-2">
                  We sent a 6-digit OTP to<br/>
                  <span className="font-semibold text-neutral-700">{forgotEmail}</span>
                </p>
              </div>

              {/* 6-digit OTP boxes */}
              <div className="flex items-center justify-center gap-2 mb-2" onPaste={handleOtpPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={el => otpRefs.current[idx] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(e.target.value, idx)}
                    onKeyDown={e => handleOtpKeyDown(e, idx)}
                    disabled={otpLoading}
                    className={`w-11 h-13 text-center text-xl font-bold border-2 rounded-lg focus:outline-none transition-all
                      ${otpError ? 'border-red-400 bg-red-50 text-red-700' : digit ? 'border-brand-gold bg-[#FBF7ED] text-neutral-900' : 'border-neutral-200 bg-neutral-50 text-neutral-900'}
                      ${otpLoading ? 'opacity-50 cursor-not-allowed' : 'focus:border-brand-gold'}`}
                    style={{ width: '44px', height: '52px' }}
                    aria-label={`OTP digit ${idx + 1}`}
                    id={`otp-digit-${idx}`}
                  />
                ))}
              </div>

              {otpError && <p className="text-xs text-red-500 text-center mt-1 mb-3">{otpError}</p>}

              <button
                onClick={() => handleVerifyOtp()}
                disabled={otpLoading || otp.some(d => !d)}
                className="btn-primary w-full py-3 rounded-lg flex items-center justify-center font-semibold text-sm transition-transform active:scale-[0.98] mt-4"
                id="verify-otp-btn"
              >
                {otpLoading
                  ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : 'Verify OTP'}
              </button>

              {/* Resend */}
              <div className="text-center mt-5">
                {resendCooldown > 0 ? (
                  <p className="text-xs text-neutral-400">Resend OTP in <span className="font-semibold text-neutral-600">{resendCooldown}s</span></p>
                ) : (
                  <button
                    onClick={handleSendOtp}
                    disabled={forgotLoading}
                    className="text-xs text-brand-gold hover:underline font-semibold flex items-center gap-1.5 mx-auto"
                    id="resend-otp-btn"
                  >
                    <RefreshCw size={12} />
                    {forgotLoading ? 'Sending…' : 'Resend OTP'}
                  </button>
                )}
              </div>
            </>
          )}

          {/* ════════════════════════════════════
              STEP 3 — Set New Password
          ════════════════════════════════════ */}
          {view === VIEW_FORGOT_RESET && (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full bg-neutral-950 flex items-center justify-center mx-auto mb-4 text-brand-gold">
                  <Lock size={22} strokeWidth={1.5} />
                </div>
                <h1 className="font-playfair text-2xl font-bold text-neutral-900">Set new password</h1>
                <p className="text-xs text-neutral-500 mt-2">OTP verified! Choose a strong new password.</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
                {/* New password */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="new-password">New Password</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-neutral-400"><Lock size={16} /></span>
                    <input
                      id="new-password"
                      type={showNewPw ? 'text' : 'password'}
                      value={newPw}
                      onChange={e => { setNewPw(e.target.value); if (newPwError) { const r = validatePassword(e.target.value); setNewPwError(r.isValid ? '' : r.message); } }}
                      placeholder="Min. 6 characters"
                      className={`w-full border ${newPwError ? 'border-red-400 focus:border-red-500' : 'border-neutral-200/80 focus:border-brand-gold'} rounded-lg pl-10 pr-10 py-3 text-sm focus:outline-none bg-neutral-50/30 transition-colors`}
                    />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-3.5 text-neutral-400 hover:text-neutral-600" aria-label="Toggle password">
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {newPwError && <p className="text-xs text-red-500 mt-1">{newPwError}</p>}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="confirm-password">Confirm New Password</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-neutral-400"><Lock size={16} /></span>
                    <input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPw}
                      onChange={e => { setConfirmPw(e.target.value); if (confirmPwError) setConfirmPwError(e.target.value === newPw ? '' : 'Passwords do not match.'); }}
                      placeholder="Repeat your password"
                      className={`w-full border ${confirmPwError ? 'border-red-400 focus:border-red-500' : 'border-neutral-200/80 focus:border-brand-gold'} rounded-lg pl-10 pr-10 py-3 text-sm focus:outline-none bg-neutral-50/30 transition-colors`}
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-3.5 text-neutral-400 hover:text-neutral-600" aria-label="Toggle confirm password">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPwError && <p className="text-xs text-red-500 mt-1">{confirmPwError}</p>}
                </div>

                <button type="submit" disabled={resetLoading} className="btn-primary w-full py-3 rounded-lg flex items-center justify-center font-semibold text-sm transition-transform active:scale-[0.98] mt-2" id="reset-password-btn">
                  {resetLoading ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          {/* ════════════════════════════════════
              LOGIN / REGISTER
          ════════════════════════════════════ */}
          {(view === VIEW_LOGIN || view === VIEW_REGISTER) && (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-full bg-neutral-950 flex items-center justify-center mx-auto mb-4 text-brand-gold">
                  <User size={24} strokeWidth={1.5} />
                </div>
                <h1 className="font-playfair text-2xl font-bold text-neutral-900">
                  {view === VIEW_REGISTER ? 'Create an Account' : 'Welcome Back'}
                </h1>
                <p className="text-xs text-neutral-500 mt-2">
                  {view === VIEW_REGISTER
                    ? 'Sign up to unlock rewards, wishlists, and personalized styling.'
                    : 'Access your orders, custom wishlist, and member cashbacks.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {view === VIEW_REGISTER && (
                  <>
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="auth-name">Full Name</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3.5 text-neutral-400"><User size={16} /></span>
                        <input id="auth-name" type="text" value={name} onChange={e => onNameChange(e.target.value)} placeholder="Enter your name"
                          className={`w-full border ${errors.name ? 'border-red-400 focus:border-red-500' : 'border-neutral-200/80 focus:border-brand-gold'} rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none bg-neutral-50/30 transition-colors`} />
                      </div>
                      {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="auth-phone">
                        Phone Number <span className="font-normal text-neutral-400">(India or UAE)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-3.5 text-neutral-400"><Phone size={16} /></span>
                        <input id="auth-phone" type="tel" value={phone} onChange={e => onPhoneChange(e.target.value)} placeholder="+91 98765 43210 or +971 50 123 4567"
                          className={`w-full border ${errors.phone ? 'border-red-400 focus:border-red-500' : 'border-neutral-200/80 focus:border-brand-gold'} rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none bg-neutral-50/30 transition-colors`} />
                      </div>
                      {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                    </div>
                  </>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5" htmlFor="auth-email">Email Address</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-neutral-400"><Mail size={16} /></span>
                    <input id="auth-email" type="email" value={email} onChange={e => onEmailChange(e.target.value)} placeholder="yourname@domain.com"
                      className={`w-full border ${errors.email ? 'border-red-400 focus:border-red-500' : 'border-neutral-200/80 focus:border-brand-gold'} rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none bg-neutral-50/30 transition-colors`} />
                  </div>
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-neutral-700" htmlFor="auth-password">Password</label>
                    {view === VIEW_LOGIN && (
                      <button type="button" onClick={() => { setForgotEmail(email); setView(VIEW_FORGOT_EMAIL); }}
                        className="text-xs text-brand-gold hover:underline font-medium" id="forgot-password-link">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-neutral-400"><Lock size={16} /></span>
                    <input id="auth-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => onPasswordChange(e.target.value)} placeholder="••••••••"
                      className={`w-full border ${errors.password ? 'border-red-400 focus:border-red-500' : 'border-neutral-200/80 focus:border-brand-gold'} rounded-lg pl-10 pr-10 py-3 text-sm focus:outline-none bg-neutral-50/30 transition-colors`} />
                    <button type="button" onClick={() => setShowPw(!showPassword)} className="absolute right-3 top-3.5 text-neutral-400 hover:text-neutral-600" aria-label={showPassword ? 'Hide' : 'Show'}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                </div>

                {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-100">{error}</p>}

                <button type="submit" disabled={loading} className="btn-primary w-full py-3 rounded-lg flex items-center justify-center font-semibold text-sm transition-transform active:scale-[0.98] mt-6" id="auth-submit-btn">
                  {loading
                    ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : view === VIEW_REGISTER ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              <div className="text-center mt-6 pt-6 border-t border-neutral-100">
                <button onClick={() => setView(view === VIEW_REGISTER ? VIEW_LOGIN : VIEW_REGISTER)} className="text-xs text-brand-gold hover:underline font-semibold" id="auth-toggle-btn">
                  {view === VIEW_REGISTER ? 'Already have an account? Sign In' : 'New to Billu Bazaar? Create an Account'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  // ── Authenticated layout ────────────────────────────────────────────────────
  return (
    <main id="main-content">
      <div className="max-w-site mx-auto px-4 md:px-8 py-6 md:py-12">
        {/* Mobile Navigation Header & Horizontal Pill Strip (< md) */}
        <div className="block md:hidden mb-4 space-y-2">
          {/* User Info Bar */}
          <div className="bg-white shadow-xs px-3 py-2 rounded-lg border border-neutral-200/60 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-brand-gold flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">{customer?.name?.[0]?.toUpperCase() || 'B'}</span>
              </div>
              <div className="min-w-0 flex items-center gap-2">
                <p className="font-semibold text-xs text-neutral-900 truncate">{customer?.name || '—'}</p>
                <div className="flex items-center gap-0.5 text-[10px] text-brand-gold font-medium bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50">
                  <Star size={10} className="fill-brand-gold" />
                  <span>{customer?.loyaltyPoints || 0} pts</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="px-2 py-1 text-[11px] text-red-500 font-semibold hover:bg-red-50 rounded flex items-center gap-1 transition-colors flex-shrink-0"
              id="mobile-account-logout"
            >
              <LogOut size={12} /> Sign Out
            </button>
          </div>

          {/* Horizontal Nav Pills — Single line compact strip with custom 3px thin scrollbar */}
          <nav className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1.5 pt-0.5 select-none">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full border transition-all ${
                    isActive
                      ? 'bg-brand-gold text-white border-brand-gold shadow-xs'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                  }`
                }
                id={`mobile-nav-${label.toLowerCase().replace(/\s.*/, '')}`}
              >
                <Icon size={12} strokeWidth={1.75} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Layout Wrapper */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Desktop Sidebar (>= md) */}
          <aside className="hidden md:block w-60 flex-shrink-0">
            <div className="bg-white shadow-sm p-5 text-center mb-4 border border-neutral-100 rounded-xl">
              <div className="w-16 h-16 rounded-full bg-brand-gold flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-xl">{customer?.name?.[0]?.toUpperCase() || 'B'}</span>
              </div>
              <p className="font-medium">{customer?.name || '—'}</p>
              <p className="text-xs text-brand-grey truncate">{customer?.email || '—'}</p>
              <div className="mt-3 flex items-center justify-center gap-1">
                <Star size={12} className="fill-brand-gold text-brand-gold" />
                <span className="text-xs font-medium text-brand-gold">{customer?.loyaltyPoints || 0} pts</span>
              </div>
            </div>
            <nav className="bg-white shadow-sm rounded-xl border border-neutral-100 overflow-hidden">
              {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) => `w-full flex items-center gap-3 px-4 py-3 text-sm text-left border-l-2 transition-all hover:bg-brand-light ${isActive ? 'border-brand-gold text-brand-gold bg-brand-light/50 font-medium' : 'border-transparent text-brand-grey'}`}
                  id={`account-nav-${label.toLowerCase().replace(/\s.*/, '')}`}>
                  <Icon size={16} strokeWidth={1.5} />{label}
                </NavLink>
              ))}
              <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left border-l-2 border-transparent text-red-400 hover:bg-red-50 transition-all" id="account-logout">
                <LogOut size={16} strokeWidth={1.5} /> Sign Out
              </button>
            </nav>
          </aside>
          <div className="flex-1 min-w-0"><Outlet /></div>
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default AccountLayout;