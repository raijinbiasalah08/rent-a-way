import React, { createContext, useState, useEffect, useContext } from 'react';
import { login as apiLogin, register as apiRegister, googleLogin as apiGoogleLogin, getMe } from '../api/auth';

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
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe()
        .then(res => setUser(res.data.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await apiLogin({ email, password });
    const { user: signedInUser, token } = res.data.data;
    localStorage.setItem('token', token);
    setUser(signedInUser);
    setPendingGoogleUser(null);
    return signedInUser;
  };

  const register = async (data) => {
    const res = await apiRegister(data);
    const { user: newUser, token } = res.data.data;
    localStorage.setItem('token', token);
    setUser(newUser);
    setPendingGoogleUser(null);
    return newUser;
  };

  const loginWithGoogle = async (credential) => {
    if (!credential) throw new Error('Google did not return a sign-in credential. Please try again.');

    const res = await apiGoogleLogin({ credential });
    const data = res.data.data;

    if (data.needsRoleSelection) {
      const newGoogleUser = { credential, ...data.googleUser };
      setPendingGoogleUser(newGoogleUser);
      return { needRoleSelection: true, googleUser: newGoogleUser };
    }

    localStorage.setItem('token', data.token);
    setUser(data.user);
    setPendingGoogleUser(null);
    return { needRoleSelection: false, role: data.user.role, user: data.user };
  };

  const assignRoleAndFinalize = async (selectedRole) => {
    if (!pendingGoogleUser?.credential) {
      throw new Error('Your Google sign-in expired. Please sign in again.');
    }

    const role = selectedRole === 'renter' ? 'customer' : selectedRole;
    const res = await apiGoogleLogin({ credential: pendingGoogleUser.credential, role });
    const data = res.data.data;

    if (!data.user || !data.token) {
      throw new Error('Could not finish creating your account. Please sign in again.');
    }

    localStorage.setItem('token', data.token);
    setUser(data.user);
    setPendingGoogleUser(null);
    return { user: data.user, role: data.user.role };
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setPendingGoogleUser(null);
    window.location.href = '/login';
  };

  const updateUser = (data) => setUser(prev => ({ ...prev, ...data }));

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      pendingGoogleUser,
      login,
      register,
      loginWithGoogle,
      assignRoleAndFinalize,
      logout,
      updateUser,
      roleDashboard
    }}>
      {children}
    </AuthContext.Provider>
  );
};
