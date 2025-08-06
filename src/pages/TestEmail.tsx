import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Loader2, Mail } from "lucide-react";
import {
  testEmailConnection,
  sendPaymentConfirmation,
} from "@/services/emailService";
import { toast } from "sonner";

const TestEmail: React.FC = () => {
  const [email, setEmail] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      const result = await testEmailConnection();
      setConnectionStatus(result.success ? "success" : "error");

      if (result.success) {
        toast.success(
          result.message ||
            "Conexão com servidor SMTP estabelecida com sucesso!"
        );
      } else {
        toast.error(result.error || "Falha ao conectar com servidor SMTP");
      }
    } catch (error) {
      console.error("Erro ao testar conexão:", error);
      setConnectionStatus("error");
      toast.error("Erro ao testar conexão com servidor SMTP");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!email.trim()) {
      toast.error("Por favor, insira um email válido");
      return;
    }

    try {
      setSendingEmail(true);

      const result = await sendPaymentConfirmation(email, {
        transactionId: `test-${Date.now()}`,
        amount: 100,
        imageCount: 10,
        date: new Date().toLocaleString("pt-BR"),
        phoneNumber: "258841234567",
        originalAmount: 150,
        discountApplied: 50,
        couponCode: "TESTE20",
      });

      if (result.success) {
        toast.success("Email de teste enviado com sucesso!");
      } else {
        toast.error("Falha ao enviar email de teste");
      }
    } catch (error) {
      console.error("Erro ao enviar email de teste:", error);
      toast.error("Erro ao enviar email de teste");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Teste de Email
          </CardTitle>
          <CardDescription>
            Teste a configuração do servidor de email Zoho
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert variant="default" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuração necessária</AlertTitle>
            <AlertDescription className="text-xs">
              Para usar o sistema de email, você precisa configurar as seguintes
              variáveis de ambiente no Supabase:
              <ul className="list-disc pl-5 mt-2">
                <li>ZOHO_EMAIL_USER</li>
                <li>ZOHO_EMAIL_PASSWORD</li>
                <li>ADMIN_EMAIL</li>
              </ul>
              <p className="mt-2">
                O sistema usa autenticação segura com a chave anônima do
                Supabase.
              </p>
            </AlertDescription>
          </Alert>

          {connectionStatus === "success" && (
            <Alert className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Conexão estabelecida</AlertTitle>
              <AlertDescription>
                A conexão com o servidor SMTP do Zoho foi estabelecida com
                sucesso.
              </AlertDescription>
            </Alert>
          )}

          {connectionStatus === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro de conexão</AlertTitle>
              <AlertDescription>
                Não foi possível estabelecer conexão com o servidor SMTP.
                Verifique as credenciais no painel do Supabase.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="w-full"
            >
              {testingConnection ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando conexão...
                </>
              ) : (
                "Testar conexão com servidor SMTP"
              )}
            </Button>
          </div>

          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="email">Email para teste</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button
            onClick={handleSendTestEmail}
            disabled={sendingEmail || !email.trim()}
            className="w-full"
          >
            {sendingEmail ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando email de teste...
              </>
            ) : (
              "Enviar email de teste"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TestEmail;
