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
  children: FolderNode[];
};

type Library = {
  folderTree: FolderNode[];
  folders: { id: string; name: string; parentId: string | null; documentCount: number }[];
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

  useEffect(() => {
    if (folderParam) setFolderId(folderParam);
    if (categoryParam) setCategory(categoryParam);
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

  async function deleteDocument(doc: DocumentItem) {
    if (!window.confirm(`Delete “${doc.title}”? This cannot be undone.`)) return;
    await adminApi.delete(`/control-room/documents/${doc.id}`);
    refresh();
  }

  async function linkIncident(documentId: string, incidentId: string | null) {
    await adminApi.patch(`/control-room/documents/${documentId}/link-incident`, { incidentId });
    setLinkDocId(null);
    refresh();
  }

  if (!library && loading) return <LoadingSpinner label="Loading documents..." fullScreen />;
  if (error) return <ErrorAlert error={error} onRetry={refresh} />;

  return (
    <div className="documents-hub">
      <div className="documents-hub__header">
        <div>
          <p className="text-muted">
            {library?.stats.totalDocuments ?? 0} files · {library?.stats.folderCount ?? 0} folders
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
          <button type="button" className="btn-secondary" onClick={() => setShowNewFolder((v) => !v)}>
            New folder
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowUpload((v) => !v)}>
            Add document
          </button>
        </div>
      </div>

      {incidentFilter && (
        <div className="alert alert--info documents-incident-banner">
          Showing documents linked to incident.{' '}
          <Link href="/control-room/documents" className="interactive-text">Clear filter</Link>
        </div>
      )}

      {showNewFolder && (
        <NewFolderForm
          folders={library?.folders ?? []}
          onSuccess={() => {
            setShowNewFolder(false);
            refresh();
          }}
        />
      )}

      {showUpload && (
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
      )}

      <div className="documents-hub__body">
        <aside className="documents-sidebar">
          <div className="documents-sidebar__section">
            <button
              type="button"
              className={`documents-tree-item ${!folderId && !category ? 'documents-tree-item--active' : ''}`}
              onClick={clearFilters}
            >
              <span>📁</span> All documents
              <span className="documents-tree-count">{library?.stats.totalDocuments}</span>
            </button>
            <button
              type="button"
              className={`documents-tree-item ${category === 'PINNED' ? 'documents-tree-item--active' : ''}`}
              onClick={() => {
                setFolderId(null);
                setCategory('PINNED');
              }}
            >
              <span>📌</span> Pinned
              <span className="documents-tree-count">{library?.stats.pinned}</span>
            </button>
          </div>

          <div className="documents-sidebar__section">
            <h3>Folders</h3>
            <FolderTree
              nodes={library?.folderTree ?? []}
              activeId={folderId}
              onSelect={(id) => {
                setCategory(null);
                setFolderId(id);
              }}
            />
          </div>

          <div className="documents-sidebar__section">
            <h3>Categories</h3>
            {Object.entries(DOCUMENT_CATEGORIES).map(([key, label]) => {
              const count = library?.categories.find((c) => c.category === key)?.count ?? 0;
              return (
                <button
                  key={key}
                  type="button"
                  className={`documents-tree-item ${category === key ? 'documents-tree-item--active' : ''}`}
                  onClick={() => {
                    setFolderId(null);
                    setCategory(key);
                  }}
                >
                  <span>{CATEGORY_ICONS[key as DocumentCategoryKey]}</span>
                  {label}
                  <span className="documents-tree-count">{count}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="documents-main">
          <div className="documents-toolbar">
            <input
              type="search"
              className="command-search"
              placeholder="Search documents, tags, filenames..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {(folderId || category || search) && (
              <button type="button" className="btn-ghost" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <LoadingSpinner label="Loading files..." />
          ) : documents.length === 0 ? (
            <div className="empty-state">
              No documents match your filters.{' '}
              <button type="button" className="interactive-text" onClick={() => setShowUpload(true)}>
                Add one
              </button>
            </div>
          ) : (
            <div className="documents-grid">
              {documents
                .filter((d) => category !== 'PINNED' || d.isPinned)
                .map((doc) => (
                  <article key={doc.id} className={`document-card ${doc.isPinned ? 'document-card--pinned' : ''}`}>
                    <div className="document-card__icon">{fileTypeIcon(doc.fileType)}</div>
                    <div className="document-card__body">
                      <div className="document-card__top">
                        <h3>{doc.title}</h3>
                        {doc.isPinned && <span className="document-pin">Pinned</span>}
                      </div>
                      <p className="document-card__meta">
                        {DOCUMENT_CATEGORIES[doc.category]} · {doc.fileName}
                        {doc.fileSizeKb ? ` · ${doc.fileSizeKb} KB` : ''}
                      </p>
                      {doc.description && (
                        <p className="document-card__desc">{doc.description}</p>
                      )}
                      {doc.folder && (
                        <span className="document-tag">📁 {doc.folder.name}</span>
                      )}
                      {doc.incident && (
                        <Link
                          href={`/control-room/documents?incident=${doc.incident.id}`}
                          className="document-tag document-tag--incident"
                        >
                          🔗 {doc.incident.type} — {doc.incident.address ?? 'Incident'}
                        </Link>
                      )}
                      {doc.tags.length > 0 && (
                        <div className="document-tags">
                          {doc.tags.map((t) => (
                            <span key={t} className="document-tag">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="document-card__actions">
                      <a href={resolveMediaUrl(doc.fileUrl) ?? '#'} className="btn-sm btn-sm--link" target="_blank" rel="noopener noreferrer">
                        Open
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
        </main>
      </div>

      {linkDocId && (
        <LinkIncidentModal
          incidents={incidentsData?.data ?? []}
          onLink={(incidentId) => linkIncident(linkDocId, incidentId)}
          onClose={() => setLinkDocId(null)}
        />
      )}
    </div>
  );
}

function FolderTree({
  nodes,
  activeId,
  onSelect,
  depth = 0,
}: {
  nodes: FolderNode[];
  activeId: string | null;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  return (
    <ul className="documents-folder-tree" style={{ paddingLeft: depth ? '0.75rem' : 0 }}>
      {nodes.map((node) => (
        <li key={node.id}>
          <button
            type="button"
            className={`documents-tree-item ${activeId === node.id ? 'documents-tree-item--active' : ''}`}
            onClick={() => onSelect(node.id)}
          >
            <span>📂</span>
            {node.name}
            <span className="documents-tree-count">{node.documentCount}</span>
          </button>
          {node.children.length > 0 && (
            <FolderTree nodes={node.children} activeId={activeId} onSelect={onSelect} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  );
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
    <form className="portal-card documents-form" onSubmit={submit}>
      <h2>Create folder</h2>
      <div className="incident-report-form__grid">
        <label className="incident-report-form__full">
          Folder name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Parent folder
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
        <label className="incident-report-form__full">
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>
      <button type="submit" className="btn-primary" disabled={submitting}>
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
    <form className="portal-card documents-form" onSubmit={submit}>
      <h2>Add document</h2>
      <p className="text-muted">
        Choose a file to register in the library (metadata and an open link).
        Files stay available to ops from this desk.
      </p>
      <div className="incident-report-form__grid">
        <label className="incident-report-form__full">
          File
          <input
            type="file"
            onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
          />
        </label>
        <label className="incident-report-form__full">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Filename
          <input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="report.pdf" required />
        </label>
        <label>
          File type
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
        <label>
          Category
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
        <label>
          Folder
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
        <label>
          Link to incident
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
        <label className="incident-report-form__full">
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </label>
        <label className="incident-report-form__full">
          Tags (comma-separated)
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="evidence, cctv, 2026" />
        </label>
      </div>
      <button type="submit" className="btn-primary" disabled={submitting}>
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
    <div className="documents-modal-overlay" onClick={onClose} role="presentation">
      <div className="documents-modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <h2>Link to incident</h2>
        <ul className="documents-link-list">
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
        <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
