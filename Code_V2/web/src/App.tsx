import { useState, useEffect, Component, type ReactNode, type ErrorInfo } from 'react';
import type { ViewName } from './types';
import { AuthProvider, useAuth } from './hooks/useAuth';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { error: null };
    }
    static getDerivedStateFromError(error: Error) { return { error }; }
    componentDidCatch(error: Error, info: ErrorInfo) { console.error('App error:', error, info); }
    render() {
        if (this.state.error) {
            return (
                <div style={{ padding: 40, fontFamily: 'monospace', background: '#fff5f5', minHeight: '100vh' }}>
                    <h2 style={{ color: '#c00' }}>Application Error</h2>
                    <pre style={{ whiteSpace: 'pre-wrap', color: '#333', background: '#fee', padding: 16, borderRadius: 8 }}>
                        {this.state.error.message}
                        {'\n\n'}
                        {this.state.error.stack}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}

import AppHeader from './components/AppHeader';
import Sidebar from './components/Sidebar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

import { VolDashboard, VolOpportunities, VolApplications, VolAttendance, VolCertificates, VolProfile, VolSkills, VolOpportunityDetail } from './pages/volunteer';
import { CoordDashboard, CoordManageEvents, CoordApplications, CoordCertTemplates, CoordMembers, CoordOpportunityDetail } from './pages/coordinator';
import { AdminDashboard, AdminOrgs, AdminDisputes, AdminUsers, AdminSkills, AdminSystemInfo } from './pages/admin';

function AppInner() {
    const auth = useAuth();
    const [currentView, setCurrentView] = useState<ViewName>('landing');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedOppId, setSelectedOppId] = useState<string | null>(null);

    // Map backend role string to display role for sidebar/header
    const displayRole = auth.role === 'SystemAdmin' ? 'admin' : auth.role === 'Coordinator' ? 'coordinator' : 'volunteer';

    // Auto-navigate based on auth state
    useEffect(() => {
        if (auth.loading) return;
        const isPublicView = currentView === 'landing' || currentView === 'login' || currentView === 'register';
        
        if (auth.token && isPublicView) {
            setCurrentView('dashboard');
        }
        if (!auth.token && !isPublicView) {
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

    const navigateTo = (view: ViewName) => { setSelectedOppId(null); setCurrentView(view); };

    const renderContent = () => {
        if (displayRole === 'volunteer') {
            switch (currentView) {
                case 'dashboard': return <VolDashboard onNavigate={navigateTo} />;
                case 'opportunities': return selectedOppId
                    ? <VolOpportunityDetail oppId={selectedOppId} onBack={() => setSelectedOppId(null)} />
                    : <VolOpportunities onViewDetail={(id) => setSelectedOppId(id)} />;
                case 'applications': return <VolApplications onNavigate={navigateTo} />;
                case 'attendance': return <VolAttendance />;
                case 'certificates': return <VolCertificates />;
                case 'profile': return <VolProfile onNavigate={setCurrentView} />;
                case 'skills': return <VolSkills />;
                default: return <VolDashboard onNavigate={navigateTo} />;
            }
        }
        if (displayRole === 'coordinator') {
            switch (currentView) {
                case 'dashboard': return <CoordDashboard onNavigate={navigateTo} />;
                case 'manage_events': return selectedOppId
                    ? <CoordOpportunityDetail oppId={selectedOppId} onBack={() => setSelectedOppId(null)} />
                    : <CoordManageEvents onViewDetail={(id) => setSelectedOppId(id)} />;
                case 'org_applications': return <CoordApplications />;
                case 'manage_templates': return <CoordCertTemplates />;
                case 'org_members': return <CoordMembers />;
                default: return <CoordDashboard onNavigate={navigateTo} />;
            }
        }
        if (displayRole === 'admin') {
            switch (currentView) {
                case 'dashboard': return <AdminDashboard onNavigate={navigateTo} />;
                case 'admin_orgs': return <AdminOrgs />;
                case 'admin_disputes': return <AdminDisputes />;
                case 'admin_users': return <AdminUsers />;
                case 'admin_skills': return <AdminSkills />;
                case 'admin_system_info': return <AdminSystemInfo />;
                default: return <AdminDashboard onNavigate={navigateTo} />;
            }
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-[#fffdfa] selection:bg-orange-200 selection:text-orange-900">
            {currentView === 'landing' && <LandingPage onGoLogin={() => setCurrentView('login')} onGoRegister={() => setCurrentView('register')} />}
            {currentView === 'login' && (
                <LoginPage onBack={() => setCurrentView('landing')} />
            )}
            {currentView === 'register' && (
                <RegisterPage onBack={() => setCurrentView('landing')} onGoLogin={() => setCurrentView('login')} />
            )}
            {auth.token && currentView !== 'landing' && currentView !== 'login' && currentView !== 'register' && (
                <div className="flex h-screen overflow-hidden">
                    <AppHeader
                        userRole={displayRole as 'volunteer' | 'coordinator' | 'admin'}
                        sidebarOpen={sidebarOpen}
                        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                        onNavigate={navigateTo}
                    />
                    <Sidebar
                        userRole={displayRole as 'volunteer' | 'coordinator' | 'admin'}
                        currentView={currentView}
                        sidebarOpen={sidebarOpen}
                        onNavigate={navigateTo}
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
        <ErrorBoundary>
            <AuthProvider>
                <AppInner />
            </AuthProvider>
        </ErrorBoundary>
    );
}
