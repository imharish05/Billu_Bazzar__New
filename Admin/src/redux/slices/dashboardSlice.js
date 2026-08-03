import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchStats = createAsyncThunk('dashboard/stats', async (_, { rejectWithValue }) => {
  try { const res = await api.get('/orders/stats'); return res.data.stats; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

// Generate 7-day mock revenue chart data
const generate7DayRevenue = () => {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return days.map(day => ({ day, revenue: Math.floor(Math.random() * 80000) + 20000, orders: Math.floor(Math.random() * 40) + 10 }));
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    stats: { totalOrders: 0, todayOrders: 0, monthOrders: 0, totalCustomers: 0, pendingOrders: 0, deliveredOrders: 0, totalRevenue: 0, totalRevenueAED: 0 },
    revenueChart: generate7DayRevenue(),
    loading: false, error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStats.pending, (state) => { state.loading = true; })
      .addCase(fetchStats.fulfilled, (state, action) => { state.loading = false; state.stats = action.payload; })
      .addCase(fetchStats.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});
export default dashboardSlice.reducer;
