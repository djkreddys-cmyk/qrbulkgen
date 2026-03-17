import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { apiRequest, createAuthHeaders } from "../lib/api";
import { clearStoredSession, loadStoredSession, saveStoredSession } from "../lib/storage";

const AuthContext = createContext(null);
const PROTECTED_ROUTES = ["dashboard", "scanner", "single-generate", "bulk-jobs"];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [screen, setScreen] = useState("login");
  const [activeRoute, setActiveRoute] = useState("dashboard");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [error, setError] = useState("");
  const [singleDraft, setSingleDraft] = useState(null);
  const [bulkDraft, setBulkDraft] = useState(null);
  const [resetPasswordToken, setResetPasswordToken] = useState("");
  const [resetNotice, setResetNotice] = useState("");

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const stored = await loadStoredSession();
        if (!stored?.token) {
          return;
        }

        const data = await apiRequest("/auth/me", {
          headers: createAuthHeaders(stored.token),
        });

        if (!mounted) return;
      setToken(stored.token);
      setUser(data.user || stored.user || null);
      setScreen("app");
      setActiveRoute("dashboard");
      setSingleDraft(null);
      setBulkDraft(null);
      } catch {
        await clearStoredSession();
      } finally {
        if (mounted) {
          setIsBootstrapping(false);
        }
      }
    }

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  async function login({ identifier, password }) {
    setError("");
    setIsSubmitting(true);
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      setUser(data.user || null);
      setToken(data.token || "");
      setScreen("app");
      setActiveRoute("dashboard");
      setSingleDraft(null);
      setBulkDraft(null);
      await saveStoredSession({
        token: data.token || "",
        user: data.user || null,
      });
      return data;
    } catch (requestError) {
      setError(requestError.message || "Login failed");
      throw requestError;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function register({ name, email, phone, password }) {
    setError("");
    setIsSubmitting(true);
    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, password }),
      });
      setUser(data.user || null);
      setToken(data.token || "");
      setScreen("app");
      setActiveRoute("dashboard");
      setSingleDraft(null);
      await saveStoredSession({
        token: data.token || "",
        user: data.user || null,
      });
      return data;
    } catch (requestError) {
      setError(requestError.message || "Register failed");
      throw requestError;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function refreshSession() {
    if (!token) return null;
    const data = await apiRequest("/auth/me", {
      headers: createAuthHeaders(token),
    });
    setUser(data.user || null);
    await saveStoredSession({
      token,
      user: data.user || null,
    });
    return data.user || null;
  }

  async function forgotPassword(email) {
    setError("");
    setIsSubmitting(true);
    try {
      const data = await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      return data;
    } catch (requestError) {
      setError(requestError.message || "Failed to send reset link");
      throw requestError;
    } finally {
      setIsSubmitting(false);
    }
  }

  function openResetPassword(tokenValue) {
    setError("");
    setResetNotice("");
    setResetPasswordToken(String(tokenValue || ""));
    setScreen("reset-password");
  }

  async function completePasswordReset() {
    setUser(null);
    setToken("");
    setActiveRoute("dashboard");
    setSingleDraft(null);
    setBulkDraft(null);
    setResetPasswordToken("");
    setResetNotice("Password reset successful. Please log in.");
    setScreen("login");
    await clearStoredSession();
  }

  function navigate(nextRoute) {
    setError("");
    if (PROTECTED_ROUTES.includes(nextRoute) && !token) {
      setScreen("login");
      return;
    }
    if (nextRoute !== "reset-password") {
      setResetPasswordToken("");
    }
    setScreen(PROTECTED_ROUTES.includes(nextRoute) ? "app" : nextRoute);
    if (PROTECTED_ROUTES.includes(nextRoute)) {
      setActiveRoute(nextRoute);
    }
  }

  async function logout() {
    setUser(null);
    setToken("");
    setScreen("login");
    setActiveRoute("dashboard");
    setError("");
    setSingleDraft(null);
    setResetPasswordToken("");
    setResetNotice("");
    await clearStoredSession();
  }

  const value = useMemo(
    () => ({
      user,
      token,
      screen,
      setScreen,
      activeRoute,
      setActiveRoute,
      navigate,
      singleDraft,
      setSingleDraft,
      bulkDraft,
      setBulkDraft,
      resetPasswordToken,
      setResetPasswordToken,
      resetNotice,
      setResetNotice,
      isSubmitting,
      isBootstrapping,
      error,
      setError,
      login,
      register,
      forgotPassword,
      openResetPassword,
      completePasswordReset,
      refreshSession,
      logout,
    }),
    [user, token, screen, activeRoute, singleDraft, bulkDraft, resetPasswordToken, resetNotice, isSubmitting, isBootstrapping, error],
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
