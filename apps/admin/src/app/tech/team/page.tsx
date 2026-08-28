'use client';

import Link from 'next/link';
import { TechLayout } from '@/components/tech/TechLayout';
import { ErrorAlert } from '@/components/ErrorAlert';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { techApi, type ApiResponse } from '@/lib/api-client';
import { TechProfileCard } from '@/components/ui/TechProfileCard';

type TeamData = {
  id: string;
  name: string;
  branch: { id: string; name: string; code: string } | null;
  myRole: 'LEAD' | 'MEMBER';
  members: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    jobTitle: string | null;
    isLead: boolean;
    isMe: boolean;
    openJobs: number;
    statusLabel: string;
  }[];
};

export default function TechTeamPage() {
  return (
    <TechLayout title="My Team">
      <TechTeamContent />
    </TechLayout>
  );
}

function TechTeamContent() {
  const { data, loading, error, reload } = useApi(
    () => techApi.get<ApiResponse<TeamData | null>>('/store/tech/team'),
    [],
  );

  if (loading) return <LoadingSpinner label="Loading team..." />;
  if (error) return <ErrorAlert message={error} onRetry={reload} />;

  const team = Array.isArray(data?.data) ? null : data?.data;
  if (!team) {
    return (
      <div className="page-content">
        <div className="empty-state">
          You are not assigned to a tech team yet. Ask control room to add you to Install Tech Unit.
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>{team.name}</h1>
          <p className="text-muted">
            {team.branch ? `${team.branch.name} (${team.branch.code})` : 'Field install unit'}
            {' · '}
            {team.members.length} technicians
            {team.myRole === 'LEAD' ? ' · You are team lead' : ''}
          </p>
        </div>
        <div className="entity-card-actions">
          <Link href="/tech/chat" className="btn-primary">
            Team chat
          </Link>
          <Link href="/tech/inventory" className="btn-secondary">
            Parts / inventory
          </Link>
        </div>
      </div>

      <section className="card-panel page-section">
        <div className="card-header-row card-header-row--panel">
          <div>
            <h2>Team roster</h2>
            <p className="text-muted">{team.members.length} technicians in {team.name}</p>
          </div>
        </div>
        <div className="tech-profile-grid">
          {team.members.map((m) => (
            <TechProfileCard
              key={m.id}
              firstName={m.firstName}
              lastName={m.lastName}
              jobTitle={m.jobTitle ?? 'Technician'}
              email={m.email}
              phone={m.phone}
              highlight={m.isMe}
              badge={
                <>
                  {m.isLead ? <span className="badge">Lead</span> : null}
                  <span
                    className={`status-pill status-pill--${
                      m.statusLabel === 'Available' ? 'ok' : 'pending'
                    }`}
                  >
                    {m.statusLabel}
                  </span>
                </>
              }
            >
              {m.openJobs > 0 ? (
                <p className="tech-profile-card__note">
                  {m.openJobs} open job{m.openJobs === 1 ? '' : 's'}
                </p>
              ) : null}
            </TechProfileCard>
          ))}
        </div>
      </section>
    </div>
  );
}
