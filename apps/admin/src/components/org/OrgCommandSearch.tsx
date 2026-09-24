'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { searchOrgOps } from '@/lib/org';

export function OrgCommandSearch({
  organizationId,
  siteId,
}: {
  organizationId: string;
  siteId: string | 'all';
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hits = useMemo(
    () => searchOrgOps(organizationId, query, siteId),
    [organizationId, query, siteId],
  );

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="org-search" ref={rootRef}>
      <input
        className="org-search__input"
        value={query}
        placeholder="Search cameras, people, vehicles, incidents…"
        aria-label="Search operations"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && query.trim().length >= 2 ? (
        <div className="org-search__menu" role="listbox">
          {hits.length === 0 ? (
            <p className="org-search__empty">No matches in this site view.</p>
          ) : (
            hits.map((hit) => (
              <Link
                key={hit.id}
                href={hit.href}
                className="org-search__hit"
                onClick={() => setOpen(false)}
              >
                <span>{hit.kind}</span>
                <strong>{hit.label}</strong>
                <em>{hit.detail}</em>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
