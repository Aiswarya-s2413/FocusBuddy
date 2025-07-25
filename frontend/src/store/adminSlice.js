import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminAxios } from '../utils/axios';

// Add response interceptor for automatic token refresh
adminAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        await adminAxios.post('/refresh-token/');
        // Retry original request
        return adminAxios(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login or clear auth state
        window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Admin Login
export const adminLogin = createAsyncThunk(
  'admin/login',
  async (credentials, { rejectWithValue }) => {
    try {
      console.log('Login credentials:', credentials); // Debug log
      const response = await adminAxios.post('/login/', credentials);
      console.log('Login response:', response.data); // Debug log
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message); // Debug log
      if (error.response?.data) {
        // Handle specific field errors from Django serializer
        if (error.response.data.non_field_errors) {
          return rejectWithValue({ message: error.response.data.non_field_errors[0] });
        }
        if (error.response.data.email) {
          return rejectWithValue({ message: `Email: ${error.response.data.email[0]}` });
        }
        if (error.response.data.password) {
          return rejectWithValue({ message: `Password: ${error.response.data.password[0]}` });
        }
        return rejectWithValue(error.response.data);
      } else {
        return rejectWithValue({ message: 'Network error, please try again later.' });
      }
    }
  }
);

const deleteCookie = (name, path = '/', domain = '') => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${domain}`;
}

// Admin Logout
export const adminLogout = createAsyncThunk(
  'admin/logout',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const response = await adminAxios.post('/logout/');
      
      // Manually clear cookies on the frontend
      deleteCookie('admin_access');
      deleteCookie('admin_refresh');
      
      // Also try with explicit path
      deleteCookie('admin_access', '/');
      deleteCookie('admin_refresh', '/');
      
      return response.data;
    } catch (error) {
      console.warn('Logout request failed, but clearing client state anyway');
      
      // Still clear cookies even if server request fails
      deleteCookie('admin_access');
      deleteCookie('admin_refresh');
      deleteCookie('admin_access', '/');
      deleteCookie('admin_refresh', '/');
      
      return { message: 'Logged out locally' };
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

// Refresh token
export const refreshToken = createAsyncThunk(
  'admin/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await adminAxios.post('/refresh-token/');
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 'Token refresh failed'
      );
    }
  }
);

// Load admin state from localStorage on startup
const loadAdminInitialState = () => {
  try {
    const savedAdmin = localStorage.getItem('admin');
    if (savedAdmin) {
      return {
        loading: false,
        success: true,
        error: null,
        message: '',
        admin: JSON.parse(savedAdmin),
        isAuthenticated: true,
      };
    }
  } catch (error) {
    console.error('Error loading admin state from localStorage:', error);
  }
  return {
    loading: false,
    success: false,
    error: null,
    message: '',
    admin: null,
    isAuthenticated: false,
  };
};

const adminSlice = createSlice({
  name: 'admin',
  initialState: loadAdminInitialState(),
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearMessage: (state) => {
      state.message = '';
    },
    clearAuthState: (state) => {
      state.admin = null;
      state.success = false;
      state.message = '';
      state.error = null;
      state.isAuthenticated = false;
      state.loading = false;
      localStorage.removeItem('admin');
    },
    hydrateAdminFromLocalStorage: (state) => {
      const savedAdmin = localStorage.getItem('admin');
      if (savedAdmin) {
        state.admin = JSON.parse(savedAdmin);
        state.isAuthenticated = true;
        state.success = true;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(adminLogin.pending, (state) => {
        state.loading = true;
        state.success = false;
        state.error = null;
        state.message = '';
      })
      .addCase(adminLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.admin = action.payload.user;
        state.message = action.payload.message;
        state.isAuthenticated = true;
        state.error = null;
        // Save admin to localStorage
        localStorage.setItem('admin', JSON.stringify(action.payload.user));
      })
      .addCase(adminLogin.rejected, (state, action) => {
        state.loading = false;
        state.success = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.admin = null;
      })
      
      // Logout cases
      .addCase(adminLogout.pending, (state) => {
        state.loading = true;
      })
      .addCase(adminLogout.fulfilled, (state, action) => {
        state.admin = null;
        state.success = false;
        state.message = action.payload.message || 'Logged out successfully';
        state.error = null;
        state.isAuthenticated = false;
        state.loading = false;
        localStorage.removeItem('admin');
      })
      .addCase(adminLogout.rejected, (state) => {
        // Clear state even if logout request failed
        state.admin = null;
        state.success = false;
        state.message = 'Logged out locally';
        state.error = null;
        state.isAuthenticated = false;
        state.loading = false;
        localStorage.removeItem('admin');
      })
      
      // Check auth status cases
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.admin = action.payload.user;
        state.error = null;
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.admin = null;
        // Only set error if it's not a 401 (which is expected when not authenticated)
        if (!action.payload?.message?.includes('Not authenticated')) {
          state.error = action.payload;
        }
      })
      
      // Token refresh cases
      .addCase(refreshToken.fulfilled, (state) => {
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.isAuthenticated = false;
        state.admin = null;
      });
  },
});

export const { clearError, clearMessage, clearAuthState, hydrateAdminFromLocalStorage } = adminSlice.actions;
export default adminSlice.reducer;