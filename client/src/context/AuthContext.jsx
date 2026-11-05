import React, { createContext, useState, useEffect, useContext } from "react";
import {
  login as apiLogin,
  register as apiRegister,
  googleLogin as apiGoogleLogin,
  getMe,
} from "../api/auth";
import { readToken, saveToken, clearToken } from "../utils/session";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const roleDashboard = (role) => {
  if (role === "admin") return "/admin/dashboard";
  if (role === "supplier") return "/supplier/dashboard";
  return "/customer/dashboard";
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null);
  const [sessionError, setSessionError] = useState("");
  const [sessionAttempt, setSessionAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setSessionError("");
    const token = readToken();
    if (token) {
      getMe()
        .then((res) => {
          if (current) setUser(res.data.data);
        })
        .catch((error) => {
          if (!current) return;
          if ([401, 403].includes(error.response?.status)) {
            clearToken();
            setUser(null);
          } else
            setSessionError(
              "Could not reach the server. Please retry in a moment.",
            );
        })
        .finally(() => {
          if (current) setLoading(false);
        });
    } else {
      setLoading(false);
    }
    return () => {
      current = false;
    };
  }, [sessionAttempt]);

  const login = async (email, password, remember = true) => {
    const res = await apiLogin({ email, password });
    const { user: signedInUser, token } = res.data.data;
    saveToken(token, remember);
    setUser(signedInUser);
    setPendingGoogleUser(null);
    return signedInUser;
  };

  const register = async (data) => {
    const res = await apiRegister(data);
    const { user: newUser, token } = res.data.data;
    saveToken(token);
    setUser(newUser);
    setPendingGoogleUser(null);
    return newUser;
  };

  const loginWithGoogle = async (credential) => {
    if (!credential)
      throw new Error(
        "Google did not return a sign-in credential. Please try again.",
      );

    const res = await apiGoogleLogin({ credential });
    const data = res.data.data;

    if (data.needsRoleSelection) {
      const newGoogleUser = { credential, ...data.googleUser };
      setPendingGoogleUser(newGoogleUser);
      return { needRoleSelection: true, googleUser: newGoogleUser };
    }

    saveToken(data.token);
    setUser(data.user);
    setPendingGoogleUser(null);
    return { needRoleSelection: false, role: data.user.role, user: data.user };
  };

  const assignRoleAndFinalize = async (selectedRole) => {
    if (!pendingGoogleUser?.credential) {
      throw new Error("Your Google sign-in expired. Please sign in again.");
    }

    const role = selectedRole === "renter" ? "customer" : selectedRole;
    const res = await apiGoogleLogin({
      credential: pendingGoogleUser.credential,
      role,
    });
    const data = res.data.data;

    if (!data.user || !data.token) {
      throw new Error(
        "Could not finish creating your account. Please sign in again.",
      );
    }

    saveToken(data.token);
    setUser(data.user);
    setPendingGoogleUser(null);
    return { user: data.user, role: data.user.role };
  };

  const logout = () => {
    clearToken();
    setUser(null);
    setPendingGoogleUser(null);
    window.location.href = "/login";
  };

  const updateUser = (data) => setUser((prev) => ({ ...prev, ...data }));

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        sessionError,
        retrySession: () => setSessionAttempt((value) => value + 1),
        pendingGoogleUser,
        login,
        register,
        loginWithGoogle,
        assignRoleAndFinalize,
        logout,
        updateUser,
        roleDashboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
