import axios from 'axios';

// API базовый URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Создание экземпляра axios с базовым URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Перехватчик запросов для добавления токена
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

// Перехватчик ответов для обработки ошибок
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const originalRequest = error.config;

    // Если ошибка 401 (Unauthorized) и это не повторный запрос
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      // Помечаем запрос как повторный
      originalRequest._retry = true;

      // Здесь можно реализовать обновление токена через refresh token
      // Если refresh token истек, перенаправляем на страницу входа
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }

      return Promise.reject(error);
    }

    return Promise.reject(error.response ? error.response.data : error);
  }
);

export default api;