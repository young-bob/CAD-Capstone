import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import OpportunityCard, { Opportunity } from "@/components/opportunities/OpportunityCard";
<<<<<<< HEAD
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
=======
import OpportunityMap from "@/components/opportunities/OpportunityMap";
import ApplicationDialog from "@/components/opportunities/ApplicationDialog";

const opportunities: Opportunity[] = [
  {
    id: 1,
    title: "Weekend Food Distribution",
    org: "City Food Bank",
    orgId: "00000000-0000-0000-0000-000000000001",
    orgType: "Food Bank",
    distance: "1.2 km",
    hours: "3-4 hrs",
    skills: ["Food Handling", "Customer Service"],
    date: "Sat, Feb 14",
    spots: 5,
    recommended: true,
    description: "Help distribute fresh produce and packaged goods to families in need. Volunteers will organize supplies, assist with check-in, and load groceries for community members.",
  },
  {
    id: 2,
    title: "Senior Companion Program",
    org: "Elder Care Center",
    orgId: "00000000-0000-0000-0000-000000000002",
    orgType: "Healthcare",
    distance: "2.8 km",
    hours: "2-3 hrs",
    skills: ["Communication", "Empathy"],
    date: "Mon-Fri",
    spots: 3,
    recommended: true,
    description: "Spend time with seniors through conversation, reading, games, and light activities. Your companionship can brighten someone's day and reduce feelings of isolation.",
  },
  {
    id: 3,
    title: "Community Garden Cleanup",
    org: "Green Spaces Initiative",
    orgId: "00000000-0000-0000-0000-000000000003",
    orgType: "Environment",
    distance: "0.8 km",
    hours: "2 hrs",
    skills: ["Physical Labor", "Outdoor"],
    date: "Sun, Feb 15",
    spots: 12,
    recommended: false,
    description: "Join us for a spring cleanup at the community garden. Tasks include weeding, planting, mulching, and setting up garden beds for the upcoming growing season.",
  },
  {
    id: 4,
    title: "After-School Tutoring",
    org: "Bright Futures Academy",
    orgId: "00000000-0000-0000-0000-000000000004",
    orgType: "Education",
    distance: "3.5 km",
    hours: "1.5 hrs",
    skills: ["Teaching", "Math", "English"],
    date: "Tue & Thu",
    spots: 2,
    recommended: false,
    description: "Tutor elementary and middle school students in math and English. Help with homework, build study skills, and inspire confidence in young learners.",
    orgIsActive: false,
  },
  {
    id: 5,
    title: "Animal Shelter Assistant",
    org: "Happy Paws Shelter",
    orgId: "00000000-0000-0000-0000-000000000005",
    orgType: "Animal Welfare",
    distance: "4.1 km",
    hours: "3 hrs",
    skills: ["Animal Care"],
    date: "Weekends",
    spots: 8,
    recommended: true,
    description: "Assist with daily operations at the shelter including feeding, walking dogs, socializing animals, and helping potential adopters meet their new best friends.",
  },
  {
    id: 6,
    title: "Hospital Visitor Program",
    org: "Regional Medical Center",
    orgId: "00000000-0000-0000-0000-000000000006",
    orgType: "Healthcare",
    distance: "5.2 km",
    hours: "2 hrs",
    skills: ["Empathy", "Communication"],
    date: "Wed & Fri",
    spots: 4,
    recommended: false,
    description: "Visit patients who may not have family nearby. Offer comfort through conversation, deliver books and magazines, and assist nursing staff with non-medical tasks.",
  },
];

const Opportunities = () => {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  const filtered = useMemo(() => {
    return opportunities.filter((o) => {
      // Hide inactive organization opportunities fully
      if (o.orgIsActive === false) return false;

      // Search
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const match =
          o.title.toLowerCase().includes(q) ||
          o.org.toLowerCase().includes(q) ||
          o.skills.some((s) => s.toLowerCase().includes(q));
        if (!match) return false;
      }
      // Skills
      if (filters.skills.length > 0) {
        if (!filters.skills.some((s) => o.skills.includes(s))) return false;
      }
      // Org type
      if (filters.orgType !== "all" && o.orgType !== filters.orgType) return false;
      // Distance
      if (parseFloat(o.distance) > filters.distance) return false;
      return true;
    });
  }, [filters]);
>>>>>>> ea71196db2b2d45c0d03ad964ec61df1b885cd0b

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
<<<<<<< HEAD
                isHighlighted={false}
                onHover={() => {}}
                isApplied={isApplied}
                isFull={isFull}
                applying={applying === opp.opportunityId}
                onApply={() => handleApply(opp)}
=======
                isHighlighted={highlightedId === opp.id}
                onHover={setHighlightedId}
                onApply={setSelectedOpportunity}
>>>>>>> ea71196db2b2d45c0d03ad964ec61df1b885cd0b
              />
            );
          })}
        </div>
<<<<<<< HEAD
      )}
=======

        {/* Map */}
        <div className="lg:col-span-4">
          <div className="card-elevated overflow-hidden lg:sticky lg:top-8 h-[300px] lg:h-[calc(100vh-10rem)]">
            <div className="w-full h-full p-3">
              <OpportunityMap
                opportunities={filtered}
                highlightedId={highlightedId}
                onPinHover={setHighlightedId}
              />
            </div>
          </div>
        </div>
      </div>

      <ApplicationDialog
        opportunity={selectedOpportunity}
        isOpen={!!selectedOpportunity}
        onClose={() => setSelectedOpportunity(null)}
      />
>>>>>>> ea71196db2b2d45c0d03ad964ec61df1b885cd0b
    </div>
  );
};

export default Opportunities;
