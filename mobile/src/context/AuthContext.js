import React, { createContext, useContext, useMemo, useState } from "react";

import { apiRequest } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [screen, setScreen] = useState("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function login({ email, password }) {
    setError("");
    setIsSubmitting(true);
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user || null);
      setToken(data.token || "");
      return data;
    } catch (requestError) {
      setError(requestError.message || "Login failed");
      throw requestError;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function register({ name, email, password }) {
    setError("");
    setIsSubmitting(true);
    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setUser(data.user || null);
      setToken(data.token || "");
      return data;
    } catch (requestError) {
      setError(requestError.message || "Register failed");
      throw requestError;
    } finally {
      setIsSubmitting(false);
    }
  }

  function logout() {
    setUser(null);
    setToken("");
    setScreen("login");
    setError("");
  }

  const value = useMemo(
    () => ({
      user,
      token,
      screen,
      setScreen,
      isSubmitting,
      error,
      setError,
      login,
      register,
      logout,
    }),
    [user, token, screen, isSubmitting, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
