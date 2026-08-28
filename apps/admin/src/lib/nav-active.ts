/** Pick a single active nav item: longest matching href wins over parents. */
export function navHrefIsActive(
  pathname: string,
  href: string,
  exact = false,
  candidates: readonly string[] = [],
): boolean {
  if (!href) return false;
  if (href === '/') return pathname === '/';
  if (exact) return pathname === href;

  const matches = pathname === href || pathname.startsWith(`${href}/`);
  if (!matches) return false;

  return !candidates.some(
    (other) =>
      other !== href &&
      other.length > href.length &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );
}
