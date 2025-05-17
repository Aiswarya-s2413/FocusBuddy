import axios from 'axios';

// Base URL from environment or fallback
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Helper to get CSRF token from cookies
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

// Generic axios instance (optional fallback use)
const instance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// User Axios instance
export const userAxios = axios.create({
  baseURL: `${baseURL}/api/user/`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add CSRF token to every request from userAxios
userAxios.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Admin Axios instance
export const adminAxios = axios.create({
  baseURL: `${baseURL}/api/admin/`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add CSRF token to every request from adminAxios
adminAxios.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag to prevent multiple refresh attempts at once
let isRefreshing = false;
// Store pending requests to retry after refresh
let failedQueue = [];

// Process the pending requests queue
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  
  failedQueue = [];
};

// Admin Token Refresh Logic - Fixed to prevent infinite loop
adminAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If not a 401 error or already retried, immediately reject
    if (!error.response || error.response.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If we're already refreshing or if this is a refresh request, don't try to refresh again
    if (isRefreshing || originalRequest.url.includes('refresh')) {
      // If this is a refresh request that failed, redirect to login
      if (originalRequest.url.includes('refresh')) {
        window.location.href = '/admin/login';
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    isRefreshing = true;

    // Add this request to the queue if it's not the refresh request itself
    const retryOriginal = new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    });

    try {
      // Attempt token refresh
      await adminAxios.post('/refresh/');
      
      // Process all pending requests
      processQueue(null);
      isRefreshing = false;
      
      // Return the original request
      return adminAxios(originalRequest);
    } catch (refreshError) {
      // Process the queue with the error
      processQueue(refreshError);
      isRefreshing = false;
      
      // If refresh failed, redirect to login
      window.location.href = '/admin/login';
      return Promise.reject(refreshError);
    }
  }
);

export default instance;