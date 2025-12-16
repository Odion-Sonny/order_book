import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    LineChart,
    History,
    Settings,
    Bell,
    Search,
    Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';


const SidebarItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group text-sm font-medium",
                    isActive
                        ? "bg-[#1C1C1E] text-white shadow-sm border border-white/5"
                        : "text-neutral-400 hover:text-white hover:bg-[#1C1C1E]/50"
                )
            }
        >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
        </NavLink>
    );
};

const AppLayout = () => {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-black text-white flex font-sans">
            {/* Sidebar - Solid Column */}
            <aside className="w-64 fixed inset-y-0 left-0 z-50 bg-black border-r border-[#333333] flex flex-col">
                {/* Logo Area */}
                <div className="h-16 flex items-center px-6 border-b border-[#333333]">
                    <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                        <span className="font-bold text-white text-lg">T</span>
                    </div>
                    <span className="font-semibold text-lg tracking-tight text-white">Titanium</span>
                </div>

                {/* Navigation */}
                <div className="flex-1 py-6 px-3 space-y-1">
                    <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-4 px-4 pt-2">Menu</div>
                    <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
                    <SidebarItem to="/trade" icon={LineChart} label="Trade" />
                    <SidebarItem to="/portfolio" icon={Wallet} label="Portfolio" />
                    <SidebarItem to="/history" icon={History} label="History" />
                </div>

                {/* User / Settings */}
                <div className="p-4 border-t border-[#333333]">
                    <SidebarItem to="/settings" icon={Settings} label="Settings" />
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-64 min-h-screen flex flex-col bg-black">
                {/* Header - High Contrast, No Blur */}
                <header className="h-16 sticky top-0 z-40 px-8 flex items-center justify-between bg-black border-b border-[#333333]">
                    <h1 className="text-xl font-semibold text-white capitalize">
                        {location.pathname === '/' ? 'Dashboard' : location.pathname.slice(1)}
                    </h1>

                    <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="h-9 w-64 bg-[#1C1C1E] border border-[#333333] rounded-md pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-neutral-600"
                            />
                        </div>

                        {/* Notifications */}
                        <button className="h-9 w-9 flex items-center justify-center rounded-md border border-[#333333] bg-[#1C1C1E] hover:bg-[#2C2C2E] transition-colors relative">
                            <Bell className="h-4 w-4 text-neutral-400" />
                            <span className="absolute top-2 right-2.5 h-1.5 w-1.5 bg-red-500 rounded-full" />
                        </button>

                        {/* Profile Avatar */}
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-neutral-700 to-neutral-600 border border-[#333333]" />
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-8 flex-1">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AppLayout;
