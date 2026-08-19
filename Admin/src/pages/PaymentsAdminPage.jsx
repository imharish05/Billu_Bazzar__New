import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import api from '../services/api';
import toast from 'react-hot-toast';

const PAY_STATUS = {
  PAID: 'bg-green-50 text-green-700',
  UNPAID: 'bg-yellow-50 text-yellow-700',
  REFUNDED: 'bg-gray-100 text-gray-500',
  FAILED: 'bg-red-50 text-red-500',
  PAYMENT_RECEIVED_STOCK_FAILED: 'bg-orange-50 text-orange-700'
};

const PaymentsAdminPage = () => {
  const [data, setData] = useState({ summary: [], refundedSummary: [], payments: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        const res = await api.get('/payments/admin/summary');
        if (res.data?.success) {
          setData({
            summary: res.data.summary || [],
            refundedSummary: res.data.refundedSummary || [],
            payments: res.data.payments || []
          });
        }
      } catch (err) {
        console.error('Failed to load payments summary:', err);
        toast.error(err.response?.data?.message || 'Error loading payments dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchPaymentData();
  }, []);

  // Compute metric cards separately for INR (Razorpay) and AED (Telr)
  const inrSummary = data.summary.find(s => s.currency === 'INR') || { totalRevenue: 0, transactionCount: 0 };
  const aedSummary = data.summary.find(s => s.currency === 'AED') || { totalRevenue: 0, transactionCount: 0 };

  const inrRefunded = data.refundedSummary.find(s => s.currency === 'INR')?.totalRefunded || 0;
  const aedRefunded = data.refundedSummary.find(s => s.currency === 'AED')?.totalRefunded || 0;

  const statCards = [
    {
      label: 'INR Collected (Razorpay)',
      value: `₹${inrSummary.totalRevenue.toLocaleString('en-IN')}`,
      sub: `${inrSummary.transactionCount} successful transactions`
    },
    {
      label: 'AED Collected (Telr)',
      value: `AED ${aedSummary.totalRevenue.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`,
      sub: `${aedSummary.transactionCount} successful transactions`
    },
    {
      label: 'INR Refunded',
      value: `₹${inrRefunded.toLocaleString('en-IN')}`,
      sub: 'OOS or cancelled refunds'
    },
    {
      label: 'AED Refunded',
      value: `AED ${aedRefunded.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`,
      sub: 'OOS or cancelled refunds'
    }
  ];

  return (
    <AdminLayout title="Payments">
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-gold"></div>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map(s => (
              <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm">
                <p className="text-brand-grey text-xs mb-1">{s.label}</p>
                <p className="font-playfair text-2xl font-bold text-brand-text">{s.value}</p>
                <p className="text-xs text-brand-grey mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-brand-light flex items-center justify-between">
              <p className="text-sm text-brand-grey">{data.payments.length} transactions logged</p>
              <button className="text-xs text-brand-gold hover:underline focus-visible:outline-brand-gold" id="export-payments">
                Export to Excel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Payments table">
                <thead>
                  <tr className="bg-brand-light/40 text-left">
                    {['Order', 'Amount', 'Method', 'Gateway Ref', 'Status', 'Date'].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-brand-grey uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.payments.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-brand-grey text-xs">
                        No transactions found.
                      </td>
                    </tr>
                  ) : (
                    data.payments.map(p => (
                      <tr key={p.id} className="border-b border-brand-light hover:bg-brand-light/20 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-gold">{p.orderNo}</td>
                        <td className="px-4 py-3 font-semibold">
                          {p.currency === 'AED'
                            ? `AED ${p.amount.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`
                            : `₹${p.amount.toLocaleString('en-IN')}`}
                        </td>
                        <td className="px-4 py-3 text-brand-grey">{p.method}</td>
                        <td className="px-4 py-3 font-mono text-xs text-brand-grey">{p.ref}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${PAY_STATUS[p.status] || 'bg-gray-100'}`}>
                            {p.status ? p.status.replace(/_/g, ' ') : ''}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-brand-grey text-xs">
                          {new Date(p.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default PaymentsAdminPage;
