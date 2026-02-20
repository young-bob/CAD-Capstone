import { motion } from "framer-motion";
import { Building2, Users, Shield, Settings, BarChart3, Bell, Plus } from "lucide-react";
import StatCard from "../components/StatCard";
import { Button } from "@/components/ui/button";

const organizations = [
  { name: "City Food Bank", volunteers: 42, shifts: 12, status: "active" },
  { name: "Community Garden Project", volunteers: 28, shifts: 8, status: "active" },
  { name: "Elder Care Center", volunteers: 15, shifts: 6, status: "active" },
  { name: "Youth Tutoring Alliance", volunteers: 35, shifts: 10, status: "pending" },
];

const recentUsers = [
  { name: "Jane Doe", role: "volunteer", joined: "Feb 10, 2026" },
  { name: "Mark Rivera", role: "coordinator", joined: "Feb 8, 2026" },
  { name: "Sarah Lee", role: "volunteer", joined: "Feb 7, 2026" },
  { name: "Tom Kim", role: "volunteer", joined: "Feb 5, 2026" },
];

const AdminDashboard = () => {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Admin Overview</h1>
          <p className="page-subtitle">Manage organizations, users, and system settings</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Settings className="w-4 h-4" />
            System Settings
          </Button>
          <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="w-4 h-4" />
            Add Organization
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Organizations" value="4" change="+1 this month" changeType="positive" />
        <StatCard icon={Users} label="Total Users" value="120" change="+12 this week" changeType="positive" iconBg="bg-secondary/10" />
        <StatCard icon={Shield} label="Coordinators" value="8" change="Active" changeType="neutral" iconBg="bg-info/10" />
        <StatCard icon={BarChart3} label="Verified Hours" value="3,240" change="+340 this week" changeType="positive" iconBg="bg-success/10" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Organizations */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Organizations</h2>
            <Button variant="ghost" size="sm" className="text-xs">View All</Button>
          </div>
          <div className="space-y-3">
            {organizations.map((org, i) => (
              <motion.div
                key={org.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{org.name}</p>
                  <p className="text-xs text-muted-foreground">{org.volunteers} volunteers · {org.shifts} shifts</p>
                </div>
                <span className={`badge-status ${org.status === "active" ? "badge-success" : "badge-pending"}`}>
                  {org.status}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Recent Users */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Recent Users</h2>
            <Button variant="ghost" size="sm" className="text-xs">View All</Button>
          </div>
          <div className="space-y-3">
            {recentUsers.map((user, i) => (
              <motion.div
                key={user.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center text-xs font-semibold text-secondary">
                  {user.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role} · Joined {user.joined}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* System Notifications */}
      <div className="card-elevated p-6">
        <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          System Notifications
        </h2>
        <div className="space-y-2">
          {[
            "New organization 'Youth Tutoring Alliance' pending approval",
            "System backup completed successfully at 3:00 AM",
            "2 coordinators awaiting role approval",
          ].map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className="p-3 rounded-lg bg-muted/40 text-sm text-foreground"
            >
              {msg}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
