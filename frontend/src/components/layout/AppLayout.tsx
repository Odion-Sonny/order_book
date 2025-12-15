import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    LineChart,
    History,
    Settings,
    Bell,
    Search
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SidebarItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
                    isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )
            }
        >
            {({ isActive }) => (
                <>
                    <Icon className={cn("h-5 w-5", isActive && "text-primary drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]")} />
                    <span className="font-medium text-sm">{label}</span>
                    {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-[0_0_10px_#7C3AED]" />
                    )}
                </>
            )}
        </NavLink>
    );
};

const AppLayout = () => {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-background text-foreground flex font-sans selection:bg-primary/20">
            {/* Sidebar */}
            <aside className="w-64 fixed inset-y-0 left-0 z-50 bg-card/30 backdrop-blur-xl border-r border-white/5 flex flex-col">
                <div className="h-16 flex items-center px-6 border-b border-white/5">
                    <div className="h-8 w-8 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20 mr-3">
                        <span className="font-bold text-white">M</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                        Midnight
                    </span>
                </div>

                <div className="flex-1 py-6 px-4 space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">Platform</div>
                    <SidebarItem to="/" icon={LayoutDashboard} label="Overview" />
                    <SidebarItem to="/markets" icon={LineChart} label="Markets" />
                    <SidebarItem to="/trades" icon={History} label="Trade History" />
                </div>

                <div className="p-4 border-t border-white/5">
                    <SidebarItem to="/settings" icon={Settings} label="Settings" />
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/20 via-background to-background">
                {/* Header */}
                <header className="h-16 sticky top-0 z-40 px-8 flex items-center justify-between backdrop-blur-md bg-background/50 border-b border-white/5">
                    <div className="flex items-center gap-4 text-muted-foreground text-sm">
                        <span className="opacity-50">/</span>
                        <span className="text-foreground font-medium capitalize">{location.pathname === '/' ? 'Overview' : location.pathname.slice(1)}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search assets..."
                                className="h-9 w-64 bg-white/5 border border-white/10 rounded-full pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                            />
                        </div>
                        <button className="h-9 w-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors relative">
                            <Bell className="h-4 w-4 text-muted-foreground" />
                            <span className="absolute top-2 right-2.5 h-1.5 w-1.5 bg-primary rounded-full shadow-[0_0_8px_#7C3AED]" />
                        </button>
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 border border-white/10" />
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-8 flex-1 overflow-x-hidden">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AppLayout;
