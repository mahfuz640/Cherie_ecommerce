const configuredApi = import.meta.env.VITE_API_URL;
const localApi = /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?\/?$/i;
const productionApi = 'https://cherie-fonrtend.onrender.com';

export const API = (
  import.meta.env.PROD && (!configuredApi || localApi.test(configuredApi))
    ? productionApi
    : configuredApi || 'http://localhost:5000'
).replace(/\/$/, '');
export const money = value => `Tk ${Number(value || 0).toLocaleString()}`;
export const apiImg = value => value?.startsWith('http') || value?.startsWith('data:') ? value : `${API}${value || ''}`;

export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, options);
  } catch {
    throw new Error('Unable to reach the server. Please try again shortly.');
  }
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;
  if (!response.ok) throw new Error(data?.message || 'Something went wrong.');
  return data;
}
