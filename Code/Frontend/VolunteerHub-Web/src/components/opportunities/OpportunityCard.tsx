import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, Users, Star, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface Opportunity {
  id: number;
  title: string;
  org: string;
  orgId: string;
  orgType: string;
  distance: string;
  hours: string;
  skills: string[];
  date: string;
  spots: number;
  recommended: boolean;
  description: string;
  orgIsActive?: boolean;
}

interface Props {
  opportunity: Opportunity;
  index: number;
  isHighlighted: boolean;
  onHover: (id: number | null) => void;
  onApply: (opportunity: Opportunity) => void;
}

const OpportunityCard = ({ opportunity: opp, index, isHighlighted, onHover, onApply }: Props) => {
  const [isHovered, setIsHovered] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHover(opp.id);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`card-elevated p-5 cursor-pointer transition-all duration-200 ${isHighlighted ? "ring-2 ring-primary/40 shadow-elevated" : ""
        }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
              {opp.title}
            </h3>
            {opp.recommended && (
              <Badge className="bg-secondary/10 text-secondary border-0 text-[10px] shrink-0">
                <Star className="w-3 h-3 mr-0.5" />
                Match
              </Badge>
            )}
          </div>

          {/* Org */}
          <p className="text-xs text-muted-foreground">{opp.org}</p>

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {opp.distance}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {opp.hours}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {opp.spots} spots
            </span>
          </div>

          {/* Skills */}
          <div className="flex gap-1 flex-wrap">
            {opp.skills.map((s) => (
              <span
                key={s}
                className="px-2 py-0.5 rounded-md bg-muted text-[11px] text-muted-foreground"
              >
                {s}
              </span>
            ))}
          </div>

          {/* Expanded description on hover */}
          <motion.div
            initial={false}
            animate={{
              height: isHovered ? "auto" : 0,
              opacity: isHovered ? 1 : 0,
            }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-xs text-muted-foreground italic pt-1 leading-relaxed">
              {opp.description}
            </p>
          </motion.div>
        </div>

        {/* Right side */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-[11px] text-muted-foreground font-medium">{opp.date}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSaved(!saved);
            }}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${saved ? "fill-destructive text-destructive" : "text-muted-foreground"
                }`}
            />
          </button>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onApply(opp);
              }}
              className="bg-accent text-accent-foreground hover:bg-accent/90 text-xs font-semibold shadow-sm"
            >
              Apply
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default OpportunityCard;
