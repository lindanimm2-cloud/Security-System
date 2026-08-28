import { OfficerLayout } from '@/components/officer/OfficerLayout';
import { InternalChat } from '@/components/InternalChat';

export default function OfficerMessagesPage() {
  return (
    <OfficerLayout title="Dispatch Chat">
      <InternalChat portal="officer" />
    </OfficerLayout>
  );
}
