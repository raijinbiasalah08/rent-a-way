import React, { createContext, useState, useEffect, useContext } from 'react';
import { login as apiLogin, register as apiRegister, googleLogin as apiGoogleLogin, getMe } from '../api/auth';
import { auth, googleProvider, signInWithPopup, signOut, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

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

    // Save role permanently in Firestore
    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, {
        displayName: user.name,
        email: user.email,
        photoURL: user.avatar || null,
        role: data.role === 'supplier' ? 'supplier' : 'renter',
        createdAt: serverTimestamp(),
        ...(data.barangay ? { barangay: data.barangay } : {}),
        ...(data.address ? { address: data.address } : {}),
        ...(data.latitude != null ? { latitude: data.latitude } : {}),
        ...(data.longitude != null ? { longitude: data.longitude } : {})
      }, { merge: true });
    } catch (err) {
      console.warn('Firestore role persistence note:', err);
    }

    return user;
  };

  const registerWithGoogle = async (requestedRole, additionalData = {}) => {
    // 1. Open Google OAuth popup via Firebase
    const result = await signInWithPopup(auth, googleProvider);
    const googleUser = result.user;

    // 2. Check Firestore users/{uid}
    const userRef = doc(db, 'users', googleUser.uid);
    const userSnap = await getDoc(userRef);

    let resolvedRole = requestedRole;
    let alreadyExisted = false;

    if (userSnap.exists() && userSnap.data()?.role) {
      // PREVENT OVERWRITE: keep existing role
      alreadyExisted = true;
      resolvedRole = userSnap.data().role;
      await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true }).catch(() => {});
    } else {
      // Create new permanent profile in Firestore
      await setDoc(userRef, {
        displayName: googleUser.displayName || googleUser.email?.split('@')[0],
        email: googleUser.email,
        photoURL: googleUser.photoURL || null,
        role: requestedRole, // "renter" | "supplier"
        createdAt: serverTimestamp(),
        ...additionalData
      });
    }

    // Sync with Rent-A-Way backend
    const res = await apiGoogleLogin({
      email: googleUser.email,
      name: googleUser.displayName || googleUser.email?.split('@')[0],
      avatar: googleUser.photoURL,
      googleId: googleUser.uid,
      role: resolvedRole === 'renter' ? 'customer' : resolvedRole,
      barangay: additionalData.barangay,
      address: additionalData.address,
      latitude: additionalData.latitude,
      longitude: additionalData.longitude
    });

    const { user, token } = res.data.data;
    user.role = resolvedRole;
    localStorage.setItem('token', token);
    setUser(user);
    setPendingGoogleUser(null);
    return { user, role: resolvedRole, alreadyExisted };
  };

  // Google Login Flow:
  // 1. Sign in with Firebase
  // 2. Check Firestore users/{uid}
  // 3. If exists with role -> logs in and returns { needRoleSelection: false, role }
  // 4. If new user -> stores pending user and returns { needRoleSelection: true, googleUser }
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const googleUser = result.user;

    const userRef = doc(db, 'users', googleUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data()?.role) {
      // Existing user: Read saved role
      const savedRole = userSnap.data().role;

      // Update lastLogin timestamp in Firestore
      setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true }).catch(() => {});

      // Synchronize with Rent-A-Way backend
      const res = await apiGoogleLogin({
        email: googleUser.email,
        name: googleUser.displayName || googleUser.email?.split('@')[0],
        avatar: googleUser.photoURL,
        googleId: googleUser.uid,
        role: savedRole === 'renter' ? 'customer' : savedRole
      });

      const { user, token } = res.data.data;
      user.role = savedRole;
      localStorage.setItem('token', token);
      setUser(user);
      setPendingGoogleUser(null);
      return { needRoleSelection: false, role: savedRole, user };
    }

    // New user without a role: Prompt role selection on /choose-role
    setPendingGoogleUser(googleUser);
    return { needRoleSelection: true, googleUser };
  };

  // Assigns role for new Google sign-in user, saves permanently to Firestore, and syncs backend
  const assignRoleAndFinalize = async (selectedRole) => {
    const activeGoogleUser = auth.currentUser || pendingGoogleUser;
    if (!activeGoogleUser) {
      throw new Error('No active Google authentication session found. Please sign in again.');
    }

    const userRef = doc(db, 'users', activeGoogleUser.uid);

    // Save exact requested structure to Firestore
    await setDoc(userRef, {
      displayName: activeGoogleUser.displayName || activeGoogleUser.email?.split('@')[0],
      email: activeGoogleUser.email,
      photoURL: activeGoogleUser.photoURL || null,
      role: selectedRole, // "renter" | "supplier"
      createdAt: serverTimestamp()
    });

    // Sync with Rent-A-Way backend
    const res = await apiGoogleLogin({
      email: activeGoogleUser.email,
      name: activeGoogleUser.displayName || activeGoogleUser.email?.split('@')[0],
      avatar: activeGoogleUser.photoURL,
      googleId: activeGoogleUser.uid,
      role: selectedRole === 'renter' ? 'customer' : selectedRole
    });

    const { user, token } = res.data.data;
    user.role = selectedRole;
    localStorage.setItem('token', token);
    setUser(user);
    setPendingGoogleUser(null);
    return { user, role: selectedRole };
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut error:', err);
    }
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
      setPendingGoogleUser,
      login,
      register,
      loginWithGoogle,
      registerWithGoogle,
      assignRoleAndFinalize,
      logout,
      updateUser,
      roleDashboard
    }}>
      {children}
    </AuthContext.Provider>
  );
};