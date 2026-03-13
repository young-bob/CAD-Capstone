import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services/adminService";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, UserCircle2, Shield, Loader2, Plus, Globe, Trash2, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import AssignCoordinatorDialog from "@/components/admin/AssignCoordinatorDialog";
import CreateOrgAccountDialog from "@/components/admin/CreateOrgAccountDialog";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const AdminOrganizationDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);

    // Fetch Orgs
    const { data: org, isLoading: loadingOrg } = useQuery({
        queryKey: ['admin-organization', id],
        queryFn: () => adminService.getOrganization(id!),
        enabled: !!id,
    });

    const { data: coordinators = [], isLoading: loadingCoords } = useQuery({
        queryKey: ['org-coordinators', id],
        queryFn: () => adminService.getCoordinators(id!),
        enabled: !!id,
    });

    const removeCoordinatorMutation = useMutation({
        mutationFn: (userId: string) => adminService.removeCoordinator(id!, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-coordinators', id] });
            toast.success("Coordinator removed successfully");
        },
        onError: () => {
            toast.error("Failed to remove coordinator");
        }
    });

    if (loadingOrg) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!org) {
        return (
            <div className="text-center p-12">
                <p className="text-muted-foreground">Organization not found.</p>
                <Button variant="link" onClick={() => navigate('/admin')}>Return to Dashboard</Button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6 relative">
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/admin')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <Building2 className="w-6 h-6 text-primary" />
                        {org.name}
                    </h1>
                    <p className="page-subtitle flex items-center gap-4 mt-2">
                        <span className={`badge-status ${org.isVerified ? "badge-success" : "badge-pending"}`}>
                            {org.isVerified ? "Verified" : "Unverified"}
                        </span>
                        {org.contactEmail && (
                            <span className="flex items-center gap-1"><UserCircle2 className="w-4 h-4" /> {org.contactEmail}</span>
                        )}
                        {org.website && (
                            <span className="flex items-center gap-1"><Globe className="w-4 h-4" /> <a href={org.website} target="_blank" rel="noreferrer" className="hover:underline">{org.website}</a></span>
                        )}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="col-span-2 space-y-6">
                    <div className="card-elevated p-6">
                        <h2 className="text-lg font-semibold mb-4">About Organization</h2>
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {org.description || "No description provided."}
                        </p>
                    </div>

                    <div className="card-elevated p-6 mt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-primary" />
                                Organization Account
                            </h2>
                            <Button variant="outline" size="sm" onClick={() => setIsCreateAccountOpen(true)}>
                                Create Account
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Create a dedicated manager account for this organization. This account will be able to log in to the Organization Dashboard to edit this profile and manage their own coordinators independently.
                        </p>
                    </div>
                </div>

                {/* Sidebar Area - Coordinators */}
                <div className="col-span-1 space-y-6">
                    <div className="card-elevated p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                                <Shield className="w-4 h-4 text-primary" />
                                Coordinators
                            </h2>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setIsAssignOpen(true)}
                                className="h-8 gap-1 px-2"
                            >
                                <Plus className="w-3.5 h-3.5" /> Assign
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {loadingCoords ? (
                                <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                            ) : coordinators.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6 bg-muted/20 border border-dashed rounded-lg">
                                    No coordinators assigned yet.
                                </p>
                            ) : (
                                coordinators.map((c, i) => (
                                    <motion.div
                                        key={c.userId}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                                            {c.name ? c.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2) : "C"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{c.jobTitle || "Coordinator"}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 ml-auto"
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to remove this coordinator?')) {
                                                    removeCoordinatorMutation.mutate(c.userId);
                                                }
                                            }}
                                            disabled={removeCoordinatorMutation.isPending}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AssignCoordinatorDialog
                isOpen={isAssignOpen}
                onClose={() => setIsAssignOpen(false)}
                organizationId={id!}
            />

            <CreateOrgAccountDialog
                isOpen={isCreateAccountOpen}
                onClose={() => setIsCreateAccountOpen(false)}
                organizationId={id!}
                organizationName={org.name}
            />
        </div>
    );
};

export default AdminOrganizationDetails;
