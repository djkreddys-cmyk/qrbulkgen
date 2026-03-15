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
      setScreen("app");
      setActiveRoute("dashboard");
      setSingleDraft(null);
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

  function navigate(nextRoute) {
    if (PROTECTED_ROUTES.includes(nextRoute) && !token) {
      setScreen("login");
      return;
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
      isSubmitting,
      isBootstrapping,
      error,
      setError,
      login,
      register,
      forgotPassword,
      refreshSession,
      logout,
    }),
    [user, token, screen, activeRoute, singleDraft, isSubmitting, isBootstrapping, error],
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
