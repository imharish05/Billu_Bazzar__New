import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchAdminOrders = createAsyncThunk('adminOrders/fetch', async (params = {}, { rejectWithValue }) => {
  try { const res = await api.get('/orders', { params: { page: 1, limit: 10, ...params } }); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});
export const updateOrderStatus = createAsyncThunk('adminOrders/updateStatus', async ({ id, status, paymentStatus }, { rejectWithValue }) => {
  try { const res = await api.patch(`/orders/${id}/status`, { status, paymentStatus }); return res.data.order; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const ordersSlice = createSlice({
  name: 'adminOrders',
  initialState: { items: [], total: 0, page: 1, limit: 10, totalPages: 1, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminOrders.pending, (state) => { state.loading = true; })
      .addCase(fetchAdminOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.orders;
        state.total = action.payload.total;
        state.page = action.payload.page || 1;
        state.totalPages = action.payload.totalPages || 1;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => { const idx = state.items.findIndex(o => o.id === action.payload.id); if (idx > -1) state.items[idx] = action.payload; });
  },
});
export default ordersSlice.reducer;
