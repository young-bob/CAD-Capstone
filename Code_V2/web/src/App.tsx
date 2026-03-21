import { useState, useEffect, useRef, Component, type ReactNode, type ErrorInfo } from 'react';
import type { ViewName } from './types';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useCommandPalette } from './hooks/useCommandPalette';

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
import Sidebar, { type SidebarMode } from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import AIAssistant from './components/AIAssistant';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

import { VolDashboard, VolOpportunities, VolApplications, VolAttendance, VolCertificates, VolProfile, VolSkills, VolOpportunityDetail } from './pages/volunteer';
import { CoordDashboard, CoordManageEvents, CoordApplications, CoordCertTemplates, CoordMembers, CoordOpportunityDetail } from './pages/coordinator';
import { AdminDashboard, AdminOrgs, AdminDisputes, AdminUsers, AdminSkills, AdminSystemInfo } from './pages/admin';

// Views considered "deeper" than dashboard — navigate right when entering them
const DEEP_VIEWS = new Set<ViewName>(['opportunities', 'applications', 'attendance', 'certificates', 'profile', 'skills',
    'manage_events', 'org_applications', 'manage_templates', 'org_members',
    'admin_orgs', 'admin_disputes', 'admin_users', 'admin_skills', 'admin_system_info']);

function AppInner() {
    const auth = useAuth();
    const isPublicView = !auth.token;
    const { theme, toggleTheme } = useTheme(!isPublicView);
    const cmdPalette = useCommandPalette();

    const [currentView, setCurrentView] = useState<ViewName>('landing');
    const [sidebarMode, setSidebarMode] = useState<SidebarMode>('expanded');
    const [selectedOppId, setSelectedOppId] = useState<string | null>(null);
    const [navDirection, setNavDirection] = useState<'right' | 'left'>('right');
    const prevViewRef = useRef<ViewName>('landing');

    // Map backend role string to display role for sidebar/header
    const displayRole = auth.role === 'SystemAdmin' ? 'admin' : auth.role === 'Coordinator' ? 'coordinator' : 'volunteer';

    // Auto-navigate based on auth state
    useEffect(() => {
        if (auth.loading) return;
        const isPublicView = currentView === 'landing' || currentView === 'login' || currentView === 'register';
        if (auth.token && isPublicView) setCurrentView('dashboard');
        if (!auth.token && !isPublicView) setCurrentView('landing');
    }, [auth.token, auth.loading, currentView]);

    // On mobile, default sidebar to hidden
    useEffect(() => {
        if (window.innerWidth < 768) setSidebarMode('hidden');
    }, []);

    // '[' key to toggle sidebar collapse
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === '[' && !e.ctrlKey && !e.metaKey &&
                !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
                setSidebarMode(m => m === 'expanded' ? 'collapsed' : 'expanded');
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const handleLogout = () => {
        auth.logout();
        setCurrentView('landing');
    };

    if (auth.loading) {
        return (
            <div className="min-h-screen bg-[#fffdfa] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-stone-500 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    const navigateTo = (view: ViewName) => {
        const prev = prevViewRef.current;
        const goingShallower = !DEEP_VIEWS.has(view) && DEEP_VIEWS.has(prev);
        setNavDirection(goingShallower ? 'left' : 'right');
        prevViewRef.current = view;
        setSelectedOppId(null);
        setCurrentView(view);
    };

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

    const mainMargin = sidebarMode === 'expanded' ? 'ml-64' : sidebarMode === 'collapsed' ? 'ml-16' : 'ml-0';
    const slideClass = navDirection === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left';

    return (
        <div className="min-h-screen bg-[#fffdfa] dark:bg-zinc-950 selection:bg-orange-200 selection:text-orange-900">
            {currentView === 'landing'  && <LandingPage onGoLogin={() => setCurrentView('login')} onGoRegister={() => setCurrentView('register')} />}
            {currentView === 'login'    && <LoginPage onBack={() => setCurrentView('landing')} />}
            {currentView === 'register' && <RegisterPage onBack={() => setCurrentView('landing')} onGoLogin={() => setCurrentView('login')} />}

            {auth.token && currentView !== 'landing' && currentView !== 'login' && currentView !== 'register' && (
                <div className="flex h-screen overflow-hidden dark:bg-zinc-950">
                    <AppHeader
                        userRole={displayRole as 'volunteer' | 'coordinator' | 'admin'}
                        onOpenSearch={cmdPalette.open}
                        onNavigate={navigateTo}
                        theme={theme}
                        onToggleTheme={toggleTheme}
                        onLogout={handleLogout}
                    />
                    <Sidebar
                        userRole={displayRole as 'volunteer' | 'coordinator' | 'admin'}
                        currentView={currentView}
                        sidebarMode={sidebarMode}
                        onNavigate={navigateTo}
                        onLogout={handleLogout}
                        onToggleCollapse={() => setSidebarMode(m => m === 'expanded' ? 'collapsed' : 'expanded')}
                    />
                    <main
                        key={currentView}
                        className={`flex-1 overflow-y-auto pt-24 px-4 sm:px-6 lg:px-8 pb-12 transition-[margin] duration-200 dark:bg-zinc-950 dark:text-zinc-100 ${mainMargin} ${slideClass}`}
                    >
                        {renderContent()}
                    </main>
                    <AIAssistant
                        userRole={displayRole as 'volunteer' | 'coordinator' | 'admin'}
                        currentView={currentView}
                    />
                    <CommandPalette
                        isOpen={cmdPalette.isOpen}
                        onClose={cmdPalette.close}
                        onNavigate={navigateTo}
                        userRole={displayRole as 'volunteer' | 'coordinator' | 'admin'}
                    />
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
