import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="nx-footer">
      <div className="nx-footer-grid">
        <div className="nx-footer-brand">
          <p className="nx-footer-name">4DS Nexus</p>
          <p>
            Integrated protection, response, and professional security supply —
            built for families, fleets, and sites that cannot afford downtime.
          </p>
        </div>
        <div>
          <h3>Company</h3>
          <ul>
            <li>
              <Link href="/about">About</Link>
            </li>
            <li>
              <Link href="/services">Services</Link>
            </li>
            <li>
              <Link href="/careers">Careers</Link>
            </li>
            <li>
              <Link href="/contact">Contact</Link>
            </li>
          </ul>
        </div>
        <div>
          <h3>Shop</h3>
          <ul>
            <li>
              <Link href="/store">All products</Link>
            </li>
            <li>
              <Link href="/store?category=CCTV">CCTV cameras</Link>
            </li>
            <li>
              <Link href="/store?category=ALARMS">Alarm systems</Link>
            </li>
            <li>
              <Link href="/store?category=ACCESS_CONTROL">Access control</Link>
            </li>
            <li>
              <Link href="/store?category=ELECTRIC_FENCING">Electric fencing</Link>
            </li>
            <li>
              <Link href="/store?category=PACKAGES">Security packages</Link>
            </li>
            <li>
              <Link href="/store?category=BODY_ARMOUR">Body armour</Link>
            </li>
            <li>
              <Link href="/services">Installation services</Link>
            </li>
          </ul>
        </div>
        <div>
          <h3>Access</h3>
          <ul>
            <li>
              <Link href="/account">Client account</Link>
            </li>
            <li>
              <Link href="/portal/login">Protection portal</Link>
            </li>
            <li>
              <Link href="/portals">Employee login</Link>
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
