import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Award,
  History,
  ShoppingBag,
  UserPlus,
  Star,
  Gift,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { loyaltyEarnRules as defaultEarnRules } from '../../data/mockAccountData';
import { formatPrice } from '../../utils/currency';
import api from '../../services/api';

const ITEMS_PER_PAGE = 5;

const LoyaltyPage = () => {
  const customer = useSelector((state) => state.auth.customer);
  const { code: currencyCode, rate: currencyRate } = useSelector((state) => state.currency);

  const [earnRules, setEarnRules] = useState(defaultEarnRules);
  const [loadingRules, setLoadingRules] = useState(true);
  const [redeemRate, setRedeemRate] = useState(0.2); // Default 0.2

  const [ledger, setLedger] = useState([]);
  const [balance, setBalance] = useState(customer?.loyaltyPoints || 0);
  const [loadingLedger, setLoadingLedger] = useState(true);

  // Activity filter & pagination state
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'EARNED' | 'REDEEMED'
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchLoyaltyData = async () => {
      try {
        const [settingsRes, ledgerRes] = await Promise.all([
          api.get('/site-settings/loyalty'),
          api.get('/customers/loyalty'),
        ]);

        if (settingsRes.data?.success && settingsRes.data?.data) {
          const d = settingsRes.data.data;
          if (d.redeemRate) {
            setRedeemRate(Number(d.redeemRate));
          }

          const dynamicRules = [];
          if (d.earnRate) {
            const earnFormatted = formatPrice(d.earnRate, currencyCode, currencyRate);
            dynamicRules.push({
              action: `Shopping (Every ${earnFormatted} spent)`,
              points: '+1 point',
              icon: 'shopping',
            });
          }
          if (d.signupPointsEnabled !== false && Number(d.signupPoints || 0) > 0) {
            dynamicRules.push({
              action: 'Account Registration / Welcome Bonus',
              points: `+${d.signupPoints} points`,
              icon: 'signup',
            });
          }
          if (d.reviewPointsEnabled !== false && Number(d.reviewPoints || 0) > 0) {
            dynamicRules.push({
              action: 'Write a Verified Product Review',
              points: `+${d.reviewPoints} points`,
              icon: 'review',
            });
          }

          if (d.earnRules && d.earnRules.length > 0) {
            d.earnRules.forEach((r) => {
              if (r.action && r.points) {
                // Avoid duplicates
                if (!dynamicRules.some((dr) => dr.action.toLowerCase() === r.action.toLowerCase())) {
                  dynamicRules.push({ ...r, icon: 'bonus' });
                }
              }
            });
          }

          setEarnRules(dynamicRules);
        }

        if (ledgerRes.data?.success) {
          setLedger(ledgerRes.data.ledger || []);
          if (ledgerRes.data.balance !== undefined) {
            setBalance(ledgerRes.data.balance);
          }
        }
      } catch (err) {
        console.error('Failed to fetch loyalty data:', err);
      } finally {
        setLoadingRules(false);
        setLoadingLedger(false);
      }
    };

    if (customer) {
      fetchLoyaltyData();
    } else {
      setLoadingRules(false);
      setLoadingLedger(false);
    }
  }, [customer, currencyCode, currencyRate]);

  // Filtered ledger based on tab
  const filteredLedger = useMemo(() => {
    if (activeTab === 'EARNED') {
      return ledger.filter((tx) => tx.type === 'EARN' || tx.type === 'BONUS' || tx.points > 0);
    }
    if (activeTab === 'REDEEMED') {
      return ledger.filter((tx) => tx.type === 'REDEEM' || tx.type === 'EXPIRE' || tx.points < 0);
    }
    return ledger;
  }, [ledger, activeTab]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredLedger.length / ITEMS_PER_PAGE));
  const paginatedLedger = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLedger.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredLedger, currentPage]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  // Tier calculation
  const loyaltyTier = balance >= 1000 ? 'Gold' : balance >= 500 ? 'Silver' : 'Bronze';
  const nextTierPoints = balance >= 1000 ? 1000 : balance >= 500 ? 1000 : 500;
  const progressPercent = Math.min(100, Math.round((balance / nextTierPoints) * 100));
  const worth = balance * redeemRate;
  const cashbackBalance = 0;

  // Helper for rule icons
  const getRuleIcon = (type) => {
    switch (type) {
      case 'shopping':
        return <ShoppingBag size={15} className="text-brand-gold" />;
      case 'signup':
        return <UserPlus size={15} className="text-purple-600" />;
      case 'review':
        return <Star size={15} className="text-amber-500" />;
      default:
        return <Gift size={15} className="text-emerald-600" />;
    }
  };

  // Helper to get transaction details
  const getTxMeta = (tx) => {
    const isPositive = tx.points > 0 || tx.type === 'EARN' || tx.type === 'BONUS';

    if (tx.type === 'EARN') {
      return {
        badge: 'Order Reward',
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        icon: <TrendingUp size={14} className="text-emerald-600" />,
        iconBg: 'bg-emerald-100/80',
        isPositive: true,
      };
    }
    if (tx.type === 'REDEEM') {
      return {
        badge: 'Checkout Discount',
        badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
        icon: <TrendingDown size={14} className="text-rose-600" />,
        iconBg: 'bg-rose-100/80',
        isPositive: false,
      };
    }
    if (tx.type === 'BONUS') {
      return {
        badge: 'Bonus / Restored',
        badgeColor: 'bg-purple-50 text-purple-800 border-purple-200',
        icon: <Gift size={14} className="text-purple-600" />,
        iconBg: 'bg-purple-100/80',
        isPositive: true,
      };
    }
    if (tx.type === 'EXPIRE') {
      return {
        badge: 'Points Reversed',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: <RotateCcw size={14} className="text-amber-600" />,
        iconBg: 'bg-amber-100/80',
        isPositive: false,
      };
    }

    return {
      badge: tx.type || 'Transaction',
      badgeColor: isPositive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-neutral-100 text-neutral-700 border-neutral-200',
      icon: isPositive ? <TrendingUp size={14} className="text-emerald-600" /> : <TrendingDown size={14} className="text-neutral-500" />,
      iconBg: isPositive ? 'bg-emerald-100/80' : 'bg-neutral-100',
      isPositive,
    };
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-playfair text-xl sm:text-2xl font-bold text-neutral-900">
            Loyalty Rewards & Cashback
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Earn points on every purchase and redeem them instantly during checkout.
          </p>
        </div>
      </div>

      {/* Top Balances Cards */}
      <div className="grid sm:grid-cols-2 gap-5 mb-7">
        {/* Points Balance Card */}
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 text-white p-6 rounded-2xl shadow-md relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-white">
                <Award size={14} /> {loyaltyTier} Member
              </span>
              <span className="text-[11px] text-amber-100/90 font-medium">
                1 pt = {formatPrice(redeemRate, currencyCode, currencyRate)}
              </span>
            </div>

            <div className="mt-3">
              <span className="text-4xl sm:text-5xl font-playfair font-bold text-white tracking-tight">
                {balance.toLocaleString('en-IN')}
              </span>
              <span className="text-sm font-semibold ml-2 text-amber-100">Points</span>
            </div>

            <p className="text-xs text-amber-100/90 mt-1 font-medium">
              Equivalent cash value: <strong className="text-white text-sm font-bold">{formatPrice(worth, currencyCode, currencyRate)}</strong>
            </p>
          </div>

          {/* Tier Progress Bar */}
          <div className="relative z-10 pt-3 border-t border-white/20">
            <div className="flex items-center justify-between text-[11px] text-amber-100 font-medium mb-1">
              <span>{loyaltyTier} Tier</span>
              {balance < 1000 && (
                <span>{nextTierPoints - balance} pts to {balance >= 500 ? 'Gold' : 'Silver'}</span>
              )}
            </div>
            <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Cashback Wallet Card */}
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 text-white p-6 rounded-2xl shadow-md relative overflow-hidden flex flex-col justify-between space-y-4 border border-neutral-800">
          <div className="relative z-10">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-neutral-300">
                <Wallet size={14} className="text-brand-gold" /> Cashback Wallet
              </span>
              <span className="text-[11px] text-neutral-400 font-medium">Instant Credits</span>
            </div>

            <div className="mt-3">
              <span className="text-4xl sm:text-5xl font-playfair font-bold text-white tracking-tight">
                {formatPrice(cashbackBalance, currencyCode, currencyRate)}
              </span>
            </div>

            <p className="text-xs text-neutral-400 mt-1">
              Auto-applies at checkout for applicable orders.
            </p>
          </div>

          <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Redeemable on all products</span>
            <span className="text-brand-gold font-semibold">No expiry</span>
          </div>
        </div>
      </div>

      {/* Main Grid: How to Earn More & Recent Activity */}
      <div className="grid md:grid-cols-12 gap-6 items-start">
        {/* LEFT: How to earn more (5 cols) */}
        <div className="md:col-span-5 bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-100">
            <div className="p-1.5 bg-amber-50 text-brand-gold rounded-lg">
              <Sparkles size={16} />
            </div>
            <h2 className="font-playfair text-base font-bold text-neutral-900">
              How to Earn Points
            </h2>
          </div>

          <div className="space-y-3">
            {loadingRules ? (
              <div className="text-xs text-neutral-400 py-4 text-center">Loading earn rules...</div>
            ) : earnRules.length > 0 ? (
              earnRules.map((rule, idx) => (
                <div
                  key={rule.id || idx}
                  className="flex items-center justify-between gap-3 p-3 bg-neutral-50/70 hover:bg-neutral-50 rounded-xl border border-neutral-200/60 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-white rounded-lg border border-neutral-200/70 shrink-0">
                      {getRuleIcon(rule.icon)}
                    </div>
                    <span className="font-medium text-neutral-800 leading-snug">
                      {rule.action}
                    </span>
                  </div>
                  <span className="font-bold text-brand-gold font-mono shrink-0 bg-white px-2 py-1 rounded-md border border-amber-200/60 shadow-2xs">
                    {rule.points}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-neutral-400 py-4 text-center">No active earn rules found.</div>
            )}
          </div>
        </div>

        {/* RIGHT: Recent Activity Ledger (7 cols) */}
        <div className="md:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-100 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 text-brand-gold rounded-lg">
                <History size={16} />
              </div>
              <h2 className="font-playfair text-base font-bold text-neutral-900">
                Points Activity History
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center bg-neutral-100 p-1 rounded-xl gap-1 text-xs">
              <button
                type="button"
                onClick={() => handleTabChange('ALL')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'ALL'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                All ({ledger.length})
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('EARNED')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'EARNED'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Earned (+)
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('REDEEMED')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeTab === 'REDEEMED'
                    ? 'bg-white text-rose-800 shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                Redeemed (-)
              </button>
            </div>
          </div>

          {/* Activity List */}
          <div className="space-y-3">
            {loadingLedger ? (
              <div className="text-xs text-neutral-400 py-8 text-center">Loading transaction history...</div>
            ) : paginatedLedger.length > 0 ? (
              paginatedLedger.map((tx) => {
                const meta = getTxMeta(tx);
                const orderNumber = tx.order?.orderNumber;
                const orderId = tx.order?.id || tx.orderId;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-3 p-3.5 bg-neutral-50/60 hover:bg-neutral-50 rounded-xl border border-neutral-200/70 transition-all text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${meta.iconBg}`}>
                        {meta.icon}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-neutral-900 leading-snug">
                            {tx.description || tx.type}
                          </p>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.2 rounded border uppercase tracking-wider ${meta.badgeColor}`}
                          >
                            {meta.badge}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-neutral-500 flex-wrap">
                          <span className="font-mono">
                            {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {orderNumber && orderId && (
                            <>
                              <span>•</span>
                              <Link
                                to={`/account/orders/${orderId}`}
                                className="font-bold text-brand-gold hover:underline inline-flex items-center gap-0.5"
                              >
                                Order #{orderNumber} <ExternalLink size={10} />
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm sm:text-base font-bold font-mono block ${
                          meta.isPositive ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {meta.isPositive ? '+' : ''}
                        {tx.points} pts
                      </span>
                      {tx.balance !== undefined && (
                        <span className="text-[10px] text-neutral-400 font-mono block">
                          Bal: {tx.balance}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-400">
                  <History size={20} />
                </div>
                <p className="text-xs font-semibold text-neutral-700">No activity in this category yet.</p>
                <p className="text-[11px] text-neutral-400">
                  Points earned and redeemed on your orders will show up here.
                </p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
              <span className="text-[11px] text-neutral-400">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredLedger.length)} of {filteredLedger.length}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2 font-mono font-semibold text-neutral-800 text-xs">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LoyaltyPage;