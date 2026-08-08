'use client';

import { TechLayout } from '@/components/tech/TechLayout';
import { InternalChat } from '@/components/InternalChat';

export default function TechTeamChatPage() {
  return (
    <TechLayout title="Team Chat">
      <div className="page-content">
        <div className="page-header">
          <div>
            <h1>Install team chat</h1>
            <p className="text-muted">
              Private channel for your 3-person install unit — cameras, alarms, and access techs.
            </p>
          </div>
        </div>
        <InternalChat portal="technician" channel="tech-team" />
      </div>
    </TechLayout>
  );
}
