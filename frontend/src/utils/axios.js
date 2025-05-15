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
  baseURL: `${baseURL}/admin/`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 👉 Admin Token Refresh Logic
adminAxios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/admin/refresh/')
    ) {
      originalRequest._retry = true;

      try {
        // Attempt token refresh
        await adminAxios.post('/refresh/');

        // Retry original request
        return adminAxios(originalRequest);
      } catch (refreshError) {
        window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
