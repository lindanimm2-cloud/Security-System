'use client';

import { useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { WorkflowTracker } from '@/components/ui/WorkflowTracker';
import { useJobExtras, type JobPhotoKind } from '@/lib/tech-job-extras';
import {
  advanceActionLabel,
  equipmentFromJob,
  mapsUrl,
  mergeChecklist,
  nextWorkflowStatus,
  optionTone,
  primaryActionFor,
  TECH_WORKFLOW,
  whatsappUrl,
  workflowIndex,
  workflowLabel,
  workflowStageKey,
  type ChecklistItem,
  type EquipmentItem,
} from '@/lib/tech-workflow';
import { CONTROL_ROOM_LINE } from '@/lib/control-room-line';

export type InstallJob = {
  id: string;
  title: string;
  description: string | null;
  jobType: string;
  status: string;
  clientName: string;
  clientPhone: string | null;
  address: string;
  scheduledAt: string;
  equipmentNotes: string | null;
  serial?: string;
  tests?: ChecklistItem[];
  technicianName?: string;
  equipment?: EquipmentItem[];
};

const PHOTO_KINDS: { id: JobPhotoKind; label: string }[] = [
  { id: 'before', label: 'Before' },
  { id: 'install', label: 'Installation' },
  { id: 'after', label: 'After' },
];

function generatedSerial(item: EquipmentItem) {
  const tag = item.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8) || 'DEV';
  return `NX-${tag}-${Date.now().toString().slice(-4)}`;
}

