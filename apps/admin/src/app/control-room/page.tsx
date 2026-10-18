'use client';

import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { OperationsWall } from '@/components/control-room/OperationsWall';

export default function ControlRoomPage() {
  return (
    <ControlRoomLayout title="Operations Wall">
      <OperationsWall />
    </ControlRoomLayout>
  );
}
