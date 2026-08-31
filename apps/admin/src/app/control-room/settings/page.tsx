'use client';

import { useMemo, useState, useEffect } from 'react';
import { ControlRoomLayout } from '@/components/control-room/ControlRoomLayout';
import { RoleProfileDialog, type RoleGuideRow } from '@/components/control-room/RoleProfileDialog';
import { SettingsCategoryPanels } from '@/components/control-room/SettingsCategoryPanels';
import { pushPriorityAlert } from '@/components/control-room/PriorityAlertProvider';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { PriorityAlert } from '@/lib/alert-priority';
import { adminApi } from '@/lib/api-client';
import { getSession } from '@/lib/auth';
import { useTheme } from '@/components/ThemeProvider';
import {
  THEME_PREFERENCE_HINTS,
  THEME_PREFERENCE_LABELS,
  getScheduleHours,
  setScheduleHours,
  type ThemePreference,
} from '@/lib/theme';

const PREVIEW_ALERTS: {
  label: string;
  alert: PriorityAlert;
  priority: string;
  recipients: string;
  channel: string;
  escalation: string;
  fallback: string;
  ack: string;
}[] = [
  {
    label: 'Panic',
    priority: 'Critical',
    recipients: 'Control room, supervisor, nearest officers',
    channel: 'Floating alert · SMS · radio',
    escalation: '30s / 60s / 120s',
    fallback: 'Backup control room',
    ack: 'Required',
    alert: {
      id: 'preview-panic',
      tier: 'critical',
      kind: 'panic',
      category: 'PANIC',
      title: '4DS-2050-SJ-00142',
      subtitle: 'Panic alert · Morningside, Durban · ACTIVE',
      link: '/control-room/map',
      createdAt: new Date().toISOString(),
    },
  },
  {
    label: 'Silent panic',
    priority: 'Critical',
    recipients: 'Control room, supervisor',
    channel: 'Discreet toast · no siren',
    escalation: '30s then supervisor',
    fallback: 'GPS trace + manager',
    ack: 'Required',
    alert: {
      id: 'preview-silent',
      tier: 'critical',
      kind: 'silent',
      category: 'SILENT_PANIC',
      title: '4DS-2050-JJ-00088',
      subtitle: 'Silent panic · Berea, Durban · Discreet activation',
      link: '/control-room/map',
      createdAt: new Date().toISOString(),
    },
  },
  {
    label: 'Medical',
    priority: 'High',
    recipients: 'Control room, medical crew',
    channel: 'Dispatch + ambulance workflow',
    escalation: 'Immediate medical desk',
    fallback: 'Public EMS',
    ack: 'Required',
    alert: {
      id: 'preview-medical',
      tier: 'high',
      kind: 'medical',
      category: 'MEDICAL',
      title: 'Medical emergency',
      subtitle: 'Ambulance requested · Westville, Durban',
      link: '/control-room/dispatch',
      createdAt: new Date().toISOString(),
    },
  },
  {
    label: 'Alarm',
    priority: 'High',
    recipients: 'Control room, assigned officer',
    channel: 'Ops board + notification bell',
    escalation: '60s if unacked',
    fallback: 'Supervisor',
    ack: 'Required',
    alert: {
      id: 'preview-alarm',
      tier: 'high',
      kind: 'alarm',
      category: 'ALARM',
      title: 'Intrusion alarm',
      subtitle: 'Zone 3 · Florida Rd retail',
      link: '/control-room/incidents',
      createdAt: new Date().toISOString(),
    },
  },
  {
    label: 'CCTV offline',
    priority: 'Warning',
    recipients: 'Control room, technician',
    channel: 'Notification centre',
    escalation: '10 min then technician',
    fallback: 'Install desk',
    ack: 'Recommended',
    alert: {
      id: 'preview-cctv',
      tier: 'high',
      kind: 'high',
      category: 'SYSTEM',
      title: 'CCTV offline',
      subtitle: 'Camera 04 not responding · Berea residence',
      link: '/control-room/surveillance',
      createdAt: new Date().toISOString(),
    },
  },
  {
    label: 'Technician issue',
    priority: 'Warning',
    recipients: 'Control room, install supervisor',
    channel: 'Chat + notification',
    escalation: '15 min',
    fallback: 'Operations manager',
    ack: 'Required',
    alert: {
      id: 'preview-tech',
      tier: 'high',
      kind: 'high',
      category: 'SYSTEM',
      title: 'Technician issue',
      subtitle: 'Site access blocked · Westville',
      link: '/control-room/installs',
      createdAt: new Date().toISOString(),
    },
  },
  {
    label: 'Billing',
    priority: 'Routine',
    recipients: 'Finance, account owner',
    channel: 'Notification bell only',
    escalation: 'None',
    fallback: 'Accounts',
    ack: 'Not required',
    alert: {
      id: 'preview-low',
      tier: 'normal',
      kind: 'high',
      category: 'BILLING',
      title: 'Subscription renewed',
      subtitle: 'Nomsa Client · Premium Protect · notification-bell preview',
      link: '/control-room/customers',
      createdAt: new Date().toISOString(),
    },
  },
];

