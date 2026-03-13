import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Edit, Shield, Trash2, KeyRound, Loader2, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { fetchApi } from "@/lib/apiClient";
import AppLayout from "../components/AppLayout";
import { adminService, OrganizationProfile, CoordinatorProfile } from "@/services/adminService";
import AssignCoordinatorDialog from "@/components/admin/AssignCoordinatorDialog";

const OrganizationDashboard = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isAssignOpen, setIsAssignOpen] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [website, setWebsite] = useState("");
    const [description, setDescription] = useState("");

    // 1. Fetch Profile to get OrganizationId
    const { data: profile, isLoading: loadingProfile } = useQuery({
        queryKey: ["org-manager-profile"],
        queryFn: async () => {
            return await fetchApi<{ organizationId: string }>("/OrganizationManager/profile");
        },
        enabled: !!user,
    });

    const orgId = profile?.organizationId;

    // 2. Fetch Organization Details
    const { data: org, isLoading: loadingOrg } = useQuery({
        queryKey: ["organization-details", orgId],
        queryFn: () => adminService.getOrganization(orgId!),
        enabled: !!orgId,
    });

    // Populate form when org loads
    if (org && !name && !loadingOrg) {
        setName(org.name);
        setContactEmail(org.contactEmail);
        setWebsite(org.website || "");
        setDescription(org.description || "");
    }

    // 3. Fetch Coordinators
    const { data: coordinators, isLoading: loadingCoords } = useQuery({
        queryKey: ["org-coordinators", orgId],
        queryFn: async () => {
            return await fetchApi<CoordinatorProfile[]>(`/OrganizationManager/organizations/${orgId}/coordinators`);
        },
        enabled: !!orgId,
    });

    // Mutations
    const updateOrgMutation = useMutation({
        mutationFn: async (data: Partial<OrganizationProfile>) => {
            return await adminService.updateOrganization(orgId!, data);
        },
        onSuccess: () => {
            toast.success("Organization profile updated!");
            queryClient.invalidateQueries({ queryKey: ["organization-details", orgId] });
        },
        onError: () => toast.error("Failed to update organization")
    });

    const removeCoordinatorMutation = useMutation({
        mutationFn: async (userId: string) => {
            return await fetchApi(`/OrganizationManager/organizations/${orgId}/coordinators/${userId}`, { method: "DELETE" });
        },
        onSuccess: () => {
            toast.success("Coordinator removed.");
            queryClient.invalidateQueries({ queryKey: ["org-coordinators", orgId] });
        },
        onError: () => toast.error("Failed to remove coordinator")
    });

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        updateOrgMutation.mutate({ name, contactEmail, website, description });
    };

    if (loadingProfile || loadingOrg) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center p-24">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }

    if (!orgId || !org) {
        return (
            <AppLayout>
                <div className="text-center p-24">
                    <p className="text-muted-foreground">Unable to load organization data.</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <KeyRound className="w-8 h-8 text-primary" />
                        Organization Management
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your organization's public profile and assigned coordinators independently.
                    </p>
                </div>

                {org && org.isActive === false && (
                    <Alert variant="destructive" className="border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400">
                        <AlertCircle className="h-4 w-4 stroke-red-600 dark:stroke-red-400" />
                        <AlertTitle>Organization Inactive</AlertTitle>
                        <AlertDescription className="text-red-600/90 dark:text-red-400/90">
                            Your organization has been marked as inactive by the platform administrators. Please reach out to support for more information. While inactive, your publicly listed opportunities are hidden, and you cannot create new ones.
                        </AlertDescription>
                    </Alert>
                )}

                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="profile" className="flex items-center gap-2">
                            <Edit className="w-4 h-4" /> Profile
                        </TabsTrigger>
                        <TabsTrigger value="coordinators" className="flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Coordinators
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile">
                        <Card>
                            <CardHeader>
                                <CardTitle>Public Profile</CardTitle>
                                <CardDescription>Update how your organization appears to prospective volunteers.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-2xl">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Organization Name</label>
                                        <Input value={name} onChange={e => setName(e.target.value)} required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Contact Email</label>
                                            <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} required />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Website</label>
                                            <Input type="url" value={website} onChange={e => setWebsite(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Description</label>
                                        <Textarea
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            rows={5}
                                            placeholder="Describe your organization's mission..."
                                        />
                                    </div>
                                    <Button type="submit" disabled={updateOrgMutation.isPending}>
                                        {updateOrgMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                                        Save Changes
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="coordinators">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Manage Coordinators</CardTitle>
                                    <CardDescription>Assign or remove personnel who manage your volunteer applications and shifts.</CardDescription>
                                </div>
                                <Button size="sm" onClick={() => setIsAssignOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" /> Assign Coordinator
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {loadingCoords ? (
                                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                                ) : !coordinators || coordinators.length === 0 ? (
                                    <div className="text-center p-8 border-2 border-dashed border-border rounded-lg bg-card/50">
                                        <p className="text-sm text-muted-foreground">You have no coordinators assigned.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y border rounded-md">
                                        {coordinators.map(c => (
                                            <div key={c.userId} className="flex items-center justify-between p-4 bg-card">
                                                <div>
                                                    <p className="font-medium">{c.name}</p>
                                                    <p className="text-sm text-muted-foreground">{c.jobTitle} • {c.email}</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    onClick={() => removeCoordinatorMutation.mutate(c.userId)}
                                                    disabled={removeCoordinatorMutation.isPending}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" /> Remove
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <AssignCoordinatorDialog
                isOpen={isAssignOpen}
                onClose={() => setIsAssignOpen(false)}
                organizationId={orgId!}
                // Pass true to tell the dialog to hit our Org Manager endpoint instead of Admin
                isOrgManager={true}
            />
        </AppLayout>
    );
};

export default OrganizationDashboard;
