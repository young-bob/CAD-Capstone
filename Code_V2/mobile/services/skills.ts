import api from './api';

export interface Skill {
    id: string;
    name: string;
    category: string;
    description?: string;
}

export const skillService = {
    /** List all system skills */
    getAll: (): Promise<Skill[]> =>
        api.get<Skill[]>('/skills').then(r => r.data),

    /** Create a new skill (SystemAdmin only) */
    createSkill: (data: { name: string; category: string; description: string }): Promise<Skill> =>
        api.post<Skill>('/skills', data).then(r => r.data),

    /** Delete a skill (SystemAdmin only) */
    deleteSkill: (id: string): Promise<void> =>
        api.delete(`/skills/${id}`).then(() => { }),

    /** Get skills of a specific volunteer (by their UserEntity.Id) */
    getVolunteerSkills: (userId: string): Promise<Skill[]> =>
        api.get<Skill[]>(`/volunteers/${userId}/skills`).then(r => r.data),

    /** Add a skill to a volunteer */
    addSkill: (userId: string, skillId: string): Promise<void> =>
        api.post(`/volunteers/${userId}/skills/${skillId}`).then(() => { }),

    /** Remove a skill from a volunteer */
    removeSkill: (userId: string, skillId: string): Promise<void> =>
        api.delete(`/volunteers/${userId}/skills/${skillId}`).then(() => { }),

    /** Get matched opportunities for a volunteer based on their skills */
    matchOpportunities: (volunteerId: string): Promise<unknown> =>
        api.get(`/opportunities/match?volunteerId=${volunteerId}`).then(r => r.data),

    /** Set required skills on an opportunity (Coordinator/SystemAdmin) */
    setRequiredSkills: (opportunityId: string, skillIds: string[]): Promise<void> =>
        api.put(`/opportunities/${opportunityId}/required-skills`, { skillIds }).then(() => { }),
};
