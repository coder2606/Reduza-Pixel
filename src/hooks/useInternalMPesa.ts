// 🚀 Hook para M-Pesa usando API interna (sem problemas CORS!)
// Substituição do useExternalMPesa para resolver problemas CORS definitivamente

import { useState, useCallback } from "react";
import { toast } from "sonner";
import mpesaInternalService from "@/services/mpesaInternalService";
import { sendCriticalErrorNotification, sendUserErrorNotification } from "@/services/emailService";

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

// Serviço M-Pesa externo como fallback
const EXTERNAL_MPESA_URL = "https://mpesa-server-vercel.vercel.app";

const tryExternalMPesa = async (paymentData: MPesaPaymentData): Promise<MPesaResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${EXTERNAL_MPESA_URL}/api/mpesa/payment`, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...paymentData,
        projectId: "reduza-pixel",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("🔄 Fallback externo funcionou:", result);
    
    return {
      success: result.success,
      data: result.data,
      transactionId: result.transactionId,
      conversationId: result.conversationId,
      responseCode: result.responseCode,
      responseDesc: result.responseDesc,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Função para detectar tipo de erro
const isUserError = (error: string): boolean => {
  const userErrorPatterns = [
    "telefone.*inválido",
    "dados.*obrigatórios",
    "número.*formato",
    "dados.*em falta",
    "invalid phone",
    "missing required",
    "validation",
  ];
  return userErrorPatterns.some(pattern => 
    error.toLowerCase().match(new RegExp(pattern, "i"))
  );
};

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

  // Processar pagamento com sistema de fallback robusto
  const processPayment = useCallback(
    async (paymentData: MPesaPaymentData): Promise<MPesaResponse> => {
      setIsLoading(true);
      setError(null);

      let internalError = "";
      let externalError = "";

      try {
        // 🔍 Validação inicial (erro de usuário)
        if (!mpesaInternalService.validatePhoneNumber(paymentData.customerMsisdn)) {
          const userErrorMsg = "Número de telefone M-Pesa inválido. Use formato: 841234567 ou 851234567";
          
          // Enviar email de erro de usuário
          await sendUserErrorNotification(
            paymentData.customerMsisdn,
            paymentData.amount,
            "Número Inválido",
            userErrorMsg
          );
          
          throw new Error(userErrorMsg);
        }

        console.log("💳 Tentativa 1: Servidor interno...", {
          amount: paymentData.amount,
          reference: paymentData.reference,
        });

        // 🎯 TENTATIVA 1: Servidor Interno
        try {
          const result = await mpesaInternalService.processPayment(paymentData);
          
          if (result.success) {
            console.log("✅ Servidor interno: SUCESSO!", result);
            toast.success("Pagamento M-Pesa processado com sucesso!");
            setLastResponse(result);
            return result;
          } else {
            // Servidor respondeu mas com erro
            internalError = result.error || result.responseDesc || "Erro interno não especificado";
            throw new Error(internalError);
          }
        } catch (err) {
          internalError = err instanceof Error ? err.message : "Erro desconhecido no servidor interno";
          console.warn("⚠️ Servidor interno falhou:", internalError);
        }

        // 🔄 TENTATIVA 2: Fallback para Servidor Externo
        console.log("🔄 Tentativa 2: Servidor externo (fallback)...");
        toast.info("Tentando servidor alternativo...");

        try {
          const externalResult = await tryExternalMPesa(paymentData);
          
          if (externalResult.success) {
            console.log("✅ Servidor externo: SUCESSO! (fallback funcionou)", externalResult);
            toast.success("Pagamento processado com sucesso via servidor alternativo!");
            setLastResponse(externalResult);
            return externalResult;
          } else {
            externalError = externalResult.error || externalResult.responseDesc || "Erro externo não especificado";
            throw new Error(externalError);
          }
        } catch (err) {
          externalError = err instanceof Error ? err.message : "Erro desconhecido no servidor externo";
          console.error("❌ Servidor externo também falhou:", externalError);
        }

        // 🚨 AMBOS OS SERVIDORES FALHARAM - CRÍTICO!
        console.error("🚨 CRÍTICO: Ambos os servidores M-Pesa falharam!", {
          interno: internalError,
          externo: externalError,
        });

        // Enviar email crítico para admin
        await sendCriticalErrorNotification(
          paymentData.customerMsisdn,
          paymentData.amount,
          internalError,
          externalError
        );

        const criticalErrorMsg = "Falha crítica: ambos os servidores de pagamento estão indisponíveis. Administrador foi notificado.";
        toast.error(criticalErrorMsg);
        setError(criticalErrorMsg);

        const errorResponse: MPesaResponse = {
          success: false,
          error: criticalErrorMsg,
        };

        setLastResponse(errorResponse);
        return errorResponse;

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Erro desconhecido no pagamento";
        
        // Verificar se é erro de usuário ou sistema
        if (isUserError(errorMessage)) {
          console.warn("⚠️ Erro de usuário detectado:", errorMessage);
          
          // Para erros de usuário que não passaram pela validação inicial
          if (!errorMessage.includes("telefone")) {
            await sendUserErrorNotification(
              paymentData.customerMsisdn,
              paymentData.amount,
              "Dados Inválidos",
              errorMessage
            );
          }
        } else {
          console.error("❌ Erro do sistema:", errorMessage);
        }

        setError(errorMessage);
        toast.error(`Erro no pagamento: ${errorMessage}`);

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
