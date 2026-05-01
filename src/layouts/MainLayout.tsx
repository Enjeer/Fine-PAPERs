import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      <AppSidebar />
      <main className="flex-1 min-w-0 transition-all duration-300">
        <div className="p-4 md:p-8 pt-16 md:pt-8 w-full max-w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}