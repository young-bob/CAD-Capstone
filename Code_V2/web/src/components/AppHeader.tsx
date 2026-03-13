import { useState, useRef, useEffect } from 'react';
import { Heart, Menu, Bell } from 'lucide-react';

type DisplayRole = 'volunteer' | 'coordinator' | 'admin';

interface Props {
    userRole: DisplayRole;
    sidebarOpen: boolean;
    onToggleSidebar: () => void;
}

export default function AppHeader({ userRole, sidebarOpen, onToggleSidebar }: Props) {
    const [showNotif, setShowNotif] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotif(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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
                <div ref={notifRef} className="relative">
                    <button
                        onClick={() => setShowNotif(v => !v)}
                        className="p-2 text-stone-400 hover:text-orange-500 transition-colors relative"
                    >
                        <Bell className="w-6 h-6" />
                        {userRole !== 'volunteer' && (
                            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
                        )}
                    </button>
                    {showNotif && (
                        <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden z-50">
                            <div className="px-5 py-4 border-b border-stone-100">
                                <h3 className="font-bold text-stone-800 text-sm">Notifications</h3>
                            </div>
                            <div className="px-5 py-8 text-center text-stone-400 text-sm font-medium">
                                No new notifications
                            </div>
                        </div>
                    )}
                </div>
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white">
                    {userRole === 'volunteer' ? 'V' : userRole === 'coordinator' ? 'C' : 'A'}
                </div>
            </div>
        </header>
    );
}
