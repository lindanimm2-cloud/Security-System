'use client';

import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { InternalChat } from '@/components/InternalChat';
export default function ControlRoomChatPage() {
  return (
    <ControlRoomLayout title="Internal Chat">
      <InternalChat portal="admin" />
    </ControlRoomLayout>
  );
}
