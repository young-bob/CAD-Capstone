import api from './api';
import type { Skill } from '../types';

export const skillService = {
    getAll: async (): Promise<Skill[]> => {
        const res = await api.get<Skill[]>('/api/skills');
        return res.data;
    },
    createSkill: async (data: { name: string; category: string; description: string }): Promise<Skill> => {
        const res = await api.post<Skill>('/api/skills', data);
        return res.data;
    },
    updateSkill: async (id: string, data: { name: string; category: string; description: string }): Promise<void> => {
        await api.put(`/api/skills/${id}`, data);
    },
    deleteSkill: async (id: string): Promise<void> => {
        await api.delete(`/api/skills/${id}`);
    },
    bulkImport: async (skills: { name: string; category: string; description: string }[]): Promise<{ name: string; status: string; reason?: string }[]> => {
        const res = await api.post('/api/skills/bulk', skills);
        return res.data;
    },
    getVolunteerSkills: async (userId: string): Promise<Skill[]> => {
        const res = await api.get<Skill[]>(`/api/volunteers/${userId}/skills`);
        return res.data;
    },
    addSkill: async (userId: string, skillId: string): Promise<void> => {
        await api.post(`/api/volunteers/${userId}/skills/${skillId}`);
    },
    removeSkill: async (userId: string, skillId: string): Promise<void> => {
        await api.delete(`/api/volunteers/${userId}/skills/${skillId}`);
    },
    setRequiredSkills: async (opportunityId: string, skillIds: string[]): Promise<void> => {
        await api.put(`/api/opportunities/${opportunityId}/skills`, { skillIds });
    },
};

