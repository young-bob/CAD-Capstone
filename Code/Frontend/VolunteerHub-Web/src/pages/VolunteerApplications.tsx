import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { volunteerService } from "@/services/volunteerService";
import { type Application, type ApplicationStatus } from "@/services/opportunityService";
import { toast } from "sonner";

type FilterOption = "All" | "Applied" | "Approved" | "Rejected" | "Waitlisted";

const statusColors: Record<ApplicationStatus, string> = {
  Pending: "badge-pending",
  Approved: "badge-success",
  Rejected: "bg-destructive/10 text-destructive",
  Waitlisted: "badge-warning",
};

// "Pending" from backend is displayed as "Applied" in the UI
const displayStatus = (status: ApplicationStatus): string => {
  if (status === "Pending") return "Applied";
  return status;
};

const filterMatch = (app: Application, filter: FilterOption): boolean => {
  if (filter === "All") return true;
  if (filter === "Applied") return app.status === "Pending";
  return app.status === filter;
};

const VolunteerApplications = () => {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>("All");

  useEffect(() => {
    if (!user?.id) return;
    volunteerService.getApplications(user.id)
      .then(data => setApps(data as Application[]))
      .catch(() => toast.error("Failed to load applications"))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const filtered = useMemo(
    () => apps.filter(a => filterMatch(a, filter)),
    [apps, filter]
  );

  const filters: FilterOption[] = ["All", "Applied", "Approved", "Waitlisted", "Rejected"];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 w-20 bg-muted rounded-full animate-pulse" />)}
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="card-elevated p-5 h-16 animate-pulse bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">My Applications</h1>
        <p className="page-subtitle">{apps.length} total application{apps.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-12 text-center"
        >
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No {filter === "All" ? "" : filter.toLowerCase() + " "}applications</h3>
          {filter === "All"
            ? <p className="text-muted-foreground">Browse opportunities and apply to get started.</p>
            : <p className="text-muted-foreground">No applications with this status yet.</p>
          }
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((app, index) => (
            <motion.div
              key={app.appId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="card-elevated p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">
                    {(app as Application & { opportunityTitle?: string }).opportunityTitle ?? `Opportunity ${app.opportunityId.slice(0, 8)}...`}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Applied {new Date(app.submissionDate).toLocaleDateString()}
                  </p>
                  {app.rejectionReason && (
                    <p className="text-sm text-destructive mt-1">Reason: {app.rejectionReason}</p>
                  )}
                </div>
                <span className={`badge-status text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${statusColors[app.status]}`}>
                  {displayStatus(app.status)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VolunteerApplications;
