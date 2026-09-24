'use client';

import Link from 'next/link';
import { ControlRoomChat } from '@/components/portal/ControlRoomChat';
import { PortalLayout } from '@/components/portal/PortalLayout';

export default function PortalControlRoomChatPage() {
  return (
    <PortalLayout>
      <div className="page-content page-content--chat page-content--messaging">
        <div className="cr-chat-page-links">
          <Link href="/portal/emergency" className="interactive-text">
            Emergency Hub
          </Link>
          <span aria-hidden>·</span>
          <Link href="/portal/family/chat" className="interactive-text">
            Family chat
          </Link>
        </div>
        <ControlRoomChat />
      </div>
    </PortalLayout>
  );
}
