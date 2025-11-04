import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Session } from "@supabase/supabase-js";
import ChatbotWidget from "@/components/chatbot/ChatbotWidget";
import NotificationsBell from "@/components/notifications/NotificationsBell";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Gera notificações de prazos para o usuário autenticado
  useEffect(() => {
    const run = async () => {
      if (!session) return;
      try {
        await supabase.rpc('generate_deadline_notifications', { p_user_id: session.user.id });
      } catch {
        // silencioso
      }
    };
    run();
  }, [session]);

  // Tema: ler preferência salva e aplicar
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
      if (saved === "dark") setIsDark(true);
      else if (saved === "light") setIsDark(false);
      else if (typeof document !== "undefined") setIsDark(document.documentElement.classList.contains("dark"));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", isDark);
    }
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {}
  }, [isDark]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 md:h-16 border-b bg-card flex items-center px-3 md:px-6 shadow-sm justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
              <SidebarTrigger className="mr-1 md:mr-2 flex-shrink-0" />
              <h1 className="text-sm md:text-xl font-semibold text-foreground truncate">Plataforma de Gestão de Convênios</h1>
            </div>
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <NotificationsBell />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:h-10 md:w-10"
                aria-label="Alternar contraste"
                onClick={() => setIsDark((v) => !v)}
                title="Contraste"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </div>
          </header>
          <main className="flex-1 p-3 md:p-6 overflow-auto">{children}</main>
          {/* Chatbot fixo no canto inferior direito */}
          <ChatbotWidget />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;