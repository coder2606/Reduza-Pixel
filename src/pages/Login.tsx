import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { loginUser, resetPassword } from "@/utils/auth";
import { supabase } from "@/lib/supabase";
import { useTwoFactorAuth } from "@/hooks/useTwoFactorAuth";
import { TwoFactorVerification } from "@/components/TwoFactorVerification";

interface LoginCredentials {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [tempSession, setTempSession] = useState<any>(null);

  const navigate = useNavigate();
  const { verifyTwoFactorCode } = useTwoFactorAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Primeiro passo: login com email/senha
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

      if (loginError) throw loginError;

      // Verificar se o usuário é admin e precisa de 2FA
      const { data: totpData, error: totpError } = await supabase
        .from("admin_totp_secrets")
        .select("verified")
        .eq("user_id", data.user.id)
        .single();

      if (totpError && totpError.code !== "PGRST116") {
        // PGRST116 significa que não encontrou registro (usuário sem 2FA)
        throw totpError;
      }

      // Se o usuário tem 2FA verificado, mostrar tela de verificação
      if (totpData?.verified) {
        setTempSession(data);
        setShowTwoFactor(true);
        // Fazer logout temporário até que o 2FA seja verificado
        await supabase.auth.signOut();
      } else {
        // Usuário sem 2FA, prosseguir com login normal
        toast.success("Login realizado com sucesso!");
        navigate("/think");
      }
    } catch (err: any) {
      console.error("Erro durante o login:", err);
      setError(err.message || "Erro ao fazer login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTwoFactorVerify = async (code: string): Promise<boolean> => {
    try {
      // Verificar código 2FA
      const isValid = await verifyTwoFactorCode(code);

      if (isValid) {
        // Fazer login novamente, agora que 2FA foi verificado
        const { error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error) throw error;

        toast.success("Login realizado com sucesso!");
        navigate("/think");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Erro na verificação 2FA:", error);
      return false;
    }
  };

  const handleTwoFactorCancel = () => {
    setShowTwoFactor(false);
    setTempSession(null);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.trim()) {
      setError("Digite seu email para recuperar a senha.");
      return;
    }

    setForgotPasswordLoading(true);
    setError(null);

    try {
      await resetPassword(forgotPasswordEmail);
      toast.success(
        "Email de recuperação enviado! Verifique sua caixa de entrada."
      );
      setShowForgotPassword(false);
      setForgotPasswordEmail("");
    } catch (err: any) {
      console.error("Erro durante recuperação:", err);
      setError(err.message || "Erro ao enviar email de recuperação.");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Painel Administrativo
          </h1>
          <p className="text-muted-foreground">
            Acesse o painel de controle do PixelShaper
          </p>
        </div>

        {/* Form de Login */}
        <Card className="shadow-lg border-border/50">
          <CardHeader>
            <CardTitle className="text-center">Fazer Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Campo Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={credentials.email}
                  onChange={handleChange}
                  placeholder="Digite seu email"
                  disabled={isLoading}
                  required
                />
              </div>

              {/* Campo Senha */}
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={credentials.password}
                    onChange={handleChange}
                    placeholder="Digite sua senha"
                    disabled={isLoading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={togglePasswordVisibility}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Mensagem de Erro */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Botão de Login */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fazendo login...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>

            {/* Link Esqueci a senha */}
            <div className="text-center mt-4">
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setShowForgotPassword(true);
                  setForgotPasswordEmail(credentials.email);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Esqueci minha senha
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Recuperação de Senha */}
        {showForgotPassword && (
          <Card className="mt-4 shadow-lg border-border/50">
            <CardHeader>
              <CardTitle className="text-center">Recuperar Senha</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    placeholder="Digite seu email"
                    disabled={forgotPasswordLoading}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleForgotPassword}
                    disabled={forgotPasswordLoading}
                    className="flex-1"
                    size="lg"
                  >
                    {forgotPasswordLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar Email"
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotPasswordEmail("");
                      setError(null);
                    }}
                    disabled={forgotPasswordLoading}
                    size="lg"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Link para voltar */}
        <div className="text-center mt-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            ← Voltar ao PixelShaper
          </Button>
        </div>

        {/* Componente de verificação 2FA */}
        <TwoFactorVerification
          isOpen={showTwoFactor}
          onVerify={handleTwoFactorVerify}
          onCancel={handleTwoFactorCancel}
        />
      </div>
    </div>
  );
};

export default Login;
