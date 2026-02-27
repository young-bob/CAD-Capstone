import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Users, Calendar, Pencil, Trash2, ClipboardList, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { fetchApi } from "@/lib/apiClient";
import { opportunityService, type OpportunityDetails } from "@/services/opportunityService";
import { toast } from "sonner";

const CoordinatorOpportunities = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<OpportunityDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      try {
        // Get coordinator's organization
        const coord = await fetchApi<{ organizationId: string | null }>(`/coordinator/${user.id}`);
        if (!coord.organizationId) {
          setLoading(false);
          return;
        }
        setOrgId(coord.organizationId);

        // Get opportunity IDs for this org
        const ids = await fetchApi<string[]>(`/organization/${coord.organizationId}/opportunities`);
        if (!ids.length) {
          setLoading(false);
          return;
        }

        // Fetch details for each
        const details = await Promise.all(ids.map(id => opportunityService.getById(id)));
        setOpportunities(details.filter(Boolean) as OpportunityDetails[]);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load opportunities");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this opportunity? This cannot be undone.")) return;
    try {
      await opportunityService.delete(id);
      setOpportunities(prev => prev.filter(o => o.opportunityId !== id));
      toast.success("Opportunity deleted");
    } catch {
      toast.error("Failed to delete opportunity");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="page-header">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="card-elevated p-5 h-32 animate-pulse bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">My Opportunities</h1>
          <p className="page-subtitle">{opportunities.length} opportunity{opportunities.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => navigate("/coordinator/opportunities/new")} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Opportunity
        </Button>
      </div>

      {opportunities.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-12 text-center"
        >
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-1">No opportunities yet</h3>
          <p className="text-muted-foreground mb-4">Create your first opportunity to get started.</p>
          <Button onClick={() => navigate("/coordinator/opportunities/new")} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Opportunity
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {opportunities.map((opp, index) => {
            const isFull = opp.registeredCount >= opp.maxVolunteers;
            return (
              <motion.div
                key={opp.opportunityId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="card-elevated p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base truncate">{opp.title}</h3>
                      <Badge variant={isFull ? "destructive" : "secondary"} className="text-xs shrink-0">
                        {isFull ? "Full" : "Open"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{opp.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {opp.registeredCount}/{opp.maxVolunteers} volunteers
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(opp.startTime).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/coordinator/opportunities/${opp.opportunityId}/applications`)}
                      className="gap-1.5"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      Applications
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/coordinator/opportunities/${opp.opportunityId}/edit`)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(opp.opportunityId)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CoordinatorOpportunities;
