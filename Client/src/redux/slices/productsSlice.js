import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchProducts = createAsyncThunk('products/fetchAll', async (params = {}, { rejectWithValue }) => {
  try { const res = await api.get('/products', { params }); return res.data; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const fetchProduct = createAsyncThunk('products/fetchOne', async (slug, { rejectWithValue }) => {
  try { const res = await api.get(`/products/${slug}`); return res.data.product; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const fetchFeatured = createAsyncThunk('products/featured', async (_, { rejectWithValue }) => {
  try { const res = await api.get('/products/featured'); return res.data.products; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const fetchNewArrivals = createAsyncThunk('products/fetchNewArrivals', async (limit = 8, { rejectWithValue }) => {
  try { const res = await api.get('/products', { params: { newArrival: true, limit } }); return res.data.products; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const fetchBestSellers = createAsyncThunk('products/fetchBestSellers', async (limit = 8, { rejectWithValue }) => {
  try { const res = await api.get('/products', { params: { bestSeller: true, limit } }); return res.data.products; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [], featured: [], newArrivals: [], bestSellers: [], current: null,
    total: 0, page: 1, totalPages: 1,
    loading: false, error: null,
    bestSellersLoaded: false,
    newArrivalsLoaded: false,
    filters: { category: '', minPrice: '', maxPrice: '', sort: 'createdAt', order: 'DESC' },
  },
  reducers: {
    setFilters: (state, action) => { state.filters = { ...state.filters, ...action.payload }; },
    clearCurrent: (state) => { state.current = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => { state.loading = true; })
      .addCase(fetchProducts.fulfilled, (state, action) => { state.loading = false; state.items = action.payload.products; state.total = action.payload.total; state.page = action.payload.page; state.totalPages = action.payload.totalPages; })
      .addCase(fetchProducts.rejected, (state, action) => { state.loading = false; state.error = action.payload; })
      .addCase(fetchProduct.pending, (state) => { state.loading = true; state.current = null; })
      .addCase(fetchProduct.fulfilled, (state, action) => { state.loading = false; state.current = action.payload; })
      .addCase(fetchFeatured.fulfilled, (state, action) => { state.featured = action.payload; })
      .addCase(fetchNewArrivals.fulfilled, (state, action) => { state.newArrivals = action.payload || []; state.newArrivalsLoaded = true; })
      .addCase(fetchNewArrivals.rejected, (state) => { state.newArrivalsLoaded = true; })
      .addCase(fetchBestSellers.fulfilled, (state, action) => { state.bestSellers = action.payload || []; state.bestSellersLoaded = true; })
      .addCase(fetchBestSellers.rejected, (state) => { state.bestSellersLoaded = true; });
  },
});

export const { setFilters, clearCurrent } = productsSlice.actions;
export default productsSlice.reducer;
