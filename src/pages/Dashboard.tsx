import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDashboardPdf } from "@/lib/pdf";
import { exportDashboardToExcel } from "@/lib/export";
import { Building2, FolderKanban, DollarSign, TrendingUp, BarChart3, Search, Plus, Filter, User, MapPin, RefreshCw, ArrowUp, ArrowDown, Info, ChevronDown, ChevronUp, X } from "lucide-react";
import DailyTasks from "@/components/tasks/DailyTasks";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie, Label as RechartsLabel, LabelList, AreaChart, Area } from "recharts";
import { Badge } from "@/components/ui/badge";
import { UserControlPanel } from "@/components/user/UserControlPanel";
import { useUserControl } from "@/hooks/use-user-control";
import { MunicipalityDialog } from "@/components/municipalities/MunicipalityDialog";
// Removido debug visual para focar no novo layout

interface DashboardStats {
  totalMunicipalities: number;
  totalProjects: number;
  totalAmount: number;
  avgExecution: number;
  projectsByStatus: { status: string; count: number }[];
}

interface MunicipalityWithProjects {
  id: string;
  name: string;
  projects: {
    id: string;
    object: string;
    status: string;
    year: number;
    transfer_amount: number;
    counterpart_amount: number;
    execution_percentage: number;
  }[];
  totalProjects: number;
  totalAmount: number;
  avgExecution: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ municipality_id: "", program_id: "", ministry: "", status: "" });
  const [municipalities, setMunicipalities] = useState<{ id: string; name: string }[]>([]);
  const [programs, setPrograms] = useState<{ id: string; name: string }[]>([]);
  const [municipalitiesWithProjects, setMunicipalitiesWithProjects] = useState<MunicipalityWithProjects[]>([]);
  const [boardFilter, setBoardFilter] = useState({ status: "em_elaboracao", showCompleted: false });
  const [municipalitiesBoardData, setMunicipalitiesBoardData] = useState<MunicipalityWithProjects[]>([]);
  const [municipalitiesBoardFilter, setMunicipalitiesBoardFilter] = useState({ status: "all", showAll: false });
  const [municipalityDialogOpen, setMunicipalityDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [userName, setUserName] = useState<string>("Usuário");
  
  // Filtros específicos para Progresso Geral
  const [progressFilters, setProgressFilters] = useState({
    useMainFilters: true,
    municipality_id: "",
    program_id: "",
    status: "",
    executionRange: "" // "all" | "above_60" | "below_60" | "0-20" | "21-40" | "41-60" | "61-80" | "81-100"
  });
  const [showProgressDetails, setShowProgressDetails] = useState(false);
  const [previousAvgExecution, setPreviousAvgExecution] = useState<number | null>(null);

  // Tema de contraste removido nesta versão
  
  // Hook para controle de usuário
  const { logActivity } = useUserControl();

  // Carregar nome do usuário
  useEffect(() => {
    const loadUserName = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Prioridade: metadata > profiles.full_name > profiles.name
        // Não usar email como nome - deixar "Usuário" se não houver nome
        
        // 1. Primeiro tentar da metadata (sempre atualizada quando o usuário salva)
        if (user.user_metadata?.full_name && 
            user.user_metadata.full_name.trim() !== "" &&
            user.user_metadata.full_name !== user.email) {
          setUserName(user.user_metadata.full_name);
          return;
        }

        // 2. Se não tiver na metadata, tentar da tabela profiles
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (!profileError && profile) {
          const profileData = profile as { full_name?: string | null; name?: string | null };
          
          // Tentar full_name primeiro
          if (profileData.full_name && 
              typeof profileData.full_name === 'string' &&
              profileData.full_name.trim() !== "" &&
              profileData.full_name !== user.email) {
            setUserName(profileData.full_name);
            return;
          }
          
          // Tentar name como fallback
          if (profileData.name && 
              typeof profileData.name === 'string' &&
              profileData.name.trim() !== "" &&
              profileData.name !== user.email) {
            setUserName(profileData.name);
            return;
          }
        }
        
        // Se não encontrou nome válido, manter "Usuário" (não usar email)
        // O estado inicial já é "Usuário", então não precisa fazer nada
      } catch (error) {
        // Silencioso - manter "Usuário" como padrão
        console.warn("Erro ao carregar nome do usuário:", error);
      }
    };

    loadUserName();

    // Escutar mudanças no perfil em tempo real
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('profile-changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'profiles',
        }, async (payload) => {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser && payload.new && (payload.new as any).id === currentUser.id) {
            const newName = (payload.new as any).full_name || (payload.new as any).name;
            // Só atualizar se o nome for válido e não for igual ao email
            if (newName && 
                newName.trim() !== "" && 
                newName !== currentUser.email) {
              setUserName(newName);
            }
          }
        })
        .subscribe();
    })();

    // Escutar mudanças na autenticação (quando metadata é atualizada)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'USER_UPDATED' && session?.user) {
        // Recarregar nome quando o usuário for atualizado
        // Priorizar metadata primeiro
        if (session.user.user_metadata?.full_name && 
            session.user.user_metadata.full_name.trim() !== "" &&
            session.user.user_metadata.full_name !== session.user.email) {
          setUserName(session.user.user_metadata.full_name);
        } else {
          // Se não tiver na metadata, recarregar completo
          loadUserName();
        }
      }
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadDashboardData();
    loadMunicipalitiesBoard();
  }, [filters, municipalitiesBoardFilter]);

  // Contraste removido: sem sync de tema

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      let query = supabase.from("projects").select("*");
      if (filters.municipality_id) {
        query = query.eq("municipality_id", filters.municipality_id);
      }
      if (filters.program_id) {
        query = query.eq("program_id", filters.program_id);
      }
      if (filters.ministry) {
        query = query.ilike("ministry", `%${filters.ministry}%`);
      }
      if (filters.status) {
        // Cast necessário para compatibilizar com enum gerado pelo tipo do Supabase
        query = query.eq("status", filters.status as any);
      }

      const { data: projects, error } = await query;
      if (error) throw error;
      const totalAmount = projects.reduce(
        (sum, p) => sum + Number(p.transfer_amount) + Number(p.counterpart_amount),
        0
      );
      const avgExecution =
        projects.length > 0
          ? projects.reduce((sum, p) => sum + (p.execution_percentage || 0), 0) / projects.length
          : 0;

      const statusCounts = projects.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const distinctMunicipalities = new Set((projects || []).map((p: any) => p.municipality_id)).size;
      setStats({
        totalMunicipalities: distinctMunicipalities,
        totalProjects: projects.length,
        totalAmount,
        avgExecution,
        projectsByStatus: Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count,
        })),
      });
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [munRes, progRes] = await Promise.all([
        supabase.from("municipalities").select("id, name").order("name"),
        supabase.from("programs").select("id, name").order("name"),
      ]);
      setMunicipalities(munRes.data || []);
      setPrograms(progRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar opções:", error);
    }
  };

  const loadMunicipalitiesBoard = async () => {
    try {
      let query = supabase
        .from("projects")
        .select("*, municipalities(id, name)")
        .order("created_at", { ascending: false });

      if (municipalitiesBoardFilter.status && municipalitiesBoardFilter.status !== "all" && !municipalitiesBoardFilter.showAll) {
        query = query.eq("status", municipalitiesBoardFilter.status as any);
      }

      const { data: projects, error } = await query;
      if (error) throw error;

      // Agrupar por município
      const grouped = (projects || []).reduce((acc: Record<string, MunicipalityWithProjects>, p: any) => {
        const munId = p.municipality_id;
        const munName = p.municipalities?.name || "Sem município";
        
        if (!acc[munId]) {
          acc[munId] = {
            id: munId,
            name: munName,
            projects: [],
            totalProjects: 0,
            totalAmount: 0,
            avgExecution: 0,
          };
        }

        acc[munId].projects.push({
          id: p.id,
          object: p.object || "—",
          status: p.status,
          year: p.year || new Date().getFullYear(),
          transfer_amount: Number(p.transfer_amount || 0),
          counterpart_amount: Number(p.counterpart_amount || 0),
          execution_percentage: Number(p.execution_percentage || 0),
        });

        return acc;
      }, {});

      // Calcular totais
      const municipalitiesData = Object.values(grouped).map((mun) => {
        const totalProjects = mun.projects.length;
        const totalAmount = mun.projects.reduce(
          (sum, p) => sum + p.transfer_amount + p.counterpart_amount,
          0
        );
        const avgExecution =
          totalProjects > 0
            ? mun.projects.reduce((sum, p) => sum + p.execution_percentage, 0) / totalProjects
            : 0;

        return {
          ...mun,
          totalProjects,
          totalAmount,
          avgExecution,
        };
      });

      setMunicipalitiesBoardData(municipalitiesData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Erro ao carregar quadro de municípios:", error);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      em_criacao: "Em Criação",
      em_elaboracao: "Em Elaboração",
      em_analise: "Em Análise",
      em_complementacao: "Em Complementação",
      solicitado_documentacao: "Solicitado Documentação",
      aguardando_documentacao: "Aguardando Documentação",
      clausula_suspensiva: "Cláusula Suspensiva",
      aprovado: "Aprovado",
      em_execucao: "Em Execução",
      prestacao_contas: "Prestação de Contas",
      concluido: "Concluído",
      cancelado: "Cancelado",
    };
    return labels[status] || status;
  };

  // Dados para gráficos do novo layout
  const pieData = useMemo(() => (stats?.projectsByStatus || []).map(item => ({
    name: getStatusLabel(item.status),
    value: item.count,
    status: item.status,
  })), [stats]);

  const totalProjectsPie = useMemo(() => (stats?.projectsByStatus || []).reduce((s, i) => s + i.count, 0), [stats]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [countProjects, setCountProjects] = useState(0);
  const [countMunicipalities, setCountMunicipalities] = useState(0);
  const animRef = useRef<number | null>(null);
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<string>>(new Set());
  // Mantemos apenas a visão de barras (removendo alternância e 3D)
  const totalVisible = useMemo(() => {
    const arr = (stats?.projectsByStatus || []).filter((d) => !hiddenStatuses.has(d.status));
    return arr.reduce((s, i) => s + i.count, 0);
  }, [stats, hiddenStatuses]);

  const formatPercent = (v: number) => {
    if (!totalVisible) return "0%";
    return `${Math.round((v / totalVisible) * 1000) / 10}%`;
  };

  // Função para calcular escala comprimida que melhora a visualização quando há uma barra muito grande
  // A maior barra será SEMPRE limitada a um máximo fixo para evitar cortes
  const calculateCompressedScale = useMemo(() => {
    const visibleData = [...pieData].filter((d) => !hiddenStatuses.has(d.status)).sort((a, b) => b.value - a.value);
    if (visibleData.length === 0) return { max: 100, scale: (v: number) => v };
    
    const maxValue = visibleData[0].value;
    const secondValue = visibleData.length > 1 ? visibleData[1].value : 0;
    
    // SEMPRE aplica compressão quando há uma barra dominante
    // Limita a maior barra a um máximo fixo baseado na segunda maior (3-4x)
    if (maxValue > 0 && secondValue > 0 && maxValue > secondValue) {
      // Limita a maior barra a no máximo 3x a segunda maior barra
      // Isso garante que nunca vai cortar, mesmo que a diferença seja enorme
      const visualMax = Math.max(secondValue * 3, 50); // Mínimo de 50 para casos especiais
      
      return {
        max: visualMax,
        scale: (v: number) => {
          if (v === maxValue) {
            // A maior barra sempre será limitada ao máximo visual
            return visualMax;
          } else if (v <= secondValue) {
            // Barras menores ou iguais à segunda mantêm proporção linear
            return v;
          } else {
            // Barras entre a segunda e a maior são comprimidas usando raiz quadrada
            const compressedPart = Math.sqrt((v - secondValue) / (maxValue - secondValue)) * (visualMax - secondValue);
            return secondValue + compressedPart;
          }
        }
      };
    }
    
    // Se não houver segunda barra ou valores muito pequenos, usa compressão simples
    if (maxValue > 0 && maxValue > 100) {
      const visualMax = maxValue * 0.4; // 40% do máximo
      return {
        max: visualMax,
        scale: (v: number) => {
          return Math.sqrt(v / maxValue) * visualMax;
        }
      };
    }
    
    // Se não precisar compressão, retorna escala normal
    return { max: maxValue, scale: (v: number) => v };
  }, [pieData, hiddenStatuses]);

  const truncate = (s: string, n = 18) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  const [timer, setTimer] = useState<string>(() => new Date().toLocaleTimeString());

  // Estado para projetos filtrados do progresso
  const [progressProjects, setProgressProjects] = useState<any[]>([]);
  
  // Carregar média do mês anterior para comparação
  useEffect(() => {
    const loadPreviousMonthData = async () => {
      try {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        let query = supabase
          .from("projects")
          .select("execution_percentage")
          .lte("created_at", oneMonthAgo.toISOString());
        
        const { data, error } = await query;
        if (error) throw error;
        
        if (data && data.length > 0) {
          const avg = data.reduce((sum, p) => sum + (p.execution_percentage || 0), 0) / data.length;
          setPreviousAvgExecution(avg);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do mês anterior:", error);
      }
    };
    
    loadPreviousMonthData();
  }, []);
  
  // Carregar projetos para cálculo de estatísticas do progresso
  useEffect(() => {
    const loadProgressProjects = async () => {
      try {
        let query = supabase.from("projects").select("execution_percentage");
        
        // Aplicar filtros do progresso ou usar filtros principais
        const activeFilters = progressFilters.useMainFilters ? filters : progressFilters;
        
        if (activeFilters.municipality_id) {
          query = query.eq("municipality_id", activeFilters.municipality_id);
        }
        if (activeFilters.program_id) {
          query = query.eq("program_id", activeFilters.program_id);
        }
        if (activeFilters.status) {
          query = query.eq("status", activeFilters.status as any);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        // Aplicar filtro de faixa de execução
        let filtered = data || [];
        if (progressFilters.executionRange && !progressFilters.useMainFilters) {
          switch (progressFilters.executionRange) {
            case "above_60":
              filtered = filtered.filter((p: any) => (p.execution_percentage || 0) >= 60);
              break;
            case "below_60":
              filtered = filtered.filter((p: any) => (p.execution_percentage || 0) < 60);
              break;
            case "0-20":
              filtered = filtered.filter((p: any) => (p.execution_percentage || 0) >= 0 && (p.execution_percentage || 0) <= 20);
              break;
            case "21-40":
              filtered = filtered.filter((p: any) => (p.execution_percentage || 0) > 20 && (p.execution_percentage || 0) <= 40);
              break;
            case "41-60":
              filtered = filtered.filter((p: any) => (p.execution_percentage || 0) > 40 && (p.execution_percentage || 0) <= 60);
              break;
            case "61-80":
              filtered = filtered.filter((p: any) => (p.execution_percentage || 0) > 60 && (p.execution_percentage || 0) <= 80);
              break;
            case "81-100":
              filtered = filtered.filter((p: any) => (p.execution_percentage || 0) > 80 && (p.execution_percentage || 0) <= 100);
              break;
          }
        }
        
        setProgressProjects(filtered);
      } catch (error) {
        console.error("Erro ao carregar projetos para progresso:", error);
      }
    };
    
    loadProgressProjects();
  }, [filters, progressFilters]);

  // Calcular estatísticas adicionais do progresso com dados reais
  const progressStats = useMemo(() => {
    // Se não houver projetos filtrados, usar stats gerais
    if (!progressProjects.length && stats) {
      const avgExec = stats.avgExecution;
      const meta = 60;
      return {
        aboveMeta: avgExec >= meta ? Math.round(stats.totalProjects * 0.5) : 0,
        belowMeta: avgExec < meta ? Math.round(stats.totalProjects * 0.5) : 0,
        distribution: {
          "0-20": Math.round(stats.totalProjects * 0.2),
          "21-40": Math.round(stats.totalProjects * 0.3),
          "41-60": Math.round(stats.totalProjects * 0.25),
          "61-80": Math.round(stats.totalProjects * 0.15),
          "81-100": Math.round(stats.totalProjects * 0.1)
        },
        meta,
        currentAvg: avgExec,
        differenceToMeta: avgExec - meta,
        totalProjects: stats.totalProjects
      };
    }
    
    if (!progressProjects.length) return null;
    
    const meta = 60;
    const executions = progressProjects.map((p: any) => p.execution_percentage || 0);
    const avgExec = executions.reduce((sum, e) => sum + e, 0) / executions.length;
    
    // Calcular projetos acima/abaixo da meta
    const aboveMeta = executions.filter(e => e >= meta).length;
    const belowMeta = executions.filter(e => e < meta).length;
    
    // Distribuição por faixas
    const distribution = {
      "0-20": executions.filter(e => e >= 0 && e <= 20).length,
      "21-40": executions.filter(e => e > 20 && e <= 40).length,
      "41-60": executions.filter(e => e > 40 && e <= 60).length,
      "61-80": executions.filter(e => e > 60 && e <= 80).length,
      "81-100": executions.filter(e => e > 80 && e <= 100).length
    };
    
    return {
      aboveMeta,
      belowMeta,
      distribution,
      meta,
      currentAvg: avgExec,
      differenceToMeta: avgExec - meta,
      totalProjects: executions.length
    };
  }, [progressProjects]);

  // Função para obter cor do gauge baseada na média
  const getGaugeColor = (avg: number) => {
    if (avg >= 60) return "#22c55e"; // Verde
    if (avg >= 40) return "#eab308"; // Amarelo
    return "#ef4444"; // Vermelho
  };

  // Função para obter status do progresso
  const getProgressStatus = (avg: number) => {
    if (avg >= 60) return { label: "Meta Atingida", color: "text-green-500" };
    if (avg >= 40) return { label: "Próximo da Meta", color: "text-yellow-500" };
    return { label: "Abaixo da Meta", color: "text-red-500" };
  };

  useEffect(() => {
    const durationMs = 800;
    const start = performance.now();
    const targetProj = stats?.totalProjects || 0;
    const targetMun = stats?.totalMunicipalities || 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      setCountProjects(Math.round(targetProj * p));
      setCountMunicipalities(Math.round(targetMun * p));
      if (p < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [stats?.totalProjects, stats?.totalMunicipalities]);

  useEffect(() => {
    const id = setInterval(() => setTimer(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Cores para os gráficos
  const COLORS = [
    "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00", 
    "#ff00ff", "#00ffff", "#ff0000", "#0000ff", "#ffff00", 
    "#ffa500", "#800080"
  ];

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      em_criacao: "#8884d8",
      em_elaboracao: "#82ca9d", 
      em_analise: "#ffc658",
      em_complementacao: "#ff7300",
      solicitado_documentacao: "#00ff00",
      aguardando_documentacao: "#ff00ff",
      clausula_suspensiva: "#ff0000",
      aprovado: "#00ffff",
      em_execucao: "#0000ff",
      prestacao_contas: "#ffff00",
      concluido: "#00ff00",
      cancelado: "#ff0000",
    };
    return colorMap[status] || "#8884d8";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header fixo com título, busca, ações e usuário */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="mx-auto max-w-[1400px] px-3 md:px-4 py-2 md:py-3">
          {/* Linha superior: título e busca */}
          <div className="flex items-center gap-2 md:gap-3 justify-between mb-2 md:mb-0">
            <h2 className="text-lg md:text-2xl font-semibold tracking-tight truncate flex-1 min-w-0">Plataforma de Gestão de Convênios</h2>
            <div className="hidden md:flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 flex-1 max-w-md">
              <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <input className="bg-transparent outline-none text-sm flex-1" placeholder="Pesquisar" />
            </div>
          </div>
          {/* Linha inferior: botões de ação */}
          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs md:text-sm"
              onClick={() => setMunicipalityDialogOpen(true)}
            >
              <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> 
              <span className="hidden sm:inline">Novo</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs md:text-sm"
              onClick={() => stats && createDashboardPdf({})} 
              disabled={!stats}
            >
              <span className="hidden sm:inline">Exportar </span>PDF
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs md:text-sm hidden sm:flex"
              onClick={() => stats && exportDashboardToExcel(stats)} 
              disabled={!stats}
            >
              Exportar Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs md:text-sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> 
              <span className="hidden sm:inline">Filtros</span>
            </Button>
            {/* Botão de busca mobile - pode ser expandido no futuro */}
            <Button 
              variant="outline" 
              size="sm"
              className="md:hidden"
              onClick={() => setShowFilters(!showFilters)}
              title="Buscar"
            >
              <Search className="h-3 w-3" />
            </Button>
            {/* Usuário */}
            <div className="flex items-center gap-1 md:gap-2 rounded-full border px-2 py-1 ml-auto">
              <User className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
              <span className="text-xs md:text-sm hidden sm:inline truncate max-w-[150px]" title={userName}>
                {userName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <Card className="border-b">
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="filter-municipality">Município</Label>
                <Select
                  value={filters.municipality_id || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, municipality_id: value === "all" ? "" : value }))
                  }
                >
                  <SelectTrigger id="filter-municipality">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {municipalities.map((mun) => (
                      <SelectItem key={mun.id} value={mun.id}>
                        {mun.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="filter-program">Programa</Label>
                <Select
                  value={filters.program_id || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, program_id: value === "all" ? "" : value }))
                  }
                >
                  <SelectTrigger id="filter-program">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {programs.map((prog) => (
                      <SelectItem key={prog.id} value={prog.id}>
                        {prog.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="filter-ministry">Ministério</Label>
                <Input
                  id="filter-ministry"
                  placeholder="Digite para filtrar"
                  value={filters.ministry}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, ministry: e.target.value }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="filter-status">Status</Label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, status: value === "all" ? "" : value }))
                  }
                >
                  <SelectTrigger id="filter-status">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="em_criacao">Em Criação</SelectItem>
                    <SelectItem value="em_elaboracao">Em Elaboração</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="em_complementacao">Em Complementação</SelectItem>
                    <SelectItem value="solicitado_documentacao">Solicitado Documentação</SelectItem>
                    <SelectItem value="aguardando_documentacao">Aguardando Documentação</SelectItem>
                    <SelectItem value="clausula_suspensiva">Cláusula Suspensiva</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="em_execucao">Em Execução</SelectItem>
                    <SelectItem value="prestacao_contas">Prestação de Contas</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs com variação e mini-sparkline */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[{
          title: "Municípios", value: stats?.totalMunicipalities || 0, icon: <Building2 className="h-4 w-4" />, delta: +2, link: "/municipalities"
        },{
          title: "Projetos", value: stats?.totalProjects || 0, icon: <FolderKanban className="h-4 w-4" />, delta: +5, link: "/projects"
        },{
          title: "Valor Total", value: formatCurrency(stats?.totalAmount || 0), icon: <DollarSign className="h-4 w-4" />, delta: +1.2, link: "/projects"
        },{
          title: "Execução Média", value: `${Math.round(stats?.avgExecution || 0)}%`, icon: <TrendingUp className="h-4 w-4" />, delta: 0, link: "/projects"
        }].map((kpi, idx) => (
          <Card key={idx} className="border border-white/5 hover:-translate-y-0.5 transition-all hover:shadow-md cursor-pointer" onClick={() => navigate(kpi.link)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">{kpi.icon}{kpi.title}</CardTitle>
              <span className={`text-xs ${kpi.delta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{kpi.delta >= 0 ? `↑ ${kpi.delta}%` : `↓ ${Math.abs(kpi.delta)}%`}</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              {/* Sparkline simples (placeholder) */}
              <div className="mt-3 h-10">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={Array.from({length: 12}, (_,i) => ({x:i, y: Math.max(1, (idx+1)*5 + ((i%3)-1)*3)}))}>
                    <defs>
                      <linearGradient id={`spark-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="y" stroke="#60a5fa" fill={`url(#spark-${idx})`} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Barra de filtros removida: exibimos todos os dados */}

      {/* Bloco central inspirado no mock: coluna esquerda (2) + direita (1) */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-2xl shadow-lg shadow-blue-900/20">
          <CardHeader className="pb-3 px-3 md:px-6">
            <CardTitle className="flex items-center gap-2 justify-between text-base md:text-lg">
              <span>Distribuição dos Projetos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-5 px-3 md:px-6">
            <div id="chart-distribuicao" className="relative overflow-hidden w-full">
                <ChartContainer config={{}} className="h-[280px] md:h-[360px] w-full">
                    <BarChart 
                      data={[...pieData]
                        .filter((d)=>!hiddenStatuses.has(d.status))
                        .sort((a,b)=>b.value-a.value)
                        .map((d) => ({
                          ...d,
                          displayValue: calculateCompressedScale.scale(d.value),
                          originalValue: d.value
                        }))} 
                      layout="vertical" 
                      margin={{ left: 10, right: 90 }}
                    >
                      <defs>
                        {/* sombra removida para tirar 3D */}
                        {pieData.map((d) => (
                          <linearGradient key={d.status} id={`grad-${d.status}`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={getStatusColor(d.status)} />
                            <stop offset="100%" stopColor={getStatusColor(d.status)} stopOpacity={0.85} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        type="number" 
                        domain={[0, calculateCompressedScale.max]}
                        hide 
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={80} 
                        tick={{ fontSize: 9 }} 
                        tickFormatter={(v) => truncate(v, 12)}
                      />
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border rounded-lg p-2 shadow-lg">
                                <p className="font-medium">{data.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {data.originalValue} projetos • {formatPercent(data.originalValue)}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="displayValue" radius={[12,12,12,12]} isAnimationActive={false} minPointSize={8}>
                        {[...pieData].filter((d)=>!hiddenStatuses.has(d.status)).sort((a,b)=>b.value-a.value).map((item, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={`url(#grad-${item.status})`}
                            onMouseEnter={() => setActiveIndex(index)}
                            onMouseLeave={() => setActiveIndex(null)}
                            style={{ transform: activeIndex === index ? 'scale(1.02)' : undefined, transformOrigin: 'left center' }}
                          />
                        ))}
                        <LabelList 
                          dataKey="originalValue" 
                          position="right" 
                          className="fill-foreground text-xs" 
                          formatter={(v:any) => `${v} • ${formatPercent(v)}`} 
                          offset={5}
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                {/* Legenda em badges suaves */}
                <div className="mt-4 flex flex-wrap gap-2 text-xs items-center">
                  {pieData.slice().sort((a,b)=>b.value-a.value).map((item) => (
                    <button
                      key={item.name}
                      onClick={() => {
                        setHiddenStatuses((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.status)) next.delete(item.status); else next.add(item.status);
                          return next;
                        });
                      }}
                      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 ${hiddenStatuses.has(item.status) ? 'opacity-50' : 'bg-background/60'}`}
                    >
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getStatusColor(item.status) }} />
                      <span className="truncate max-w-[120px]">{item.name}</span>
                      <span className="font-medium">{item.value}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setHiddenStatuses(new Set())}
                    className="ml-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Limpar
                  </button>
                </div>
              </div>
          </CardContent>
        </Card>

        <Card className="relative rounded-2xl shadow-lg shadow-blue-900/20 overflow-hidden">
          <CardHeader className="pb-2 px-3 md:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2">
                Progresso Geral
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowProgressDetails(!showProgressDetails)}
                  title="Ver detalhes"
                >
                  {showProgressDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CardTitle>
              {progressStats && (
                <Badge 
                  variant="outline" 
                  className={getProgressStatus(progressStats.currentAvg).color}
                >
                  {getProgressStatus(progressStats.currentAvg).label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-5 px-3 md:px-6">
            {/* Filtros específicos do Progresso Geral */}
            {showProgressDetails && (
              <div className="border-b pb-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="use-main-filters"
                    checked={progressFilters.useMainFilters}
                    onChange={(e) => setProgressFilters(prev => ({ ...prev, useMainFilters: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="use-main-filters" className="text-sm cursor-pointer">
                    Usar filtros do dashboard
                  </Label>
                </div>
                {!progressFilters.useMainFilters && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <Label htmlFor="progress-municipality" className="text-xs">Município</Label>
                      <Select
                        value={progressFilters.municipality_id || "all"}
                        onValueChange={(value) => setProgressFilters(prev => ({ ...prev, municipality_id: value === "all" ? "" : value }))}
                      >
                        <SelectTrigger id="progress-municipality" className="h-8 text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {municipalities.map((mun) => (
                            <SelectItem key={mun.id} value={mun.id}>{mun.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="progress-program" className="text-xs">Programa</Label>
                      <Select
                        value={progressFilters.program_id || "all"}
                        onValueChange={(value) => setProgressFilters(prev => ({ ...prev, program_id: value === "all" ? "" : value }))}
                      >
                        <SelectTrigger id="progress-program" className="h-8 text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {programs.map((prog) => (
                            <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="progress-execution-range" className="text-xs">Faixa de Execução</Label>
                      <Select
                        value={progressFilters.executionRange || "all"}
                        onValueChange={(value) => setProgressFilters(prev => ({ ...prev, executionRange: value === "all" ? "" : value }))}
                      >
                        <SelectTrigger id="progress-execution-range" className="h-8 text-xs">
                          <SelectValue placeholder="Todas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as faixas</SelectItem>
                          <SelectItem value="above_60">≥ 60% (Acima da meta)</SelectItem>
                          <SelectItem value="below_60">{"< 60% (Abaixo da meta)"}</SelectItem>
                          <SelectItem value="0-20">0% - 20%</SelectItem>
                          <SelectItem value="21-40">21% - 40%</SelectItem>
                          <SelectItem value="41-60">41% - 60%</SelectItem>
                          <SelectItem value="61-80">61% - 80%</SelectItem>
                          <SelectItem value="81-100">81% - 100%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Gauge semicircular com cores semafóricas */}
            <div 
              id="chart-progresso" 
              className="h-[150px] md:h-[180px] relative cursor-pointer"
              onClick={() => setShowProgressDetails(!showProgressDetails)}
              title="Clique para ver detalhes"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={[
                      { name: "progresso", value: Math.max(0, Math.round(progressStats?.currentAvg || stats?.avgExecution || 0)) },
                      { name: "restante", value: Math.max(0, 100 - Math.round(progressStats?.currentAvg || stats?.avgExecution || 0)) }
                    ]}
                    startAngle={180}
                    endAngle={0}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={1}
                    dataKey="value"
                  >
                    <Cell 
                      fill={getGaugeColor(progressStats?.currentAvg || stats?.avgExecution || 0)} 
                      radius={6} 
                    />
                    <Cell fill="#0f172a" radius={6} />
                  </Pie>
                  {/* Linha indicadora da meta (60%) */}
                  <Pie
                    data={[
                      { name: "meta", value: 60 },
                      { name: "resto", value: 40 }
                    ]}
                    startAngle={180}
                    endAngle={0}
                    innerRadius={75}
                    outerRadius={77}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#eab308" opacity={0.3} />
                    <Cell fill="transparent" />
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="-mt-12 md:-mt-16 text-center">
                <div className="text-3xl md:text-4xl font-bold" style={{ color: getGaugeColor(progressStats?.currentAvg || stats?.avgExecution || 0) }}>
                  {Math.round(progressStats?.currentAvg || stats?.avgExecution || 0)}%
                </div>
                <div className="text-xs text-slate-400">Média de Execução</div>
                <div className="text-xs text-slate-500 mt-1">Meta: 60%</div>
                {previousAvgExecution !== null && (
                  <div className="text-xs mt-1 flex items-center justify-center gap-1">
                    {progressStats && progressStats.currentAvg >= previousAvgExecution ? (
                      <ArrowUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={progressStats && progressStats.currentAvg >= previousAvgExecution ? "text-green-500" : "text-red-500"}>
                      {previousAvgExecution !== null ? Math.abs(Math.round((progressStats?.currentAvg || stats?.avgExecution || 0) - previousAvgExecution)) : 0}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Estatísticas adicionais */}
            {progressStats && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg p-2 bg-green-500/10 border border-green-500/20">
                  <div className="text-slate-400 text-xs">Acima da Meta</div>
                  <div className="text-lg font-bold text-green-500">{progressStats.aboveMeta}</div>
                </div>
                <div className="rounded-lg p-2 bg-red-500/10 border border-red-500/20">
                  <div className="text-slate-400 text-xs">Abaixo da Meta</div>
                  <div className="text-lg font-bold text-red-500">{progressStats.belowMeta}</div>
                </div>
              </div>
            )}

            {/* Cards de projetos e municípios */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                <div className="text-slate-400 text-sm mb-1">Projetos</div>
                <div className="text-3xl font-bold">{progressStats?.totalProjects || countProjects}</div>
                {progressStats && (
                  <div className="text-xs text-slate-500 mt-1">Analisados: {progressStats.totalProjects}</div>
                )}
              </div>
              <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                <div className="text-slate-400 text-sm mb-1">Municípios</div>
                <div className="text-3xl font-bold">{countMunicipalities}</div>
              </div>
            </div>

            {/* Distribuição por faixas (expandível) */}
            {showProgressDetails && progressStats && (
              <div className="border-t pt-4">
                <div className="text-sm font-medium mb-2">Distribuição por Faixas</div>
                <div className="space-y-2">
                  {Object.entries(progressStats.distribution).map(([range, count]) => (
                    <div key={range} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{range}%</span>
                      <div className="flex-1 mx-2 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${(count / progressStats.totalProjects) * 100}%` }}
                        />
                      </div>
                      <span className="font-medium w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Segunda fileira removida conforme solicitação */}

      {/* Bloco "Evolução por Status" removido conforme solicitação */}

      {/* Atividades Recentes - Organizado de forma simétrica */}
      <Card>
        <CardHeader className="px-3 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
            Atividades Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
          <DailyTasks />
        </CardContent>
      </Card>

      {/* Quadro de Municípios */}
      <Card>
        <CardHeader className="px-3 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <MapPin className="h-4 w-4 md:h-5 md:w-5" />
            Quadro de Municípios
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4 mb-4 md:mb-6 pb-4 border-b">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Label htmlFor="status-filter" className="text-sm font-medium whitespace-nowrap">
                Status dos Projetos:
              </Label>
              <Select
                value={municipalitiesBoardFilter.status || "all"}
                onValueChange={(value) =>
                  setMunicipalitiesBoardFilter((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger id="status-filter" className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="em_criacao">Em Criação</SelectItem>
                  <SelectItem value="em_elaboracao">Em Elaboração</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="em_complementacao">Em Complementação</SelectItem>
                  <SelectItem value="solicitado_documentacao">Solicitado Documentação</SelectItem>
                  <SelectItem value="aguardando_documentacao">Aguardando Documentação</SelectItem>
                  <SelectItem value="clausula_suspensiva">Cláusula Suspensiva</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="em_execucao">Em Execução</SelectItem>
                  <SelectItem value="prestacao_contas">Prestação de Contas</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="show-all-status"
                checked={municipalitiesBoardFilter.showAll}
                onChange={(e) =>
                  setMunicipalitiesBoardFilter((prev) => ({ ...prev, showAll: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="show-all-status" className="text-sm cursor-pointer whitespace-nowrap">
                Mostrar todos os status
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMunicipalitiesBoard()}
              className="ml-auto w-full sm:w-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>

          {/* Cards de Municípios */}
          <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {municipalitiesBoardData.map((mun) => {
              const filteredProjects = municipalitiesBoardFilter.showAll
                ? mun.projects
                : municipalitiesBoardFilter.status && municipalitiesBoardFilter.status !== "all"
                ? mun.projects.filter((p) => p.status === municipalitiesBoardFilter.status)
                : mun.projects;

              if (filteredProjects.length === 0) return null;

              const filteredTotal = filteredProjects.reduce(
                (sum, p) => sum + p.transfer_amount + p.counterpart_amount,
                0
              );
              const filteredAvgExec =
                filteredProjects.length > 0
                  ? filteredProjects.reduce((sum, p) => sum + p.execution_percentage, 0) /
                    filteredProjects.length
                  : 0;

              return (
                <Card key={mun.id} className="border border-white/5 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      {mun.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Estatísticas */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Projetos:</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {filteredProjects.length}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Valor Total:</span>
                        <span className="text-sm font-semibold">{formatCurrency(filteredTotal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Execução:</span>
                        <Badge
                          variant={filteredAvgExec >= 60 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {Math.round(filteredAvgExec)}%
                        </Badge>
                      </div>
                    </div>

                    {/* Lista de Projetos */}
                    <div className="space-y-2 pt-2 border-t">
                      <span className="text-xs font-medium text-muted-foreground">Projetos:</span>
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                        {filteredProjects.slice(0, 5).map((proj) => (
                          <div
                            key={proj.id}
                            className="flex items-center justify-between text-xs p-2 rounded bg-muted/50"
                          >
                            <span className="truncate flex-1" title={proj.object}>
                              {proj.object}
                            </span>
                            <Badge
                              variant="outline"
                              className="ml-2 text-[10px] px-1.5 py-0.5"
                              style={{
                                backgroundColor: getStatusColor(proj.status) + "20",
                                borderColor: getStatusColor(proj.status),
                                color: getStatusColor(proj.status),
                              }}
                            >
                              {getStatusLabel(proj.status)}
                            </Badge>
                          </div>
                        ))}
                        {filteredProjects.length > 5 && (
                          <div className="text-xs text-muted-foreground text-center pt-1">
                            +{filteredProjects.length - 5} projeto(s)
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {municipalitiesBoardData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum município encontrado com os filtros selecionados.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Painel de Controle do Usuário */}
      <UserControlPanel />

      {/* Dialog de Novo Município */}
      <MunicipalityDialog
        open={municipalityDialogOpen}
        onOpenChange={setMunicipalityDialogOpen}
        municipality={undefined}
        onSuccess={() => {
          loadOptions();
          loadDashboardData();
          loadMunicipalitiesBoard();
        }}
      />

      {/* botão de contraste agora está integrado ao widget do Assistente */}
    </div>
  );
};

export default Dashboard;