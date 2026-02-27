import { motion } from "framer-motion";
import { BarChart3, TrendingUp, AlertTriangle, Download, Users, Calendar, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatCard from "../components/StatCard";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const forecastData = [
  { day: "Mon", predicted: 12, registered: 10 },
  { day: "Tue", predicted: 8, registered: 7 },
  { day: "Wed", predicted: 15, registered: 9 },
  { day: "Thu", predicted: 10, registered: 10 },
  { day: "Fri", predicted: 6, registered: 6 },
  { day: "Sat", predicted: 20, registered: 14 },
  { day: "Sun", predicted: 18, registered: 11 },
];

const monthlyTrend = [
  { month: "Sep", hours: 120 },
  { month: "Oct", hours: 180 },
  { month: "Nov", hours: 210 },
  { month: "Dec", hours: 150 },
  { month: "Jan", hours: 240 },
  { month: "Feb", hours: 190 },
];

const suggestions = [
  { text: "Open 5 more slots for Saturday morning food distribution", urgency: "high" },
  { text: "Send reminders to 3 unconfirmed volunteers for Wednesday tutoring", urgency: "medium" },
  { text: "Consider recruiting for evening shelter shifts — consistent 50% vacancy", urgency: "high" },
  { text: "Top performer Jane D. approaching 40-hour milestone — prepare certificate", urgency: "low" },
];

const urgencyStyle: Record<string, string> = {
  high: "border-l-4 border-l-destructive bg-destructive/5",
  medium: "border-l-4 border-l-warning bg-warning/5",
  low: "border-l-4 border-l-info bg-info/5",
};

const Analytics = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Predictive Analytics</h1>
          <p className="page-subtitle">Forecast volunteer demand and optimize shift planning</p>
        </div>
        <div className="flex gap-3">
          <Select defaultValue="week">
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Users} label="Active Volunteers" value="47" change="+12% vs last month" changeType="positive" />
        <StatCard icon={Calendar} label="Shifts This Week" value="14" change="3 understaffed" changeType="negative" iconBg="bg-warning/10" />
        <StatCard icon={TrendingUp} label="Total Hours (MTD)" value="190" change="On track for 280" changeType="positive" iconBg="bg-secondary/10" />
        <StatCard icon={AlertTriangle} label="Coverage Gap" value="32%" change="Weekend shifts" changeType="negative" iconBg="bg-destructive/10" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Charts */}
        <div className="col-span-2 space-y-6">
          {/* Demand Forecast */}
          <div className="card-elevated p-6">
            <h2 className="text-base font-semibold text-foreground mb-1">Predicted Need vs. Registered</h2>
            <p className="text-xs text-muted-foreground mb-4">This week's volunteer demand forecast</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="predicted" name="Predicted Need" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.3} />
                  <Bar dataKey="registered" name="Registered" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Trend */}
          <div className="card-elevated p-6">
            <h2 className="text-base font-semibold text-foreground mb-1">Monthly Hours Trend</h2>
            <p className="text-xs text-muted-foreground mb-4">Total verified volunteer hours over time</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                    fill="url(#colorHours)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="space-y-4">
          <div className="card-elevated p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-accent" />
              Suggested Actions
            </h3>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`p-3 rounded-lg text-xs leading-relaxed text-foreground ${urgencyStyle[s.urgency]}`}
                >
                  {s.text}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Quick Summary */}
          <div className="card-elevated p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Coverage Summary</h3>
            <div className="space-y-3">
              {[
                { label: "Morning Shifts", value: 85, color: "bg-success" },
                { label: "Afternoon Shifts", value: 72, color: "bg-warning" },
                { label: "Evening Shifts", value: 48, color: "bg-destructive" },
                { label: "Weekend Shifts", value: 60, color: "bg-warning" },
              ].map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium text-foreground">{item.value}%</span>
                  </div>
                  <div className="progress-track">
                    <motion.div
                      className={`h-full rounded-full ${item.color}`}
                      initial={{ width: "0%" }}
                      animate={{ width: `${item.value}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
