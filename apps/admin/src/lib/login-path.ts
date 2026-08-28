/** Portal login URL for the current route. */
export function loginPathFor(pathname: string | null | undefined): string {
  if (!pathname) return '/login';
  if (pathname.startsWith('/portal')) return '/portal/login';
  if (pathname.startsWith('/officer')) return '/officer/login';
  if (pathname.startsWith('/tech')) return '/tech/login';
  if (pathname.startsWith('/medical')) return '/medical/login';
  return '/login';
}

/** True on any portal sign-in screen (never block these with auth-required UI). */
export function isLoginPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split('?')[0]?.replace(/\/+$/, '') || '/';
  return path === '/login' || path.endsWith('/login');
}
