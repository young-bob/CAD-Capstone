import { apiClient } from '@/lib/apiClient';

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
    apiClient.get<VolunteerProfile>(`/api/volunteer/${id}`),

  updateProfile: (id: string, profile: VolunteerProfile) =>
    apiClient.post<void>(`/api/volunteer/${id}`, profile),
};