const ROLE_GUIDE: RoleGuideRow[] = [
  { role: 'Owner', portal: 'Control Panel', access: 'Full Access', users: 1, status: 'Operational', count: 64, tone: 'owner', tags: ['Platform', 'Billing', 'Users', 'Security'] },
  { role: 'Developer', portal: 'Control Panel', access: 'Technical', users: 2, status: 'Scoped', count: 31, tone: 'developer', tags: ['Ops', 'Logs', 'Support', 'Deployments'] },
  { role: 'Manager', portal: 'Control Panel', access: 'Operations', users: 4, status: 'Operational', count: 38, tone: 'manager', tags: ['Operations', 'Sales', 'Customers', 'Fleet'] },
  { role: 'Supervisor', portal: 'Control Panel', access: 'Dispatch', users: 8, status: 'Operational', count: 26, tone: 'supervisor', tags: ['Dispatch', 'Map', 'Incidents', 'Escalation'] },
  { role: 'Sales', portal: 'Control Panel', access: 'Sales', users: 5, status: 'Operational', count: 18, tone: 'sales', tags: ['Leads', 'CRM', 'Quotes', 'Store'] },
  { role: 'Client', portal: 'Client Portal', access: 'Protected User', users: 42, status: 'Operational', count: 12, tone: 'client', tags: ['Panic', 'Tracking', 'Family', 'Subscription'] },
  { role: 'Officer', portal: 'Officer App', access: 'Field', users: 24, status: 'Operational', count: 22, tone: 'officer', tags: ['Assignments', 'Navigation', 'Reports', 'Check-ins'] },
  { role: 'Technician', portal: 'Technician App', access: 'Installation', users: 7, status: 'Operational', count: 20, tone: 'technician', tags: ['Installs', 'CCTV', 'Alarms', 'Access Control'] },
];

const SETTINGS_NAV = [
  { id: 'general', label: 'General', keywords: ['general', 'overview', 'organisation', 'settings'] },
  { id: 'appearance', label: 'Appearance', keywords: ['theme', 'appearance', 'dark', 'light'] },
  { id: 'roles', label: 'Users & Roles', keywords: ['roles', 'users', 'rbac', 'access'] },
  { id: 'permissions', label: 'Permissions', keywords: ['permissions', 'matrix', 'access'] },
  { id: 'notifications', label: 'Notifications', keywords: ['notifications', 'bell', 'routine'] },
  { id: 'alerts', label: 'Alerts & Escalation', keywords: ['panic', 'medical', 'silent', 'escalation', 'alerts'] },
  { id: 'lens', label: 'Critical Quick Actions Lens', keywords: ['lens', 'eye', 'critical', 'quick actions', 'peek'] },
  { id: 'organisation', label: 'Organisation', keywords: ['organisation', 'tenant', 'company'] },
  { id: 'branches', label: 'Branches', keywords: ['branches', 'zones', 'sites'] },
  { id: 'security', label: 'Security', keywords: ['security', 'sessions', 'mfa', 'audit'] },
  { id: 'billing', label: 'Billing', keywords: ['billing', 'revenue', 'developer'] },
  { id: 'integrations', label: 'Integrations', keywords: ['integrations', 'api', 'webhooks'] },
  { id: 'audit', label: 'Audit Logs', keywords: ['audit', 'activity', 'history'] },
] as const;

