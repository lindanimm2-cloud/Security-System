import { adminApi, type ApiResponse } from '@/lib/api-client';
import type { OpsAuditCategory, OpsAuditEntry, VmsTree } from './types';

export const VMS_ALARM_POLL_EVENT = 'vms:alarm-poll';

export function fetchVmsTree() {
  return adminApi.get<ApiResponse<VmsTree>>('/control-room/vms/tree');
}

/** Best-effort operator audit; never blocks the UI. */
export function logOpsAudit(category: OpsAuditCategory, action: string, target: string, detail = '') {
  return adminApi
    .post<ApiResponse<OpsAuditEntry>>('/control-room/ops-audit', { category, action, target, detail })
    .catch(() => null);
}

export function downloadBlob(filename: string, content: string, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
