import { motion } from "framer-motion";
import { Clock, CheckCircle2, XCircle, AlertCircle, Calendar, MapPin, FileText, Award } from "lucide-react";
import StatCard from "../components/StatCard";
import ProgressRing from "../components/ProgressRing";
import BadgeGrid from "../components/BadgeGrid";
import { Button } from "@/components/ui/button";

const hoursBreakdown = [
  { label: "Approved", value: 28, color: "bg-success" },
  { label: "Pending", value: 4, color: "bg-warning" },
  { label: "Rejected", value: 1, color: "bg-destructive" },
];

const notifications = [
  { text: "Upcoming shift at Food Bank tomorrow at 9 AM", icon: Calendar, time: "2h ago" },
  { text: "Your CPR certification expires in 14 days", icon: AlertCircle, time: "5h ago" },
  { text: "4 pending hours approved by coordinator", icon: CheckCircle2, time: "1d ago" },
];

const recentActivity = [
  { org: "City Food Bank", date: "Feb 8, 2026", hours: 3, status: "approved" },
  { org: "Community Garden", date: "Feb 5, 2026", hours: 2, status: "approved" },
  { org: "Elder Care Center", date: "Feb 3, 2026", hours: 4, status: "pending" },
  { org: "Animal Shelter", date: "Jan 30, 2026", hours: 2, status: "approved" },
];

const Dashboard = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Welcome back, Jane 👋</h1>
          <p className="page-subtitle">Track your volunteer progress and upcoming opportunities</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            My Calendar
          </Button>
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Award className="w-4 h-4" />
            Generate Certificate
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Total Hours" value="32" change="+4 this week" changeType="positive" />
        <StatCard icon={CheckCircle2} label="Approved" value="28" change="87.5% approval" changeType="positive" iconBg="bg-success/10" />
        <StatCard icon={AlertCircle} label="Pending" value="4" change="Under review" changeType="neutral" iconBg="bg-warning/10" />
        <StatCard icon={XCircle} label="Remaining" value="8" change="Est. 2 weeks" changeType="neutral" iconBg="bg-info/10" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Progress + Badges */}
        <div className="col-span-2 space-y-6">
          <div className="card-elevated p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Progress to 40 Hours</h2>
            <div className="flex items-center gap-8">
              <ProgressRing value={32} max={40} label="Required" />
              <div className="flex-1 space-y-3">
                {hoursBreakdown.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm text-muted-foreground flex-1">{item.label}</span>
                    <span className="text-sm font-semibold text-foreground">{item.value} hrs</span>
                  </div>
                ))}
                <div className="pt-2">
                  <div className="progress-track">
                    <motion.div
                      className="progress-fill-secondary"
                      initial={{ width: "0%" }}
                      animate={{ width: "80%" }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">80% complete — keep going!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="card-elevated p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Achievements</h2>
            <BadgeGrid />
          </div>

          {/* Recent Activity */}
          <div className="card-elevated p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {recentActivity.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.org}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{item.hours}h</span>
                  <span className={`badge-status ${
                    item.status === "approved" ? "badge-success" : "badge-pending"
                  }`}>
                    {item.status === "approved" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {item.status}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions + Notifications */}
        <div className="space-y-6">
          <div className="card-elevated p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-3">
                <MapPin className="w-4 h-4 text-primary" />
                View Opportunities
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <FileText className="w-4 h-4 text-secondary" />
                Generate Certificate
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3">
                <Calendar className="w-4 h-4 text-accent" />
                My Calendar
              </Button>
            </div>
          </div>

          <div className="card-elevated p-6">
            <h2 className="text-base font-semibold text-foreground mb-4">Notifications</h2>
            <div className="space-y-3">
              {notifications.map((n, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <n.icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-foreground leading-snug">{n.text}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{n.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
