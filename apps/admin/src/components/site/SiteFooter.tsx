import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="nx-footer">
      <div className="nx-footer-grid">
        <div className="nx-footer-brand">
          <p className="nx-footer-name">4DS Nexus</p>
          <p>
            Integrated protection and response — close protection, private
            escort, monitoring, and rapid dispatch for people and sites that
            cannot afford downtime.
          </p>
        </div>
        <div>
          <h3>Company</h3>
          <ul>
            <li>
              <Link href="/about">About</Link>
            </li>
            <li>
              <Link href="/careers">Careers</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
            <li>
              <Link href="/legal">Terms &amp; privacy</Link>
            </li>
          </ul>
        </div>
        <div>
          <h3>Services</h3>
          <ul>
            <li>
              <Link href="/services#close-protection">Close protection</Link>
            </li>
            <li>
              <Link href="/services#private-escort">Private escort</Link>
            </li>
            <li>
              <Link href="/services#personal-protection">Personal protection</Link>
            </li>
            <li>
              <Link href="/services#rapid-response">Armed response</Link>
            </li>
            <li>
              <Link href="/services#cctv-installs">CCTV &amp; access</Link>
            </li>
            <li>
              <Link href="/services">All services</Link>
            </li>
          </ul>
        </div>
        <div>
          <h3>Access</h3>
          <ul>
            <li>
              <Link href="/portal/login">Protection portal</Link>
            </li>
            <li>
              <Link href="/login">Staff login</Link>
            </li>
            <li>
              <a href="mailto:hello@4dsnexus.co.za">hello@4dsnexus.co.za</a>
            </li>
            <li>
              <span>+27 11 100 4400</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="nx-footer-bottom">
        <p>© {new Date().getFullYear()} 4DS Nexus. All rights reserved.</p>
        <p className="nx-muted">Johannesburg · Pretoria · 24/7 control room</p>
      </div>
    </footer>
  );
}
