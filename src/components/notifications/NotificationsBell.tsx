import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle, Info, AlertTriangle, XCircle, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

type NotificationRow = {
  id: string;
  title: string;
  message: string | null;
  link: string | null;
  type: string;
  read_at: string | null;
  created_at: string;
};

const typeIcon = (type: string) => {
  switch (type) {
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case "error":
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Info className="h-4 w-4 text-blue-600" />;
  }
};

const formatDateTime = (iso: string) => {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
};

export default function NotificationsBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = useMemo(() => items.filter((i) => !i.read_at).length, [items]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, link, type, read_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setItems((data || []) as NotificationRow[]);
    } catch (err) {
      // silencioso
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Real-time: escuta novas notificações do usuário
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel('notifications-stream')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          const n = payload.new as any as NotificationRow;
          setItems((prev) => [n, ...prev].slice(0, 20));
        })
        .subscribe();
    })();

    // Atualização periódica como fallback
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);
    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const markAllAsRead = async () => {
    try {
      const ids = items.filter((i) => !i.read_at).map((i) => i.id);
      if (!ids.length) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      setItems((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, read_at: new Date().toISOString() } : i)));
    } catch {
      // silencioso
    }
  };

  const markOneAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read_at: new Date().toISOString() } : i)));
    } catch {
      // silencioso
    }
  };

  const openLink = (link: string | null) => {
    if (!link) return;
    if (link.startsWith("http")) {
      window.open(link, "_blank");
    } else {
      navigate(link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <span className="relative inline-flex items-center">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 px-1 text-xs" variant="default">
                {unreadCount}
              </Badge>
            )}
          </span>
          <span className="hidden sm:inline">Notificações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel>Notificações</DropdownMenuLabel>
          <Button variant="ghost" size="sm" onClick={markAllAsRead} disabled={loading || unreadCount === 0}>
            Marcar todas como lidas
          </Button>
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <div className="px-3 py-2 text-sm text-muted-foreground">Nenhuma notificação</div>
        )}
        {items.map((n) => (
          <DropdownMenuItem key={n.id} className="flex items-start gap-2">
            <div className="mt-0.5">{typeIcon(n.type)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{n.title}</span>
                {!n.read_at && <span className="text-[10px] text-primary">• novo</span>}
              </div>
              {n.message && <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>}
              <div className="text-[10px] text-muted-foreground mt-1">{formatDateTime(n.created_at)}</div>
            </div>
            <div className="flex items-center gap-1">
              {n.link && (
                <Button variant="ghost" size="icon" onClick={() => openLink(n.link)} title="Abrir">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              {!n.read_at && (
                <Button variant="ghost" size="sm" onClick={() => markOneAsRead(n.id)}>
                  Lida
                </Button>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}