const AUTH_STORAGE_KEY = "qrbulkgen.auth";
const AUTH_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

function isSessionExpired(session) {
  if (!session || typeof session !== "object") {
    return true;
  }

  const lastActivityAt = Number(session.lastActivityAt || session.lastActiveAt || 0);
  if (!lastActivityAt) {
    return false;
  }

  return Date.now() - lastActivityAt > AUTH_IDLE_TIMEOUT_MS;
}

export function saveAuthSession(session) {
  if (typeof window === "undefined") {
    return;
  }

  const nextSession =
    session && typeof session === "object"
      ? { ...session, lastActivityAt: Date.now() }
      : session;

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
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
    const session = JSON.parse(raw);
    if (isSessionExpired(session)) {
      clearAuthSession();
      return null;
    }
    return session;
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

export function markAuthActivity() {
  if (typeof window === "undefined") {
    return;
  }

  const session = loadAuthSession();
  if (!session) {
    return;
  }

  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      ...session,
      lastActivityAt: Date.now(),
    }),
  );
}

export function getAuthIdleTimeoutMs() {
  return AUTH_IDLE_TIMEOUT_MS;
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
