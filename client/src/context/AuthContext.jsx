import React, { createContext, useState, useEffect, useContext } from 'react';
import AuthService from '../services/auth.service';

// Создание контекста авторизации
const AuthContext = createContext();

// Провайдер контекста авторизации
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Загрузка информации о пользователе при монтировании компонента
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Проверяем, авторизован ли пользователь
        if (AuthService.isAuthenticated()) {
          // Получаем сохраненные данные пользователя
          const savedUser = AuthService.getCurrentUser();
          
          if (savedUser) {
            setUser(savedUser);
          } else {
            // Если в localStorage нет данных пользователя, пытаемся получить их с сервера
            try {
              const response = await AuthService.getProfile();
              setUser(response.data.user);
            } catch (err) {
              // Если не получилось, выходим из системы
              await AuthService.logout();
              setUser(null);
            }
          }
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);
  
  // Функция для входа в систему
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await AuthService.login(email, password);
      setUser(response.data.user);
      setError(null);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Функция для выхода из системы
  const logout = async () => {
    try {
      setLoading(true);
      await AuthService.logout();
      setUser(null);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Функция для регистрации
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await AuthService.register(userData);
      setUser(response.data.user);
      setError(null);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Функция для обновления профиля
  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      const response = await AuthService.updateProfile(userData);
      setUser(response.data.user);
      setError(null);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Функция для изменения пароля
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      const response = await AuthService.changePassword(currentPassword, newPassword);
      setError(null);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        logout,
        register,
        updateProfile,
        changePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Хук для использования контекста авторизации
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;