import { fetchApi } from "@/lib/apiClient";

export interface OrganizationProfile {
    organizationId: string;
    name: string;
    contactEmail: string;
    description: string;
    logoUrl: string;
    website: string;
    isVerified: boolean;
    isActive: boolean;
    status?: string; // Derived or UI specific
}

export interface VolunteerProfile {
    userId: string;
    name: string;
    email: string;
    role?: string; // Custom role for UI
}

export interface UserProfile {
    userId: string;
    email: string;
    role: string;
    createdAt: string;
    lastLoginAt?: string;
    isActive: boolean;
}

export interface CoordinatorProfile {
    userId: string;
    organizationId: string;
    name: string;
    email: string;
    jobTitle: string;
}

export const adminService = {
    getOrganizations: async () => {
        return await fetchApi<OrganizationProfile[]>("/Admin/organizations");
    },

    createOrganization: async (data: { name: string; contactEmail: string; description?: string; website?: string }) => {
        return await fetchApi<OrganizationProfile>("/Admin/organizations", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    updateOrganization: async (id: string, data: { name?: string; contactEmail?: string; description?: string; website?: string; isActive?: boolean }) => {
        return await fetchApi<OrganizationProfile>(`/Admin/organizations/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
    },

    deleteOrganization: async (id: string) => {
        return await fetchApi(`/Admin/organizations/${id}`, { method: "DELETE" });
    },

    getOrganization: async (id: string) => {
        return await fetchApi<OrganizationProfile>(`/Admin/organizations/${id}`);
    },

    getCoordinators: async (organizationId: string) => {
        return await fetchApi<CoordinatorProfile[]>(`/Admin/organizations/${organizationId}/coordinators`);
    },

    assignCoordinator: async (organizationId: string, userId: string, jobTitle?: string) => {
        return await fetchApi(`/Admin/organizations/${organizationId}/coordinators`, {
            method: "POST",
            body: JSON.stringify({ userId, jobTitle })
        });
    },

    removeCoordinator: async (organizationId: string, userId: string) => {
        return await fetchApi(`/Admin/organizations/${organizationId}/coordinators/${userId}`, {
            method: "DELETE",
        });
    },

    createOrganizationAccount: async (organizationId: string, accountData: { name: string; email: string; password: string }) => {
        return await fetchApi(`/Admin/organizations/${organizationId}/create-account`, {
            method: "POST",
            body: JSON.stringify(accountData),
        });
    },

    getVolunteers: async () => {
        return await fetchApi<VolunteerProfile[]>("/admin/volunteers");
    },

    deleteVolunteer: async (id: string) => {
        return await fetchApi(`/admin/volunteers/${id}`, { method: "DELETE" });
    },

    getUsers: async () => {
        return await fetchApi<UserProfile[]>("/admin/users");
    },

    deleteUser: async (id: string) => {
        return await fetchApi(`/admin/users/${id}`, { method: "DELETE" });
    },

    resetUserPassword: async (userId: string, newPassword: string) => {
        return await fetchApi(`/admin/users/${userId}/reset-password`, {
            method: "POST",
            body: JSON.stringify({ newPassword }),
        });
    },
};
