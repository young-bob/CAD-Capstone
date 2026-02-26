import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { opportunityService, type Application, type ApplicationStatus, type OpportunityDetails } from "@/services/opportunityService";
import { volunteerService, type VolunteerProfile } from "@/services/volunteerService";
import { toast } from "sonner";

const statusColors: Record<ApplicationStatus, string> = {
  Pending: "badge-pending",
  Approved: "badge-success",
  Rejected: "badge-status bg-destructive/10 text-destructive",
  Waitlisted: "badge-warning",
};

const statusLabels: Record<ApplicationStatus, string> = {
  Pending: "Pending",
  Approved: "Approved",
  Rejected: "Rejected",
  Waitlisted: "Waitlisted",
};

interface AppWithName extends Application {
  volunteerName: string;
}

const ApplicationsReview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [opp, setOpp] = useState<OpportunityDetails | null>(null);
  const [apps, setApps] = useState<AppWithName[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    if (!id) return;
    try {
      const [details, applications] = await Promise.all([
        opportunityService.getById(id),
        opportunityService.getApplications(id),
      ]);
      setOpp(details);

      // Fetch volunteer names
      const withNames = await Promise.all(
        applications.map(async app => {
          try {
            const profile = await volunteerService.getProfile(app.volunteerId);
            return { ...app, volunteerName: profile?.name ?? "Unknown Volunteer" };
          } catch {
            return { ...app, volunteerName: "Unknown Volunteer" };
          }
        })
      );
      setApps(withNames);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleProcess = async (appId: string, status: ApplicationStatus, reason?: string) => {
    if (!id) return;
    setProcessing(appId);
    try {
      await opportunityService.processApplication(id, appId, status, reason);
      toast.success(`Application ${status.toLowerCase()}`);
      setRejectId(null);
      setRejectReason("");
      await load();
    } catch {
      toast.error("Failed to process application");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="card-elevated p-5 h-20 animate-pulse bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/coordinator/opportunities")} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="page-title">{opp?.title ?? "Applications"}</h1>
          <p className="page-subtitle flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {opp?.registeredCount}/{opp?.maxVolunteers} enrolled · {apps.length} application{apps.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {apps.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-12 text-center"
        >
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No applications yet</h3>
          <p className="text-muted-foreground">Applications will appear here once volunteers apply.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {apps.map((app, index) => (
            <motion.div
              key={app.appId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="card-elevated p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{app.volunteerName}</span>
                    <span className={`badge-status text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[app.status]}`}>
                      {statusLabels[app.status]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Applied {new Date(app.submissionDate).toLocaleDateString()}
                  </p>
                  {app.rejectionReason && (
                    <p className="text-sm text-destructive mt-1">Reason: {app.rejectionReason}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {(app.status === "Pending" || app.status === "Waitlisted") && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-500 text-green-600 hover:bg-green-50"
                        disabled={processing === app.appId}
                        onClick={() => handleProcess(app.appId, "Approved")}
                      >
                        Approve
                      </Button>
                      {app.status === "Pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-muted text-muted-foreground"
                          disabled={processing === app.appId}
                          onClick={() => handleProcess(app.appId, "Waitlisted")}
                        >
                          Waitlist
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        disabled={processing === app.appId}
                        onClick={() => { setRejectId(app.appId); setRejectReason(""); }}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Rejection reason input */}
              {rejectId === app.appId && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 flex gap-2"
                >
                  <Input
                    placeholder="Reason for rejection (optional)"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={processing === app.appId}
                    onClick={() => handleProcess(app.appId, "Rejected", rejectReason)}
                  >
                    Confirm
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRejectId(null)}>
                    Cancel
                  </Button>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApplicationsReview;
