import api from './api';
import type { OrgState, OpportunitySummary, ApplicationSummary, OrgRole } from '../types';

export const organizationService = {
    create: async (data: { name: string; description: string; creatorUserId: string; creatorEmail: string; proofUrl?: string }): Promise<{ orgId: string }> => {
        const res = await api.post('/api/organizations', data);
        return res.data;
    },
    uploadProof: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'organizations');
        const uploadRes = await api.post<{ fileKey: string }>('/api/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const { fileKey } = uploadRes.data;
        const urlRes = await api.get<{ url: string }>(`/api/files/url/${fileKey}`);
        return urlRes.data.url;
    },
    getById: async (id: string): Promise<OrgState> => {
        const res = await api.get<OrgState>(`/api/organizations/${id}`);
        return res.data;
    },
    createOpportunity: async (orgId: string, data: { title: string; description: string; category: string }): Promise<{ opportunityId: string }> => {
        const res = await api.post(`/api/organizations/${orgId}/opportunities`, data);
        return res.data;
    },
    inviteMember: async (orgId: string, data: { email: string; role: OrgRole }): Promise<void> => {
        await api.post(`/api/organizations/${orgId}/members`, data);
    },
    blockVolunteer: async (orgId: string, volunteerId: string): Promise<void> => {
        await api.post(`/api/organizations/${orgId}/block/${volunteerId}`);
    },
    unblockVolunteer: async (orgId: string, volunteerId: string): Promise<void> => {
        await api.delete(`/api/organizations/${orgId}/block/${volunteerId}`);
    },
    getOpportunities: async (orgId: string): Promise<OpportunitySummary[]> => {
        const res = await api.get<OpportunitySummary[]>(`/api/organizations/${orgId}/opportunities`);
        return res.data;
    },
    getApplications: async (orgId: string): Promise<ApplicationSummary[]> => {
        const res = await api.get<ApplicationSummary[]>(`/api/organizations/${orgId}/applications`);
        return res.data;
    },
    updateInfo: async (orgId: string, data: { name: string; description: string }): Promise<void> => {
        await api.put(`/api/organizations/${orgId}`, data);
    },
    resubmit: async (orgId: string, data: { name: string; description: string; proofUrl?: string }): Promise<void> => {
        await api.post(`/api/organizations/${orgId}/resubmit`, data);
    },
};
