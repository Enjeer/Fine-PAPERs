import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
  <div className="flex h-screen w-full overflow-hidden">
    <AppSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
    <main 
      className={cn(
        "flex-1 min-w-0 transition-all duration-300 flex flex-col h-full",
        isCollapsed ? "md:ml-20" : "md:ml-80", 
        "ml-0" 
      )}
    >ы
      <div className="relative flex-1 min-h-0 w-full">
        <Outlet />
      </div>
    </main>
  </div>
  );
}