import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchAdminProducts = createAsyncThunk('adminProducts/fetch', async (params = {}, { rejectWithValue }) => {
  try { const res = await api.get('/products', { params: { page: 1, limit: 10, ...params } }); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data?.message || err.message || 'Failed to fetch products'); }
});
export const createProduct = createAsyncThunk('adminProducts/create', async (data, { rejectWithValue }) => {
  try { const res = await api.post('/products', data); return res.data.product; }
  catch (err) { return rejectWithValue(err.response?.data?.message || err.message || 'Failed to create product'); }
});
export const updateProduct = createAsyncThunk('adminProducts/update', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await api.put(`/products/${id}`, data); return res.data.product; }
  catch (err) { return rejectWithValue(err.response?.data?.message || err.message || 'Failed to update product'); }
});
export const deleteProduct = createAsyncThunk('adminProducts/delete', async (id, { rejectWithValue }) => {
  try { await api.delete(`/products/${id}`); return id; }
  catch (err) { return rejectWithValue(err.response?.data?.message || err.message || 'Failed to delete product'); }
});

const productsSlice = createSlice({
  name: 'adminProducts',
  initialState: { items: [], total: 0, page: 1, limit: 10, totalPages: 1, loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminProducts.pending, (state) => { state.loading = true; })
      .addCase(fetchAdminProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.products;
        state.total = action.payload.total;
        state.page = action.payload.page || 1;
        state.totalPages = action.payload.totalPages || 1;
      })
      .addCase(fetchAdminProducts.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(createProduct.fulfilled, (state, action) => { state.items.unshift(action.payload); state.total += 1; })
      .addCase(updateProduct.fulfilled, (state, action) => { const idx = state.items.findIndex(p => p.id === action.payload.id); if (idx > -1) state.items[idx] = action.payload; })
      .addCase(deleteProduct.fulfilled, (state, action) => { state.items = state.items.filter(p => p.id !== action.payload); state.total -= 1; });
  },
});
export default productsSlice.reducer;
