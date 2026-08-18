import axios from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveRefreshToken,
  clearTokens
} from '../utils/tokenStorage';
import { isTokenExpired } from '../utils/tokenHelper';
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

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach JWT token ──────────────────────────────────
api.interceptors.request.use(async (config) => {
  // Prevent interception loop for token endpoints
  if (config.url === '/auth/refresh' || config.url === '/auth/get-refresh-token') {
    return config;
  }

  let token = getAccessToken();
  const refreshToken = getRefreshToken();

  if (token) {
    const accessExpired = isTokenExpired(token);
    const refreshExpired = isTokenExpired(refreshToken);

    if (accessExpired) {
      if (refreshExpired || !refreshToken) {
        // Scenario 3: Both tokens expired -> logout
        clearTokens();
        const storeInstance = await getStore();
        storeInstance.dispatch(logout());
        return Promise.reject(new Error('Session expired. Please log in again.'));
      } else {
        // Scenario 1: Access token expired, Refresh token valid -> refresh access token
        if (isRefreshing) {
          try {
            const newToken = await new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            });
            config.headers.Authorization = `Bearer ${newToken}`;
            return config;
          } catch (err) {
            return Promise.reject(err);
          }
        }

        isRefreshing = true;
        try {
          const res = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          const newAccessToken = res.data.token;
          
          saveAccessToken(newAccessToken);
          const storeInstance = await getStore();
          storeInstance.dispatch(updateAccessToken(newAccessToken));
          
          processQueue(null, newAccessToken);
          config.headers.Authorization = `Bearer ${newAccessToken}`;
          isRefreshing = false;
          return config;
        } catch (err) {
          processQueue(err, null);
          isRefreshing = false;
          clearTokens();
          const storeInstance = await getStore();
          storeInstance.dispatch(logout());
          return Promise.reject(err);
        }
      }
    } else {
      // Access token is valid.
      // Scenario 2: Refresh token is expired, but Access is valid -> renew refresh token using access token
      if (refreshToken && refreshExpired) {
        try {
          const res = await axios.post(`${baseURL}/auth/get-refresh-token`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const newRefreshToken = res.data.refreshToken;
          saveRefreshToken(newRefreshToken);
        } catch (err) {
          console.error('Failed to renew expired refresh token:', err);
        }
      }
    }
  }

  // Retrieve token again in case it was refreshed above
  token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  let guestSessionId = localStorage.getItem('bb_guest_session_id');
  if (!guestSessionId) {
    guestSessionId = 'guest_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('bb_guest_session_id', guestSessionId);
  }
  config.headers['x-session-id'] = guestSessionId;

  return config;
}, (error) => Promise.reject(error));


// ── Response interceptor — handle 401 ──────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      clearTokens();
      const storeInstance = await getStore();
      storeInstance.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default api;
