const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";

export async function apiRequest(path, options = {}) {
  const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;
  const mergedHeaders = {
    ...(options.headers || {}),
  };

  if (!isFormDataBody && !mergedHeaders["Content-Type"]) {
    mergedHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: mergedHeaders,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.error?.message || "Request failed";
    throw new Error(message);
  }

  return data;
}

export { API_BASE_URL };
