import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, UserIcon, RefreshCw, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { fetchApi } from "@/lib/apiClient";
import AppLayout from "../components/AppLayout";

// Temporary type to match CoordinatorController response
interface PendingApplication {
    userId: string;
    name: string;
    email: string;
    appliedAt: string;
}

const CoordinatorDashboard = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [approvingId, setApprovingId] = useState<string | null>(null);

    // In a real scenario, a coordinator might manage multiple organizations. 
    // We'll assume the primary one for this demo, fetching from their token or profile.
    // For the sake of this prototype, we'll use a mocked organization ID if one isn't available.
    const organizationId = user?.id || "00000000-0000-0000-0000-000000000001"; // Replace with actual logic to get their assigned Org ID

    // Fetch pending applications
    const { data: applications, isLoading, error, refetch } = useQuery<PendingApplication[]>({
        queryKey: ["pending-applications", organizationId],
        queryFn: async () => {
            // Temporary mocked fetch until we tie Coordinator to specific Org officially
            // We will hardcode 00000000-0000-0000-0000-000000000001 or fetch from endpoint
            return await fetchApi<PendingApplication[]>(`/Coordinator/organizations/${organizationId}/applications`);
        },
        enabled: !!user,
    });

    const approveMutation = useMutation({
        mutationFn: async (userId: string) => {
            return await fetchApi(
                `/Coordinator/organizations/${organizationId}/applications/${userId}/approve`,
                { method: "POST" }
            );
        },
        onSuccess: () => {
            toast.success("Application approved successfully.");
            queryClient.invalidateQueries({ queryKey: ["pending-applications"] });
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to approve application.");
        },
        onSettled: () => {
            setApprovingId(null);
        }
    });

    const handleApprove = (userId: string) => {
        setApprovingId(userId);
        approveMutation.mutate(userId);
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Coordinator Dashboard</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your organization's volunteer roster and pending applications.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Dashboard Summary Cards */}
                    <Card className="border-border shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Pending Applications
                            </CardTitle>
                            <Clock className="w-4 h-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                                {isLoading ? "-" : applications?.length || 0}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Requires your review</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Pending Applications List */}
                <Card className="border-border shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Needs Approval</CardTitle>
                            <CardDescription>
                                Users waiting to become verified volunteers for your organization.
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : error ? (
                            <div className="text-center p-8 border-2 border-dashed border-border rounded-lg bg-red-50/50">
                                <p className="text-sm text-red-600 font-medium">Failed to load applications</p>
                                <p className="text-xs text-red-500/80 mt-1">Ensure your backend allows fetching `/Coordinator/organizations/*/applications`.</p>
                            </div>
                        ) : !applications || applications.length === 0 ? (
                            <div className="text-center p-8 border-2 border-dashed border-border rounded-lg bg-card/50">
                                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-6 h-6 text-muted-foreground" />
                                </div>
                                <h3 className="text-sm font-medium text-foreground">All caught up!</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    There are no pending applications for your organization right now.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border rounded-md border border-border">
                                {applications.map((app) => (
                                    <div key={app.userId} className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <UserIcon className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{app.name || app.email}</p>
                                                <div className="flex items-center text-xs text-muted-foreground mt-1 gap-2">
                                                    <span>{app.email}</span>
                                                    <span>•</span>
                                                    <span>Applied {format(new Date(app.appliedAt), "MMM d, yyyy")}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                                <X className="w-4 h-4 mr-1" />
                                                Decline
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleApprove(app.userId)}
                                                disabled={approvingId === app.userId}
                                                className="bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                {approvingId === app.userId ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                                                ) : (
                                                    <Check className="w-4 h-4 mr-1" />
                                                )}
                                                Approve
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
};

export default CoordinatorDashboard;
