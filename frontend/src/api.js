export const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const money = value => `Tk ${Number(value || 0).toLocaleString()}`;
export const apiImg = value => value?.startsWith('http') || value?.startsWith('data:') ? value : `${API}${value || ''}`;

export async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;
  if (!response.ok) throw new Error(data?.message || 'Something went wrong.');
  return data;
}
