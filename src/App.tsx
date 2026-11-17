import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ProjectsProvider } from "@/lib/projects-context";
import { TicketsProvider } from "./lib/tickets-context";
import MainLayout from "@/layouts/MainLayout";
import AdminLayout from "@/admin/AdminLayout";
import AuthPage from "@/pages/AuthPage";
import AdminDashboardPage from "@/admin/pages/AdminDashboardPage";
import AdminRolesPage from "@/admin/pages/AdminRolesPage";
import AdminSupportPage from "@/admin/pages/AdminSupportPage";
import AdminSupportTicketPage from "@/admin/pages/AdminSupportTicketPage";
import DashboardPage from "@/pages/DashboardPage";
import ProjectsPage from "@/pages/ProjectsPage";
import EditorPage from "@/pages/EditorPage";
import SupportPage from "./pages/SupportPage";
import NotFound from "@/pages/NotFound";
import AIAssistantPage from "@/pages/AIAssistantPage";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { ThemeProvider } from "./lib/themeProvider";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="h-screen w-screen bg-background" aria-live="polite" />;
  return (
    <Routes>
      <Route
        path="/auth"
        element={user ? <Navigate to="/" replace /> : <AuthPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ProjectsProvider>
              <MainLayout />
            </ProjectsProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId/assistant" element={<AIAssistantPage />} />
        <Route path="projects/:projectId" element={<EditorPage />} />
        <Route
          path="support"
          element={
            <TicketsProvider>
              <SupportPage />
            </TicketsProvider>
          }
        />
      </Route>
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="roles" element={<AdminRolesPage />} />
        <Route path="support" element={<AdminSupportPage />} />
        <Route path="support/:ticketId" element={<AdminSupportTicketPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
      <Analytics />
      <SpeedInsights />
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
