import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { fetchApi } from "@/lib/apiClient";
import { opportunityService } from "@/services/opportunityService";
import { toast } from "sonner";

const CreateOpportunity = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    visibility: "Public" as "Public" | "Internal",
    startTime: "",
    endTime: "",
    maxVolunteers: 10,
    geoFenceRadius: 100,
    address: "",
    city: "",
    province: "",
    postalCode: "",
  });

  useEffect(() => {
    if (!user?.id) return;
    fetchApi<{ organizationId: string | null }>(`/coordinator/${user.id}`)
      .then(c => setOrgId(c.organizationId))
      .catch(() => toast.error("Could not load coordinator info"));
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      toast.error("Coordinator is not linked to an organization");
      return;
    }

    setSaving(true);
    try {
      await opportunityService.create({
        organizationId: orgId,
        title: form.title,
        description: form.description,
        visibility: form.visibility,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        maxVolunteers: form.maxVolunteers,
        geoFenceRadius: form.geoFenceRadius,
        venueLocation: {
          latitude: 0,
          longitude: 0,
          address: form.address,
          city: form.city,
          province: form.province,
          postalCode: form.postalCode,
        },
      });
      toast.success("Opportunity created!");
      navigate("/coordinator/opportunities");
    } catch {
      toast.error("Failed to create opportunity");
    } finally {
      setSaving(false);
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/coordinator/opportunities")} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <h1 className="page-title">Create Opportunity</h1>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="card-elevated p-6 space-y-5"
      >
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={set("title")} placeholder="Opportunity title" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={form.description}
              onChange={set("description")}
              placeholder="Describe the opportunity..."
              required
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Start Time</Label>
              <Input id="startTime" type="datetime-local" value={form.startTime} onChange={set("startTime")} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">End Time</Label>
              <Input id="endTime" type="datetime-local" value={form.endTime} onChange={set("endTime")} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="maxVolunteers">Max Volunteers</Label>
              <Input
                id="maxVolunteers"
                type="number"
                min={1}
                value={form.maxVolunteers}
                onChange={e => setForm(prev => ({ ...prev, maxVolunteers: Number(e.target.value) }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <Select
                value={form.visibility}
                onValueChange={v => setForm(prev => ({ ...prev, visibility: v as "Public" | "Internal" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Public">Public</SelectItem>
                  <SelectItem value="Internal">Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={set("address")} placeholder="Street address" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={set("city")} placeholder="City" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="province">Province</Label>
              <Input id="province" value={form.province} onChange={set("province")} placeholder="ON" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" value={form.postalCode} onChange={set("postalCode")} placeholder="A1B 2C3" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate("/coordinator/opportunities")}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create Opportunity"}
          </Button>
        </div>
      </motion.form>
    </div>
  );
};

export default CreateOpportunity;
