const ADMIN_TOKEN_KEY = 'cherie-token';

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

export function setAdminToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function hasActiveAdminSession() {
  const token = getAdminToken();
  if (!token) return false;

  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) throw new Error('Missing token payload');
    const base64Payload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64Payload + '='.repeat((4 - base64Payload.length % 4) % 4)));
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 <= Date.now()) {
      clearAdminSession();
      return false;
    }
    return true;
  } catch {
    clearAdminSession();
    return false;
  }
}
