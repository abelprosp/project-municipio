import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Session } from "@supabase/supabase-js";
import ChatbotWidget from "@/components/chatbot/ChatbotWidget";
import NotificationsBell from "@/components/notifications/NotificationsBell";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
          <header className="h-16 border-b bg-card flex items-center px-6 shadow-sm justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="mr-2" />
              <h1 className="text-xl font-semibold text-foreground">Plataforma de Gestão de Convênios</h1>
            </div>
            <div className="flex items-center gap-2">
              <NotificationsBell />
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
          {/* Chatbot fixo no canto inferior direito */}
          <ChatbotWidget />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MainLayout;