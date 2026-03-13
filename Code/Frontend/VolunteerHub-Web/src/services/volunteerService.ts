import { fetchApi } from '@/lib/apiClient';
<<<<<<< HEAD
import type { Application } from './opportunityService';
=======
>>>>>>> ea71196db2b2d45c0d03ad964ec61df1b885cd0b

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface VolunteerProfile {
  userId: string;
  name: string;
  email: string;
  phoneNumber: string;
  bio: string;
  totalHours: number;
  currentLocation: Location;
  skillIds: string[];
}

export const volunteerService = {
<<<<<<< HEAD
  getProfile: (id: string) =>
    fetchApi<VolunteerProfile>(`/volunteer/${id}`),

  updateProfile: (id: string, profile: VolunteerProfile) =>
    fetchApi<void>(`/volunteer/${id}`, {
      method: 'POST',
      body: JSON.stringify(profile),
    }),

  apply: (volunteerId: string, opportunityId: string) =>
    fetchApi<Application>(`/volunteer/${volunteerId}/apply/${opportunityId}`, {
      method: 'POST',
    }),

  getApplications: (volunteerId: string) =>
    fetchApi<Application[]>(`/volunteer/${volunteerId}/applications`),
=======
  getProfile: async (id: string) =>
    await fetchApi<VolunteerProfile>(`/api/Volunteer/${id}`),

  updateProfile: async (id: string, profile: VolunteerProfile) =>
    await fetchApi<void>(`/api/Volunteer/${id}`, { method: "POST", body: JSON.stringify(profile) }),

  isMemberOf: async (id: string, organizationId: string) => {
    const res = await fetchApi<{ isMember: boolean }>(`/api/Volunteer/${id}/organizations/${organizationId}/is-member`);
    return res.isMember;
  },

  applyToOrganization: async (id: string, organizationId: string) =>
    await fetchApi<void>(`/api/Volunteer/${id}/organizations/${organizationId}/apply`, { method: "POST" }),
>>>>>>> ea71196db2b2d45c0d03ad964ec61df1b885cd0b
};
