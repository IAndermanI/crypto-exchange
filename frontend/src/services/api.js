import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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
    
    console.log('Request:', config.method.toUpperCase(), config.url, token ? '✓ Auth' : '✗ No Auth');
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Обработка ответов - УПРОЩЕННАЯ ВЕРСИЯ
api.interceptors.response.use(
  (response) => {
    console.log('Response OK:', response.config.url);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.status, error.config?.url);
    
    // Проверяем, нужно ли делать редирект
    const isProtectedEndpoint = error.config?.url?.includes('/cryptocurrency/') ||
                                error.config?.url?.includes('/portfolio') ||
                                error.config?.url?.includes('/transactions') ||
                                error.config?.url?.includes('/buy') ||
                                error.config?.url?.includes('/sell');
    
    // Если 401 или 422 на защищенном endpoint и мы не на странице логина
    if ((error.response?.status === 401 || error.response?.status === 422) && 
        isProtectedEndpoint && 
        !window.location.pathname.includes('/login')) {
      
      // НЕ делаем автоматический редирект, просто выбрасываем ошибку
      // Пусть компонент сам решает что делать
      console.log('Authentication required for:', error.config?.url);
    }
    
    return Promise.reject(error);
  }
);
export default api;