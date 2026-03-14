const API_BASE_URL = "https://qrbulkgen-production.up.railway.app/api";

export async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message || "Request failed");
  }

  return data;
}

export function createAuthHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export { API_BASE_URL };
