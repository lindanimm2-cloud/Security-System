import Image from 'next/image';
import Link from 'next/link';

export type BrandVariant = 'portal' | 'control' | 'officer';

const PRODUCT_LABELS: Record<BrandVariant, string> = {
  portal: 'Client Portal',
  control: 'Control Panel',
  officer: 'Officer App',
};

const HOME_HREFS: Record<BrandVariant, string> = {
  portal: '/portal',
  control: '/control-room',
  officer: '/officer',
};

const LOGO_SRC = '/brand/4ds-logo.png';

export function BrandMark({
  variant,
  href,
  compact = false,
  showProduct = true,
}: {
  variant: BrandVariant;
  href?: string | false;
  compact?: boolean;
  showProduct?: boolean;
}) {
  const product = PRODUCT_LABELS[variant];
  const link = href === false ? undefined : (href ?? HOME_HREFS[variant]);

  const inner = (
    <>
      <div className="brand-mark-logo-wrap">
        <Image
          src={LOGO_SRC}
          alt="4DS Solutions"
          width={compact ? 168 : 220}
          height={compact ? 44 : 56}
          className={`brand-mark-image ${compact ? 'brand-mark-image--compact' : ''}`}
          priority
        />
      </div>
      {showProduct && (
        <div className={`brand-mark-copy ${compact ? 'brand-mark-copy--compact' : ''}`}>
          <span className="brand-mark-product">{product}</span>
        </div>
      )}
    </>
  );

  if (link) {
    return (
      <Link href={link} className={`brand-mark brand-mark--${variant} ${compact ? 'brand-mark--compact' : ''}`}>
        {inner}
      </Link>
    );
  }

  return (
    <div className={`brand-mark brand-mark--${variant} ${compact ? 'brand-mark--compact' : ''}`}>
      {inner}
    </div>
  );
}
