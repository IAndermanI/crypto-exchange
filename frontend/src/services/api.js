import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://84.201.180.47:5000/api';
const COMMISSION_RATE = process.env.REACT_APP_COMMISSION_RATE || '1.5';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Важно! Добавляем токен к КАЖДОМУ запросу
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Обработка ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 422) {
      // Если токен истек или невалидный - перенаправляем на логин
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const COMMISSION = parseFloat(COMMISSION_RATE) / 100;
export default api;