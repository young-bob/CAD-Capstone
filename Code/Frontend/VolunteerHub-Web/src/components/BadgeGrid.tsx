import { motion } from "framer-motion";
import { Trophy, Star, Heart, Zap, Award } from "lucide-react";

const badges = [
  { icon: Star, label: "First Hour", earned: true, color: "text-warning" },
  { icon: Zap, label: "10 Hours", earned: true, color: "text-accent" },
  { icon: Heart, label: "Community Hero", earned: true, color: "text-destructive" },
  { icon: Trophy, label: "25 Hours", earned: false, color: "text-muted-foreground" },
  { icon: Award, label: "40 Hours", earned: false, color: "text-muted-foreground" },
];

const BadgeGrid = () => {
  return (
    <div className="flex flex-wrap gap-3">
      {badges.map((badge, i) => (
        <motion.div
          key={badge.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1, duration: 0.3 }}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
            badge.earned
              ? "bg-card border-border shadow-soft hover:shadow-elevated cursor-pointer"
              : "bg-muted/50 border-transparent opacity-50"
          }`}
          style={{ minWidth: 80 }}
        >
          <badge.icon className={`w-6 h-6 ${badge.earned ? badge.color : "text-muted-foreground"}`} />
          <span className="text-[11px] font-medium text-foreground text-center">{badge.label}</span>
        </motion.div>
      ))}
    </div>
  );
};

export default BadgeGrid;
