import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Lock, 
  Mail, 
  Calendar, 
  Shield, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserControl } from "@/hooks/use-user-control";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  phone?: string;
  full_name?: string;
}

export function UserControlPage() {
  const { toast } = useToast();
  const { getUserStats, logActivity } = useUserControl();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Estados para edição
  const [profileData, setProfileData] = useState({
    full_name: "",
    phone: ""
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;
      if (!authUser) return;

      // Buscar dados adicionais do usuário se existirem
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      const userProfile: UserProfile = {
        id: authUser.id,
        email: authUser.email || "",
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        email_confirmed_at: authUser.email_confirmed_at,
        phone: profileData?.phone || "",
        full_name: profileData?.full_name || authUser.user_metadata?.full_name || ""
      };

      setUser(userProfile);
      setProfileData({
        full_name: userProfile.full_name || "",
        phone: userProfile.phone || ""
      });

      // Log da atividade
      await logActivity(
        "view",
        "profile",
        authUser.id,
        "Perfil do Usuário",
        "Usuário visualizou sua página de perfil"
      );

    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as informações do perfil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      length: password.length >= minLength,
      upperCase: hasUpperCase,
      lowerCase: hasLowerCase,
      numbers: hasNumbers,
      specialChar: hasSpecialChar
    };
  };

  const handleProfileUpdate = async () => {
    setSaving(true);
    setErrors({});

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Atualizar ou criar perfil na tabela profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: authUser.id,
          full_name: profileData.full_name,
          phone: profileData.phone,
          updated_at: new Date().toISOString()
        });

      if (profileError) throw profileError;

      // Atualizar metadata do usuário
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: profileData.full_name
        }
      });

      if (metadataError) throw metadataError;

      // Atualizar estado local
      setUser(prev => prev ? {
        ...prev,
        full_name: profileData.full_name,
        phone: profileData.phone
      } : null);

      // Log da atividade
      await logActivity(
        "update",
        "profile",
        authUser.id,
        "Perfil do Usuário",
        "Usuário atualizou suas informações pessoais",
        { 
          full_name: profileData.full_name,
          phone: profileData.phone 
        }
      );

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });

    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setSaving(true);
    setErrors({});

    // Validações
    const newErrors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "Senha atual é obrigatória";
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = "Nova senha é obrigatória";
    } else {
      const passwordValidation = validatePassword(passwordData.newPassword);
      if (!passwordValidation.length) {
        newErrors.newPassword = "Senha deve ter pelo menos 8 caracteres";
      }
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Senhas não coincidem";
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      newErrors.newPassword = "Nova senha deve ser diferente da atual";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      // Log da atividade
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await logActivity(
          "update",
          "password",
          authUser.id,
          "Senha do Usuário",
          "Usuário alterou sua senha"
        );
      }

      // Limpar formulário
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });

      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });

    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      
      if (error.message.includes("Invalid login credentials")) {
        setErrors({ currentPassword: "Senha atual incorreta" });
      } else {
        toast({
          title: "Erro",
          description: error.message || "Não foi possível alterar a senha.",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const passwordValidation = passwordData.newPassword ? validatePassword(passwordData.newPassword) : null;
  const stats = getUserStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando perfil...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Não foi possível carregar as informações do usuário.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Controle do Usuário</h2>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e configurações de conta</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
        </TabsList>

        {/* Aba Perfil */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Digite seu nome completo"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Informações da Conta</Label>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                    <Mail className="h-4 w-4 text-gray-600" />
                    <div>
                      <div className="text-sm font-medium">Email</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <div>
                      <div className="text-sm font-medium">Membro desde</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: ptBR })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleProfileUpdate} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Segurança */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current_password">Senha Atual</Label>
                <div className="relative">
                  <Input
                    id="current_password"
                    type={showPassword ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Digite sua senha atual"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.currentPassword && (
                  <p className="text-sm text-red-600 mt-1">{errors.currentPassword}</p>
                )}
              </div>

              <div>
                <Label htmlFor="new_password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Digite sua nova senha"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.newPassword && (
                  <p className="text-sm text-red-600 mt-1">{errors.newPassword}</p>
                )}
                
                {passwordValidation && (
                  <div className="mt-2 space-y-1">
                    <div className="text-sm font-medium">Requisitos da senha:</div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className={`flex items-center gap-1 ${passwordValidation.length ? 'text-green-600' : 'text-gray-500'}`}>
                        <CheckCircle className="h-3 w-3" />
                        Pelo menos 8 caracteres
                      </div>
                      <div className={`flex items-center gap-1 ${passwordValidation.upperCase ? 'text-green-600' : 'text-gray-500'}`}>
                        <CheckCircle className="h-3 w-3" />
                        Letra maiúscula
                      </div>
                      <div className={`flex items-center gap-1 ${passwordValidation.lowerCase ? 'text-green-600' : 'text-gray-500'}`}>
                        <CheckCircle className="h-3 w-3" />
                        Letra minúscula
                      </div>
                      <div className={`flex items-center gap-1 ${passwordValidation.numbers ? 'text-green-600' : 'text-gray-500'}`}>
                        <CheckCircle className="h-3 w-3" />
                        Número
                      </div>
                      <div className={`flex items-center gap-1 ${passwordValidation.specialChar ? 'text-green-600' : 'text-gray-500'}`}>
                        <CheckCircle className="h-3 w-3" />
                        Caractere especial
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirme sua nova senha"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={handlePasswordChange} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Alterando...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Informações de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                  <Mail className="h-4 w-4 text-gray-600" />
                  <div>
                    <div className="text-sm font-medium">Email Verificado</div>
                    <div className="text-sm text-muted-foreground">
                      {user.email_confirmed_at ? (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verificado
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Não verificado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <div>
                    <div className="text-sm font-medium">Último Acesso</div>
                    <div className="text-sm text-muted-foreground">
                      {user.last_sign_in_at ? (
                        formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true, locale: ptBR })
                      ) : (
                        "Nunca"
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Atividade */}
        <TabsContent value="activity" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">Atividades</span>
                </div>
                <div className="text-2xl font-bold">{stats.totalActivities}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">Tarefas</span>
                </div>
                <div className="text-2xl font-bold">{stats.totalTasks}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-muted-foreground">Pendentes</span>
                </div>
                <div className="text-2xl font-bold">{stats.pendingTasks}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-muted-foreground">Notificações</span>
                </div>
                <div className="text-2xl font-bold">{stats.unreadNotifications}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resumo da Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium">ID do Usuário</Label>
                  <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Data de Criação</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Nome Completo</Label>
                  <p className="text-sm text-muted-foreground">{user.full_name || "Não informado"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
