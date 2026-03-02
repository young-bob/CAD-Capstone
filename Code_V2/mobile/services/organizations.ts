import api from './api';
import { OrgRole } from '../types/enums';
import { OpportunitySummary } from '../types/opportunity';
import { ApplicationSummary } from '../types/application';

export interface OrgState {
    name: string;
    description: string;
    status: string;
    members: { userId: string; email: string; role: OrgRole; joinedAt: string }[];
    opportunityIds: string[];
    blockedVolunteerIds: string[];
    isInitialized: boolean;
    createdAt: string;
}

export const organizationService = {
    create: async (data: { name: string; description: string; creatorUserId: string; creatorEmail: string }): Promise<{ orgId: string }> => {
        const res = await api.post('/api/organizations', data);
        return res.data;
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
};
