'use client';

import Link from 'next/link';
import { CONSENT_VERSION, POLICY_VERSION } from '@/lib/device-security';
import type { ReactNode } from 'react';

export type SecurityDocTocItem = {
  id: string;
  label: string;
  href?: string;
};

export function SecurityDocFrame({
  docId,
  title,
  kicker = 'Client protection file',
  summary,
  stamp = 'Restricted · Client',
  toc,
  children,
}: {
  docId: string;
  title: string;
  kicker?: string;
  summary?: string;
  stamp?: string;
  toc: SecurityDocTocItem[];
  children: ReactNode;
}) {
  return (
    <div className="sec-doc">
      <aside className="sec-doc__rail" aria-label="File index">
        <p className="sec-doc__rail-kicker">Index</p>
        <ol>
          {toc.map((item, i) => (
            <li key={item.id}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              {item.href ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <a href={`#${item.id}`}>{item.label}</a>
              )}
            </li>
          ))}
        </ol>
      </aside>

      <article className="sec-doc__folio">
        <header className="sec-doc__mast">
          <div className="sec-doc__stamp">{stamp}</div>
          <p className="sec-kicker">{kicker}</p>
          <h1>{title}</h1>
          {summary ? <p className="sec-doc__summary">{summary}</p> : null}
          <dl className="sec-doc__meta">
            <div>
              <dt>File</dt>
              <dd>{docId}</dd>
            </div>
            <div>
              <dt>Policy</dt>
              <dd>v{POLICY_VERSION}</dd>
            </div>
            <div>
              <dt>Consent</dt>
              <dd>{CONSENT_VERSION}</dd>
            </div>
            <div>
              <dt>Silent Panic</dt>
              <dd>Available in the dock</dd>
            </div>
          </dl>
        </header>
        <div className="sec-doc__body">{children}</div>
        <footer className="sec-doc__end">
          <p>End of file · Native Emergency SOS is not claimed on this web application.</p>
        </footer>
      </article>
    </div>
  );
}

export function SecurityArticle({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="sec-article" id={id}>
      <header className="sec-article__head">
        <span>{number}</span>
        <h2>{title}</h2>
      </header>
      <div className="sec-article__copy">{children}</div>
    </section>
  );
}
