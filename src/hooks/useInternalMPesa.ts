// 🚀 Hook para M-Pesa usando API interna (sem problemas CORS!)
// Substituição do useExternalMPesa para resolver problemas CORS definitivamente

import { useState, useCallback } from "react";
import { toast } from "sonner";
import mpesaInternalService from "@/services/mpesaInternalService";

interface MPesaPaymentData {
  amount: number;
  customerMsisdn: string;
  reference: string;
  thirdPartyReference: string;
}

interface MPesaResponse {
  success: boolean;
  data?: any;
  error?: string;
  transactionId?: string;
  conversationId?: string;
  responseCode?: string;
  responseDesc?: string;
}

interface UseInternalMPesaReturn {
  // Estados
  isLoading: boolean;
  error: string | null;
  lastResponse: MPesaResponse | null;

  // Funções
  processPayment: (paymentData: MPesaPaymentData) => Promise<MPesaResponse>;
  queryTransactionStatus: (query: {
    transactionId?: string;
    thirdPartyReference?: string;
  }) => Promise<MPesaResponse>;
  queryCustomerName: (customerMsisdn: string) => Promise<MPesaResponse>;
  healthCheck: () => Promise<any>;
  generateReference: (prefix?: string) => string;
  validatePhoneNumber: (msisdn: string) => boolean;
  clearError: () => void;
}

export const useInternalMPesa = (): UseInternalMPesaReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<MPesaResponse | null>(null);

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Health check da API
  const healthCheck = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("🩺 Verificando saúde da API M-Pesa interna...");

      const result = await mpesaInternalService.healthCheck();

      console.log("✅ API M-Pesa interna funcionando:", result);
      toast.success("API M-Pesa interna está funcionando!");

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      console.error("❌ Erro no health check da API interna:", errorMessage);

      setError(errorMessage);
      toast.error(`Erro na API M-Pesa interna: ${errorMessage}`);

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Processar pagamento
  const processPayment = useCallback(
    async (paymentData: MPesaPaymentData): Promise<MPesaResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        console.log("💳 Processando pagamento via API interna...", {
          amount: paymentData.amount,
          reference: paymentData.reference,
        });

        // Validar número de telefone antes de enviar
        if (
          !mpesaInternalService.validatePhoneNumber(paymentData.customerMsisdn)
        ) {
          throw new Error(
            "Número de telefone M-Pesa inválido. Use formato: 841234567 ou 851234567"
          );
        }

        const result = await mpesaInternalService.processPayment(paymentData);

        setLastResponse(result);

        if (result.success) {
          console.log("✅ Pagamento processado com sucesso:", result);
          toast.success("Pagamento M-Pesa processado com sucesso!");
        } else {
          console.warn("⚠️ Pagamento falhou:", result);
          toast.error(
            `Falha no pagamento: ${
              result.responseDesc || result.error || "Erro desconhecido"
            }`
          );
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro desconhecido no pagamento";
        console.error("❌ Erro no pagamento via API interna:", errorMessage);

        setError(errorMessage);
        toast.error(`Erro no pagamento M-Pesa: ${errorMessage}`);

        // Retornar resposta de erro padronizada
        const errorResponse: MPesaResponse = {
          success: false,
          error: errorMessage,
        };

        setLastResponse(errorResponse);
        return errorResponse;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Consultar status de transação
  const queryTransactionStatus = useCallback(
    async (query: {
      transactionId?: string;
      thirdPartyReference?: string;
    }): Promise<MPesaResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        console.log("📊 Consultando status da transação...", query);

        const result = await mpesaInternalService.queryTransactionStatus(query);

        setLastResponse(result);

        if (result.success) {
          toast.success("Status da transação consultado com sucesso!");
        } else {
          toast.error("Erro ao consultar status da transação");
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao consultar status";
        console.error("❌ Erro ao consultar status:", errorMessage);

        setError(errorMessage);
        toast.error(`Erro ao consultar status: ${errorMessage}`);

        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Consultar nome do cliente
  const queryCustomerName = useCallback(
    async (customerMsisdn: string): Promise<MPesaResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        console.log("👤 Consultando nome do cliente...");

        if (!mpesaInternalService.validatePhoneNumber(customerMsisdn)) {
          throw new Error("Número de telefone inválido");
        }

        const result = await mpesaInternalService.queryCustomerName({
          customerMsisdn,
        });

        setLastResponse(result);

        if (result.success) {
          toast.success("Nome do cliente consultado com sucesso!");
        } else {
          toast.error("Erro ao consultar nome do cliente");
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao consultar nome";
        console.error("❌ Erro ao consultar nome:", errorMessage);

        setError(errorMessage);
        toast.error(`Erro ao consultar nome: ${errorMessage}`);

        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Gerar referência única
  const generateReference = useCallback((prefix = "RDP"): string => {
    return mpesaInternalService.generateTransactionReference(prefix);
  }, []);

  // Validar número de telefone
  const validatePhoneNumber = useCallback((msisdn: string): boolean => {
    return mpesaInternalService.validatePhoneNumber(msisdn);
  }, []);

  return {
    // Estados
    isLoading,
    error,
    lastResponse,

    // Funções
    processPayment,
    queryTransactionStatus,
    queryCustomerName,
    healthCheck,
    generateReference,
    validatePhoneNumber,
    clearError,
  };
};

export default useInternalMPesa;

// Log da inicialização do hook
if (import.meta.env.DEV) {
  console.log("🎣 Hook useInternalMPesa carregado");
  console.log("🚀 Usando API M-Pesa interna - sem problemas CORS!");
}
