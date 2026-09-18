import React, { createContext, useState, useEffect, useContext } from 'react';
import { login as apiLogin, register as apiRegister, getMe } from '../api/auth';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const roleDashboard = (role) => {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'supplier') return '/supplier/dashboard';
  return '/customer/dashboard';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Server returns { success, data: user }
      getMe()
        .then(res => setUser(res.data.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    // Server returns { success, data: { user, token } }
    const res = await apiLogin({ email, password });
    const { user, token } = res.data.data;
    localStorage.setItem('token', token);
    setUser(user);
    return user; // let caller redirect based on role
  };

  const register = async (data) => {
    // Server returns { success, data: { user, token } }
    const res = await apiRegister(data);
    const { user, token } = res.data.data;
    localStorage.setItem('token', token);
    setUser(user);
    return user; // let caller redirect based on role
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  };

  const updateUser = (data) => setUser(prev => ({ ...prev, ...data }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, roleDashboard }}>
      {children}
    </AuthContext.Provider>
  );
};