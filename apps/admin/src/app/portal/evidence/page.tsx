'use client';



import { ErrorAlert } from '@/components/ErrorAlert';



import Link from 'next/link';

import { LoadingSpinner } from '@/components/LoadingSpinner';

import { PortalLayout } from '@/components/portal/PortalLayout';

import { useApi } from '@/hooks/useApi';

import { clientApi, type ApiResponse } from '@/lib/api-client';

import { resolveMediaUrl } from '@/lib/media-url';



type EvidenceItem = {

  id: string;

  type: string;

  title: string | null;

  status: string;

  createdAt: string;

  media: { id: string; fileName: string; fileType: string; fileUrl: string }[];

};



export default function EvidencePage() {

  return (

    <PortalLayout>

      <EvidenceContent />

    </PortalLayout>

  );

}



function EvidenceContent() {

  const { data, loading, error , reload } = useApi(

    () => clientApi.get<ApiResponse<EvidenceItem[]>>('/client/incidents/evidence'),

    [],

  );



  if (loading) return <LoadingSpinner label="Loading evidence vault..." fullScreen />;

  if (error) return <ErrorAlert error={error} onRetry={reload} />;



  const incidents = data!.data;

  const withMedia = incidents.filter((i) => i.media.length > 0);



  return (

    <div className="page-content">

      <div className="page-header">

        <div>

          <h1>Evidence vault</h1>

          <p className="text-muted">Secure storage for photos, videos, documents, and evidence.</p>

        </div>

      </div>



      {withMedia.length === 0 ? (

        <div className="empty-state">No evidence files stored yet.</div>

      ) : (

        <div className="entity-grid">

          {withMedia.map((inc) => (

            <article key={inc.id} className="entity-card">

              <div className="entity-card-header">

                <strong>{inc.title ?? inc.type}</strong>

                <span className="status-pill">{inc.status}</span>

              </div>

              <p className="text-muted">{new Date(inc.createdAt).toLocaleString()}</p>

              <Link href="/portal/incidents" className="link-sm interactive-text">

                View incident →

              </Link>

              <ul className="evidence-list">

                {inc.media.map((m) => {

                  const openUrl = resolveMediaUrl(m.fileUrl);

                  return (

                    <li key={m.id} className="evidence-item">

                      <span className="evidence-icon">{m.fileType.startsWith('image') ? '🖼️' : '📄'}</span>

                      <div>

                        <strong>{m.fileName}</strong>

                        <span className="text-muted">{m.fileType}</span>

                      </div>

                      {openUrl && (

                        <a

                          href={openUrl}

                          className="btn-sm btn-sm--link"

                          target="_blank"

                          rel="noopener noreferrer"

                          download={m.fileName}

                        >

                          Open

                        </a>

                      )}

                    </li>

                  );

                })}

              </ul>

            </article>

          ))}

        </div>

      )}

    </div>

  );

}

