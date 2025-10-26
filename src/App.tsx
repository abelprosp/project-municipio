import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Municipalities from "./pages/Municipalities";
import Projects from "./pages/Projects";
import Programs from "./pages/Programs";
import { UserControlPage } from "./pages/UserControl";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
            element={
              <MainLayout>
                <Dashboard />
              </MainLayout>
            }
          />
          <Route
            path="/municipalities"
            element={
              <MainLayout>
                <Municipalities />
              </MainLayout>
            }
          />
          <Route
            path="/projects"
            element={
              <MainLayout>
                <Projects />
              </MainLayout>
            }
          />
          <Route
            path="/programs"
            element={
              <MainLayout>
                <Programs />
              </MainLayout>
            }
          />
          <Route
            path="/user-control"
            element={
              <MainLayout>
                <UserControlPage />
              </MainLayout>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
