export function getSocketUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010/v1';
  return apiUrl.replace(/\/v1\/?$/, '');
}
