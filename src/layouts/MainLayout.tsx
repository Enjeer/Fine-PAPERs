import { Outlet } from "react-router-dom";
import AppSidebar from "@/components/AppSidebar";

export default function MainLayout() {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <main className="flex-1 transition-all duration-300">
        <div className="p-4 md:p-8 pt-12 md:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
