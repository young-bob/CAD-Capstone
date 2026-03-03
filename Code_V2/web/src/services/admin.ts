import api from './api';
import type { OrganizationSummary, UserRecord } from '../types';

export const adminService = {
    approveOrg: async (orgId: string): Promise<void> => {
        await api.post(`/api/admin/organizations/${orgId}/approve`);
    },
    rejectOrg: async (orgId: string, reason: string): Promise<void> => {
        await api.post(`/api/admin/organizations/${orgId}/reject`, { reason });
    },
    banUser: async (userId: string): Promise<void> => {
        await api.post(`/api/admin/users/${userId}/ban`);
    },
    unbanUser: async (userId: string): Promise<void> => {
        await api.post(`/api/admin/users/${userId}/unban`);
    },
    resolveDispute: async (attendanceId: string, data: { resolution: string; adjustedHours: number }): Promise<void> => {
        await api.post(`/api/admin/disputes/${attendanceId}/resolve`, data);
    },
    getUsers: async (params?: { role?: string; search?: string }): Promise<UserRecord[]> => {
        const res = await api.get<UserRecord[]>('/api/admin/users', { params });
        return res.data;
    },
    getPendingOrganizations: async (): Promise<OrganizationSummary[]> => {
        const res = await api.get<OrganizationSummary[]>('/api/admin/pending-organizations');
        return res.data;
    },
};
