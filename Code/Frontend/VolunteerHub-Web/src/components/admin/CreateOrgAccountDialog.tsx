import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminService } from "@/services/adminService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface CreateOrgAccountDialogProps {
    isOpen: boolean;
    onClose: () => void;
    organizationId: string;
    organizationName: string;
}

const CreateOrgAccountDialog = ({ isOpen, onClose, organizationId, organizationName }: CreateOrgAccountDialogProps) => {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const createAccountMutation = useMutation({
        mutationFn: async (data: any) => {
            return await adminService.createOrganizationAccount(organizationId, data);
        },
        onSuccess: () => {
            toast.success("Organization account created successfully.");
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            handleClose();
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to create organization account.");
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password || !name) {
            toast.error("Please fill in all fields.");
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }

        createAccountMutation.mutate({ name, email, password });
    };

    const handleClose = () => {
        setName("");
        setEmail("");
        setPassword("");
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <KeyRound className="w-5 h-5 text-primary" />
                            Create Organization Account
                        </DialogTitle>
                        <DialogDescription>
                            Create a dedicated manager account for <strong>{organizationName}</strong>. This account will have the <code>OrganizationManager</code> role.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-6">
                        <div className="space-y-2">
                            <Label htmlFor="org-name">Manager Name</Label>
                            <Input
                                id="org-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Org Admin"
                                autoComplete="off"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="org-email">Login Email</Label>
                            <Input
                                id="org-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="manager@organization.org"
                                autoComplete="off"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="org-password">Temporary Password</Label>
                            <Input
                                id="org-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Requires at least 6 characters"
                                autoComplete="new-password"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={createAccountMutation.isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={createAccountMutation.isPending}>
                            {createAccountMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Account"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateOrgAccountDialog;
