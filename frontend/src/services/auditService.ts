import api from '../axios';

export interface AuditLog {
  timestamp: string;
  userEmail: string;
  action: string;
  resource: string;
  details?: any;
}

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  const response = await api.get('/audit');
  return response.data;
};