const THEME_OPTIONS: ThemePreference[] = ['light', 'dark', 'system', 'schedule'];

const PERMISSION_MATRIX = [
  { module: 'Dashboard', owner: 'Yes', manager: 'Yes', supervisor: 'Yes', officer: 'Yes', technician: 'Yes' },
  { module: 'Customers', owner: 'Yes', manager: 'Yes', supervisor: 'View', officer: 'No', technician: 'No' },
  { module: 'Fleet', owner: 'Yes', manager: 'Yes', supervisor: 'Yes', officer: 'View', technician: 'View' },
  { module: 'CCTV', owner: 'Yes', manager: 'Yes', supervisor: 'Yes', officer: 'Scoped', technician: 'Yes' },
  { module: 'Panic', owner: 'Yes', manager: 'Yes', supervisor: 'Yes', officer: 'Yes', technician: 'No' },
  { module: 'Dispatch', owner: 'Yes', manager: 'Yes', supervisor: 'Yes', officer: 'Yes', technician: 'No' },
  { module: 'Installations', owner: 'Yes', manager: 'Yes', supervisor: 'View', officer: 'No', technician: 'Yes' },
  { module: 'Billing', owner: 'Yes', manager: 'Yes', supervisor: 'No', officer: 'No', technician: 'No' },
  { module: 'Users', owner: 'Yes', manager: 'Yes', supervisor: 'No', officer: 'No', technician: 'No' },
  { module: 'System Settings', owner: 'Yes', manager: 'No', supervisor: 'No', officer: 'No', technician: 'No' },
];

