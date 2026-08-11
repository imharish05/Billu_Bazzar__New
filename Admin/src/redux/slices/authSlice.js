import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const loginAdmin = createAsyncThunk('auth/adminLogin', async (credentials, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/admin/login', credentials);
    localStorage.setItem('bb_admin_token', res.data.token);
    localStorage.setItem('bb_admin_refresh_token', res.data.refreshToken);
    if (res.data.admin) {
      localStorage.setItem('bb_admin_user', JSON.stringify(res.data.admin));
    }
    return res.data;
  } catch (err) { return rejectWithValue(err.response?.data?.message || 'Login failed'); }
});

const getSavedAdmin = () => {
  try {
    return JSON.parse(localStorage.getItem('bb_admin_user') || 'null');
  } catch {
    return null;
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    admin: getSavedAdmin(),
    token: localStorage.getItem('bb_admin_token') || null,
    isAuthenticated: !!localStorage.getItem('bb_admin_token'),
    loading: false, error: null,
  },
  reducers: {
    setAdminUser: (state, action) => {
      state.admin = action.payload;
      if (action.payload) {
        localStorage.setItem('bb_admin_user', JSON.stringify(action.payload));
      } else {
        localStorage.removeItem('bb_admin_user');
      }
    },
    logout: (state) => {
      state.admin = null; state.token = null; state.isAuthenticated = false;
      localStorage.removeItem('bb_admin_token');
      localStorage.removeItem('bb_admin_refresh_token');
      localStorage.removeItem('bb_admin_user');
    },
    updateAccessToken: (state, action) => {
      state.token = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAdmin.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.loading = false; state.token = action.payload.token;
        state.admin = action.payload.admin; state.isAuthenticated = true;
      })
      .addCase(loginAdmin.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  },
});
export const { logout, setAdminUser, updateAccessToken, clearError } = authSlice.actions;
export default authSlice.reducer;
