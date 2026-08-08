import Link from 'next/link';
import type { AddonCode } from '@/lib/subscription-plans';
import { upgradeHref } from '@/lib/subscription-plans';

export function UpgradeBanner({
  addon,
  title,
  price,
}: {
  addon: AddonCode;
  title: string;
  price: string;
}) {
  return (
    <div className="upgrade-banner">
      <div>
        <strong>{title}</strong> is not on your plan. Add it for <strong>{price}/mo</strong> via secure PayFast checkout.
      </div>
      <Link href={upgradeHref(addon)} className="btn-primary btn-sm">Upgrade</Link>
    </div>
  );
}
