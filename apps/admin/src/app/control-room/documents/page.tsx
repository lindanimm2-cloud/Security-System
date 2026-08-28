'use client';

import { ErrorAlert } from '@/components/ErrorAlert';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useApi } from '@/hooks/useApi';
import { adminApi, type ApiResponse } from '@/lib/api-client';
import {
  CATEGORY_ICONS,
  DOCUMENT_CATEGORIES,
  fileTypeIcon,
  type DocumentCategoryKey,
} from '@/lib/document-categories';
import { OpsDialog } from '@/components/ops/OpsDialog';
import { incidentHref } from '@/lib/control-room-routes';
import { resolveMediaUrl } from '@/lib/media-url';
import { UiSelect } from '@/components/ui/UiSelect';

type FolderNode = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  parentId: string | null;
  documentCount: number;
  updatedAt?: string;
  children: FolderNode[];
};

type LibraryFolder = {
  id: string;
  name: string;
  parentId: string | null;
  documentCount: number;
  icon?: string | null;
  updatedAt?: string;
};

type Library = {
  folderTree: FolderNode[];
  folders: LibraryFolder[];
  categories: { category: string; count: number }[];
  stats: { totalDocuments: number; pinned: number; folderCount: number };
};

type DocumentItem = {
  id: string;
  title: string;
  description: string | null;
  category: DocumentCategoryKey;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSizeKb: number | null;
  tags: string[];
  isPinned: boolean;
  folderId: string | null;
  incidentId: string | null;
  folder: { id: string; name: string } | null;
  incident: {
    id: string;
    type: string;
    title: string | null;
    address: string | null;
    status: string;
  } | null;
  createdAt: string;
  uploadedBy: string | null;
};

type LinkableIncident = {
  id: string;
  type: string;
  title: string | null;
  status: string;
  address: string | null;
  client: string;
  documentCount: number;
};

export default function DocumentsPage() {
  return (
    <ControlRoomLayout title="Documents">
      <DocumentsContent />
    </ControlRoomLayout>
  );
}