function serialFromScan(file: File) {
  return new Promise<string>((resolve) => {
    void (async () => {
      try {
        const Detector = (
          window as unknown as {
            BarcodeDetector?: new (opts: { formats: string[] }) => {
              detect: (source: ImageBitmap) => Promise<Array<{ rawValue: string }>>;
            };
          }
        ).BarcodeDetector;
        if (Detector && file.type.startsWith('image/')) {
          const bitmap = await createImageBitmap(file);
          const codes = await new Detector({
            formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a'],
          }).detect(bitmap);
          bitmap.close();
          const value = codes[0]?.rawValue?.trim();
          if (value) {
            resolve(value);
            return;
          }
        }
      } catch {
        /* fall through */
      }
      const fromName = file.name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
      if (fromName && fromName.length >= 4 && fromName !== 'IMAGE') {
        resolve(fromName.slice(0, 16));
        return;
      }
      resolve(`NX-SCAN-${Date.now().toString().slice(-6)}`);
    })();
  });
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  const time = date.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
  const end = new Date(date.getTime() + 2 * 3600000).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (sameDay) return `Today · ${time}–${end}`;
  return `${date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} · ${time}–${end}`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function InstallJobCard({
  job,
  busy,
  overrideReason,
  onOverrideReason,
  onAdvance,
  onToggleCheck,
  onSaveSerial,
}: {
  job: InstallJob;
  busy: boolean;
  overrideReason: string;
  onOverrideReason: (value: string) => void;
  onAdvance: () => void;
  onToggleCheck: (item: ChecklistItem) => void;
  onSaveSerial: (serial: string) => void;
}) {
  const seed = useMemo(() => equipmentFromJob(job), [job]);
  const { extras, addPhoto, removePhoto, patchEquipment, setIssue } = useJobExtras(job.id, seed);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [issueDraft, setIssueDraft] = useState('');
  const [equipNote, setEquipNote] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoKind, setPhotoKind] = useState<JobPhotoKind>('before');
  const scanInput = useRef<HTMLInputElement>(null);
  const scanTarget = useRef<string | null>(null);

  const checks = mergeChecklist(job.tests);
  const doneCount = checks.filter((c) => c.done).length;
  const checkTone = optionTone(doneCount, checks.length);
  const stageIndex = workflowIndex(job.status);
  const next = nextWorkflowStatus(job.status);
  const primary = primaryActionFor(job.status);
  const advanceLabel = advanceActionLabel(job.status);
  const canAdvance = Boolean(next) && job.status !== 'COMPLETED' && job.status !== 'CANCELLED';
  const phone = job.clientPhone || '';
  const stageBtn = `tech-stage tech-stage--${workflowStageKey(job.status)}`;
  const equipDone = extras.equipment.filter((row) => row.status === 'installed').length;
  const equipTone = optionTone(equipDone, extras.equipment.length || 1);
  const photoTone = optionTone(extras.photos.length, PHOTO_KINDS.length);
  const controlTone = extras.issue?.open ? 'hot' : 'idle';

  function togglePanel(id: string) {
    setOpenPanel((current) => (current === id ? null : id));
  }

  async function onPickPhoto(file: File | undefined) {
    if (!file) return;
    const url = await readFileAsDataUrl(file);
    addPhoto(photoKind, url);
  }

  function isPrimarySerial(item: EquipmentItem) {
    return /^camera 01$/i.test(item.name) || extras.equipment.length === 1;
  }

  function applySerial(item: EquipmentItem, serial: string, note: string) {
    const next = serial.trim();
    if (!next) return;
    patchEquipment(item.id, { serial: next });
    if (isPrimarySerial(item)) onSaveSerial(next);
    setEquipNote(note);
  }

  async function onScanFile(file: File | undefined) {
    const targetId = scanTarget.current;
    if (!file || !targetId) return;
    const item = extras.equipment.find((row) => row.id === targetId);
    if (!item) return;
    const serial = await serialFromScan(file);
    applySerial(item, serial, `${item.name}: serial ${serial}`);
  }

  function markInstalled(item: EquipmentItem) {
    const serial = item.serial.trim() || generatedSerial(item);
    patchEquipment(item.id, { status: 'installed', serial });
    if (isPrimarySerial(item)) onSaveSerial(serial);
    setEquipNote(`${item.name} marked installed.`);
  }

  function markDefective(item: EquipmentItem) {
    const next = item.status === 'defective' ? 'pending' : 'defective';
    patchEquipment(item.id, { status: next });
    setEquipNote(next === 'defective' ? `${item.name} marked defective.` : `${item.name} set back to pending.`);
  }

  function startScan(item: EquipmentItem) {
    const serial = generatedSerial(item);
    applySerial(item, serial, `${item.name}: serial ${serial}. You can also pick a QR photo to replace it.`);
    scanTarget.current = item.id;
    const input = scanInput.current;
    if (!input) return;
    input.value = '';
    input.click();
  }

  return (
    <article className="ds-job">
      <header className="ds-job__head">
        <div className="ds-job__identity">
          <p className="ds-kicker">
            {job.title.includes('—') || job.title.includes(' - ')
              ? job.title.split(/\s+[—–-]\s+/)[0]
              : `${job.jobType} installation`}
          </p>
          <h2>
            {job.title.includes('—') || job.title.includes(' - ')
              ? job.title.split(/\s+[—–-]\s+/).slice(1).join(' — ')
              : job.title}
          </h2>
          <p className="ds-job__client">
            {job.jobType} · {job.clientName}
          </p>
        </div>
        <StatusBadge
          status={job.status}
          label={workflowLabel(job.status).toUpperCase() === 'INSTALL' ? 'Installation in progress' : workflowLabel(job.status)}
          pulse={job.status === 'INSTALL' || job.status === 'IN_PROGRESS' || job.status === 'EN_ROUTE'}
        />
      </header>

      <dl className="ds-job__facts">
        <div>
          <dt>Address</dt>
          <dd>{job.address}</dd>
        </div>
        <div>
          <dt>Equipment</dt>
          <dd>{job.equipmentNotes || extras.equipment.map((row) => row.name).join(', ') || 'Not listed'}</dd>
        </div>
        <div>
          <dt>Scheduled</dt>
          <dd>{formatWhen(job.scheduledAt)}</dd>
        </div>
        <div>
          <dt>Assigned technician</dt>
          <dd>{job.technicianName || 'Assigned to you'}</dd>
        </div>
      </dl>

      <div className="ds-job__progress">
        <ProgressBar
          value={stageIndex}
          max={TECH_WORKFLOW.length - 1}
          label={`Progress  ${Math.min(stageIndex, TECH_WORKFLOW.length - 1)} / ${TECH_WORKFLOW.length} stages complete`}
          tone={job.status === 'COMPLETED' ? 'success' : 'accent'}
        />
      </div>

      <WorkflowTracker steps={[...TECH_WORKFLOW]} currentIndex={stageIndex} />

      {job.description && job.description !== job.title ? (
        <p className="ds-job__notes">{job.description}</p>
      ) : null}

      <div className="ds-job__cta">
        {canAdvance && advanceLabel ? (
          <button
            type="button"
            className={`btn-primary ds-btn-block ${stageBtn}`}
            disabled={busy}
            onClick={() => {
              if (next === 'COMPLETED' && doneCount < checks.length && !overrideReason.trim()) {
                setOpenPanel('checklist');
                return;
              }
              onAdvance();
            }}
          >
            {busy ? 'Updating…' : advanceLabel}
          </button>
        ) : null}
        <div className="tech-job-tools">
          <a className="btn-secondary" href={mapsUrl(job.address)} target="_blank" rel="noreferrer">
            Navigate
          </a>
          {phone ? (
            <>
              <a className="btn-secondary" href={`tel:${phone}`}>
                Call
              </a>
              <a className="btn-secondary" href={whatsappUrl(phone)} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </>
          ) : null}
        </div>
        {primary.kind === 'done' && <p className="ds-job__done">This job is complete.</p>}
      </div>

      {next === 'COMPLETED' && (
        <label className="ds-field">
          <span>Override reason if tests are incomplete</span>
          <input
            className="input"
            value={overrideReason}
            onChange={(e) => onOverrideReason(e.target.value)}
            placeholder="Required only if the checklist is not finished"
          />
        </label>
      )}

      <div className="ds-job__actions">
        <button
          type="button"
          className={`btn-secondary tech-opt tech-opt--${checkTone}`}
          onClick={() => togglePanel('checklist')}
        >
          Checklist · {doneCount}/{checks.length}
        </button>
        <button
          type="button"
          className={`btn-secondary tech-opt tech-opt--${equipTone}`}
          onClick={() => togglePanel('equipment')}
        >
          Equipment · {equipDone}/{extras.equipment.length || 0}
        </button>
        <button
          type="button"
          className={`btn-secondary tech-opt tech-opt--${photoTone}`}
          onClick={() => togglePanel('photos')}
        >
          Photos · {extras.photos.length}/{PHOTO_KINDS.length}
        </button>
        <button type="button" className="btn-secondary tech-opt tech-opt--idle" onClick={() => togglePanel('customer')}>
          Customer
        </button>
        <button
          type="button"
          className={`btn-secondary tech-opt tech-opt--${controlTone}`}
          onClick={() => togglePanel('control')}
        >
          Control room
        </button>
      </div>

      {openPanel === 'checklist' && (
        <section className="ds-panel" aria-label="Installation checklist">
          <div className="ds-panel__head">
            <h3>Installation checklist</h3>
            <span className="text-muted">
              {doneCount} / {checks.length} completed
            </span>
          </div>
          <ProgressBar value={doneCount} max={checks.length} tone={doneCount === checks.length ? 'success' : 'accent'} />
          <ul className="ds-check">
            {checks.map((item) => (
              <li key={item.id}>
                  <button
                    type="button"
                    className={`ds-check__row ${item.done ? 'ds-check__row--done' : 'ds-check__row--todo'}`}
                    data-check={item.id}
                    onClick={() => onToggleCheck(item)}
                  >
                  <span className="ds-check__mark" aria-hidden>
                    {item.done ? '✓' : '○'}
                  </span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {openPanel === 'equipment' && (
        <section className="ds-panel" aria-label="Equipment">
          <div className="ds-panel__head">
            <h3>Equipment</h3>
            {equipNote ? <span className="tech-note--ok">{equipNote}</span> : null}
          </div>
          <div className="ds-equip-grid">
            {extras.equipment.map((item) => (
              <article key={item.id} className={`ds-equip ds-equip--${item.status}`}>
                <div className="ds-equip__top">
                  <div>
                    <strong>{item.name}</strong>
                    <p className="text-muted">{item.model}</p>
                  </div>
                  <StatusBadge
                    status={item.status}
                    label={item.status === 'installed' ? 'Installed' : item.status === 'defective' ? 'Defective' : 'Pending'}
                  />
                </div>
                <label className="ds-field">
                  <span>Serial</span>
                  <input
                    className="input"
                    value={item.serial}
                    onChange={(e) => patchEquipment(item.id, { serial: e.target.value })}
                    onBlur={() => {
                      if (item.serial.trim() && isPrimarySerial(item)) onSaveSerial(item.serial.trim());
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        markInstalled(item);
                      }
                    }}
                    placeholder="Scan or enter serial"
                  />
                </label>
                <div className="ds-equip__actions">
                  <button
                    type="button"
                    className={`btn-sm ${item.serial ? 'ds-equip-btn--ok' : ''}`}
                    aria-label="Scan QR"
                    onClick={() => startScan(item)}
                  >
                    Scan
                  </button>
                  <button
                    type="button"
                    className={`btn-sm ${item.status === 'installed' ? 'ds-equip-btn--installed' : ''}`}
                    aria-label={item.status === 'installed' ? 'Installed' : 'Mark installed'}
                    aria-pressed={item.status === 'installed'}
                    onClick={() => markInstalled(item)}
                  >
                    {item.status === 'installed' ? 'Installed' : 'Install'}
                  </button>
                  <button
                    type="button"
                    className={`btn-sm ${item.status === 'defective' ? 'ds-equip-btn--bad' : ''}`}
                    aria-label="Mark defective"
                    aria-pressed={item.status === 'defective'}
                    onClick={() => markDefective(item)}
                  >
                    Defective
                  </button>
                </div>
              </article>
            ))}
          </div>
          <input
            ref={scanInput}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              void onScanFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </section>
      )}

      {openPanel === 'photos' && (
        <section className="ds-panel" aria-label="Site photos">
          <div className="ds-panel__head">
            <h3>Site photos</h3>
          </div>
          <div className="ds-photos">
            {PHOTO_KINDS.map((kind) => {
              const photo = extras.photos.find((p) => p.kind === kind.id);
              return (
                <figure key={kind.id} className="ds-photo">
                  <figcaption>{kind.label}</figcaption>
                  {photo ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={`${kind.label} photo`} />
                      <span className="ds-photo__meta">
                        {new Date(photo.takenAt).toLocaleString('en-ZA', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <div className="ds-equip__actions">
                        <button
                          type="button"
                          className="btn-sm"
                          onClick={() => {
                            setPhotoKind(kind.id);
                            photoInput.current?.click();
                          }}
                        >
                          Retake
                        </button>
                        <button type="button" className="btn-sm" onClick={() => removePhoto(photo.id)}>
                          Delete
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="ds-photo__add"
                      onClick={() => {
                        setPhotoKind(kind.id);
                        photoInput.current?.click();
                      }}
                    >
                      Take / upload
                    </button>
                  )}
                </figure>
              );
            })}
          </div>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              void onPickPhoto(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </section>
      )}

      {openPanel === 'customer' && (
        <section className="ds-panel" aria-label="Customer">
          <div className="ds-panel__head">
            <h3>Customer</h3>
          </div>
          <p className="ds-job__client-name">{job.clientName}</p>
          <div className="ds-job__actions">
            {phone ? (
              <>
                <a className="btn-secondary" href={`tel:${phone}`}>
                  Call
                </a>
                <a className="btn-secondary" href={whatsappUrl(phone)} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </>
            ) : null}
            <a className="btn-secondary" href={mapsUrl(job.address)} target="_blank" rel="noreferrer">
              Open navigation
            </a>
          </div>
          <p className="text-muted">{job.address}</p>
        </section>
      )}

      {openPanel === 'control' && (
        <section className="ds-panel" aria-label="Control room">
          <div className="ds-panel__head">
            <h3>Control room</h3>
          </div>
          {extras.issue?.open && (
            <div className="ds-issue" role="status">
              <strong>Active issue</strong>
              <p>{extras.issue.title}</p>
              <div className="ds-job__actions">
                <button type="button" className="btn-secondary" onClick={() => setIssue({ ...extras.issue!, open: false })}>
                  Resolve
                </button>
                <a className="btn-primary" href="/tech/chat">
                  Escalate
                </a>
              </div>
            </div>
          )}
          <div className="ds-job__actions">
            <a className="btn-secondary" href={`tel:${CONTROL_ROOM_LINE.phone}`}>
              Call control room
            </a>
            <a className="btn-secondary" href="/tech/chat">
              Chat control room
            </a>
          </div>
          <label className="ds-field">
            <span>Report issue</span>
            <input
              className="input"
              value={issueDraft}
              onChange={(e) => setIssueDraft(e.target.value)}
              placeholder="e.g. Camera 04 not responding"
            />
          </label>
          <button
            type="button"
            className="btn-secondary"
            disabled={!issueDraft.trim()}
            onClick={() => {
              setIssue({ title: issueDraft.trim(), open: true });
              setIssueDraft('');
            }}
          >
            Report issue
          </button>
        </section>
      )}
    </article>
  );
}

export function InstallJobsEmpty() {
  return (
    <EmptyState
      title="No active installation jobs"
      body="You're all caught up. Completed work stays on the board when it is assigned."
    />
  );
}
