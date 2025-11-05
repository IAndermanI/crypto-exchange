import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://84.201.180.47:5000/api';
const COMMISSION_RATE = process.env.REACT_APP_COMMISSION_RATE || '1.5';

console.log('API Configuration:', {
  apiUrl: API_URL,
  commissionRate: COMMISSION_RATE + '%'
});

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к каждому запросу
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

// Экспортируем и константу комиссии
export const COMMISSION = parseFloat(COMMISSION_RATE) / 100;
export default api;