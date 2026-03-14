import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_STORAGE_KEY = "qrbulkgen.mobile.auth";

export async function loadStoredSession() {
  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveStoredSession(session) {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export async function clearStoredSession() {
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
}
