import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function MainLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      <AppSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <main 
        className={cn(
          "flex-1 min-w-0 transition-all duration-300",
          isCollapsed ? "md:ml-20" : "md:ml-80", 
          "ml-0",
          "py-5, md:p-0" 
        )}
      >
        <div className="w-full max-w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}