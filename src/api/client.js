import axios from 'axios';

export const ACCESS_KEY = 'smartpay.accessToken';
export const REFRESH_KEY = 'smartpay.refreshToken';
export const USER_KEY = 'smartpay.user';

const client = axios.create({ baseURL: '/api/v1' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (error.response?.status !== 401 || !refreshToken || original?._retry) {
      return Promise.reject(error);
    }
    original._retry = true;
    try {
      const response = await axios.post('/api/v1/auth/refresh', { refreshToken });
      const data = response.data.data;
      localStorage.setItem(ACCESS_KEY, data.accessToken);
      localStorage.setItem(REFRESH_KEY, data.refreshToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return client(original);
    } catch (refreshError) {
      clearSession();
      return Promise.reject(refreshError);
    }
  }
);

export function saveSession(data) {
  localStorage.setItem(ACCESS_KEY, data.accessToken);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function storedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export function unwrap(response) {
  return response.data.data;
}

export default client;
