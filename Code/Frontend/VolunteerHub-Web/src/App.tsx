import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Opportunities from "./pages/Opportunities";
import Certificates from "./pages/Certificates";
import Attendance from "./pages/Attendance";
import Analytics from "./pages/Analytics";
import AdminDashboard from "./pages/AdminDashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import CoordinatorOpportunities from "./pages/CoordinatorOpportunities";
import CreateOpportunity from "./pages/CreateOpportunity";
import EditOpportunity from "./pages/EditOpportunity";
import ApplicationsReview from "./pages/ApplicationsReview";
import CoordinatorEnrollments from "./pages/CoordinatorEnrollments";
import VolunteerApplications from "./pages/VolunteerApplications";
import VolunteerEnrollments from "./pages/VolunteerEnrollments";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const AppRoutes = () => {
  const { session, primaryRole, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <Auth />;

  return (
    <AppLayout>
      <Routes>
        {/* Volunteer routes */}
        {primaryRole === "volunteer" && (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/volunteer/applications" element={<VolunteerApplications />} />
            <Route path="/volunteer/enrollments" element={<VolunteerEnrollments />} />
            <Route path="/certificates" element={<Certificates />} />
          </>
        )}

        {/* Coordinator routes */}
        {primaryRole === "coordinator" && (
          <>
            <Route path="/" element={<Navigate to="/coordinator/opportunities" replace />} />
            <Route path="/coordinator/opportunities" element={<CoordinatorOpportunities />} />
            <Route path="/coordinator/opportunities/new" element={<CreateOpportunity />} />
            <Route path="/coordinator/opportunities/:id/edit" element={<EditOpportunity />} />
            <Route path="/coordinator/opportunities/:id/applications" element={<ApplicationsReview />} />
            <Route path="/coordinator/enrollments" element={<CoordinatorEnrollments />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/analytics" element={<Analytics />} />
          </>
        )}

        {/* Admin routes */}
        {primaryRole === "admin" && (
          <>
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/opportunities" element={<Opportunities />} />
            <Route path="/certificates" element={<Certificates />} />
          </>
        )}

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
