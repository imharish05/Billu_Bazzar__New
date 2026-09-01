import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

import { getAccessToken } from '../../utils/tokenStorage';

export const fetchMyOrders = createAsyncThunk('orders/myOrders', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/orders/my');
    return res.data.orders;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch orders');
  }
});

export const fetchOrderById = createAsyncThunk('orders/fetchById', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/orders/track/${id}`);
    if (res.data?.order) {
      return res.data.order;
    }
    return rejectWithValue('Order not found');
  } catch (err) {
    // Only attempt protected endpoint if customer is logged in with an access token
    if (getAccessToken()) {
      try {
        const res = await api.get(`/orders/my/${id}`);
        return res.data?.order;
      } catch (err2) {
        return rejectWithValue(err2.response?.data?.message || err.response?.data?.message || 'Failed to fetch order details');
      }
    }
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch order details');
  }
});

export const cancelCustomerOrder = createAsyncThunk('orders/cancel', async (payload, { rejectWithValue }) => {
  try {
    const id = typeof payload === 'object' ? payload.id : payload;
    const reason = typeof payload === 'object' ? payload.reason : undefined;
    const res = await api.post(`/orders/my/${id}/cancel`, { reason });
    return res.data.order;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to cancel order');
  }
});

export const placeOrder = createAsyncThunk('orders/place', async (orderData, { rejectWithValue }) => {
  try {
    const res = await api.post('/orders', orderData);
    return res.data.order;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to place order');
  }
});

const ordersSlice = createSlice({
  name: 'orders',
  initialState: { items: [], current: null, loading: false, error: null },
  reducers: {
    clearCurrentOrder: (state) => { state.current = null; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyOrders.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchMyOrders.fulfilled, (state, action) => { state.loading = false; state.items = action.payload; })
      .addCase(fetchMyOrders.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(fetchOrderById.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchOrderById.fulfilled, (state, action) => { state.loading = false; state.current = action.payload; })
      .addCase(fetchOrderById.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(cancelCustomerOrder.fulfilled, (state, action) => {
        state.current = action.payload;
        const index = state.items.findIndex(o => o.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })

      .addCase(placeOrder.fulfilled, (state, action) => {
        state.current = action.payload;
        state.items.unshift(action.payload);
      });
  },
});

export const { clearCurrentOrder } = ordersSlice.actions;
export default ordersSlice.reducer;
