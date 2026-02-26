import { fetchApi } from '@/lib/apiClient';

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
};