export default function ControlRoomSettingsPage() {
  const session = getSession('admin');
  const { theme, preference, setPreference } = useTheme();
  const canGrantRevenue =
    session?.user.role === 'OWNER' || session?.user.role === 'SUPER_ADMIN';
  const [revenueBusy, setRevenueBusy] = useState(false);
  const [revenueMsg, setRevenueMsg] = useState('');
  const [revenueErr, setRevenueErr] = useState('');
  const [previewNote, setPreviewNote] = useState('');
  const [activeSection, setActiveSection] = useState<(typeof SETTINGS_NAV)[number]['id']>('appearance');
  const [search, setSearch] = useState('');
  const [roles, setRoles] = useState(ROLE_GUIDE);
  const [selectedRole, setSelectedRole] = useState<RoleGuideRow | null>(null);
  const [scheduleLight, setScheduleLight] = useState('06:00');
  const [scheduleDark, setScheduleDark] = useState('18:00');

  useEffect(() => {
    const hours = getScheduleHours();
    setScheduleLight(hours.lightFrom);
    setScheduleDark(hours.darkFrom);
  }, []);

  function updateScheduleHours(nextLight: string, nextDark: string) {
    setScheduleLight(nextLight);
    setScheduleDark(nextDark);
    setScheduleHours(nextLight, nextDark);
  }

  async function setDeveloperRevenue(enabled: boolean) {
    setRevenueBusy(true);
    setRevenueErr('');
    setRevenueMsg('');
    try {
      const res = await adminApi.patch<{
        success: boolean;
        data: { message: string };
      }>('/developer/revenue-access', { enabled });
      setRevenueMsg(res.data.message);
    } catch (err) {
      setRevenueErr(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setRevenueBusy(false);
    }
  }

  function goToUserRoles() {
    window.location.assign('/control-room/teams');
  }

  const navItems = SETTINGS_NAV.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      item.label.toLowerCase().includes(q) ||
      item.keywords.some((keyword) => keyword.includes(q))
    );
  });

  const totalUsers = roles.reduce((sum, row) => sum + row.users, 0);
  const activeAlerts = PREVIEW_ALERTS.filter((item) => item.alert.tier !== 'normal').length;
  const sectionsUsingAccess = new Set(['roles', 'permissions']);
  const selectedModules = useMemo(() => {
    if (!selectedRole) return [];
    const key = selectedRole.role.toLowerCase() as 'owner' | 'manager' | 'supervisor' | 'officer' | 'technician';
    if (!['owner', 'manager', 'supervisor', 'officer', 'technician'].includes(key)) return [];
    return PERMISSION_MATRIX.map((row) => ({ module: row.module, access: row[key] }));
  }, [selectedRole]);

  return (
    <ControlRoomLayout title="Settings">
      <div className="page-content page-content--settings">
        <section className="settings-hero">
          <div>
            <p className="ec-kicker">4DS Control Room</p>
            <h1>Settings &amp; Configuration</h1>
            <p className="text-muted">
              Control how your organisation, users, alerts, permissions and security systems operate.
            </p>
          </div>
          <div className="settings-status-grid">
            <div className="settings-status-card">
              <span className="settings-status-card__label">System</span>
              <strong>Operational</strong>
            </div>
            <div className="settings-status-card">
              <span className="settings-status-card__label">Users</span>
              <strong>{totalUsers}</strong>
            </div>
            <div className="settings-status-card">
              <span className="settings-status-card__label">Roles</span>
              <strong>{roles.length}</strong>
            </div>
            <div className="settings-status-card">
              <span className="settings-status-card__label">Active alerts</span>
              <strong>{activeAlerts}</strong>
            </div>
          </div>
        </section>

        <section className="settings-workspace">
          <aside className="settings-nav-card">
            <div className="settings-nav-card__head">
              <h2>Settings</h2>
              <p className="text-muted">Modules, access and escalations</p>
            </div>
            <label className="settings-search">
              <span>Search settings</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Users, permissions, billing, security..."
              />
            </label>
            <div className="settings-nav-list">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`settings-nav-item ${activeSection === item.id ? 'settings-nav-item--active' : ''}`}
                  onClick={() => setActiveSection(item.id)}
                >
                  <span className="settings-nav-item__icon" aria-hidden><SettingsSectionGlyph id={item.id} /></span>
                  <span>{item.label}</span>
                </button>
              ))}
              {navItems.length === 0 && (
                <p className="text-muted">No settings matched your search.</p>
              )}
            </div>
          </aside>

          <div className="settings-content-column">
            {activeSection === 'appearance' && (
              <section className="portal-card settings-panel">
                <div className="settings-panel__head">
                  <div>
                    <p className="settings-panel__eyebrow">Appearance</p>
                    <h2>Theme & operator display</h2>
                    <p className="text-muted">
                      Keep the platform readable for control room staff across day and night shifts.
                    </p>
                  </div>
                  <span className="badge">Current: {theme === 'dark' ? 'Dark' : 'Light'}</span>
                </div>

                <div className="settings-theme-grid" role="radiogroup" aria-label="Theme preference">
                  {THEME_OPTIONS.map((option) => {
                    const selected = preference === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`settings-theme-tile ${selected ? 'settings-theme-tile--active' : ''}`}
                        onClick={() => setPreference(option)}
                      >
                        <span className="settings-theme-tile__label">{THEME_PREFERENCE_LABELS[option]}</span>
                        <span className="settings-theme-tile__hint">{THEME_PREFERENCE_HINTS[option]}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="settings-inline-grid">
                  <div className="settings-inline-field">
                    <span>Automatic schedule</span>
                    <div className="settings-time-row">
                      <label>
                        <small>Light mode</small>
                        <input
                          type="time"
                          value={scheduleLight}
                          disabled={preference !== 'schedule'}
                          onChange={(e) => updateScheduleHours(e.target.value, scheduleDark)}
                        />
                      </label>
                      <label>
                        <small>Dark mode</small>
                        <input
                          type="time"
                          value={scheduleDark}
                          disabled={preference !== 'schedule'}
                          onChange={(e) => updateScheduleHours(scheduleLight, e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="settings-inline-field">
                    <span>Behaviour</span>
                    <div className="settings-mini-kpis">
                      <span className={`status-pill ${preference === 'schedule' ? 'status-pill--ok' : ''}`}>
                        {preference === 'schedule' ? 'Auto switching enabled' : 'Manual or system mode'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {(sectionsUsingAccess.has(activeSection) || activeSection === 'roles') && (
              <>
                <section className="portal-card settings-panel">
                  <div className="settings-panel__head">
                    <div>
                      <p className="settings-panel__eyebrow">Access Control</p>
                      <h2>Roles &amp; access</h2>
                      <p className="text-muted">
                        Manage who can access what across the platform. Demo organisation slug: <strong>demo</strong>.
                      </p>
                    </div>
                    <div className="settings-panel__actions">
                      <button type="button" className="btn-primary btn-sm" onClick={goToUserRoles}>
                        Manage users &amp; roles
                      </button>
                    </div>
                  </div>

                  <div className="table-wrap">
                    <table className="data-table settings-roles-table">
                      <thead>
                        <tr>
                          <th>Role</th>
                          <th>Users</th>
                          <th>Portal</th>
                          <th>Access level</th>
                          <th>Permissions</th>
                          <th>Status</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {roles.map((row) => (
                          <tr key={row.role}>
                            <td>
                              <div className="settings-role-cell">
                                <span className={`settings-role-pill settings-role-pill--${row.tone}`}>{row.role}</span>
                                <div className="settings-role-tags">
                                  {row.tags.map((tag) => (
                                    <span key={tag} className="badge">{tag}</span>
                                  ))}
                                </div>
                              </div>
                            </td>
                            <td>{row.users}</td>
                            <td>{row.portal}</td>
                            <td>{row.access}</td>
                            <td>{row.count} permissions</td>
                            <td><span className="status-pill status-pill--ok">{row.status}</span></td>
                            <td>
                              <button
                                type="button"
                                className="link-sm settings-view-link"
                                onClick={() => setSelectedRole(row)}
                              >
                                View <span aria-hidden="true">→</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="portal-card settings-panel">
                  <div className="settings-panel__head">
                    <div>
                      <p className="settings-panel__eyebrow">Permission Matrix</p>
                      <h2>Tool access by role</h2>
                      <p className="text-muted">
                        Quick view of which roles can use core tools.
                      </p>
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table className="data-table settings-matrix-table">
                      <thead>
                        <tr>
                          <th>Tool</th>
                          <th>Owner</th>
                          <th>Manager</th>
                          <th>Supervisor</th>
                          <th>Officer</th>
                          <th>Technician</th>
                        </tr>
                      </thead>
                      <tbody>
                        {PERMISSION_MATRIX.map((row) => (
                          <tr key={row.module}>
                            <td>{row.module}</td>
                            <td>{row.owner}</td>
                            <td>{row.manager}</td>
                            <td>{row.supervisor}</td>
                            <td>{row.officer}</td>
                            <td>{row.technician}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {activeSection === 'alerts' && (
              <>
                <section className="portal-card settings-panel">
                  <div className="settings-panel__head">
                    <div>
                      <p className="settings-panel__eyebrow">Alert &amp; Escalation Centre</p>
                      <h2>Critical event routing</h2>
                      <p className="text-muted">
                        Configure how incidents surface to control room staff, field supervisors and backup channels.
                      </p>
                    </div>
                  </div>
                  <div className="settings-alert-grid">
                    {PREVIEW_ALERTS.map((item) => (
                      <article key={item.label} className="settings-alert-card">
                        <div className="settings-alert-card__top">
                          <strong>{item.label}</strong>
                          <StatusBadge
                            status={item.priority}
                            tone={
                              item.alert.tier === 'critical'
                                ? 'danger'
                                : item.alert.tier === 'high'
                                  ? 'warning'
                                  : 'neutral'
                            }
                          />
                        </div>
                        <dl className="settings-kv">
                          <div>
                            <dt>Who</dt>
                            <dd>{item.recipients}</dd>
                          </div>
                          <div>
                            <dt>How</dt>
                            <dd>{item.channel}</dd>
                          </div>
                          <div>
                            <dt>Escalation</dt>
                            <dd>{item.escalation}</dd>
                          </div>
                          <div>
                            <dt>Fallback</dt>
                            <dd>{item.fallback}</dd>
                          </div>
                          <div>
                            <dt>Ack</dt>
                            <dd>{item.ack}</dd>
                          </div>
                        </dl>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => {
                            const testedAt = new Date().toISOString();
                            pushPriorityAlert({
                              ...item.alert,
                              id: `${item.alert.id}-${Date.now()}`,
                              createdAt: testedAt,
                              force: true,
                            });
                            setPreviewNote(
                              item.alert.tier === 'critical'
                                ? `Tested ${item.label} — critical alert bar should appear.`
                                : item.alert.tier === 'normal'
                                  ? `Tested ${item.label} — routine toast shown (notification-bell style preview).`
                                  : `Tested ${item.label} — toast should appear near the top of the desk.`,
                            );
                          }}
                        >
                          Test alert
                        </button>
                      </article>
                    ))}
                  </div>
                  {previewNote && (
                    <p className="text-muted settings-inline-note" role="status">
                      {previewNote}
                    </p>
                  )}
                </section>

                <section className="portal-card settings-panel">
                  <div className="settings-panel__head">
                    <div>
                      <p className="settings-panel__eyebrow">Escalation Rules</p>
                      <h2>Panic escalation timeline</h2>
                    </div>
                  </div>
                  <div className="settings-escalation-grid">
                    <div className="settings-escalation-card">
                      <strong>Panic alert</strong>
                      <dl className="settings-kv">
                        <div>
                          <dt>0–30 sec</dt>
                          <dd>Control room</dd>
                        </div>
                        <div>
                          <dt>30–60 sec</dt>
                          <dd>Supervisor</dd>
                        </div>
                        <div>
                          <dt>60–120 sec</dt>
                          <dd>Manager</dd>
                        </div>
                        <div>
                          <dt>120+ sec</dt>
                          <dd>Emergency escalation</dd>
                        </div>
                      </dl>
                    </div>
                    <div className="settings-escalation-card">
                      <strong>If alert is not acknowledged</strong>
                      <dl className="settings-kv">
                        <div>
                          <dt>Escalate automatically</dt>
                          <dd>Enabled</dd>
                        </div>
                        <div>
                          <dt>Notify supervisor</dt>
                          <dd>Enabled</dd>
                        </div>
                        <div>
                          <dt>Notify backup control room</dt>
                          <dd>Enabled</dd>
                        </div>
                        <div>
                          <dt>Start incident recording</dt>
                          <dd>Enabled</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </section>
              </>
            )}

            <SettingsCategoryPanels
              section={activeSection}
              canGrantRevenue={canGrantRevenue}
              revenueBusy={revenueBusy}
              revenueErr={revenueErr}
              revenueMsg={revenueMsg}
              onRevenue={(enabled) => void setDeveloperRevenue(enabled)}
            />
          </div>
        </section>
      </div>
      {selectedRole ? (
        <RoleProfileDialog
          key={selectedRole.role}
          row={selectedRole}
          modules={selectedModules}
          onClose={() => setSelectedRole(null)}
          onSaveRole={(next) => {
            setRoles((current) => current.map((row) => (row.role === next.role ? next : row)));
            setSelectedRole(next);
          }}
        />
      ) : null}
    </ControlRoomLayout>
  );
}

function SettingsSectionGlyph({
  id,
}: {
  id: (typeof SETTINGS_NAV)[number]['id'];
}) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {id === 'general' && (
        <>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2.8v2.4M12 18.8v2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.9 19.1l1.7-1.7M17.4 6.6l1.7-1.7" />
        </>
      )}
      {id === 'appearance' && (
        <>
          <path d="M12 3c-5 0-9 4-9 8.9 0 4.2 3.2 7.1 7.2 7.1h2.4c1.2 0 2.2-1 2.2-2.2 0-.7-.4-1.3-.9-1.7-.5-.3-.8-.9-.8-1.5 0-1.1.9-2 2-2h1.9c2.2 0 4-1.8 4-4 0-5-4-8.6-9-8.6Z" />
          <circle cx="7.6" cy="11" r="1" />
          <circle cx="11.2" cy="8.2" r="1" />
          <circle cx="15.6" cy="9.6" r="1" />
        </>
      )}
      {id === 'roles' && (
        <>
          <path d="M16 21v-1.2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V21" />
          <circle cx="9.5" cy="7.5" r="3.5" />
          <path d="M22 21v-1.2a4 4 0 0 0-3-3.8" />
          <path d="M16.5 4.3a3.3 3.3 0 0 1 0 6.4" />
        </>
      )}
      {id === 'permissions' && (
        <>
          <rect x="4" y="10" width="16" height="10" rx="2.5" />
          <path d="M8 10V7a4 4 0 1 1 8 0v3" />
          <circle cx="12" cy="15" r="1" />
        </>
      )}
      {id === 'notifications' && (
        <>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8.5-3 8.5h18S18 15 18 8" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </>
      )}
      {id === 'alerts' && (
        <>
          <path d="M12 3 2.8 19h18.4L12 3Z" />
          <path d="M12 9v4" />
          <path d="M12 16h.01" />
        </>
      )}
      {id === 'lens' && (
        <>
          <path d="M2.5 12s3.8-6.5 9.5-6.5S21.5 12 21.5 12 17.7 18.5 12 18.5 2.5 12 2.5 12z" />
          <circle cx="12" cy="12" r="3.1" />
        </>
      )}
      {id === 'organisation' && (
        <>
          <path d="M4 20V6l8-3 8 3v14" />
          <path d="M9 20v-6h6v6" />
          <path d="M8 9h.01M12 9h.01M16 9h.01" />
        </>
      )}
      {id === 'branches' && (
        <>
          <path d="M12 21s6-4.5 6-10a6 6 0 1 0-12 0c0 5.5 6 10 6 10Z" />
          <circle cx="12" cy="11" r="2.4" />
        </>
      )}
      {id === 'security' && (
        <>
          <path d="M12 3 5 6v5c0 4.6 2.8 7.9 7 10 4.2-2.1 7-5.4 7-10V6l-7-3Z" />
          <path d="m9.5 12 1.7 1.7 3.3-3.3" />
        </>
      )}
      {id === 'billing' && (
        <>
          <path d="M12 3v18" />
          <path d="M16.5 7.5H10a2.8 2.8 0 0 0 0 5.5h4a2.8 2.8 0 0 1 0 5.5H7.5" />
        </>
      )}
      {id === 'integrations' && (
        <>
          <path d="M8.5 8.5 5 12l3.5 3.5" />
          <path d="M15.5 8.5 19 12l-3.5 3.5" />
          <path d="M13.5 5 10.5 19" />
        </>
      )}
      {id === 'audit' && (
        <>
          <path d="M7 3h8l4 4v14H7z" />
          <path d="M15 3v4h4" />
          <path d="M10 12h6M10 16h6M10 8h2" />
        </>
      )}
    </svg>
  );
}
