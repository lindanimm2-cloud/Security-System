'use client';

export function UserAvatar({
  firstName,
  lastName,
  avatarUrl,
  size = 'md',
}: {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${firstName} ${lastName}`}
        className={`user-avatar user-avatar--${size}`}
      />
    );
  }
  return <div className={`user-avatar user-avatar--${size} user-avatar--initials`}>{initials}</div>;
}
