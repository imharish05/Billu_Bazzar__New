import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Fetch all return requests for logged-in customer
export const fetchMyReturns = createAsyncThunk(
  'returns/fetchMyReturns',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/returns/my');
      return response.data.returns || [];
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch returns');
    }
  }
);

// Fetch single return request details
export const fetchReturnById = createAsyncThunk(
  'returns/fetchReturnById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/returns/my/${id}`);
      return response.data.returnRequest;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch return details');
    }
  }
);

// Submit individual item return request
export const createReturnRequest = createAsyncThunk(
  'returns/createReturnRequest',
  async (returnData, { rejectWithValue }) => {
    try {
      const isFormData = returnData instanceof FormData;
      const config = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
      const response = await api.post('/returns/request', returnData, config);
      return response.data.returnRequest;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to submit return request');
    }
  }
);

const returnsSlice = createSlice({
  name: 'returns',
  initialState: {
    items: [],
    current: null,
    loading: false,
    submitting: false,
    error: null,
    successMessage: null,
  },
  reducers: {
    clearCurrentReturn: (state) => {
      state.current = null;
    },
    clearReturnStatus: (state) => {
      state.error = null;
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchMyReturns
      .addCase(fetchMyReturns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyReturns.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchMyReturns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // fetchReturnById
      .addCase(fetchReturnById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReturnById.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
      })
      .addCase(fetchReturnById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // createReturnRequest
      .addCase(createReturnRequest.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createReturnRequest.fulfilled, (state, action) => {
        state.submitting = false;
        state.items.unshift(action.payload);
        state.current = action.payload;
        state.successMessage = 'Return request submitted successfully!';
      })
      .addCase(createReturnRequest.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });
  },
});

export const { clearCurrentReturn, clearReturnStatus } = returnsSlice.actions;
export default returnsSlice.reducer;
