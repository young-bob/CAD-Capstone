import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Download,
  QrCode,
  FileText,
  CheckCircle2,
  Shield,
  Fingerprint,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

const organizations = [
  { id: "1", name: "City Food Bank", hours: 12 },
  { id: "2", name: "Elder Care Center", hours: 8 },
  { id: "3", name: "Community Garden", hours: 6 },
  { id: "all", name: "All Organizations", hours: 28 },
];

const Certificates = () => {
  const [selectedOrg, setSelectedOrg] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [certType, setCertType] = useState("official");
  const [generated, setGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);

  const org = organizations.find((o) => o.id === selectedOrg);

  const handleGenerate = () => {
    setGenerating(true);
    setGenerated(false);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6" style={{ fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="page-header">
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          Certificate Generator
        </h1>
        <p className="page-subtitle">
          Instantly generate and download verified PDF certificates
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — Controls */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-2xl border border-border p-6 space-y-5" style={{ boxShadow: "var(--shadow-card)" }}>
            {/* Organization */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Organization
              </label>
              <Select value={selectedOrg} onValueChange={(v) => { setSelectedOrg(v); setGenerated(false); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name} — {o.hours} hrs
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Date Range
              </label>
              <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setGenerated(false); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last 3 Months</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Certificate Type */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Certificate Type
              </label>
              <Select value={certType} onValueChange={(v) => { setCertType(v); setGenerated(false); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="official">Official Verified Certificate</SelectItem>
                  <SelectItem value="summary">Hours Summary Report</SelectItem>
                  <SelectItem value="letter">Reference Letter Template</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-3">
              <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
                <Button
                  className="w-full gap-2 rounded-xl h-11 font-semibold text-sm bg-warning text-warning-foreground hover:brightness-110 transition-all"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Generate Certificate
                    </>
                  )}
                </Button>
              </motion.div>

              <AnimatePresence>
                {generated && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full gap-2 rounded-xl h-11 border-success/40 text-success hover:bg-success/5"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Confirmation message */}
          <AnimatePresence>
            {generated && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-success/10 border border-success/20 rounded-2xl p-4 flex items-center gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-success">Certificate ready for download</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Your verified PDF has been generated successfully.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trust indicators */}
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Digitally Verified</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Certificates include a QR code for instant verification. Accepted by schools, institutions, and government programs.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Fingerprint className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Digital Signature</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Each certificate is cryptographically signed to prevent tampering and ensure authenticity.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right — PDF Preview */}
        <div className="lg:col-span-3">
          <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: "var(--shadow-elevated)" }}>
            {/* Preview toolbar */}
            <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-muted/30">
              <span className="text-sm font-semibold text-primary">Certificate Preview</span>
              <AnimatePresence>
                {generated && (
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="badge-success"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Ready
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Scrollable preview */}
            <ScrollArea className="h-[620px]">
              <div className="p-8 bg-muted/20 min-h-[620px] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {generating ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <Sparkles className="w-8 h-8 text-warning animate-pulse" />
                      <p className="text-sm text-muted-foreground">Generating your certificate…</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="cert"
                      initial={{ opacity: 0, scale: 0.96, y: 12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 22 }}
                      className="w-full max-w-lg bg-card rounded-2xl p-10 border border-border"
                      style={{ boxShadow: "var(--shadow-elevated)" }}
                    >
                      {/* Certificate body */}
                      <div className="text-center space-y-6">
                        {/* Icon */}
                        <div className="flex justify-center">
                          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                            <Award className="w-8 h-8 text-primary" />
                          </div>
                        </div>

                        {/* Title & name */}
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
                            Certificate of Volunteer Service
                          </p>
                          <h2 className="text-2xl font-semibold text-foreground mt-2">
                            Jane Doe
                          </h2>
                        </div>

                        {/* Hours block */}
                        <div className="border-t border-b border-border py-5 space-y-2">
                          <p className="text-sm text-muted-foreground">Has successfully completed</p>
                          <p className="text-5xl font-bold text-primary tabular-nums">
                            {org?.hours || 28}
                          </p>
                          <p className="text-sm text-muted-foreground">verified volunteer hours</p>
                          <p className="text-xs text-muted-foreground">
                            at{" "}
                            <span className="font-semibold text-foreground">
                              {org?.name || "Multiple Organizations"}
                            </span>
                          </p>
                        </div>

                        {/* Footer: date, QR, cert ID */}
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Issue Date</p>
                            <p className="text-sm font-medium text-foreground">Feb 18, 2026</p>
                          </div>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <motion.div
                                whileHover={{ scale: 1.08 }}
                                className="w-16 h-16 bg-muted/60 rounded-xl flex items-center justify-center border border-border cursor-help"
                              >
                                <QrCode className="w-10 h-10 text-foreground/30" />
                              </motion.div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[200px] text-center">
                              <p className="text-xs">
                                Scan this QR code to instantly verify the authenticity of this certificate online.
                              </p>
                            </TooltipContent>
                          </Tooltip>

                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Certificate ID</p>
                            <p className="text-sm font-medium font-mono text-foreground">VH-2026-0847</p>
                          </div>
                        </div>

                        {/* Digital signature indicator */}
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <Fingerprint className="w-3.5 h-3.5 text-success" />
                          <span className="text-[10px] text-success font-medium uppercase tracking-wider">
                            Digitally Signed &amp; Verified
                          </span>
                        </div>

                        <p className="text-[9px] text-muted-foreground leading-relaxed">
                          This certificate is cryptographically signed and can be verified by scanning the QR code above.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Certificates;
