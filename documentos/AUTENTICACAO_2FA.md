# Implementação de Autenticação de Dois Fatores (2FA) com Google Authenticator

Este documento descreve o processo de implementação de autenticação de dois fatores (2FA) usando Google Authenticator para a área administrativa do sistema Reduza Pixel.

## Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Configuração do Supabase](#configuração-do-supabase)
4. [Implementação no Frontend](#implementação-no-frontend)
5. [Fluxo de Autenticação](#fluxo-de-autenticação)
6. [Recuperação de Acesso](#recuperação-de-acesso)
7. [Testes de Segurança](#testes-de-segurança)
8. [Melhores Práticas](#melhores-práticas)

## Visão Geral

A autenticação de dois fatores (2FA) adiciona uma camada extra de segurança além da senha tradicional. Após inserir a senha, o usuário precisará fornecer um código temporário gerado pelo aplicativo Google Authenticator.

## Pré-requisitos

- Conta Supabase com autenticação configurada
- Biblioteca `@supabase/supabase-js` instalada
- Biblioteca `otplib` para geração e validação de tokens TOTP
- Biblioteca `qrcode` para geração de QR codes

```bash
npm install otplib qrcode
```

## Configuração do Supabase

### 1. Criar tabela para armazenar segredos TOTP

```sql
-- Executar esta migração no Supabase
CREATE TABLE IF NOT EXISTS admin_totp_secrets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret_key TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar políticas de segurança RLS
ALTER TABLE admin_totp_secrets ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas seus próprios segredos
CREATE POLICY "Users can view their own TOTP secrets" ON admin_totp_secrets
  FOR SELECT USING (auth.uid() = user_id);

-- Política para permitir que usuários atualizem apenas seus próprios segredos
CREATE POLICY "Users can update their own TOTP secrets" ON admin_totp_secrets
  FOR UPDATE USING (auth.uid() = user_id);

-- Função para gerar segredo TOTP ao criar novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas criar segredo TOTP para usuários com papel de admin
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = NEW.id AND raw_user_meta_data->>'role' = 'admin'
  ) THEN
    INSERT INTO public.admin_totp_secrets (user_id, secret_key)
    VALUES (NEW.id, encode(gen_random_bytes(20), 'base32'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar segredo TOTP para novos usuários admin
CREATE OR REPLACE TRIGGER on_admin_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_admin_user();
```

## Implementação no Frontend

### 1. Criar hook para gerenciar 2FA

```typescript
// src/hooks/useTwoFactorAuth.ts
import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import * as OTPAuth from "otplib";
import QRCode from "qrcode";

interface TwoFactorAuthState {
  isEnabled: boolean;
  isVerified: boolean;
  qrCodeUrl: string | null;
  secret: string | null;
  isLoading: boolean;
}

export const useTwoFactorAuth = () => {
  const [state, setState] = useState<TwoFactorAuthState>({
    isEnabled: false,
    isVerified: false,
    qrCodeUrl: null,
    secret: null,
    isLoading: true,
  });

  // Buscar status atual do 2FA
  const fetchTwoFactorStatus = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("admin_totp_secrets")
        .select("secret_key, verified")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setState({
        isEnabled: !!data,
        isVerified: data?.verified || false,
        secret: data?.secret_key || null,
        qrCodeUrl: data?.secret_key
          ? await generateQRCode(data.secret_key, user.email || "")
          : null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Erro ao buscar status 2FA:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Gerar QR Code
  const generateQRCode = async (
    secret: string,
    email: string
  ): Promise<string> => {
    const otpauth = OTPAuth.authenticator.keyuri(
      email,
      "Reduza Pixel Admin",
      secret
    );

    return await QRCode.toDataURL(otpauth);
  };

  // Ativar 2FA
  const setupTwoFactor = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuário não autenticado");

      // Gerar novo segredo
      const secret = OTPAuth.authenticator.generateSecret();

      // Salvar no banco
      const { error } = await supabase.from("admin_totp_secrets").upsert({
        user_id: user.id,
        secret_key: secret,
        verified: false,
      });

      if (error) throw error;

      const qrCodeUrl = await generateQRCode(secret, user.email || "");

      setState({
        isEnabled: true,
        isVerified: false,
        secret,
        qrCodeUrl,
        isLoading: false,
      });

      return { secret, qrCodeUrl };
    } catch (error) {
      console.error("Erro ao configurar 2FA:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  // Verificar código 2FA
  const verifyTwoFactorCode = useCallback(
    async (code: string): Promise<boolean> => {
      if (!state.secret) return false;

      try {
        // Verificar se o código é válido
        const isValid = OTPAuth.authenticator.verify({
          token: code,
          secret: state.secret,
        });

        if (!isValid) return false;

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("Usuário não autenticado");

        // Atualizar status para verificado
        if (!state.isVerified) {
          const { error } = await supabase
            .from("admin_totp_secrets")
            .update({ verified: true })
            .eq("user_id", user.id);

          if (error) throw error;

          setState((prev) => ({ ...prev, isVerified: true }));
        }

        return true;
      } catch (error) {
        console.error("Erro ao verificar código 2FA:", error);
        return false;
      }
    },
    [state.secret, state.isVerified]
  );

  // Desativar 2FA
  const disableTwoFactor = useCallback(
    async (code: string): Promise<boolean> => {
      if (!state.secret) return false;

      try {
        // Verificar código antes de desativar
        const isValid = await verifyTwoFactorCode(code);

        if (!isValid) return false;

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("Usuário não autenticado");

        // Remover registro
        const { error } = await supabase
          .from("admin_totp_secrets")
          .delete()
          .eq("user_id", user.id);

        if (error) throw error;

        setState({
          isEnabled: false,
          isVerified: false,
          secret: null,
          qrCodeUrl: null,
          isLoading: false,
        });

        return true;
      } catch (error) {
        console.error("Erro ao desativar 2FA:", error);
        return false;
      }
    },
    [state.secret, verifyTwoFactorCode]
  );

  return {
    ...state,
    fetchTwoFactorStatus,
    setupTwoFactor,
    verifyTwoFactorCode,
    disableTwoFactor,
  };
};
```

### 2. Criar componente para configuração de 2FA

```typescript
// src/components/admin/TwoFactorSetup.tsx
import React, { useState, useEffect } from "react";
import { useTwoFactorAuth } from "@/hooks/useTwoFactorAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Check, AlertCircle } from "lucide-react";

export const TwoFactorSetup: React.FC = () => {
  const [verificationCode, setVerificationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [isDisabling, setIsDisabling] = useState(false);

  const {
    isEnabled,
    isVerified,
    qrCodeUrl,
    secret,
    isLoading,
    fetchTwoFactorStatus,
    setupTwoFactor,
    verifyTwoFactorCode,
    disableTwoFactor,
  } = useTwoFactorAuth();

  useEffect(() => {
    fetchTwoFactorStatus();
  }, [fetchTwoFactorStatus]);

  const handleSetup = async () => {
    try {
      await setupTwoFactor();
      toast.success("Código QR gerado com sucesso");
    } catch (error) {
      toast.error("Erro ao configurar autenticação de dois fatores");
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      toast.error("Por favor, insira o código de verificação");
      return;
    }

    setIsSubmitting(true);

    try {
      const isValid = await verifyTwoFactorCode(verificationCode);

      if (isValid) {
        toast.success("Autenticação de dois fatores ativada com sucesso");
        setVerificationCode("");
      } else {
        toast.error("Código inválido. Tente novamente.");
      }
    } catch (error) {
      toast.error("Erro ao verificar código");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisable = async () => {
    if (!disableCode.trim()) {
      toast.error("Por favor, insira o código para desativar 2FA");
      return;
    }

    setIsDisabling(true);

    try {
      const success = await disableTwoFactor(disableCode);

      if (success) {
        toast.success("Autenticação de dois fatores desativada com sucesso");
        setDisableCode("");
      } else {
        toast.error("Código inválido. Tente novamente.");
      }
    } catch (error) {
      toast.error("Erro ao desativar 2FA");
    } finally {
      setIsDisabling(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center items-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Autenticação de Dois Fatores</CardTitle>
          <CardDescription>
            Adicione uma camada extra de segurança à sua conta usando o Google
            Authenticator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 items-center justify-center py-4">
            <AlertCircle className="h-16 w-16 text-yellow-500" />
            <p className="text-center">
              A autenticação de dois fatores não está ativada. Recomendamos
              fortemente que você ative para aumentar a segurança da sua conta.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSetup} className="w-full">
            Configurar Autenticação de Dois Fatores
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isVerified
            ? "Autenticação de Dois Fatores Ativada"
            : "Configurar Autenticação de Dois Fatores"}
        </CardTitle>
        <CardDescription>
          {isVerified
            ? "Sua conta está protegida com autenticação de dois fatores"
            : "Escaneie o código QR com o Google Authenticator"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isVerified ? (
          <div className="flex flex-col gap-4 items-center justify-center py-4">
            <div className="rounded-full bg-green-100 p-3">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-center">
              A autenticação de dois fatores está ativada para sua conta. Você
              precisará inserir um código do seu aplicativo Google Authenticator
              sempre que fizer login.
            </p>

            <div className="w-full space-y-2 mt-4">
              <Label htmlFor="disable-code">
                Código de verificação para desativar
              </Label>
              <Input
                id="disable-code"
                type="text"
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                maxLength={6}
              />
              <Button
                variant="destructive"
                className="w-full mt-2"
                onClick={handleDisable}
                disabled={isDisabling}
              >
                {isDisabling ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Desativando...
                  </>
                ) : (
                  "Desativar 2FA"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 items-center">
            {qrCodeUrl && (
              <div className="border rounded-md p-4 bg-white">
                <img
                  src={qrCodeUrl}
                  alt="QR Code para 2FA"
                  className="w-48 h-48"
                />
              </div>
            )}

            {secret && (
              <div className="w-full">
                <Label>
                  Código secreto (caso não consiga escanear o QR code)
                </Label>
                <div className="mt-1 p-2 bg-muted rounded-md font-mono text-center break-all">
                  {secret}
                </div>
              </div>
            )}

            <div className="w-full space-y-2 mt-4">
              <Label htmlFor="verification-code">Código de verificação</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
              />
            </div>
          </div>
        )}
      </CardContent>

      {!isVerified && (
        <CardFooter>
          <Button
            onClick={handleVerify}
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              "Verificar e Ativar"
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};
```

### 3. Criar componente para verificação de 2FA no login

```typescript
// src/components/TwoFactorVerification.tsx
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface TwoFactorVerificationProps {
  isOpen: boolean;
  onVerify: (code: string) => Promise<boolean>;
  onCancel: () => void;
}

export const TwoFactorVerification: React.FC<TwoFactorVerificationProps> = ({
  isOpen,
  onVerify,
  onCancel,
}) => {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (!code.trim()) {
      setError("Por favor, insira o código de verificação");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const success = await onVerify(code);

      if (!success) {
        setError("Código inválido. Tente novamente.");
      }
    } catch (error) {
      setError("Erro ao verificar código. Tente novamente.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verificação de Dois Fatores</DialogTitle>
          <DialogDescription>
            Insira o código de 6 dígitos do seu aplicativo Google Authenticator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="2fa-code">Código de verificação</Label>
            <Input
              id="2fa-code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleVerify();
                }
              }}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isVerifying}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleVerify}
            disabled={isVerifying}
            className="flex-1"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              "Verificar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### 4. Modificar página de login para incluir verificação 2FA

```typescript
// src/pages/Login.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useTwoFactorAuth } from "@/hooks/useTwoFactorAuth";
import { TwoFactorVerification } from "@/components/TwoFactorVerification";
import { toast } from "sonner";
// ... outros imports

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [tempSession, setTempSession] = useState<any>(null);

  const navigate = useNavigate();
  const { verifyTwoFactorCode } = useTwoFactorAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Primeiro passo: login com email/senha
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

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
        toast.success("Login realizado com sucesso");
        navigate("/think");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
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
          email,
          password,
        });

        if (error) throw error;

        toast.success("Login realizado com sucesso");
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

  return (
    <div>
      {/* Formulário de login existente */}
      {/* ... */}

      {/* Componente de verificação 2FA */}
      <TwoFactorVerification
        isOpen={showTwoFactor}
        onVerify={handleTwoFactorVerify}
        onCancel={handleTwoFactorCancel}
      />
    </div>
  );
};

export default Login;
```

### 5. Adicionar página de configuração 2FA no painel administrativo

```typescript
// src/components/admin/SecuritySettings.tsx
import React from "react";
import { TwoFactorSetup } from "@/components/admin/TwoFactorSetup";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const SecuritySettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Configurações de Segurança
        </h2>
        <p className="text-muted-foreground">
          Gerencie as configurações de segurança da sua conta
        </p>
      </div>

      <Tabs defaultValue="2fa">
        <TabsList>
          <TabsTrigger value="2fa">Autenticação de Dois Fatores</TabsTrigger>
          <TabsTrigger value="password">Senha</TabsTrigger>
        </TabsList>

        <TabsContent value="2fa" className="space-y-4 mt-4">
          <TwoFactorSetup />
        </TabsContent>

        <TabsContent value="password" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>
                Atualize sua senha para manter sua conta segura
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Formulário de alteração de senha */}
              {/* ... */}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

## Fluxo de Autenticação

1. **Login Inicial**:

   - Usuário insere email e senha
   - Sistema verifica credenciais no Supabase
   - Se o usuário tiver 2FA ativado, redireciona para tela de verificação

2. **Verificação 2FA**:

   - Usuário insere código de 6 dígitos do Google Authenticator
   - Sistema valida o código usando a biblioteca otplib
   - Se válido, completa o login e redireciona para o painel administrativo

3. **Configuração 2FA**:
   - Administrador acessa configurações de segurança
   - Sistema gera um segredo TOTP e exibe QR code
   - Administrador escaneia com Google Authenticator
   - Administrador insere código para verificar configuração
   - Sistema ativa 2FA para o usuário

## Recuperação de Acesso

Para garantir que os administradores não percam acesso ao sistema caso percam acesso ao dispositivo com Google Authenticator:

1. **Códigos de Backup**:

   - Implementar geração de códigos de backup de uso único
   - Armazenar hashes dos códigos no banco de dados
   - Permitir que o usuário baixe ou imprima os códigos

2. **Processo de Recuperação de Emergência**:
   - Criar um processo para super administradores resetarem 2FA de outros usuários
   - Documentar o processo e garantir que seja seguro

## Testes de Segurança

1. **Verificar Proteção Contra Ataques de Força Bruta**:

   - Implementar limite de tentativas de verificação 2FA
   - Adicionar atraso progressivo após tentativas falhas

2. **Validar Segurança do Armazenamento de Segredos**:

   - Garantir que os segredos TOTP estejam protegidos por RLS
   - Verificar que apenas o próprio usuário pode acessar seu segredo

3. **Testar Fluxo Completo**:
   - Login com credenciais corretas
   - Verificação 2FA com código válido
   - Verificação 2FA com código inválido
   - Verificação 2FA com código expirado

## Melhores Práticas

1. **Segurança**:

   - Nunca armazenar segredos TOTP em localStorage ou sessionStorage
   - Implementar políticas de RLS rigorosas no Supabase
   - Usar HTTPS para todas as comunicações

2. **Usabilidade**:

   - Fornecer instruções claras para configuração do Google Authenticator
   - Exibir o segredo em texto para entrada manual, além do QR code
   - Implementar mecanismo de recuperação para casos de perda de dispositivo

3. **Monitoramento**:
   - Registrar todas as tentativas de login e verificação 2FA
   - Implementar alertas para múltiplas tentativas falhas
   - Revisar logs regularmente para detectar padrões suspeitos

---

Esta implementação fornece uma camada adicional de segurança robusta para o painel administrativo, garantindo que apenas usuários autorizados com acesso físico ao dispositivo configurado possam entrar no sistema, mesmo que as credenciais sejam comprometidas.
