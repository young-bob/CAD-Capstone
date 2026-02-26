import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { volunteerService } from "@/services/volunteerService";
import { opportunityService, type Application, type OpportunityDetails } from "@/services/opportunityService";
import { toast } from "sonner";

interface EnrolledItem {
  app: Application;
  opp: OpportunityDetails | null;
}

const VolunteerEnrollments = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrolledItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      try {
        const apps = await volunteerService.getApplications(user.id) as Application[];
        const approved = apps.filter(a => a.status === "Approved");

        const items: EnrolledItem[] = await Promise.all(
          approved.map(async app => {
            try {
              const opp = await opportunityService.getById(app.opportunityId);
              return { app, opp };
            } catch {
              return { app, opp: null };
            }
          })
        );
        setEnrollments(items);
      } catch {
        toast.error("Failed to load enrollments");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="card-elevated p-5 h-24 animate-pulse bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">My Enrollments</h1>
        <p className="page-subtitle">{enrollments.length} active enrollment{enrollments.length !== 1 ? "s" : ""}</p>
      </div>

      {enrollments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-12 text-center"
        >
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No enrollments yet</h3>
          <p className="text-muted-foreground">Apply to opportunities and get approved to see them here.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {enrollments.map(({ app, opp }, index) => (
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
                    <h3 className="font-semibold truncate">
                      {opp?.title ?? `Opportunity ${app.opportunityId.slice(0, 8)}...`}
                    </h3>
                    <Badge className="badge-success text-xs shrink-0">Enrolled</Badge>
                  </div>
                  {opp && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(opp.startTime).toLocaleDateString()} – {new Date(opp.endTime).toLocaleDateString()}
                      </span>
                      {opp.venueLocation?.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {opp.venueLocation.city}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  Approved {new Date(app.submissionDate).toLocaleDateString()}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VolunteerEnrollments;
