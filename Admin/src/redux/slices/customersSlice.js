import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchCustomers = createAsyncThunk('customers/fetch', async (params = {}, { rejectWithValue }) => {
  try { const res = await api.get('/customers', { params: { page: 1, limit: 10, ...params } }); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const customersSlice = createSlice({
  name: 'customers',
  initialState: { items: [], total: 0, page: 1, limit: 10, totalPages: 1, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => { state.loading = true; })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.customers;
        state.total = action.payload.total;
        state.page = action.payload.page || 1;
        state.totalPages = action.payload.totalPages || 1;
      })
      .addCase(fetchCustomers.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});
export default customersSlice.reducer;
