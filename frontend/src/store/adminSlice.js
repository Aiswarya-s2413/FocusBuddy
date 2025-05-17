import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminAxios } from '../utils/axios';

// Admin Login
export const adminLogin = createAsyncThunk(
  'admin/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await adminAxios.post('/login/', credentials);
      return response.data;
    } catch (error) {
      if (error.response) {
        return rejectWithValue(error.response.data);
      } else {
        return rejectWithValue({ message: 'Network error, please try again later.' });
      }
    }
  }
);

// Admin Logout
export const adminLogout = createAsyncThunk(
  'admin/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Make sure to include withCredentials to ensure cookies are sent with the request
      const response = await adminAxios.post('/logout/', {}, { withCredentials: true });
      return response.data;
    } catch (error) {
      if (error.response) {
        return rejectWithValue(error.response.data);
      } else {
        return rejectWithValue({ message: 'Network error, please try again later.' });
      }
    }
  }
);

// Check authentication status
export const checkAuthStatus = createAsyncThunk(
  'admin/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await adminAxios.get('/check-auth/');
      return response.data;
    } catch (error) {
      // Don't treat 401 as an error, just return not authenticated
      if (error.response?.status === 401) {
        return rejectWithValue({ message: 'Not authenticated' });
      }
      // For other errors, return the error message
      return rejectWithValue(
        error.response?.data?.error || 'Failed to check authentication status'
      );
    }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    loading: false,
    success: false,
    error: null,
    message: '',
    admin: null,
    isAuthenticated: false,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearMessage: (state) => {
      state.message = '';
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(adminLogin.pending, (state) => {
        state.loading = true;
        state.success = false;
        state.error = null;
      })
      .addCase(adminLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.admin = action.payload.user;
        state.message = action.payload.message;
        state.isAuthenticated = true;
      })
      .addCase(adminLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Logout cases
      .addCase(adminLogout.fulfilled, (state) => {
        state.admin = null;
        state.success = false;
        state.message = '';
        state.error = null;
        state.isAuthenticated = false;
      })
      // Check auth status cases
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.admin = action.payload.user;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isAuthenticated = false;
        state.admin = null;
      });
  },
});

export const { clearError, clearMessage } = adminSlice.actions;
export default adminSlice.reducer; 