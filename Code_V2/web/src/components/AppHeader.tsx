import { Heart, Menu, Bell } from 'lucide-react';

type DisplayRole = 'volunteer' | 'coordinator' | 'admin';

interface Props {
    userRole: DisplayRole;
    sidebarOpen: boolean;
    onToggleSidebar: () => void;
}

export default function AppHeader({ userRole, sidebarOpen, onToggleSidebar }: Props) {
    return (
        <header className="bg-white border-b border-stone-100 h-16 fixed top-0 w-full z-50 flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-4">
                <button onClick={onToggleSidebar} className="p-2 rounded-xl text-stone-500 hover:bg-stone-100 focus:outline-none transition-colors">
                    <Menu className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-2">
                    <Heart className="h-6 w-6 text-rose-500 fill-rose-500" />
                    <span className="text-lg font-extrabold text-stone-800">VSMS</span>
                    <span className="hidden sm:inline-block ml-2 px-2.5 py-0.5 rounded-md text-xs font-bold bg-stone-100 text-stone-500 capitalize">
                        {userRole} Portal
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button className="p-2 text-stone-400 hover:text-orange-500 transition-colors relative">
                    <Bell className="w-6 h-6" />
                    {userRole !== 'volunteer' && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>}
                </button>
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white">
                    {userRole === 'volunteer' ? 'V' : userRole === 'coordinator' ? 'C' : 'A'}
                </div>
            </div>
        </header>
    );
}
