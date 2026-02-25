import { apiClient } from '@/lib/apiClient';
import type { Location } from './volunteerService';

export type OpportunityVisibility = 'Public' | 'Internal';

export interface OpportunityDetails {
  opportunityId: string;
  organizationId: string;
  title: string;
  description: string;
  visibility: OpportunityVisibility;
  startTime: string;
  endTime: string;
  venueLocation: Location;
  geoFenceRadius: number;
  maxVolunteers: number;
  registeredCount: number;
}

export const opportunityService = {
  getAll: () =>
    apiClient.get<OpportunityDetails[]>('/api/opportunity'),

  getById: (id: string) =>
    apiClient.get<OpportunityDetails>(`/api/opportunity/${id}`),
};
