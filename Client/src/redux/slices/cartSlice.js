import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// ── Guest cart persistence (localStorage) ────────────────────────────────────
// Without this, a full page reload/navigation on /checkout wipes the in-memory
// Redux cart back to [], which then lets an empty order slip through to the
// server (see handlePlaceOrder guard in CheckoutPage + syncCart guard below).
const CART_STORAGE_KEY = 'bb_guest_cart';

const loadPersistedCart = () => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [], subtotal: 0 };
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const subtotal = items.reduce((s, i) => s + i.priceAtAdd * i.quantity, 0);
    return { items, subtotal };
  } catch {
    return { items: [], subtotal: 0 };
  }
};

const persistCart = (items) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items }));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — cart just won't survive a reload
  }
};

export const fetchCart = createAsyncThunk('cart/fetch', async (_, { rejectWithValue }) => {
  try { const res = await api.get('/cart'); return res.data.cart; }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const addToCart = createAsyncThunk('cart/add', async (item, { rejectWithValue, dispatch }) => {
  try { await api.post('/cart/add', item); dispatch(fetchCart()); }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const syncCart = createAsyncThunk('cart/sync', async (items, { rejectWithValue }) => {
  try {
    const res = await api.post('/cart/sync', { items });
    return res.data.cart;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});


export const updateCartItem = createAsyncThunk('cart/update', async ({ itemId, quantity }, { rejectWithValue, dispatch }) => {
  try { await api.put(`/cart/item/${itemId}`, { quantity }); dispatch(fetchCart()); }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

export const removeFromCart = createAsyncThunk('cart/remove', async (itemId, { rejectWithValue, dispatch }) => {
  try { await api.delete(`/cart/item/${itemId}`); dispatch(fetchCart()); }
  catch (err) { return rejectWithValue(err.response?.data?.message); }
});

// ── Buy Now persistence (sessionStorage) ──────────────────────────────────
const BUY_NOW_STORAGE_KEY = 'bb_buy_now_item';

const loadPersistedBuyNow = () => {
  try {
    const raw = sessionStorage.getItem(BUY_NOW_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const areVariantsEqual = (varA, varB) => {
  const a = varA || {};
  const b = varB || {};
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) return false;
  return keysA.every(k => String(a[k]).toLowerCase() === String(b[k]).toLowerCase());
};

// ── Local cart (guest — before auth) ─────────────────────────────────────────
const persistedCart = loadPersistedCart();

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: persistedCart.items,
    subtotal: persistedCart.subtotal,
    buyNowItem: loadPersistedBuyNow(),
    isOpen: false,   // cart drawer open state
    loading: false,
    error: null,
  },
  reducers: {
    openCart: (state) => { state.isOpen = true; },
    closeCart: (state) => { state.isOpen = false; },
    toggleCart: (state) => { state.isOpen = !state.isOpen; },
    setBuyNowItem: (state, action) => {
      state.buyNowItem = action.payload;
      try {
        if (action.payload) {
          sessionStorage.setItem(BUY_NOW_STORAGE_KEY, JSON.stringify(action.payload));
        } else {
          sessionStorage.removeItem(BUY_NOW_STORAGE_KEY);
        }
      } catch {}
    },
    clearBuyNowItem: (state) => {
      state.buyNowItem = null;
      try { sessionStorage.removeItem(BUY_NOW_STORAGE_KEY); } catch {}
    },
    // Guest cart — local state reducers
    addLocalState: (state, action) => {
      const payload = action.payload || {};
      const targetProductId = payload.productId || payload.id;
      const targetVariantId = payload.variantId || null;

      const resolvedName = payload.name || payload.productName || payload.product?.name || '';
      const resolvedImage = payload.image || payload.productImage || payload.product?.image || (payload.product?.images && payload.product.images[0]) || '';
      const resolvedVariant = payload.selectedVariant || payload.variant?.attributes || {};
      const resolvedPrice = parseFloat(payload.priceAtAdd || payload.price || payload.product?.price || 0);
      const addedQty = parseInt(payload.quantity || 1, 10);

      const existingIndex = state.items.findIndex(i => {
        const sameProd = Number(i.productId || i.id) === Number(targetProductId);
        if (!sameProd) return false;
        if (targetVariantId || i.variantId) {
          return Number(i.variantId) === Number(targetVariantId);
        }
        return areVariantsEqual(i.selectedVariant, resolvedVariant);
      });

      if (existingIndex !== -1) {
        state.items[existingIndex].quantity += addedQty;
        if (resolvedName) state.items[existingIndex].name = resolvedName;
        if (resolvedImage) state.items[existingIndex].image = resolvedImage;
        if (resolvedPrice) state.items[existingIndex].priceAtAdd = resolvedPrice;
        if (resolvedVariant && Object.keys(resolvedVariant).length > 0) {
          state.items[existingIndex].selectedVariant = resolvedVariant;
        }
        if (payload.gstRate) {
          state.items[existingIndex].gstRate = payload.gstRate;
        }
      } else {
        state.items.push({
          productId: targetProductId,
          variantId: targetVariantId,
          name: resolvedName,
          image: resolvedImage,
          priceAtAdd: resolvedPrice,
          selectedVariant: resolvedVariant,
          quantity: addedQty,
          gstRate: payload.gstRate || payload.selectedVariant?.gstRate || payload.product?.gstRate || '0%',
        });
      }
      state.subtotal = state.items.reduce((s, i) => s + (parseFloat(i.priceAtAdd) || 0) * i.quantity, 0);
      persistCart(state.items);
    },
    removeLocalState: (state, action) => {
      const { productId, variantId, selectedVariant } = typeof action.payload === 'object' && action.payload !== null
        ? action.payload
        : { productId: action.payload, variantId: null, selectedVariant: null };

      state.items = state.items.filter(i => {
        const sameProd = Number(i.productId || i.id) === Number(productId);
        if (!sameProd) return true;
        if (variantId || i.variantId) {
          return Number(i.variantId) !== Number(variantId);
        }
        if (selectedVariant) {
          return !areVariantsEqual(i.selectedVariant, selectedVariant);
        }
        return false;
      });
      state.subtotal = state.items.reduce((s, i) => s + (parseFloat(i.priceAtAdd) || 0) * i.quantity, 0);
      persistCart(state.items);
    },
    clearLocalState: (state) => { state.items = []; state.subtotal = 0; persistCart([]); },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCart.pending, (state) => { state.loading = true; })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        const serverItems = action.payload?.items || [];
        if (serverItems.length > 0) {
          state.items = serverItems;
          state.subtotal = action.payload?.subtotal || 0;
          persistCart(state.items);
        } else if (state.items.length > 0) {
          // Keep persisted local/guest cart items on page refresh if server session returns empty
          state.subtotal = state.items.reduce((s, i) => s + (parseFloat(i.priceAtAdd || i.price) || 0) * i.quantity, 0);
          persistCart(state.items);
        } else {
          state.items = [];
          state.subtotal = 0;
          persistCart([]);
        }
      })
      .addCase(syncCart.fulfilled, (state, action) => {
        state.items = action.payload?.items || [];
        state.subtotal = action.payload?.subtotal || 0;
        persistCart(state.items);
      })
      .addCase(fetchCart.rejected, (state, action) => { state.loading = false; state.error = action.payload; });

  },
});

export const { openCart, closeCart, toggleCart, setBuyNowItem, clearBuyNowItem, addLocalState, removeLocalState, clearLocalState } = cartSlice.actions;

// ── Debounced background cart sync helper to prevent repetitive heavy API calls ──
let syncTimer = null;
const debouncedSyncCart = (items) => {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    try {
      await api.post('/cart/sync', { items });
    } catch (err) {
      console.log('[cart/sync] Background sync note:', err.message);
    }
  }, 300);
};

// ── Wrapped local cart actions that trigger debounced background server sync ──
export const addLocal = createAsyncThunk('cart/addLocalSync', async (cartItem, { dispatch, getState }) => {
  dispatch(addLocalState(cartItem));
  const items = getState().cart.items;
  debouncedSyncCart(items);
});

export const removeLocal = createAsyncThunk('cart/removeLocalSync', async (payload, { dispatch, getState }) => {
  dispatch(removeLocalState(payload));
  const items = getState().cart.items;
  debouncedSyncCart(items);
});

export const clearLocal = createAsyncThunk('cart/clearLocalSync', async (_, { dispatch }) => {
  dispatch(clearLocalState());
  debouncedSyncCart([]);
});

export default cartSlice.reducer;

