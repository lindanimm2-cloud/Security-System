function apiOrigin(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010/v1';
  return apiUrl.replace(/\/v1\/?$/, '');
}

/** Resolve relative upload paths to the API public origin. */
export function resolveMediaUrl(url: string | null | undefined): string | null | undefined {
  if (url == null || url === '') return url;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = apiOrigin();
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${origin}${path}`;
}
