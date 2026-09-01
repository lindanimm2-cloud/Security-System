'use client';

import Link from 'next/link';
import { FamilyChat } from '@/components/portal/FamilyChat';
import { PortalLayout } from '@/components/portal/PortalLayout';

export default function FamilyChatPage() {
  return (
    <PortalLayout>
      <div className="page-content page-content--chat page-content--family-chat">
        <div className="page-header page-header--family-chat">
          <div>
            <h1>Family Chat</h1>
            <p className="text-muted">
              <Link href="/portal/family" className="interactive-text">
                Family Safety
              </Link>
              {' · '}
              <Link href="/portal/emergency" className="interactive-text">
                Emergency Hub
              </Link>
            </p>
          </div>
        </div>
        <FamilyChat />
      </div>
    </PortalLayout>
  );
}
