import React, { useState } from 'react';
import {
  LayoutDashboard,
  LineChart,
  ClipboardList,
  BarChart2,
  Menu,
  X,
  User,
  LogOut,
  TrendingUp,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const menuItems = [
  { text: 'Portfolio', icon: <LayoutDashboard className="h-5 w-5" />, path: '/' },
  { text: 'Markets', icon: <LineChart className="h-5 w-5" />, path: '/markets' },
  { text: 'Orders', icon: <ClipboardList className="h-5 w-5" />, path: '/orders' },
  { text: 'Backtesting', icon: <BarChart2 className="h-5 w-5" />, path: '/backtesting' },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { username, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavContent = () => (
    <div className="flex flex-col h-full bg-slate-950 text-slate-300">
      <div className="flex items-center gap-3 p-6 border-b border-slate-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-500">
          <TrendingUp className="h-6 w-6" />
        </div>
        <span className="text-lg font-bold text-white tracking-tight">TradeEngine</span>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 h-12 text-sm font-medium",
              location.pathname === item.path
                ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                : "hover:bg-slate-900 hover:text-white"
            )}
            onClick={() => {
              navigate(item.path);
              setMobileMenuOpen(false);
            }}
          >
            {item.icon}
            {item.text}
          </Button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{username}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-red-500 hover:text-red-400 hover:bg-red-500/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 md:flex flex-col fixed inset-y-0 z-50">
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-[300px] h-full rounded-none">
            <div className="h-full bg-slate-950 rounded-r-xl overflow-hidden border-r border-slate-800">
              <NavContent />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-64">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-500">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="font-bold text-slate-900">TradeEngine</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
        </header>

        <div className="p-4 md:p-8 animate-in fade-in zoom-in-95 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
