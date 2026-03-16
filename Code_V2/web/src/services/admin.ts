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
    getAllOrganizations: async (): Promise<OrganizationSummary[]> => {
        const [pending, approved] = await Promise.all([
            api.get<OrganizationSummary[]>('/api/organizations/pending'),
            api.get<OrganizationSummary[]>('/api/organizations/approved'),
        ]);
        return [...(pending.data || []), ...(approved.data || [])];
    },
    resetPassword: async (userId: string, newPassword: string): Promise<void> => {
        await api.post(`/api/admin/users/${userId}/reset-password`, { newPassword });
    },
    reassignCoordinator: async (orgId: string, coordinatorUserId: string): Promise<void> => {
        await api.post(`/api/admin/organizations/${orgId}/reassign-coordinator`, { coordinatorUserId });
    },
    deleteUser: async (userId: string, confirmEmail: string): Promise<void> => {
        await api.delete(`/api/admin/users/${userId}`, { data: { confirmEmail } });
    },
    changeRole: async (userId: string, newRole: string): Promise<void> => {
        await api.post(`/api/admin/users/${userId}/change-role`, { newRole });
    },
    addCoordinatorToOrg: async (orgId: string, coordinatorUserId: string): Promise<void> => {
        await api.post(`/api/admin/organizations/${orgId}/add-coordinator`, { coordinatorUserId });
    },
    removeCoordinatorFromOrg: async (orgId: string, coordinatorUserId: string): Promise<void> => {
        await api.post(`/api/admin/organizations/${orgId}/remove-coordinator`, { coordinatorUserId });
    },
};
