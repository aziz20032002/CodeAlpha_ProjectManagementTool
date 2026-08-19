import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const clearSession = useCallback(() => {
    disconnectSocket();
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const token = localStorage.getItem('token');

      if (!token) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        if (isMounted) {
          setUser(data);
          connectSocket(token);
        }
      } catch {
        disconnectSocket();
        localStorage.removeItem('token');
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    connectSocket(data.token);
    navigate('/');
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    return data;
  };

  const logout = () => {
    clearSession();
    navigate('/login');
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
