import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { volunteerService } from "@/services/volunteerService";
import { Opportunity } from "./OpportunityCard";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ApplicationDialogProps {
    opportunity: Opportunity | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function ApplicationDialog({ opportunity, isOpen, onClose }: ApplicationDialogProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isMember, setIsMember] = useState<boolean | null>(null);

    useEffect(() => {
        if (isOpen && opportunity && user?.id) {
            setLoading(true);
            volunteerService.isMemberOf(user.id, opportunity.orgId)
                .then(isMem => {
                    setIsMember(isMem);
                })
                .catch(err => {
                    console.error("Failed to check membership", err);
                    // Default to true or handle gracefully if API is down
                    setIsMember(false);
                })
                .finally(() => setLoading(false));
        }
    }, [isOpen, opportunity, user]);

    const handleApply = async () => {
        if (!user?.id || !opportunity) return;

        setSubmitting(true);
        try {
            if (isMember === false) {
                // Submit application to the organization's pending queue
                await volunteerService.applyToOrganization(user.id, opportunity.orgId);
                toast.success("Application submitted! Awaiting Coordinator approval.");
            } else {
                toast.success("Application Submitted successfully!");
            }

            onClose();
        } catch (error) {
            toast.error("Failed to submit application. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!opportunity) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Apply for Opportunity</DialogTitle>
                    <DialogDescription>
                        {opportunity.title} at {opportunity.org}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-6">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                            <p className="text-sm text-muted-foreground">Checking membership status...</p>
                        </div>
                    ) : (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            {isMember === false ? (
                                <div className="bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-300 p-4 rounded-md border border-orange-200 dark:border-orange-800/50 flex flex-col gap-3">
                                    <div className="flex items-center gap-2 font-medium">
                                        <AlertCircle className="h-5 w-5" />
                                        Organization Membership Required
                                    </div>
                                    <p className="text-sm">
                                        To apply for this opportunity, you must first become a verified Volunteer for <strong>{opportunity.org}</strong>.
                                    </p>
                                    <ul className="text-sm list-disc pl-5 mt-1 space-y-1">
                                        <li>Government Issued Photo ID</li>
                                        <li>Vulnerable Sector Police Check</li>
                                        <li>Signed Code of Conduct</li>
                                    </ul>
                                    <p className="text-xs text-orange-700/80 dark:text-orange-400/80 mt-2">
                                        Submitting this form will send a request to the Organization Coordinator to approve your Volunteer status.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-secondary/10 p-4 rounded-md border border-secondary/20">
                                    <p className="text-sm text-foreground">
                                        You are already a member of <strong>{opportunity.org}</strong>.
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Would you like to confirm your application for the <strong>{opportunity.title}</strong> shift on {opportunity.date}?
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleApply} disabled={loading || submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[140px]">
                        {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        {isMember === false ? "Apply for Both" : "Confirm Application"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
