import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export const AuthDebug: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testLogin = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log("🔍 Testando autenticação...");

      // Testar configurações do cliente
      const clientInfo = {
        url: supabase.supabaseUrl,
        key: supabase.supabaseKey ? "✅ Presente" : "❌ Ausente",
      };

      // Testar sessão atual
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      // Testar login
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: "kobedesigner7@gmail.com",
          password: "admin123", // Use a senha real aqui
        });

      const debugInfo = {
        clientInfo,
        session: {
          data: sessionData,
          error: sessionError?.message,
        },
        login: {
          data: loginData?.user
            ? {
                id: loginData.user.id,
                email: loginData.user.email,
                confirmed: loginData.user.email_confirmed_at,
              }
            : null,
          error: loginError?.message,
          errorCode: loginError?.status,
        },
        timestamp: new Date().toISOString(),
      };

      console.log("🔍 Debug Info:", debugInfo);
      setResult(debugInfo);
    } catch (error: any) {
      console.error("❌ Erro no teste:", error);
      setResult({
        error: error.message,
        stack: error.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  const testUserExists = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Verificar se o usuário existe via API
      const response = await fetch(
        `${supabase.supabaseUrl}/auth/v1/admin/users`,
        {
          headers: {
            Authorization: `Bearer ${supabase.supabaseKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const users = await response.json();
        setResult({
          status: "success",
          message: "Usuários encontrados",
          data: users,
        });
      } else {
        setResult({
          status: "error",
          message: `HTTP ${response.status}: ${response.statusText}`,
        });
      }
    } catch (error: any) {
      setResult({
        status: "error",
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>🔧 Debug de Autenticação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={testLogin}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Testar Login"
            )}
          </Button>

          <Button
            onClick={testUserExists}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Verificar Usuários"
            )}
          </Button>

          <Button onClick={() => setResult(null)} variant="ghost" size="sm">
            Limpar
          </Button>
        </div>

        {result && (
          <div className="mt-4 p-4 bg-muted rounded-md">
            <pre className="text-xs overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthDebug;
