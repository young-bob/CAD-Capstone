import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Search, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { adminService, UserProfile } from "@/services/adminService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/apiClient";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    organizationId: string;
    isOrgManager?: boolean;
}

export default function AssignCoordinatorDialog({ isOpen, onClose, organizationId, isOrgManager = false }: Props) {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [jobTitle, setJobTitle] = useState("");

    const { data: users = [], isLoading: loadingUsers } = useQuery({
        queryKey: ['admin-users'],
        queryFn: adminService.getUsers,
        enabled: isOpen, // Only fetch when dialog opens
    });

    const filteredUsers = users.filter(v =>
        v.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async () => {
        if (!selectedUserId) {
            toast.error("Please select a user to assign as coordinator.");
            return;
        }

        setLoading(true);
        try {
            if (isOrgManager) {
                await fetchApi(`/OrganizationManager/organizations/${organizationId}/coordinators`, {
                    method: 'POST',
                    body: JSON.stringify({ userId: selectedUserId, jobTitle })
                });
            } else {
                await adminService.assignCoordinator(organizationId, selectedUserId, jobTitle);
                queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
            }

            toast.success("Coordinator assigned successfully");
            queryClient.invalidateQueries({ queryKey: ['org-coordinators', organizationId] });
            queryClient.invalidateQueries({ queryKey: ['admin-users'] }); // Refresh list as role changed
            onClose();
        } catch (error) {
            toast.error("Failed to assign coordinator");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Assign Coordinator</DialogTitle>
                    <DialogDescription>
                        Select a registered user to oversee this organization. They will be promoted to the 'Coordinator' role.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search users by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <div className="border rounded-md max-h-[200px] overflow-y-auto space-y-1 p-1 bg-muted/20">
                        {loadingUsers ? (
                            <div className="p-4 flex justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
                        ) : filteredUsers.length === 0 ? (
                            <p className="p-4 text-sm text-center text-muted-foreground">No users found.</p>
                        ) : (
                            filteredUsers.map((user) => (
                                <div
                                    key={user.userId}
                                    onClick={() => setSelectedUserId(user.userId)}
                                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${selectedUserId === user.userId ? 'bg-primary/10 border-primary/20 border' : 'hover:bg-muted/50 border border-transparent'}`}
                                >
                                    <UserCircle2 className={`w-8 h-8 ${selectedUserId === user.userId ? 'text-primary' : 'text-muted-foreground'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium w-full truncate">{user.email}</p>
                                        <p className="text-xs text-muted-foreground w-full truncate capitalize">{user.role}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="space-y-2 mt-4">
                        <label className="text-sm font-medium text-foreground">Job Title (Optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. Event Manager, HR Lead"
                            value={jobTitle}
                            onChange={(e) => setJobTitle(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading || !selectedUserId} className="min-w-[120px]">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Assign User
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
