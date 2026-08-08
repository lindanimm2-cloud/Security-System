export type SubscriptionSummary = {
  planName: string;
  tierCode: string;
  tierLabel?: string;
  status: string;
  priceFormatted?: string;
  memberId?: string;
  addons?: string[];
  access?: Record<string, boolean>;
};

export function SubscriptionBadge({
  subscription,
  compact,
}: {
  subscription: SubscriptionSummary | null | undefined;
  compact?: boolean;
}) {
  if (!subscription) {
    return <span className="sub-badge sub-badge--none">No plan</span>;
  }

  const tierClass =
    subscription.tierCode === 'PREMIUM' ? 'sub-badge--premium' : 'sub-badge--essential';
  const statusClass = `sub-badge--status-${subscription.status.toLowerCase()}`;

  if (compact) {
    return (
      <span className={`sub-badge ${tierClass} ${statusClass}`}>
        {subscription.tierCode === 'PREMIUM' ? 'Premium' : 'Essential'}
      </span>
    );
  }

  return (
    <span className={`sub-badge ${tierClass} ${statusClass}`}>
      {subscription.planName}
      {subscription.status !== 'ACTIVE' && ` · ${subscription.status.replace('_', ' ')}`}
    </span>
  );
}

export function CoverageBadges({
  access,
}: {
  access: Record<string, boolean> | undefined;
}) {
  if (!access) return null;
  const items = [
    { key: 'home', label: 'Home' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'family', label: 'Family' },
    { key: 'medical', label: 'Medical' },
  ];

  return (
    <span className="coverage-badges">
      {items.map((item) => (
        <span
          key={item.key}
          className={`coverage-badge ${access[item.key] ? 'coverage-badge--on' : 'coverage-badge--off'}`}
        >
          {item.label}
        </span>
      ))}
    </span>
  );
}
