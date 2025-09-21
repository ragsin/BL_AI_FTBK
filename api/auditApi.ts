import { AuditLog, User } from '../types';
import { API_BASE_URL } from '../config';
import { getAuthHeaders, handleResponse } from './utils';

export const getAuditLogs = async (): Promise<AuditLog[]> => {
    const response = await fetch(`${API_BASE_URL}/audit_logs`, { headers: getAuthHeaders() });
    return handleResponse<AuditLog[]>(response);
};

export const saveAuditLogs = async (logs: AuditLog[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/audit_logs`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(logs),
    });
    await handleResponse(response);
};

// Central logging function - now it will just post the single new log
export const logAction = async (
  actor: User | null, 
  action: string, 
  entityType: string, 
  entityId: string, 
  details?: Record<string, any>
) => {
  if (!actor) {
    console.warn("Audit log attempted without an actor (user).");
    return;
  }
  const logs = await getAuditLogs();
  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    userId: actor.id,
    userName: `${actor.firstName} ${actor.lastName}`,
    action,
    entityType,
    entityId,
    details: details || {},
  };
  await saveAuditLogs([newLog, ...logs]); 
};
