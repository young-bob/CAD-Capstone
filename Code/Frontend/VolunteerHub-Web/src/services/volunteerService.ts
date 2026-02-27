import { fetchApi } from '@/lib/apiClient';
import type { Application } from './opportunityService';

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
};
