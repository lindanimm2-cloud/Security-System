'use client';

import { OfficerLayout } from '@/components/officer/OfficerLayout';
import { InternalChat } from '@/components/InternalChat';
export default function OfficerInternalChatPage() {
  return (
    <OfficerLayout title="Team Chat">
      <InternalChat portal="officer" />
    </OfficerLayout>
  );
}
