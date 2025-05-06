import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// Load user state from localStorage on startup
const loadInitialState = () => {
  try {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      return {
        loading: false,
        success: true,
        error: null,
        message: '',
        user: JSON.parse(savedUser),
      };
    }
  } catch (error) {
    console.error('Error loading state from localStorage:', error);
  }
  return {
    loading: false,
    success: false,
    error: null,
    message: '',
    user: null,
  };
};

// SIGNUP
export const signupUser = createAsyncThunk(
  'user/signupUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.post('http://localhost:8000/api/user/signup/', userData, { withCredentials: true });
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

// LOGIN
export const loginUser = createAsyncThunk(
  'user/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axios.post('http://localhost:8000/api/user/login/', credentials, { withCredentials: true });
      // Save user to localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
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

// UPDATE PROFILE
export const updateProfile = createAsyncThunk(
  'user/updateProfile',
  async (name, { rejectWithValue, getState }) => {
    try {
      const response = await axios.put(
        'http://localhost:8000/api/user/update-profile/',
        { name },
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            // Add X-CSRFToken header if you're using CSRF protection
            'X-CSRFToken': document.cookie.split('; ')
              .find(row => row.startsWith('csrftoken='))
              ?.split('=')[1]
          }
        }
      );
      
      // Update user in localStorage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, ...response.data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return response.data;
    } catch (error) {
      console.error('Profile update error:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data || 'Failed to update profile');
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState: loadInitialState(),
  reducers: {
    logout: (state) => {
      // Clear localStorage on logout
      localStorage.removeItem('user');
      state.user = null;
      state.success = false;
      state.message = '';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // SIGNUP
    builder
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.success = false;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.message = action.payload.message;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // LOGIN
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.success = false;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        state.user = action.payload.user; 
        state.message = action.payload.message;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // UPDATE PROFILE
    builder
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.success = false;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.success = true;
        if (state.user && action.payload.user) {
          state.user = { ...state.user, ...action.payload.user };
        }
        state.message = action.payload.message;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout } = userSlice.actions;

export default userSlice.reducer;