import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Axios instance (used internally if needed)
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
});

// Admin Axios instance
export const adminAxios = axios.create({
  baseURL: `${baseURL}/admin/`,
  withCredentials: true, 
});

// Token refresh logic (ONLY for admin if needed)
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
        // This should trigger the backend to check the refresh token from the cookie
        await adminAxios.post('/refresh/');

        // Retry original request (cookies still attached automatically)
        return adminAxios(originalRequest);
      } catch (refreshError) {
        window.location.href = '/admin/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
