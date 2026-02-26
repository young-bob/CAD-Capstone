import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import OpportunityCard, { Opportunity } from "@/components/opportunities/OpportunityCard";
import { useAuth } from "@/contexts/AuthContext";
import { opportunityService, type OpportunityDetails, type Application } from "@/services/opportunityService";
import { volunteerService } from "@/services/volunteerService";
import { toast } from "sonner";

function mapToCard(opp: OpportunityDetails, index: number): Opportunity {
  return {
    id: index + 1,
    title: opp.title,
    org: opp.organizationId,
    orgType: "",
    distance: opp.venueLocation ? opp.venueLocation.city : "—",
    hours: `${new Date(opp.startTime).toLocaleDateString()} – ${new Date(opp.endTime).toLocaleDateString()}`,
    skills: [],
    date: new Date(opp.startTime).toLocaleDateString(),
    spots: opp.maxVolunteers - opp.registeredCount,
    recommended: false,
    description: opp.description,
  };
}

const Opportunities = () => {
  const { user } = useAuth();
  const [opps, setOpps] = useState<OpportunityDetails[]>([]);
  const [myApps, setMyApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [allOpps, apps] = await Promise.all([
          opportunityService.getAll(),
          user?.id ? volunteerService.getApplications(user.id) : Promise.resolve([]),
        ]);
        setOpps(allOpps);
        setMyApps(apps as Application[]);
      } catch {
        toast.error("Failed to load opportunities");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (!search) return opps;
    const q = search.toLowerCase();
    return opps.filter(o =>
      o.title.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q)
    );
  }, [opps, search]);

  const appliedOpportunityIds = useMemo(
    () => new Set(myApps.map(a => a.opportunityId)),
    [myApps]
  );

  const handleApply = async (opp: OpportunityDetails) => {
    if (!user?.id) return;
    setApplying(opp.opportunityId);
    try {
      const app = await volunteerService.apply(user.id, opp.opportunityId);
      setMyApps(prev => [...prev, app]);
      toast.success(
        app.status === "Waitlisted"
          ? "Added to waitlist — opportunity is full"
          : "Application submitted!"
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to apply";
      toast.error(msg);
    } finally {
      setApplying(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5 max-w-7xl mx-auto">
        <div className="page-header">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-elevated p-5 h-32 animate-pulse bg-muted/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="page-header">
        <h1 className="page-title">Discover Opportunities</h1>
        <p className="page-subtitle">Find volunteer positions that match your interests</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search opportunities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <p className="text-xs text-muted-foreground font-medium">
        {filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"} found
      </p>

      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-12 text-center"
        >
          <p className="text-sm font-medium">No opportunities available right now.</p>
          <p className="text-xs text-muted-foreground mt-1">Check back later for new opportunities.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filtered.map((opp, i) => {
            const card = mapToCard(opp, i);
            const isApplied = appliedOpportunityIds.has(opp.opportunityId);
            const isFull = opp.registeredCount >= opp.maxVolunteers;
            return (
              <OpportunityCard
                key={opp.opportunityId}
                opportunity={card}
                index={i}
                isHighlighted={false}
                onHover={() => {}}
                isApplied={isApplied}
                isFull={isFull}
                applying={applying === opp.opportunityId}
                onApply={() => handleApply(opp)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Opportunities;
