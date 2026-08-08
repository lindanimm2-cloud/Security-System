'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    interest: 'protection',
    message: '',
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <>
      <section className="nx-page-hero nx-page-hero--rich">
        <div className="nx-page-hero-inner">
          <p className="nx-eyebrow">Contact</p>
          <h1>Tell us what you need protected</h1>
          <p>
            Protection plans, fleet recovery, site installs, or corporate supply
            — send a brief and a Nexus advisor will map the right stack.
          </p>
        </div>
      </section>

      <section className="nx-section nx-contact">
        <div className="nx-contact-details">
          <h2>Reach us</h2>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>
                <a href="mailto:hello@4dsnexus.example">hello@4dsnexus.example</a>
              </dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>+27 (0) 11 000 0000</dd>
            </div>
            <div>
              <dt>HQ</dt>
              <dd>
                [Street address placeholder]
                <br />
                Johannesburg, South Africa
              </dd>
            </div>
            <div>
              <dt>Hours</dt>
              <dd>Control room 24/7 · Sales Mon–Fri 08:00–17:00</dd>
            </div>
          </dl>
          <Link href="/portals" className="nx-btn nx-btn--outline">
            Existing client? Open portals
          </Link>
        </div>

        <form className="nx-contact-form" onSubmit={onSubmit}>
          {sent ? (
            <div className="nx-success">
              Thanks — your message is recorded for this demo session. Connect
              your email or lead inbox when you go live.
            </div>
          ) : (
            <>
              <label>
                Full name
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Work email
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                Phone
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
              <label>
                Company
                <input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </label>
              <label>
                I am interested in
                <select
                  value={form.interest}
                  onChange={(e) =>
                    setForm({ ...form, interest: e.target.value })
                  }
                >
                  <option value="protection">Personal / family protection</option>
                  <option value="fleet">Fleet &amp; recovery</option>
                  <option value="install">CCTV / alarm install</option>
                  <option value="supply">Corporate gear supply</option>
                  <option value="other">Something else</option>
                </select>
              </label>
              <label>
                Message
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) =>
                    setForm({ ...form, message: e.target.value })
                  }
                />
              </label>
              <button type="submit" className="nx-btn nx-btn--primary">
                Send inquiry
              </button>
            </>
          )}
        </form>
      </section>
    </>
  );
}
