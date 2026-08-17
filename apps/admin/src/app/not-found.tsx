import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="pro-error-page">
      <div className="pro-error-page__content">
        <p className="pro-error-page__eyebrow">4DS Nexus</p>
        <h1>Page not found</h1>
        <p className="pro-error-page__lead">
          That address is not on this site. Check the link or return home.
        </p>
        <div className="pro-error-page__actions">
          <Link href="/" className="btn-primary">
            Go home
          </Link>
          <Link href="/portals" className="btn-secondary">
            Open portals
          </Link>
        </div>
      </div>
    </div>
  );
}
