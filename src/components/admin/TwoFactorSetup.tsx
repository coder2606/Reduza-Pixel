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
