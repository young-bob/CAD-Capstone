import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Users, Shield, Settings, BarChart3, Bell, Plus, Loader2, Trash2, Pencil } from "lucide-react";
import StatCard from "../components/StatCard";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService, OrganizationProfile } from "@/services/adminService";
import CreateOrganizationDialog from "@/components/admin/CreateOrganizationDialog";
import EditOrganizationDialog from "@/components/admin/EditOrganizationDialog";
import { toast } from "sonner";

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationProfile | null>(null);
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);

  const { data: organizations = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: adminService.getOrganizations,
  });

  const { data: volunteers = [], isLoading: loadingVols } = useQuery({
    queryKey: ['admin-volunteers'],
    queryFn: adminService.getVolunteers,
  });

  const handleDeleteOrganization = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;

    setDeletingOrgId(id);
    try {
      await adminService.deleteOrganization(id);
      toast.success(`${name} deleted successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
    } catch (error) {
      toast.error(`Failed to delete ${name}`);
      console.error(error);
    } finally {
      setDeletingOrgId(null);
    }
  };

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
          <Button
            className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={() => setIsCreateOrgOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Organization
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Organizations" value={organizations.length.toString()} change="Latest Data" changeType="neutral" />
        <StatCard icon={Users} label="Total Volunteers" value={volunteers.length.toString()} change="Latest Data" changeType="neutral" iconBg="bg-secondary/10" />
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
            {loadingOrgs ? (
              <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : organizations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No organizations found.</p>
            ) : (
              organizations.map((org, i) => (
                <motion.div
                  key={org.organizationId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      window.location.href = `/admin/organizations/${org.organizationId}`;
                    }}
                  >
                    <p className="text-sm font-medium text-foreground hover:underline">{org.name}</p>
                    <p className="text-xs text-muted-foreground">{org.description || "No description"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge-status ${org.isVerified ? "badge-success" : "badge-pending"}`}>
                      {org.isVerified ? "Verified" : "Unverified"}
                    </span>
                    <div className="flex items-center gap-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
                        onClick={() => setEditingOrg(org)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                        onClick={() => handleDeleteOrganization(org.organizationId, org.name)}
                        disabled={deletingOrgId === org.organizationId}
                      >
                        {deletingOrgId === org.organizationId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">Recent Volunteers</h2>
            <Button variant="ghost" size="sm" className="text-xs">View All</Button>
          </div>
          <div className="space-y-3">
            {loadingVols ? (
              <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : volunteers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No volunteers found.</p>
            ) : (
              volunteers.map((user, i) => (
                <motion.div
                  key={user.userId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center text-xs font-semibold text-secondary">
                    {user.name ? user.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2) : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.email}</p>
                  </div>
                </motion.div>
              ))
            )}
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

      <CreateOrganizationDialog
        isOpen={isCreateOrgOpen}
        onClose={() => setIsCreateOrgOpen(false)}
      />

      <EditOrganizationDialog
        isOpen={!!editingOrg}
        onClose={() => setEditingOrg(null)}
        organization={editingOrg}
      />
    </div>
  );
};

export default AdminDashboard;
