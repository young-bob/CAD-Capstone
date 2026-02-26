import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, ShieldAlert, MoreVertical, KeyRound, Loader2, ShieldPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { adminService, UserProfile } from "@/services/adminService";
import AppLayout from "@/components/AppLayout";

export default function AdminUsers() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [resetDialogUser, setResetDialogUser] = useState<UserProfile | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [deleteDialogUser, setDeleteDialogUser] = useState<UserProfile | null>(null);
    const [deleteEmailConfirm, setDeleteEmailConfirm] = useState("");

    const { data: users = [], isLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: adminService.getUsers,
    });

    const resetMutation = useMutation({
        mutationFn: async ({ userId, pass }: { userId: string, pass: string }) => {
            return await adminService.resetUserPassword(userId, pass);
        },
        onSuccess: () => {
            toast.success("User password has been successfully reset.");
            setResetDialogUser(null);
            setNewPassword("");
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to reset password.");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (userId: string) => {
            return await adminService.deleteUser(userId);
        },
        onSuccess: () => {
            toast.success("User successfully deleted.");
            setDeleteDialogUser(null);
            setDeleteEmailConfirm("");
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to delete user.");
        }
    });

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleResetPassword = () => {
        if (!resetDialogUser) return;
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }
        resetMutation.mutate({ userId: resetDialogUser.userId, pass: newPassword });
    };

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
                        <p className="text-muted-foreground mt-2">
                            Global directory of all registered users on the platform.
                        </p>
                    </div>
                </div>

                <Card className="border-border shadow-sm">
                    <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
                        <div>
                            <CardTitle>Registered Users</CardTitle>
                            <CardDescription>
                                {users.length} total users found across all roles.
                            </CardDescription>
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by email or role..."
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
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center p-12 border-2 border-dashed border-border rounded-lg bg-card/50">
                                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-foreground">No users found</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    No registered users match your search criteria.
                                </p>
                            </div>
                        ) : (
                            <div className="rounded-md border overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-secondary/50 text-secondary-foreground text-xs uppercase font-medium">
                                        <tr>
                                            <th className="px-4 py-3">User Email</th>
                                            <th className="px-4 py-3">Role</th>
                                            <th className="px-4 py-3 hidden md:table-cell">Account Created</th>
                                            <th className="px-4 py-3 hidden md:table-cell">Status</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-card">
                                        {filteredUsers.map((user) => (
                                            <tr key={user.userId} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {user.email}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                                                        user.role === 'Coordinator' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                                                            user.role === 'Volunteer' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                                                'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                                        }`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                                                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    {user.isActive ? (
                                                        <span className="text-green-600 dark:text-green-400 text-xs font-medium">Active</span>
                                                    ) : (
                                                        <span className="text-red-600 dark:text-red-400 text-xs font-medium">Deactivated</span>
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
                                                            <DropdownMenuItem onClick={() => setResetDialogUser(user)} className="cursor-pointer">
                                                                <KeyRound className="mr-2 h-4 w-4 text-orange-500" />
                                                                <span>Reset Password</span>
                                                            </DropdownMenuItem>

                                                            {user.role !== 'admin' && (
                                                                <DropdownMenuItem onClick={() => setDeleteDialogUser(user)} className="cursor-pointer text-red-600 focus:text-red-700">
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    <span>Delete User</span>
                                                                </DropdownMenuItem>
                                                            )}
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

                <Dialog open={!!resetDialogUser} onOpenChange={(open) => !open && setResetDialogUser(null)}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-orange-500" />
                                Administrative Password Reset
                            </DialogTitle>
                            <DialogDescription>
                                You are forcibly resetting the password for <strong>{resetDialogUser?.email}</strong>. This effectively logs them out of any active sessions.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">New Password</label>
                                <input
                                    type="text" // Specifically type='text' since admins need to see what they are typing to give to the user
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Enter a secure password..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setResetDialogUser(null)}>
                                Cancel
                            </Button>
                            <Button variant="default" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleResetPassword} disabled={resetMutation.isPending || newPassword.length < 6}>
                                {resetMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                Reset Password
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!deleteDialogUser} onOpenChange={(open) => !open && setDeleteDialogUser(null)}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <ShieldAlert className="w-5 h-5" />
                                Delete User Account
                            </DialogTitle>
                            <DialogDescription>
                                You are about to permanently delete <strong>{deleteDialogUser?.email}</strong>. This action cannot be undone. All data associated with this user will be removed.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Type <span className="font-mono text-red-600 font-bold">{deleteDialogUser?.email}</span> to confirm</label>
                                <input
                                    type="text"
                                    value={deleteEmailConfirm}
                                    onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Confirm email..."
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteDialogUser(null)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={() => deleteDialogUser && deleteMutation.mutate(deleteDialogUser.userId)} disabled={deleteMutation.isPending || deleteEmailConfirm !== deleteDialogUser?.email}>
                                {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                Permanently Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
