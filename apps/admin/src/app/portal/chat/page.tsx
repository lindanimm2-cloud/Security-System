'use client';

import Link from 'next/link';
import { ControlRoomChat } from '@/components/portal/ControlRoomChat';
import { PortalLayout } from '@/components/portal/PortalLayout';

export default function PortalControlRoomChatPage() {
  return (
    <PortalLayout>
      <div className="page-content page-content--chat">
        <div className="page-header">
          <div>
            <h1>Control room chat</h1>
            <p className="text-muted">
              <Link href="/portal/emergency" className="interactive-text">
                Emergency Hub
              </Link>
              {' · '}
              <Link href="/portal/family/chat" className="interactive-text">
                Family chat
              </Link>
            </p>
          </div>
        </div>
        <ControlRoomChat />
      </div>
    </PortalLayout>
  );
}
