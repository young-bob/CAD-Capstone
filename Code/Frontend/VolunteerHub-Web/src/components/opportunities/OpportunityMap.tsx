import { MapPin } from "lucide-react";
import { motion } from "framer-motion";
import type { Opportunity } from "./OpportunityCard";

const pinPositions = [
  { top: "18%", left: "28%" },
  { top: "42%", left: "58%" },
  { top: "62%", left: "22%" },
  { top: "30%", left: "72%" },
  { top: "72%", left: "55%" },
  { top: "50%", left: "40%" },
];

interface Props {
  opportunities: Opportunity[];
  highlightedId: number | null;
  onPinHover: (id: number | null) => void;
}

const OpportunityMap = ({ opportunities, highlightedId, onPinHover }: Props) => {
  return (
    <div className="w-full h-full rounded-xl bg-gradient-to-br from-primary/5 via-background to-secondary/5 border border-border relative overflow-hidden">
      {/* Grid overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
        <defs>
          <pattern id="map-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#map-grid)" />
      </svg>

      {/* Decorative roads */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.08]">
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" strokeWidth="2" />
        <line x1="40%" y1="0" x2="40%" y2="100%" stroke="currentColor" strokeWidth="2" />
        <line x1="10%" y1="30%" x2="90%" y2="70%" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      {/* You are here marker */}
      <div className="absolute top-[48%] left-[38%] z-20">
        <div className="w-4 h-4 rounded-full bg-primary border-2 border-primary-foreground shadow-elevated" />
        <div className="absolute -inset-2 rounded-full bg-primary/20 animate-ping" />
      </div>

      {/* Pins */}
      {opportunities.slice(0, 6).map((opp, i) => {
        const pos = pinPositions[i];
        const isActive = highlightedId === opp.id;
        return (
          <motion.div
            key={opp.id}
            className="absolute z-10 cursor-pointer"
            style={{ top: pos.top, left: pos.left }}
            onMouseEnter={() => onPinHover(opp.id)}
            onMouseLeave={() => onPinHover(null)}
            animate={{
              scale: isActive ? 1.4 : 1,
              zIndex: isActive ? 30 : 10,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className="relative">
              <MapPin
                className={`w-6 h-6 transition-colors duration-200 drop-shadow-md ${
                  isActive
                    ? "text-accent fill-accent/20"
                    : opp.recommended
                    ? "text-secondary fill-secondary/20"
                    : "text-primary fill-primary/20"
                }`}
              />
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-card border border-border rounded-md px-2 py-1 shadow-elevated"
                >
                  <p className="text-[10px] font-semibold text-foreground">{opp.title}</p>
                  <p className="text-[9px] text-muted-foreground">{opp.distance}</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 z-20">
        <p className="text-[10px] font-semibold text-foreground mb-1.5">Map Legend</p>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[10px] text-muted-foreground">You</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-secondary" />
            <span className="text-[10px] text-muted-foreground">Recommended</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-[10px] text-muted-foreground">Selected</span>
          </div>
        </div>
      </div>

      {/* Count */}
      <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm border border-border rounded-lg px-2.5 py-1.5 z-20">
        <p className="text-[10px] font-medium text-foreground">
          {opportunities.length} nearby
        </p>
      </div>
    </div>
  );
};

export default OpportunityMap;
