import { useAuth } from "@/lib/auth-context";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FolderOpen, 
  LogOut, 
  Headset, 
  User, 
  Menu, 
  X, 
  PanelLeftClose, 
  PanelLeftOpen 
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import Icon from '@/assets/img/NoBase-logo-white.svg';
import { useState } from "react";
import { Switch } from "./ui/switch";
import { useTheme } from "@/lib/themeProvider";

const navItems = [
  { label: "Дашборд", icon: LayoutDashboard, path: "/" },
  { label: "Проекты", icon: FolderOpen, path: "/projects" },
  { label: "Поддержка", icon: Headset, path: "/support" },
];

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  return (
    <>
      <div className={cn(
        "md:hidden fixed top-4 left-4 z-50 transition-opacity duration-300",
        isMobileOpen ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleMobile} 
          className="bg-sidebar border-sidebar-border text-sidebar-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside 
        className={cn(
          "h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out shrink-0 z-40",
          isCollapsed ? "w-20" : "w-64 md:w-80",
          "fixed md:sticky top-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3.5 top-7 hidden md:flex h-7 w-7 items-center justify-center rounded-md bg-sidebar text-sidebar-foreground shadow-sm hover:bg-accent transition-all z-50"
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>

        {/* Logo Section */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-sidebar-border overflow-hidden shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 flex items-center justify-center">
              <img src={Icon} alt="Logo" className="w-8 h-8 object-contain" />
            </div>
            {!isCollapsed && (
              <span className="font-display font-bold text-sm text-sidebar-foreground tracking-tight leading-tight transition-opacity duration-300">
                Fine<br />PAPERs
              </span>
            )}
          </div>

          <button onClick={() => setIsMobileOpen(false)} className="md:hidden p-2 text-sidebar-foreground/50">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto hide-scrollbar">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  if (isMobileOpen) setIsMobileOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-lg text-sm font-medium transition-all group relative",
                  isCollapsed ? "justify-center" : "justify-start px-3",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className={cn("shrink-0", isCollapsed ? "h-6 w-6" : "h-5 w-5")} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
                
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-popover text-popover-foreground text-xs rounded border shadow-md whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className={cn(
          "flex items-center gap-3 mb-2", 
          isCollapsed ? "justify-center" : "px-2"
        )}>
          <Switch 
            checked={theme === "dark"} 
            onCheckedChange={toggleTheme} 
          />
          {!isCollapsed && (
            <span className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest leading-none">
              Тема
            </span>
          )}
        </div>

        {/* Bottom Section (User & Theme) */}
        <div className={cn(
          "flex items-center gap-2.5 py-2 m-2 rounded-xl bg-sidebar-accent/40 border border-sidebar-border/50 transition-all",
          isCollapsed ? "justify-center px-1" : "px-3"
        )}>
          
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 border border-primary/10">
            <User className="w-4.5 h-4.5 text-primary" />
          </div>
          
          {!isCollapsed && (
            <div className="flex-1 min-w-0 flex flex-col justify-center overflow-hidden">
              <p className="text-[13px] font-bold text-sidebar-foreground truncate tracking-tight leading-none m-0 p-0">
                {user?.user_name}
              </p>
              {user?.email && (
                  <p className="text-[10px] text-sidebar-foreground/50 truncate tracking-tight leading-none m-0 p-0 pt-0.5">
                    {user.email}
                  </p>
                )}
            </div>
          )}

          {!isCollapsed && (
            <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
              <DialogTrigger asChild>
                <button className="text-sidebar-foreground/30 hover:text-destructive transition-colors p-1 shrink-0 self-center">
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Выход из системы</DialogTitle>
                </DialogHeader>
                <div className="flex justify-end gap-3 mt-4">
                  <Button variant="outline" onClick={() => setLogoutOpen(false)}>Отмена</Button>
                  <Button variant="destructive" onClick={() => { logout(); navigate("/auth"); }}>Выйти</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </aside>
    </>
  );
}