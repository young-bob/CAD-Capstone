import {
    Menu, Search, Briefcase, MapPin, User, Award, Activity, Users,
    Building, AlertTriangle, FileCheck, LogOut, Star, UserPlus, Server
} from 'lucide-react';
import type { ViewName } from '../types';

type DisplayRole = 'volunteer' | 'coordinator' | 'admin';

interface Props {
    userRole: DisplayRole;
    currentView: ViewName;
    sidebarOpen: boolean;
    onNavigate: (view: ViewName) => void;
    onLogout: () => void;
}

export default function Sidebar({ userRole, currentView, sidebarOpen, onNavigate, onLogout }: Props) {
    const btnClass = (viewName: ViewName) =>
        `w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all ${currentView === viewName
            ? 'bg-orange-50 text-orange-600 font-bold shadow-sm'
            : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900 font-medium'
        }`;

    return (
        <aside className={`bg-white border-r border-stone-100 w-64 h-screen fixed left-0 top-0 pt-16 transition-transform z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-4 space-y-1 overflow-y-auto h-full pb-20">
                {userRole === 'volunteer' && (
                    <>
                        <p className="px-4 text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 mt-4">Core Features</p>
                        <button onClick={() => onNavigate('dashboard')} className={btnClass('dashboard')}><Menu className="w-5 h-5" /> Dashboard</button>
                        <button onClick={() => onNavigate('opportunities')} className={btnClass('opportunities')}><Search className="w-5 h-5" /> Find Opportunities</button>
                        <button onClick={() => onNavigate('applications')} className={btnClass('applications')}><Briefcase className="w-5 h-5" /> My Applications</button>
                        <button onClick={() => onNavigate('attendance')} className={btnClass('attendance')}><MapPin className="w-5 h-5" /> Geo Check-in</button>
                        <p className="px-4 text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 mt-8">Personal & Assets</p>
                        <button onClick={() => onNavigate('certificates')} className={btnClass('certificates')}><Award className="w-5 h-5" /> Certificates</button>
                        <button onClick={() => onNavigate('profile')} className={btnClass('profile')}><User className="w-5 h-5" /> Profile</button>
                        <button onClick={() => onNavigate('skills')} className={btnClass('skills')}><Star className="w-5 h-5" /> My Skills</button>
                    </>
                )}
                {userRole === 'coordinator' && (
                    <>
                        <p className="px-4 text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 mt-4">Organization</p>
                        <button onClick={() => onNavigate('dashboard')} className={btnClass('dashboard')}><Activity className="w-5 h-5" /> Overview</button>
                        <button onClick={() => onNavigate('manage_events')} className={btnClass('manage_events')}><Briefcase className="w-5 h-5" /> Manage Events</button>
                        <button onClick={() => onNavigate('org_applications')} className={btnClass('org_applications')}><Users className="w-5 h-5" /> Applications</button>
                        <button onClick={() => onNavigate('org_members')} className={btnClass('org_members')}><UserPlus className="w-5 h-5" /> Members</button>
                        <button onClick={() => onNavigate('manage_templates')} className={btnClass('manage_templates')}><FileCheck className="w-5 h-5" /> Cert Templates</button>
                    </>
                )}
                {userRole === 'admin' && (
                    <>
                        <p className="px-4 text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 mt-4">System Admin</p>
                        <button onClick={() => onNavigate('dashboard')} className={btnClass('dashboard')}><Activity className="w-5 h-5" /> Platform Overview</button>
                        <button onClick={() => onNavigate('admin_orgs')} className={btnClass('admin_orgs')}><Building className="w-5 h-5" /> Organizations</button>
                        <button onClick={() => onNavigate('admin_disputes')} className={btnClass('admin_disputes')}><AlertTriangle className="w-5 h-5" /> Disputes</button>
                        <button onClick={() => onNavigate('admin_users')} className={btnClass('admin_users')}><User className="w-5 h-5" /> User Control</button>
                        <button onClick={() => onNavigate('admin_skills')} className={btnClass('admin_skills')}><Star className="w-5 h-5" /> Skills</button>
                        <button onClick={() => onNavigate('admin_system_info')} className={btnClass('admin_system_info')}><Server className="w-5 h-5" /> System Info</button>
                    </>
                )}
            </div>
            <div className="absolute bottom-0 w-full p-4 border-t border-stone-100 bg-white">
                <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-rose-500 hover:bg-rose-50 transition-all font-bold">
                    <LogOut className="w-5 h-5" /> Log Out
                </button>
            </div>
        </aside>
    );
}
