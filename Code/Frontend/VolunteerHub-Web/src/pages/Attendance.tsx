import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, CheckCircle2, Clock, AlertTriangle, QrCode, Navigation, ChevronDown, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatCard from "../components/StatCard";

const shifts = [
  {
    id: 1,
    title: "Morning Food Distribution",
    date: "Feb 11, 2026 — 9:00 AM",
    skills: ["Food Handling"],
    registered: 8,
    needed: 10,
    volunteers: [
      { name: "Jane D.", status: "checked-in", method: "GPS", time: "8:52 AM" },
      { name: "Mark R.", status: "checked-in", method: "QR", time: "8:58 AM" },
      { name: "Sarah L.", status: "checked-in", method: "GPS", time: "9:01 AM" },
      { name: "Tom K.", status: "pending", method: "—", time: "—" },
      { name: "Amy W.", status: "missing", method: "—", time: "—" },
    ],
  },
  {
    id: 2,
    title: "Afternoon Tutoring",
    date: "Feb 11, 2026 — 2:00 PM",
    skills: ["Teaching", "Math"],
    registered: 4,
    needed: 4,
    volunteers: [
      { name: "Lisa P.", status: "checked-in", method: "QR", time: "1:55 PM" },
      { name: "James H.", status: "checked-in", method: "GPS", time: "1:58 PM" },
      { name: "Kim T.", status: "pending", method: "—", time: "—" },
      { name: "David M.", status: "pending", method: "—", time: "—" },
    ],
  },
  {
    id: 3,
    title: "Evening Shelter Support",
    date: "Feb 11, 2026 — 6:00 PM",
    skills: ["Communication"],
    registered: 3,
    needed: 6,
    volunteers: [
      { name: "Noah B.", status: "pending", method: "—", time: "—" },
      { name: "Emma S.", status: "pending", method: "—", time: "—" },
      { name: "Chris V.", status: "pending", method: "—", time: "—" },
    ],
  },
];

const statusConfig: Record<string, { dot: string; label: string; badge: string }> = {
  "checked-in": { dot: "status-dot-success", label: "Checked In", badge: "badge-success" },
  pending: { dot: "status-dot-warning", label: "Pending", badge: "badge-warning" },
  missing: { dot: "status-dot-destructive", label: "Missing", badge: "badge-status bg-destructive/10 text-destructive" },
};

const alerts = [
  { text: "Amy W. hasn't checked in for Morning Food Distribution", type: "warning" },
  { text: "GPS anomaly detected for check-in at Elder Care Center", type: "error" },
  { text: "Evening shift at Shelter has 50% vacancy", type: "warning" },
];

const Attendance = () => {
  const [expandedShift, setExpandedShift] = useState<number>(1);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Attendance Console</h1>
          <p className="page-subtitle">Real-time volunteer check-in tracking and verification</p>
        </div>
        <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
          <QrCode className="w-4 h-4" />
          Generate QR Code
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Registered" value="15" change="3 shifts today" changeType="neutral" />
        <StatCard icon={CheckCircle2} label="Checked In" value="5" change="33% attendance" changeType="positive" iconBg="bg-success/10" />
        <StatCard icon={Clock} label="Pending" value="7" change="Awaiting check-in" changeType="neutral" iconBg="bg-warning/10" />
        <StatCard icon={AlertTriangle} label="Alerts" value="3" change="Requires attention" changeType="negative" iconBg="bg-destructive/10" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Shifts List */}
        <div className="col-span-2 space-y-3">
          {shifts.map((shift, si) => (
            <motion.div
              key={shift.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.05 }}
              className="card-elevated overflow-hidden"
            >
              <button
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedShift(expandedShift === shift.id ? 0 : shift.id)}
              >
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-foreground">{shift.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{shift.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    {shift.skills.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">{s}</span>
                    ))}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {shift.registered}/{shift.needed}
                  </span>
                  <div className="progress-track w-20">
                    <div
                      className={`h-full rounded-full transition-all ${shift.registered / shift.needed >= 0.8 ? "bg-success" : shift.registered / shift.needed >= 0.5 ? "bg-warning" : "bg-destructive"}`}
                      style={{ width: `${(shift.registered / shift.needed) * 100}%` }}
                    />
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedShift === shift.id ? "rotate-180" : ""}`} />
                </div>
              </button>

              {expandedShift === shift.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="border-t border-border"
                >
                  <div className="px-5 py-3">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-muted-foreground">
                          <th className="text-left py-2 font-medium">Volunteer</th>
                          <th className="text-left py-2 font-medium">Status</th>
                          <th className="text-left py-2 font-medium">Method</th>
                          <th className="text-left py-2 font-medium">Time</th>
                          <th className="text-right py-2 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shift.volunteers.map((v, vi) => (
                          <tr key={vi} className="border-t border-border/50">
                            <td className="py-2.5 text-sm font-medium text-foreground">{v.name}</td>
                            <td className="py-2.5">
                              <span className={statusConfig[v.status].badge}>
                                <span className={statusConfig[v.status].dot} />
                                {statusConfig[v.status].label}
                              </span>
                            </td>
                            <td className="py-2.5 text-sm text-muted-foreground">
                              {v.method !== "—" && (
                                <span className="flex items-center gap-1">
                                  {v.method === "GPS" ? <Navigation className="w-3 h-3" /> : <QrCode className="w-3 h-3" />}
                                  {v.method}
                                </span>
                              )}
                              {v.method === "—" && <span>—</span>}
                            </td>
                            <td className="py-2.5 text-sm text-muted-foreground">{v.time}</td>
                            <td className="py-2.5 text-right">
                              {v.status !== "checked-in" && (
                                <Button size="sm" variant="outline" className="h-7 text-xs">
                                  Approve
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Right Column: Map + Alerts */}
        <div className="space-y-4">
          {/* Live Map */}
          <div className="card-elevated overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="status-dot-info" />
                Live Check-ins
              </h3>
            </div>
            <div className="h-52 bg-muted/30 flex items-center justify-center relative">
              <div className="absolute inset-0">
                <svg className="absolute inset-0 w-full h-full opacity-[0.06]">
                  <defs>
                    <pattern id="grid2" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid2)" />
                </svg>
                {/* Geofence circle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-dashed border-primary/20" />
                <div className="absolute top-[35%] left-[40%] w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                <div className="absolute top-[45%] left-[55%] w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                <div className="absolute top-[55%] left-[48%] w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
              </div>
              <div className="relative z-10 text-center">
                <MapPin className="w-6 h-6 text-primary mx-auto" />
                <p className="text-xs text-muted-foreground mt-1">Geofence Active</p>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="card-elevated p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Active Alerts
            </h3>
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`p-3 rounded-lg text-xs leading-relaxed ${
                    alert.type === "error" ? "bg-destructive/5 text-destructive" : "bg-warning/5 text-warning-foreground"
                  }`}
                >
                  {alert.text}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
