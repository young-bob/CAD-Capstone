import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Search, MoreVertical, Edit, Power, PowerOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminService, OrganizationProfile } from "@/services/adminService";
import AppLayout from "@/components/AppLayout";

export default function AdminOrganizations() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");

    const { data: organizations = [], isLoading } = useQuery({
        queryKey: ['admin-organizations'],
        queryFn: adminService.getOrganizations,
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ orgId, isActive }: { orgId: string, isActive: boolean }) => {
            return await adminService.updateOrganization(orgId, { isActive });
        },
        onSuccess: () => {
            toast.success("Organization status updated.");
            queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to update organization status.");
        }
    });

    const filteredOrgs = organizations.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Organization Management</h1>
                        <p className="text-muted-foreground mt-2">
                            Global directory of all volunteering organizations on the platform.
                        </p>
                    </div>
                </div>

                <Card className="border-border shadow-sm">
                    <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
                        <div>
                            <CardTitle>Registered Organizations</CardTitle>
                            <CardDescription>
                                {organizations.length} total organizations found.
                            </CardDescription>
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredOrgs.length === 0 ? (
                            <div className="text-center p-12 border-2 border-dashed border-border rounded-lg bg-card/50">
                                <Building2 className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-foreground">No organizations found</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    No registered organizations match your search criteria.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-md border overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-secondary/50 text-secondary-foreground text-xs uppercase font-medium">
                                        <tr>
                                            <th className="px-4 py-3">Organization Name</th>
                                            <th className="px-4 py-3 hidden md:table-cell">Contact Email</th>
                                            <th className="px-4 py-3 hidden md:table-cell">Verification</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-card">
                                        {filteredOrgs.map((org) => (
                                            <tr key={org.organizationId} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {org.name}
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                                                    {org.contactEmail}
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    {org.isVerified ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Verified</span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Pending</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {org.isActive ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Active</span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Inactive</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => navigate(`/admin/organizations/${org.organizationId}`)} className="cursor-pointer">
                                                                <Edit className="mr-2 h-4 w-4 text-blue-500" />
                                                                <span>Manage Details</span>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => toggleStatusMutation.mutate({ orgId: org.organizationId, isActive: !org.isActive })}
                                                                className="cursor-pointer"
                                                                disabled={toggleStatusMutation.isPending}
                                                            >
                                                                {org.isActive ? (
                                                                    <>
                                                                        <PowerOff className="mr-2 h-4 w-4 text-red-600" />
                                                                        <span className="text-red-600">Deactivate</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Power className="mr-2 h-4 w-4 text-green-600" />
                                                                        <span className="text-green-600">Reactivate</span>
                                                                    </>
                                                                )}
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
