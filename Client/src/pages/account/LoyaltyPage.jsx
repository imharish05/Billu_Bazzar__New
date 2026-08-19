import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { loyaltyEarnRules as defaultEarnRules } from '../../data/mockAccountData';
import { formatPrice } from '../../utils/currency';
import api from '../../services/api';

/**
 * LoyaltyPage — /account/loyalty
 * PRD ref: "Customer Account > Loyalty points & cashback wallet" (premium)
 * Mock data — points balance, cashback balance, and transaction ledger are
 * all hardcoded; swap for real balance + ledger endpoints once available.
 */
const LoyaltyPage = () => {
  const customer = useSelector((state) => state.auth.customer);
  const { code: currencyCode, rate: currencyRate } = useSelector((state) => state.currency);

  const [earnRules, setEarnRules] = useState(defaultEarnRules);
  const [loadingRules, setLoadingRules] = useState(true);
  const [redeemRate, setRedeemRate] = useState(0.2); // Default 0.2

  const [ledger, setLedger] = useState([]);
  const [balance, setBalance] = useState(customer?.loyaltyPoints || 0);
  const [loadingLedger, setLoadingLedger] = useState(true);

  useEffect(() => {
    const fetchLoyaltyData = async () => {
      try {
        const [settingsRes, ledgerRes] = await Promise.all([
          api.get('/site-settings/loyalty'),
          api.get('/customers/loyalty')
        ]);
        
        if (settingsRes.data?.success && settingsRes.data?.data) {
          const d = settingsRes.data.data;
          if (d.redeemRate) {
            setRedeemRate(Number(d.redeemRate));
          }

          const dynamicRules = [];
          if (d.earnRate) {
            const earnFormatted = formatPrice(d.earnRate, currencyCode, currencyRate);
            dynamicRules.push({ action: `Shopping (Every ${earnFormatted} spent)`, points: '+1 point' });
          }
          if (d.signupPointsEnabled !== false && Number(d.signupPoints || 0) > 0) {
            dynamicRules.push({ action: 'Create an Account / Registration', points: `+${d.signupPoints} points` });
          }
          if (d.reviewPointsEnabled !== false && Number(d.reviewPoints || 0) > 0) {
            dynamicRules.push({ action: 'Write a Product Review', points: `+${d.reviewPoints} points` });
          }

          if (d.earnRules && d.earnRules.length > 0) {
            d.earnRules.forEach(r => {
              if (r.action && r.points) dynamicRules.push(r);
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

  const loyaltyTier = balance >= 1000 ? 'Gold' : balance >= 500 ? 'Silver' : 'Bronze';
  const worth = balance * redeemRate;
  const cashbackBalance = 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <h1 className="font-playfair text-xl font-semibold mb-5">Loyalty & Cashback</h1>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-r from-brand-gold to-yellow-500 text-white p-6">
          <p className="text-sm opacity-80 mb-1 text-white">Loyalty Points · {loyaltyTier} Tier</p>
          <p className="font-playfair text-5xl font-bold text-white">{balance}</p>
          <p className="text-sm opacity-80 mt-1 text-white">Worth {formatPrice(worth, currencyCode, currencyRate)}</p>
        </div>
        <div className="bg-brand-text text-white p-6">
          <p className="text-sm opacity-70 mb-1 flex items-center gap-1.5 text-white"><Wallet size={14} /> Cashback Wallet</p>
          <p className="font-playfair text-5xl font-bold text-white">{formatPrice(cashbackBalance, currencyCode, currencyRate)}</p>
          <p className="text-sm opacity-70 mt-1 text-white">Auto-applies at checkout</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white shadow-sm p-6">
          <h2 className="font-medium text-sm mb-4">How to earn more</h2>
          <div className="space-y-3">
            {loadingRules ? (
              <div className="text-sm text-brand-grey py-2">Loading...</div>
            ) : earnRules.length > 0 ? (
              earnRules.map((rule, idx) => (
                <div key={rule.id || idx} className="flex justify-between text-sm py-2 border-b border-brand-light last:border-0">
                  <span className="text-brand-grey">{rule.action}</span>
                  <span className="font-medium text-brand-gold">{rule.points}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-brand-grey py-2">No rules configured.</div>
            )}
          </div>
        </div>

        <div className="bg-white shadow-sm p-6">
          <h2 className="font-medium text-sm mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {loadingLedger ? (
              <div className="text-sm text-brand-grey py-2">Loading activity...</div>
            ) : ledger.length > 0 ? (
              ledger.map(tx => (
                <div key={tx.id} className="flex items-center justify-between text-sm py-2 border-b border-brand-light last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {tx.type === 'EARN' || tx.type === 'BONUS'
                      ? <TrendingUp size={14} className="text-green-600 flex-shrink-0" />
                      : <TrendingDown size={14} className="text-red-500 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className="truncate">{tx.description || tx.type}</p>
                      <p className="text-[11px] text-brand-grey">
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <span className={`font-medium flex-shrink-0 ${tx.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-brand-grey py-2">No recent activity found.</div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LoyaltyPage;