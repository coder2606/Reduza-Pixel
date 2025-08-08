import React, { useState } from "react";
import { useExternalMPesa } from "../hooks/useExternalMPesa";
import MPESA_EXTERNAL_CONFIG from "../config/mpesaConfig";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";

const MPesaTestDebug: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    processPayment,
    healthCheck,
    loading: mpesaLoading,
    error: mpesaError,
  } = useExternalMPesa({
    serverUrl: MPESA_EXTERNAL_CONFIG.serverUrl,
    apiKey: MPESA_EXTERNAL_CONFIG.apiKey,
  });

  const addResult = (
    message: string,
    type: "info" | "success" | "error" = "info"
  ) => {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    setTestResults((prev) => [...prev, formattedMessage]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testCorsDirectly = async () => {
    addResult("🌐 Testando CORS diretamente...", "info");
    setIsLoading(true);

    try {
      // Teste 1: Health Check
      addResult("1️⃣ Testando Health Check...", "info");
      const healthResponse = await fetch(
        `${MPESA_EXTERNAL_CONFIG.serverUrl}/api/health`,
        {
          method: "GET",
          mode: "cors",
          headers: {
            Origin: window.location.origin,
          },
        }
      );

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        addResult(`✅ Health Check: ${healthData.status}`, "success");
      } else {
        addResult(`❌ Health Check falhou: ${healthResponse.status}`, "error");
      }

      // Teste 2: OPTIONS Preflight
      addResult("2️⃣ Testando OPTIONS Preflight...", "info");
      const optionsResponse = await fetch(
        `${MPESA_EXTERNAL_CONFIG.serverUrl}/api/mpesa/payment`,
        {
          method: "OPTIONS",
          mode: "cors",
          headers: {
            "Content-Type": "application/json",
            Origin: window.location.origin,
          },
        }
      );

      if (optionsResponse.ok) {
        const corsHeaders = {
          origin: optionsResponse.headers.get("Access-Control-Allow-Origin"),
          methods: optionsResponse.headers.get("Access-Control-Allow-Methods"),
          headers: optionsResponse.headers.get("Access-Control-Allow-Headers"),
        };
        addResult(
          `✅ CORS Preflight: ${JSON.stringify(corsHeaders)}`,
          "success"
        );
      } else {
        addResult(
          `❌ CORS Preflight falhou: ${optionsResponse.status}`,
          "error"
        );
      }
    } catch (error) {
      addResult(`❌ Erro no teste CORS: ${(error as Error).message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const testHealthCheckViaHook = async () => {
    addResult("🔍 Testando Health Check via Hook...", "info");
    setIsLoading(true);

    try {
      const result = await healthCheck();
      if (result.status === "healthy") {
        addResult(`✅ Health Check Hook: ${result.status}`, "success");
        addResult(
          `Detalhes: ${JSON.stringify(result.details, null, 2)}`,
          "info"
        );
      } else {
        addResult(`❌ Health Check Hook: ${result.status}`, "error");
      }
    } catch (error) {
      addResult(
        `❌ Erro no Health Check Hook: ${(error as Error).message}`,
        "error"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testPaymentSimulation = async () => {
    addResult("💳 Testando Simulação de Pagamento...", "info");
    setIsLoading(true);

    try {
      const testPaymentData = {
        amount: 10,
        customerMsisdn: "258841234567", // Número de teste
        reference: `TEST_RDP_${Date.now()}`,
        thirdPartyReference: String(Date.now()).slice(-5),
      };

      addResult(
        `Dados de teste: ${JSON.stringify(testPaymentData, null, 2)}`,
        "info"
      );

      const result = await processPayment(testPaymentData);

      if (result.success) {
        addResult(
          "✅ Simulação de pagamento executada com sucesso!",
          "success"
        );
        addResult(`Resultado: ${JSON.stringify(result, null, 2)}`, "success");
      } else {
        addResult(
          `⚠️ Simulação retornou erro esperado: ${result.error}`,
          "info"
        );
        addResult(
          "(Isto é normal em ambiente de teste sem credenciais reais)",
          "info"
        );
      }
    } catch (error) {
      addResult(`❌ Erro na simulação: ${(error as Error).message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🧪 Debug M-Pesa CORS</CardTitle>
        <CardDescription>
          Ferramenta de diagnóstico para testar a integração M-Pesa e
          configurações CORS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informações de Configuração */}
        <Alert>
          <AlertDescription>
            <strong>Servidor:</strong> {MPESA_EXTERNAL_CONFIG.serverUrl}
            <br />
            <strong>Origin:</strong> {window.location.origin}
            <br />
            <strong>API Key:</strong>{" "}
            {MPESA_EXTERNAL_CONFIG.apiKey
              ? "✅ Configurada"
              : "❌ Não configurada"}
          </AlertDescription>
        </Alert>

        {/* Botões de Teste */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={testCorsDirectly}
            disabled={isLoading || mpesaLoading}
            variant="default"
          >
            🌐 Teste CORS Direto
          </Button>

          <Button
            onClick={testHealthCheckViaHook}
            disabled={isLoading || mpesaLoading}
            variant="outline"
          >
            🔍 Health Check Hook
          </Button>

          <Button
            onClick={testPaymentSimulation}
            disabled={isLoading || mpesaLoading}
            variant="secondary"
          >
            💳 Simulação Pagamento
          </Button>

          <Button onClick={clearResults} variant="destructive" size="sm">
            🧹 Limpar
          </Button>
        </div>

        {/* Estados de Loading/Error */}
        {(isLoading || mpesaLoading) && (
          <Alert>
            <AlertDescription>⏳ Executando teste...</AlertDescription>
          </Alert>
        )}

        {mpesaError && (
          <Alert>
            <AlertDescription className="text-red-600">
              ❌ Erro M-Pesa: {mpesaError}
            </AlertDescription>
          </Alert>
        )}

        {/* Resultados dos Testes */}
        {testResults.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">
              📊 Resultados dos Testes
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {testResults.join("\n")}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MPesaTestDebug;
