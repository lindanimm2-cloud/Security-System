export function CartIcon({
  size = 18,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={`cart-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 3h2l.4 2M7 13h10l3-8H5.4M7 13 5.4 5M7 13l-1.5 6h13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="20" r="1.4" fill="currentColor" />
      <circle cx="17" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}
