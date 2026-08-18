import axios from 'axios';
import { logout, updateAccessToken } from '../redux/slices/authSlice';

let store;
const getStore = async () => {
  if (!store) {
    const module = await import('../redux/store');
    store = module.default;
  }
  return store;
};

// Queue for holding requests while refreshing access token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const serverUrl = (import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');
const rawApiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

let baseURL = rawApiBase;
if (rawApiBase.startsWith('http://') || rawApiBase.startsWith('https://')) {
  baseURL = rawApiBase;
} else if (serverUrl) {
  baseURL = `${serverUrl}${rawApiBase.startsWith('/') ? '' : '/'}${rawApiBase}`;
}

const api = axios.create({ baseURL, timeout: 15000 });

api.interceptors.request.use((config) => {
  if (config.url === '/auth/refresh') {
    return config;
  }
  const token = localStorage.getItem('bb_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  async err => {
    const originalRequest = err.config;

    // Prevent loop if the request to refresh token itself fails
    if (originalRequest.url === '/auth/refresh') {
      return Promise.reject(err);
    }

    if (err.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        try {
          const newToken = await new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          });
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (queueErr) {
          return Promise.reject(queueErr);
        }
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('bb_admin_refresh_token');
      if (!refreshToken) {
        localStorage.removeItem('bb_admin_token');
        localStorage.removeItem('bb_admin_refresh_token');
        const storeInstance = await getStore();
        storeInstance.dispatch(logout());
        return Promise.reject(err);
      }

      try {
        const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        const newToken = res.data.token;

        localStorage.setItem('bb_admin_token', newToken);
        const storeInstance = await getStore();
        storeInstance.dispatch(updateAccessToken(newToken));

        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        isRefreshing = false;
        
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        
        localStorage.removeItem('bb_admin_token');
        localStorage.removeItem('bb_admin_refresh_token');
        const storeInstance = await getStore();
        storeInstance.dispatch(logout());
        
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
