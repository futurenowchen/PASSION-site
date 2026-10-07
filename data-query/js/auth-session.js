const SESSION_KEY = "passion.googleSheets.readonly.v1";

export function storeSheetsSession(response) {
  if (!globalThis.sessionStorage || !response?.access_token) return;
  const expiresIn = Number(response.expires_in || 0);
  const payload = {
    accessToken: response.access_token,
    expiresAt: Date.now() + Math.max(0, expiresIn - 60) * 1000,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
}

export function restoreSheetsSession() {
  if (!globalThis.sessionStorage) return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload?.accessToken || !payload?.expiresAt || Date.now() >= payload.expiresAt) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return payload.accessToken;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSheetsSession() {
  if (globalThis.sessionStorage) sessionStorage.removeItem(SESSION_KEY);
}
