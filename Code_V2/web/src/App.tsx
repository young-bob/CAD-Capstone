import { useState, useEffect } from 'react';
import type { ViewName } from './types';
import { AuthProvider, useAuth } from './hooks/useAuth';

import AppHeader from './components/AppHeader';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';

import { VolDashboard, VolOpportunities, VolApplications, VolAttendance, VolCertificates, VolProfile } from './pages/volunteer';
import { CoordDashboard, CoordManageEvents, CoordApplications, CoordCertTemplates } from './pages/coordinator';
import { AdminDashboard, AdminOrgs, AdminDisputes, AdminUsers } from './pages/admin';

function AppInner() {
    const auth = useAuth();
    const [currentView, setCurrentView] = useState<ViewName>('landing');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Map backend role string to display role for sidebar/header
    const displayRole = auth.role === 'SystemAdmin' ? 'admin' : auth.role === 'Coordinator' ? 'coordinator' : 'volunteer';

    // Auto-navigate based on auth state
    useEffect(() => {
        if (auth.loading) return;
        if (auth.token && (currentView === 'landing' || currentView === 'login')) {
            setCurrentView('dashboard');
        }
        if (!auth.token && currentView !== 'landing' && currentView !== 'login') {
            setCurrentView('landing');
        }
    }, [auth.token, auth.loading, currentView]);

    const handleLogout = () => {
        auth.logout();
        setCurrentView('landing');
    };

    if (auth.loading) {
        return (
            <div className="min-h-screen bg-[#fffdfa] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-stone-500 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        if (displayRole === 'volunteer') {
            switch (currentView) {
                case 'dashboard': return <VolDashboard onNavigate={setCurrentView} />;
                case 'opportunities': return <VolOpportunities />;
                case 'applications': return <VolApplications />;
                case 'attendance': return <VolAttendance />;
                case 'certificates': return <VolCertificates />;
                case 'profile': return <VolProfile />;
                default: return <VolDashboard onNavigate={setCurrentView} />;
            }
        }
        if (displayRole === 'coordinator') {
            switch (currentView) {
                case 'dashboard': return <CoordDashboard />;
                case 'manage_events': return <CoordManageEvents />;
                case 'org_applications': return <CoordApplications />;
                case 'manage_templates': return <CoordCertTemplates />;
                default: return <CoordDashboard />;
            }
        }
        if (displayRole === 'admin') {
            switch (currentView) {
                case 'dashboard': return <AdminDashboard />;
                case 'admin_orgs': return <AdminOrgs />;
                case 'admin_disputes': return <AdminDisputes />;
                case 'admin_users': return <AdminUsers />;
                default: return <AdminDashboard />;
            }
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-[#fffdfa] selection:bg-orange-200 selection:text-orange-900">
            {currentView === 'landing' && <LandingPage onGoLogin={() => setCurrentView('login')} />}
            {currentView === 'login' && (
                <LoginPage onBack={() => setCurrentView('landing')} />
            )}
            {auth.token && currentView !== 'landing' && currentView !== 'login' && (
                <div className="flex h-screen overflow-hidden">
                    <AppHeader
                        userRole={displayRole as 'volunteer' | 'coordinator' | 'admin'}
                        sidebarOpen={sidebarOpen}
                        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    />
                    <Sidebar
                        userRole={displayRole as 'volunteer' | 'coordinator' | 'admin'}
                        currentView={currentView}
                        sidebarOpen={sidebarOpen}
                        onNavigate={setCurrentView}
                        onLogout={handleLogout}
                    />
                    <main className={`flex-1 overflow-y-auto pt-24 px-4 sm:px-6 lg:px-8 pb-12 transition-all ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
                        {renderContent()}
                    </main>
                </div>
            )}
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppInner />
        </AuthProvider>
    );
}
