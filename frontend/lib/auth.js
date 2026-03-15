const AUTH_STORAGE_KEY = "qrbulkgen.auth";

export function saveAuthSession(session) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function loadAuthSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAuthToken() {
  const session = loadAuthSession();
  if (!session) {
    return "";
  }

  if (typeof session.token === "string" && session.token) {
    return session.token;
  }

  if (typeof session?.session?.token === "string" && session.session.token) {
    return session.session.token;
  }

  return "";
}

export function getAuthUser() {
  const session = loadAuthSession();
  if (!session) {
    return null;
  }

  if (session.user && typeof session.user === "object") {
    return session.user;
  }

  if (session.session?.user && typeof session.session.user === "object") {
    return session.session.user;
  }

  return null;
}

export function isAuthenticated() {
  const user = getAuthUser();
  const token = getAuthToken();
  return !!(token && (user?.email || user?.id));
}
