const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010/v1';

export async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getApiUrl() {
  return API_URL;
}
