import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchApi } from "@/lib/apiClient";
import { opportunityService, type Application, type OpportunityDetails } from "@/services/opportunityService";
import { volunteerService, type VolunteerProfile } from "@/services/volunteerService";
import { toast } from "sonner";

interface EnrolledVolunteer {
  app: Application;
  name: string;
}

interface OppEnrollment {
  opp: OpportunityDetails;
  volunteers: EnrolledVolunteer[];
}

const CoordinatorEnrollments = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<OppEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      try {
        const coord = await fetchApi<{ organizationId: string | null }>(`/coordinator/${user.id}`);
        if (!coord.organizationId) { setLoading(false); return; }

        const ids = await fetchApi<string[]>(`/organization/${coord.organizationId}/opportunities`);
        if (!ids.length) { setLoading(false); return; }

        const results: OppEnrollment[] = [];

        for (const id of ids) {
          const [opp, enrolledApps] = await Promise.all([
            opportunityService.getById(id),
            opportunityService.getEnrollments(id),
          ]);

          const volunteers: EnrolledVolunteer[] = await Promise.all(
            enrolledApps.map(async app => {
              try {
                const profile = await volunteerService.getProfile(app.volunteerId);
                return { app, name: profile?.name ?? "Unknown Volunteer" };
              } catch {
                return { app, name: "Unknown Volunteer" };
              }
            })
          );

          results.push({ opp, volunteers });
        }

        setEnrollments(results);
      } catch {
        toast.error("Failed to load enrollments");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalEnrolled = enrollments.reduce((sum, e) => sum + e.volunteers.length, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        {[1, 2].map(i => (
          <div key={i} className="card-elevated p-5 h-20 animate-pulse bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Enrollments</h1>
        <p className="page-subtitle">{totalEnrolled} volunteer{totalEnrolled !== 1 ? "s" : ""} enrolled across {enrollments.length} opportunit{enrollments.length !== 1 ? "ies" : "y"}</p>
      </div>

      {enrollments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-12 text-center"
        >
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No enrollments yet</h3>
          <p className="text-muted-foreground">Approve volunteer applications to see them here.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {enrollments.map((entry, index) => {
            const isOpen = expanded.has(entry.opp.opportunityId);
            return (
              <motion.div
                key={entry.opp.opportunityId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="card-elevated overflow-hidden"
              >
                {/* Opportunity header */}
                <button
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => toggleExpand(entry.opp.opportunityId)}
                >
                  <div>
                    <h3 className="font-semibold text-base">{entry.opp.title}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {entry.volunteers.length} enrolled
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(entry.opp.startTime).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {/* Volunteer list */}
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-t border-border"
                  >
                    {entry.volunteers.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-muted-foreground">No volunteers enrolled yet.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {entry.volunteers.map(v => (
                          <li key={v.app.appId} className="px-5 py-3 flex items-center justify-between">
                            <span className="font-medium text-sm">{v.name}</span>
                            <span className="text-xs text-muted-foreground">
                              Approved {new Date(v.app.submissionDate).toLocaleDateString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CoordinatorEnrollments;
