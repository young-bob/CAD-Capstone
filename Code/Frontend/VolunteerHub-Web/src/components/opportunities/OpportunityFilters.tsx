import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const skillOptions = [
  "Food Handling",
  "Customer Service",
  "Communication",
  "Teaching",
  "Animal Care",
  "Physical Labor",
  "Empathy",
  "Math",
  "English",
  "Outdoor",
];

const orgTypes = ["Food Bank", "Healthcare", "Education", "Environment", "Animal Welfare", "Community"];

export interface Filters {
  search: string;
  skills: string[];
  orgType: string;
  distance: number;
  date: string;
}

const defaultFilters: Filters = {
  search: "",
  skills: [],
  orgType: "all",
  distance: 5,
  date: "any",
};

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const OpportunityFilters = ({ filters, onChange }: Props) => {
  const [expanded, setExpanded] = useState(true);

  const toggleSkill = (skill: string) => {
    const next = filters.skills.includes(skill)
      ? filters.skills.filter((s) => s !== skill)
      : [...filters.skills, skill];
    onChange({ ...filters, skills: next });
  };

  const activeCount =
    filters.skills.length +
    (filters.orgType !== "all" ? 1 : 0) +
    (filters.distance !== 5 ? 1 : 0) +
    (filters.date !== "any" ? 1 : 0);

  return (
    <aside className="space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search opportunities, skills..."
          className="pl-10"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      {/* Toggle filters */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeCount > 0 && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">
              {activeCount}
            </Badge>
          )}
        </button>
        {activeCount > 0 && (
          <button
            onClick={() => onChange(defaultFilters)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-5 animate-fade-in">
          {/* Skills */}
          <div className="space-y-2.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Skills
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {skillOptions.map((skill) => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                    filters.skills.includes(skill)
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  }`}
                >
                  {skill}
                  {filters.skills.includes(skill) && (
                    <X className="w-3 h-3 ml-1 inline" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Organization Type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Organization Type
            </Label>
            <Select
              value={filters.orgType}
              onValueChange={(v) => onChange({ ...filters, orgType: v })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {orgTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Distance */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Distance
              </Label>
              <span className="text-xs font-medium text-foreground">
                {filters.distance} km
              </span>
            </div>
            <Slider
              value={[filters.distance]}
              onValueChange={([v]) => onChange({ ...filters, distance: v })}
              min={1}
              max={20}
              step={1}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>1 km</span>
              <span>20 km</span>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Availability
            </Label>
            <Select
              value={filters.date}
              onValueChange={(v) => onChange({ ...filters, date: v })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Any time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this-week">This week</SelectItem>
                <SelectItem value="this-weekend">This weekend</SelectItem>
                <SelectItem value="next-week">Next week</SelectItem>
                <SelectItem value="flexible">Flexible schedule</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </aside>
  );
};

export { defaultFilters };
export default OpportunityFilters;