function DocumentsContent() {
  const searchParams = useSearchParams();
  const incidentFilter = searchParams.get('incident');
  const folderParam = searchParams.get('folder');
  const categoryParam = searchParams.get('category');

  const [folderId, setFolderId] = useState<string | null>(folderParam);
  const [category, setCategory] = useState<string | null>(categoryParam);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [linkDocId, setLinkDocId] = useState<string | null>(null);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<DocumentItem | null>(null);

  useEffect(() => {
    setFolderId(folderParam);
    setCategory(categoryParam);
  }, [folderParam, categoryParam]);

  const { data: libraryData, reload: reloadLibrary } = useApi(
    () => adminApi.get<ApiResponse<Library>>('/control-room/documents/library'),
    [],
  );

  const docsUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (folderId) params.set('folderId', folderId);
    if (category === 'PINNED') params.set('pinned', 'true');
    else if (category) params.set('category', category);
    if (incidentFilter) params.set('incidentId', incidentFilter);
    if (search.trim()) params.set('search', search.trim());
    const q = params.toString();
    return `/control-room/documents${q ? `?${q}` : ''}`;
  }, [folderId, category, incidentFilter, search]);

  const { data: docsData, loading, error, reload: reloadDocs } = useApi(
    () => adminApi.get<ApiResponse<DocumentItem[]>>(docsUrl),
    [docsUrl],
  );

  const { data: incidentsData } = useApi(
    () => adminApi.get<ApiResponse<LinkableIncident[]>>('/control-room/documents/incidents'),
    [],
  );

  const refresh = useCallback(() => {
    reloadLibrary();
    reloadDocs();
  }, [reloadLibrary, reloadDocs]);

  const documents = docsData?.data ?? [];
  const library = libraryData?.data;

  function clearFilters() {
    setFolderId(null);
    setCategory(null);
    setSearch('');
  }

  async function togglePin(doc: DocumentItem) {
    await adminApi.patch(`/control-room/documents/${doc.id}`, { isPinned: !doc.isPinned });
    refresh();
  }

  function deleteDocument(doc: DocumentItem) {
    setDeleteConfirmDoc(doc);
  }

  async function confirmDelete() {
    if (!deleteConfirmDoc) return;
    await adminApi.delete(`/control-room/documents/${deleteConfirmDoc.id}`);
    setDeleteConfirmDoc(null);
    refresh();
  }

  async function linkIncident(documentId: string, incidentId: string | null) {
    await adminApi.patch(`/control-room/documents/${documentId}/link-incident`, { incidentId });
    setLinkDocId(null);
    refresh();
  }

  if (!library && loading) return <LoadingSpinner label="Loading documents..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={refresh} />;

  const folders = library?.folders ?? [];
  const selectedFolder = folders.find((f) => f.id === folderId) ?? null;
  const showFolderGrid = !folderId && !search.trim();

  return (
    <div className="documents-hub">
      <header className="documents-hub__header">
        <div>
          <h1 className="documents-hub__title">Documents</h1>
          <p className="documents-hub__meta">
            {library?.stats.totalDocuments ?? 0} document
            {(library?.stats.totalDocuments ?? 0) === 1 ? '' : 's'} · {library?.stats.folderCount ?? 0} folder
            {(library?.stats.folderCount ?? 0) === 1 ? '' : 's'}
            {incidentFilter && (
              <>
                {' · '}
                <Link href={incidentHref(incidentFilter)} className="interactive-text">
                  View incident
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="documents-hub__actions">
          <button type="button" className="btn-secondary" onClick={() => setShowNewFolder(true)}>
            + New folder
          </button>
          <button type="button" className="btn-action" onClick={() => setShowUpload(true)}>
            + Add document
          </button>
        </div>
      </header>

      {incidentFilter && (
        <div className="alert alert--info documents-incident-banner">
          Showing documents linked to incident.{' '}
          <Link href="/control-room/documents" className="interactive-text">Clear filter</Link>
        </div>
      )}

      {showNewFolder && (
        <OpsDialog title="New folder" subtitle="Keep SOPs, evidence, and reports grouped." onClose={() => setShowNewFolder(false)}>
          <NewFolderForm
            folders={library?.folders ?? []}
            onSuccess={() => {
              setShowNewFolder(false);
              refresh();
            }}
          />
        </OpsDialog>
      )}

      {showUpload && (
        <OpsDialog title="Add document" subtitle="Register a file in the ops library." onClose={() => setShowUpload(false)} wide>
          <UploadDocumentForm
            folders={library?.folders ?? []}
            incidents={incidentsData?.data ?? []}
            defaultIncidentId={incidentFilter}
            defaultFolderId={folderId}
            onSuccess={() => {
              setShowUpload(false);
              refresh();
            }}
          />
        </OpsDialog>
      )}

      <div className="documents-toolbar">
        <label className="documents-search">
          <span className="documents-search__icon" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            placeholder="Search documents, tags, filenames..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <div className="documents-layout">
      <nav className="documents-filters" aria-label="Document categories">
        <button
          type="button"
          className={`documents-chip ${!folderId && !category ? 'documents-chip--on' : ''}`}
          onClick={clearFilters}
        >
          All
          <span>{library?.stats.totalDocuments ?? 0}</span>
        </button>
        <button
          type="button"
          className={`documents-chip ${category === 'PINNED' ? 'documents-chip--on' : ''}`}
          onClick={() => {
            setFolderId(null);
            setCategory('PINNED');
          }}
        >
          Pinned
          <span>{library?.stats.pinned ?? 0}</span>
        </button>
        {Object.entries(DOCUMENT_CATEGORIES).map(([key, label]) => {
          const count = library?.categories.find((c) => c.category === key)?.count ?? 0;
          return (
            <button
              key={key}
              type="button"
              className={`documents-chip ${category === key ? 'documents-chip--on' : ''}`}
              onClick={() => {
                setFolderId(null);
                setCategory(key);
              }}
            >
              {CATEGORY_ICONS[key as DocumentCategoryKey]} {label}
              <span>{count}</span>
            </button>
          );
        })}
        {(folderId || category || search) && (
          <button type="button" className="documents-chip documents-chip--clear" onClick={clearFilters}>
            Clear
          </button>
        )}
      </nav>

      <div className="documents-main">
      {showFolderGrid && folders.length > 0 && (
        <section className="documents-section">
          <h2 className="documents-section__title">Folders</h2>
          <div className="documents-folder-grid">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className="documents-folder-card"
                onClick={() => {
                  setCategory(null);
                  setFolderId(folder.id);
                }}
              >
                <span className="documents-folder-card__icon" aria-hidden>
                  {folderGlyph(folder.icon)}
                </span>
                <span className="documents-folder-card__name">{folder.name}</span>
                <span className="documents-folder-card__count">
                  {folder.documentCount} document{folder.documentCount === 1 ? '' : 's'}
                </span>
                <span className="documents-folder-card__meta">
                  {formatUpdated(folder.updatedAt)}
                  <span className="documents-folder-card__open">Open →</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="documents-section">
        <div className="documents-section__head">
          <h2 className="documents-section__title">
            {selectedFolder
              ? selectedFolder.name
              : category === 'PINNED'
                ? 'Pinned documents'
                : category
                  ? DOCUMENT_CATEGORIES[category as DocumentCategoryKey] ?? 'Documents'
                  : 'Recent documents'}
          </h2>
          {selectedFolder && (
            <button type="button" className="btn-ghost" onClick={() => setFolderId(null)}>
              All folders
            </button>
          )}
        </div>

        {loading ? (
          <LoadingSpinner label="Loading files..." />
        ) : documents.filter((d) => category !== 'PINNED' || d.isPinned).length === 0 ? (
          <div className="empty-state">
            No documents match your filters.{' '}
            <button type="button" className="btn-sm btn-secondary" onClick={() => setShowUpload(true)}>
              Add one
            </button>
          </div>
        ) : (
          <div className="documents-list">
            {documents
              .filter((d) => category !== 'PINNED' || d.isPinned)
              .map((doc) => (
                <article key={doc.id} className={`document-card ${doc.isPinned ? 'document-card--pinned' : ''}`}>
                  <div className="document-card__icon">{fileTypeIcon(doc.fileType)}</div>
                  <div className="document-card__body">
                    <div className="document-card__top">
                      <h3>{doc.title}</h3>
                    </div>
                    <p className="document-card__meta">
                      {DOCUMENT_CATEGORIES[doc.category]}
                      {doc.folder ? ` · ${doc.folder.name}` : ''}
                    </p>
                    {doc.description && <p className="document-card__desc">{doc.description}</p>}
                    <dl className="document-card__facts">
                      {doc.incident && (
                        <>
                          <dt>Incident</dt>
                          <dd>
                            {doc.incident.type}
                            {doc.incident.address ? ` — ${doc.incident.address}` : ''}
                          </dd>
                        </>
                      )}
                      {doc.uploadedBy && (
                        <>
                          <dt>Added by</dt>
                          <dd>{doc.uploadedBy}</dd>
                        </>
                      )}
                      <dt>File</dt>
                      <dd>
                        {doc.fileName}
                        {doc.fileSizeKb ? ` · ${doc.fileSizeKb} KB` : ''}
                      </dd>
                      <dt>Added</dt>
                      <dd>{formatAdded(doc.createdAt)}</dd>
                    </dl>
                    <div className="document-tags">
                      {doc.isPinned && <span className="document-tag document-tag--pin">Pinned</span>}
                      {doc.incident && (
                        <Link
                          href={`/control-room/documents?incident=${doc.incident.id}`}
                          className="document-tag"
                        >
                          {doc.incident.type}
                        </Link>
                      )}
                      {doc.tags.map((t) => (
                        <span key={t} className="document-tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="document-card__actions">
                    <a
                      href={resolveMediaUrl(doc.fileUrl) ?? '#'}
                      className="document-card__open"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open document →
                    </a>
                    {doc.incident ? (
                      <Link href={incidentHref(doc.incident.id)} className="btn-sm btn-sm--link">
                        Incident
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="btn-sm btn-sm--link"
                        onClick={() => setLinkDocId(doc.id)}
                      >
                        Link incident
                      </button>
                    )}
                    <button type="button" className="btn-sm" onClick={() => togglePin(doc)}>
                      {doc.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      type="button"
                      className="btn-sm btn-sm--danger"
                      onClick={() => void deleteDocument(doc)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
          </div>
        )}
      </section>
      </div>
      </div>

      {linkDocId && (
        <LinkIncidentModal
          incidents={incidentsData?.data ?? []}
          onLink={(incidentId) => linkIncident(linkDocId, incidentId)}
          onClose={() => setLinkDocId(null)}
        />
      )}

      {deleteConfirmDoc && (
        <OpsDialog
          title="Delete document"
          subtitle={`"${deleteConfirmDoc.title}" will be permanently removed. This cannot be undone.`}
          onClose={() => setDeleteConfirmDoc(null)}
        >
          <div className="fleet-form__actions">
            <button type="button" className="btn-ghost" onClick={() => setDeleteConfirmDoc(null)}>
              Cancel
            </button>
            <button type="button" className="btn-danger" onClick={() => void confirmDelete()}>
              Delete
            </button>
          </div>
        </OpsDialog>
      )}
    </div>
  );
}

function folderGlyph(icon: string | null | undefined) {
  if (icon && icon !== 'folder' && icon.length <= 4) return icon;
  return '📁';
}

function formatUpdated(iso?: string) {
  if (!iso) return 'Updated recently';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Updated recently';
  const diff = Date.now() - d.getTime();
  const mins = Math.max(0, Math.round(diff / 60000));
  if (mins < 60) return mins <= 1 ? 'Updated just now' : `Updated ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? 'Updated 1 hour ago' : `Updated ${hours} hours ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Updated yesterday';
  if (days < 7) return `Updated ${days} days ago`;
  return `Updated ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function formatAdded(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function NewFolderForm({
  folders,
  onSuccess,
}: {
  folders: { id: string; name: string }[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await adminApi.post('/control-room/documents/folders', {
        name: name.trim(),
        description: description || undefined,
        parentId: parentId || undefined,
      });
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="stack-form documents-form" onSubmit={submit}>
      <label className="form-field">
        <span>Folder name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="form-field">
        <span>Parent folder</span>
        <UiSelect
          compact={false}
          ariaLabel="Parent folder"
          value={parentId}
          onChange={setParentId}
          options={[
            { value: '', label: 'Root level' },
            ...folders.map((f) => ({ value: f.id, label: f.name })),
          ]}
        />
      </label>
      <label className="form-field">
        <span>Description</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <button type="submit" className="btn-primary btn-primary--full" disabled={submitting}>
        {submitting ? 'Creating…' : 'Create folder'}
      </button>
    </form>
  );
}

function UploadDocumentForm({
  folders,
  incidents,
  defaultIncidentId,
  defaultFolderId,
  onSuccess,
}: {
  folders: { id: string; name: string }[];
  incidents: LinkableIncident[];
  defaultIncidentId: string | null;
  defaultFolderId: string | null;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('application/pdf');
  const [fileSizeKb, setFileSizeKb] = useState(0);
  const [category, setCategory] = useState<DocumentCategoryKey>('OTHER');
  const [folderId, setFolderId] = useState(defaultFolderId ?? '');
  const [incidentId, setIncidentId] = useState(defaultIncidentId ?? '');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function onFilePicked(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    setFileType(file.type || 'application/octet-stream');
    setFileSizeKb(Math.max(1, Math.round(file.size / 1024)));
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !fileName.trim()) return;
    setSubmitting(true);
    try {
      await adminApi.post('/control-room/documents', {
        title: title.trim(),
        fileName: fileName.trim(),
        fileType,
        category,
        folderId: folderId || undefined,
        incidentId: incidentId || undefined,
        description: description || undefined,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        fileSizeKb: fileSizeKb || undefined,
      });
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="stack-form documents-form" onSubmit={submit}>
      <p className="text-muted">
        Choose a file to register in the library (metadata and an open link).
        Files stay available to ops from this desk.
      </p>
      <div className="form-grid">
        <label className="form-field form-field--full">
          <span>File</span>
          <input
            type="file"
            onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="form-field form-field--full">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="form-field">
          <span>Filename</span>
          <input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="report.pdf" required />
        </label>
        <label className="form-field">
          <span>File type</span>
          <UiSelect
            compact={false}
            ariaLabel="File type"
            value={fileType}
            onChange={setFileType}
            options={[
              { value: 'application/pdf', label: 'PDF' },
              { value: 'image/jpeg', label: 'Image (JPEG)' },
              { value: 'image/png', label: 'Image (PNG)' },
              { value: 'video/mp4', label: 'Video (MP4)' },
              { value: 'application/vnd.ms-excel', label: 'Spreadsheet' },
              { value: 'text/plain', label: 'Text' },
              { value: 'application/octet-stream', label: 'Other' },
            ]}
          />
        </label>
        <label className="form-field">
          <span>Category</span>
          <UiSelect
            compact={false}
            ariaLabel="Category"
            value={category}
            onChange={(value) => setCategory(value as DocumentCategoryKey)}
            options={Object.entries(DOCUMENT_CATEGORIES).map(([k, v]) => ({
              value: k,
              label: v,
            }))}
          />
        </label>
        <label className="form-field">
          <span>Folder</span>
          <UiSelect
            compact={false}
            ariaLabel="Folder"
            value={folderId}
            onChange={setFolderId}
            options={[
              { value: '', label: 'No folder' },
              ...folders.map((f) => ({ value: f.id, label: f.name })),
            ]}
          />
        </label>
        <label className="form-field form-field--full">
          <span>Link to incident</span>
          <UiSelect
            compact={false}
            ariaLabel="Link to incident"
            value={incidentId}
            onChange={setIncidentId}
            options={[
              { value: '', label: 'None' },
              ...incidents.map((i) => ({
                value: i.id,
                label: `${i.type} — ${i.client}`,
                meta: i.status,
              })),
            ]}
          />
        </label>
        <label className="form-field form-field--full">
          <span>Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </label>
        <label className="form-field form-field--full">
          <span>Tags (comma-separated)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="evidence, cctv, 2026" />
        </label>
      </div>
      <button type="submit" className="btn-primary btn-primary--full" disabled={submitting}>
        {submitting ? 'Saving…' : 'Save document'}
      </button>
    </form>
  );
}

function LinkIncidentModal({
  incidents,
  onLink,
  onClose,
}: {
  incidents: LinkableIncident[];
  onLink: (incidentId: string) => void;
  onClose: () => void;
}) {
  return (
    <OpsDialog title="Link to incident" subtitle="Select an active incident to attach this document to." onClose={onClose}>
      <ul className="documents-link-list">
        {incidents.length === 0 && (
          <li><p className="text-muted">No active incidents found.</p></li>
        )}
        {incidents.map((i) => (
          <li key={i.id}>
            <button type="button" className="documents-link-item" onClick={() => onLink(i.id)}>
              <strong>{i.type} — {i.client}</strong>
              <span>{i.address ?? 'No address'} · {i.status}</span>
              {i.documentCount > 0 && (
                <span className="text-muted">{i.documentCount} doc(s) linked</span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <div className="fleet-form__actions" style={{ marginTop: '0.75rem' }}>
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </OpsDialog>
  );
}
