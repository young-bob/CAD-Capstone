import { fetchApi } from '@/lib/apiClient';
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
  requiredSkillIds?: string[];
}

export interface CreateOpportunityPayload {
  organizationId: string;
  title: string;
  description: string;
  visibility: OpportunityVisibility;
  startTime: string;
  endTime: string;
  venueLocation: Location;
  geoFenceRadius: number;
  maxVolunteers: number;
  requiredSkillIds?: string[];
}

export type ApplicationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Waitlisted';

export interface Application {
  appId: string;
  volunteerId: string;
  opportunityId: string;
  submissionDate: string;
  status: ApplicationStatus;
  rejectionReason?: string;
  opportunityTitle?: string;
}

export const opportunityService = {
  getAll: () =>
    fetchApi<OpportunityDetails[]>('/opportunity'),

  getById: (id: string) =>
    fetchApi<OpportunityDetails>(`/opportunity/${id}`),

  create: (payload: CreateOpportunityPayload) =>
    fetchApi<OpportunityDetails>('/opportunity', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: Partial<CreateOpportunityPayload>) =>
    fetchApi<OpportunityDetails>(`/opportunity/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/opportunity/${id}`, { method: 'DELETE' }),

  getApplications: (id: string) =>
    fetchApi<Application[]>(`/opportunity/${id}/applications`),

  processApplication: (opportunityId: string, appId: string, status: ApplicationStatus, rejectionReason?: string) =>
    fetchApi<void>(`/opportunity/${opportunityId}/applications/${appId}/process`, {
      method: 'POST',
      body: JSON.stringify({ status, rejectionReason }),
    }),

  getEnrollments: (id: string) =>
    fetchApi<Application[]>(`/opportunity/${id}/enrollments`),
};
