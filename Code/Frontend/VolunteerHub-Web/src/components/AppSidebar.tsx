import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Award,
  ClipboardCheck,
  BarChart3,
  Bell,
  Settings,
  Shield,
  LogOut,
  Building2,
<<<<<<< HEAD
  Briefcase,
  Users,
  FileText,
  ClipboardList,
=======
  Building,
>>>>>>> ea71196db2b2d45c0d03ad964ec61df1b885cd0b
} from "lucide-react";
import { useAuth, AppRole } from "@/contexts/AuthContext";

const volunteerNav = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/opportunities", icon: Search, label: "Opportunities" },
  { to: "/volunteer/applications", icon: FileText, label: "My Applications" },
  { to: "/volunteer/enrollments", icon: ClipboardList, label: "My Enrollments" },
  { to: "/certificates", icon: Award, label: "Certificates" },
];

const coordinatorNav = [
<<<<<<< HEAD
  { to: "/coordinator/opportunities", icon: Briefcase, label: "My Opportunities" },
  { to: "/coordinator/enrollments", icon: Users, label: "Enrollments" },
=======
  { to: "/coordinator", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/opportunities", icon: Search, label: "Opportunities" },
>>>>>>> ea71196db2b2d45c0d03ad964ec61df1b885cd0b
  { to: "/attendance", icon: ClipboardCheck, label: "Attendance" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
];

const adminNav = [
  { to: "/admin", icon: Building2, label: "Admin Overview" },
  { to: "/admin/users", icon: ClipboardCheck, label: "Users" },
  { to: "/admin/organizations", icon: Building, label: "Organizations" },
];

const organizationManagerNav = [
  { to: "/organization/dashboard", icon: Building2, label: "Org Dashboard" },
];

function getNavItems(role: AppRole) {
  if (role === "admin") return adminNav;
  if (role === "coordinator") return coordinatorNav;
  if (role === "organizationmanager") return organizationManagerNav;
  return volunteerNav;
}

function getInitials(name?: string, email?: string) {
  if (name) return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  if (email) return email[0].toUpperCase();
  return "U";
}

const AppSidebar = () => {
  const { primaryRole, user, signOut } = useAuth();
  const navItems = getNavItems(primaryRole);
  const displayName = user?.email ?? "User";
  const initials = getInitials(undefined, user?.email);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-3 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold text-sidebar-foreground tracking-tight">VolunteerHub</h1>
          <p className="text-[11px] text-sidebar-muted">Verified Hours Platform</p>
        </div>
      </div>

      {/* Role Badge */}
      <div className="px-3 pt-4 pb-2">
        <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-primary/10 text-sidebar-foreground text-xs font-medium">
          <Shield className="w-3.5 h-3.5" />
          <span className="capitalize">{primaryRole}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/" || item.to === "/admin"}
            className={({ isActive }) =>
              `nav-link ${isActive ? "active" : ""}`
            }
          >
            <item.icon className="w-[18px] h-[18px]" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-1">
        <button className="nav-link w-full">
          <Bell className="w-[18px] h-[18px]" />
          <span>Notifications</span>
          <span className="ml-auto bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">3</span>
        </button>
        <button className="nav-link w-full">
          <Settings className="w-[18px] h-[18px]" />
          <span>Settings</span>
        </button>
        <button onClick={signOut} className="nav-link w-full text-destructive/70 hover:text-destructive">
          <LogOut className="w-[18px] h-[18px]" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-t border-sidebar-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-xs font-semibold text-sidebar-primary">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-sidebar-foreground truncate">{displayName}</p>
          <p className="text-[11px] text-sidebar-muted truncate capitalize">{primaryRole}</p>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
