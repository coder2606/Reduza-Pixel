// 🧪 Componente de teste para API M-Pesa interna
// Permite testar a nova implementação sem problemas CORS

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Smartphone,
  CreditCard,
  Server,
  Zap,
} from "lucide-react";
import { useInternalMPesa } from "@/hooks/useInternalMPesa";

const MPesaInternalTestDebug: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState("841234567");
  const [amount, setAmount] = useState("10");
  const [testResults, setTestResults] = useState<any[]>([]);

  const {
    isLoading,
    error,
    lastResponse,
    processPayment,
    healthCheck,
    generateReference,
    validatePhoneNumber,
    clearError,
  } = useInternalMPesa();

  const addTestResult = (test: string, result: any, success: boolean) => {
    const newResult = {
      id: Date.now(),
      test,
      result,
      success,
      timestamp: new Date().toLocaleTimeString(),
    };
    setTestResults((prev) => [newResult, ...prev]);
  };

  const handleHealthCheck = async () => {
    try {
      clearError();
      console.log("🩺 Testando health check da API interna...");

      const result = await healthCheck();
      addTestResult("Health Check", result, true);
    } catch (err) {
      addTestResult("Health Check", { error: err.message }, false);
    }
  };

  const handlePaymentTest = async () => {
    try {
      clearError();

      if (!validatePhoneNumber(phoneNumber)) {
        addTestResult(
          "Validação",
          { error: "Número de telefone inválido" },
          false
        );
        return;
      }

      const reference = generateReference("TEST");
      const thirdPartyReference = generateReference("TRD");

      console.log("💳 Testando pagamento via API interna...");

      const result = await processPayment({
        amount: parseFloat(amount),
        customerMsisdn: phoneNumber,
        reference,
        thirdPartyReference,
      });

      addTestResult("Pagamento", result, result.success);
    } catch (err) {
      addTestResult("Pagamento", { error: err.message }, false);
    }
  };

  const handleDirectAPITest = async () => {
    try {
      clearError();
      console.log("📡 Testando endpoint direto da API...");

      const response = await fetch("/api/mpesa", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      addTestResult("API Direta", result, response.ok);
    } catch (err) {
      addTestResult("API Direta", { error: err.message }, false);
    }
  };

  const formatResult = (result: any) => {
    return JSON.stringify(result, null, 2);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-500" />
          Teste M-Pesa API Interna
          <Badge variant="secondary">Sem problemas CORS!</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Teste a nova implementação M-Pesa interna que resolve os problemas
          CORS definitivamente
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status da API */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  <span className="text-sm font-medium">API Status</span>
                </div>
                {error ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {error ? "Com erro" : "Funcionando"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span className="text-sm font-medium">CORS</span>
                </div>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Same-origin (resolvido!)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm font-medium">Última Resposta</span>
                </div>
                {lastResponse?.success ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : lastResponse ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <div className="w-4 h-4 bg-gray-300 rounded-full" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {lastResponse
                  ? lastResponse.success
                    ? "Sucesso"
                    : "Falha"
                  : "Nenhuma"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Formulário de Teste */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Número M-Pesa</Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="841234567 ou 851234567"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Válido: {validatePhoneNumber(phoneNumber) ? "✅" : "❌"}
              </p>
            </div>

            <div>
              <Label htmlFor="amount">Valor (MZN)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10.00"
                min="1"
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleHealthCheck}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Server className="w-4 h-4 mr-2" />
              )}
              Health Check
            </Button>

            <Button
              onClick={handleDirectAPITest}
              disabled={isLoading}
              variant="outline"
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Teste API Direta
            </Button>

            <Button
              onClick={handlePaymentTest}
              disabled={isLoading || !validatePhoneNumber(phoneNumber)}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Teste Pagamento
            </Button>
          </div>
        </div>

        {/* Erro Atual */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-4 h-4" />
                <span className="font-medium">Erro Atual:</span>
              </div>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              <Button
                onClick={clearError}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Limpar Erro
              </Button>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Resultados dos Testes */}
        <div>
          <h3 className="font-medium mb-3">Resultados dos Testes</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum teste executado ainda. Clique em um dos botões acima para
                testar.
              </p>
            ) : (
              testResults.map((result) => (
                <Card
                  key={result.id}
                  className={`${
                    result.success
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium text-sm">
                          {result.test}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {result.timestamp}
                      </span>
                    </div>
                    <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                      {formatResult(result.result)}
                    </pre>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MPesaInternalTestDebug;
