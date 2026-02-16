import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("currentOrganizationId");
    delete axios.defaults.headers.common["Authorization"];
    window.location.href = "/signin"; // Force redirect
  };

  // Setup axios interceptor globally (outside useEffect)
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Auto-logout on 401 Unauthorized
        if (error.response?.status === 401 && window.location.pathname !== "/signin") {
          console.warn("Authentication failed - logging out");
          logout();
        }
        return Promise.reject(error);
      }
    );

    // Cleanup on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []); // Run once on mount

  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");

      if (storedToken && storedUser) {
        // Force set the authorization header
        axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;

        try {
          const userData = JSON.parse(storedUser);
          if (userData.id) {
            setToken(storedToken);
            setUser(userData);
          } else {
            logout();
          }
        } catch (error) {
          logout();
        }
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post("/api/auth/login", { email, password });
      const { token: newToken, user: userData } = response.data;

      setToken(newToken);
      setUser(userData);
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(userData));
      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

      // Notify other components that auth state changed
      window.dispatchEvent(new CustomEvent("auth-change"));

      return { success: true };
    } catch (error) {
      const errorData = error.response?.data;
      // Handle both string errors and object errors from error handler
      const errorMessage =
        typeof errorData?.error === "object" ? errorData.error.message : errorData?.error;
      return {
        success: false,
        error: errorMessage || "Login failed",
        details: errorData?.details || null,
      };
    }
  };

  const signup = async (email, password, name) => {
    try {
      const response = await axios.post("/api/auth/signup", { email, password, name });
      const { token: newToken, user: userData } = response.data;

      setToken(newToken);
      setUser(userData);
      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(userData));
      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;

      // Notify other components that auth state changed
      window.dispatchEvent(new CustomEvent("auth-change"));

      return { success: true };
    } catch (error) {
      const errorData = error.response?.data;
      // Handle both string errors and object errors from error handler
      const errorMessage =
        typeof errorData?.error === "object" ? errorData.error.message : errorData?.error;
      return {
        success: false,
        error: errorMessage || "Signup failed",
        details: errorData?.details || null,
      };
    }
  };

  const value = {
    user,
    login,
    signup,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
