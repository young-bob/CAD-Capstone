import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import OpportunityFilters, { Filters, defaultFilters } from "@/components/opportunities/OpportunityFilters";
import OpportunityCard, { Opportunity } from "@/components/opportunities/OpportunityCard";
import OpportunityMap from "@/components/opportunities/OpportunityMap";

const opportunities: Opportunity[] = [
  {
    id: 1,
    title: "Weekend Food Distribution",
    org: "City Food Bank",
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
    orgType: "Education",
    distance: "3.5 km",
    hours: "1.5 hrs",
    skills: ["Teaching", "Math", "English"],
    date: "Tue & Thu",
    spots: 2,
    recommended: false,
    description: "Tutor elementary and middle school students in math and English. Help with homework, build study skills, and inspire confidence in young learners.",
  },
  {
    id: 5,
    title: "Animal Shelter Assistant",
    org: "Happy Paws Shelter",
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

  const filtered = useMemo(() => {
    return opportunities.filter((o) => {
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

  const recommendedCount = filtered.filter((o) => o.recommended).length;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Discover Opportunities</h1>
        <p className="page-subtitle">
          Find volunteer positions near you that match your skills and interests
        </p>
      </div>

      {/* Smart recommendation banner */}
      {recommendedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary/10 border border-secondary/20"
        >
          <Sparkles className="w-4 h-4 text-secondary" />
          <p className="text-xs font-medium text-secondary">
            {recommendedCount} opportunities match your profile
          </p>
        </motion.div>
      )}

      {/* Main layout: Filters | List | Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Filter sidebar */}
        <div className="lg:col-span-3">
          <div className="card-elevated p-4 lg:sticky lg:top-8">
            <OpportunityFilters filters={filters} onChange={setFilters} />
          </div>
        </div>

        {/* Opportunity list */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground font-medium">
              {filtered.length} {filtered.length === 1 ? "opportunity" : "opportunities"} found
            </p>
          </div>
          {filtered.length === 0 ? (
            <div className="card-elevated p-10 text-center">
              <p className="text-sm font-medium text-foreground">No opportunities found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your filters or expanding the search radius
              </p>
            </div>
          ) : (
            filtered.map((opp, i) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                index={i}
                isHighlighted={highlightedId === opp.id}
                onHover={setHighlightedId}
              />
            ))
          )}
        </div>

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
    </div>
  );
};

export default Opportunities;
