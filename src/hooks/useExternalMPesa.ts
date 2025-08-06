// 🎯 Hook React para usar servidor M-Pesa externo
// Baseado no README: https://github.com/coder2606/mpesa-server-vercel
// Servidor: https://mpesa-server-vercel.vercel.app/

import { useState } from "react";
import MPesaExternalService, {
  MPesaPaymentData,
  MPesaResponse,
} from "../services/mpesaExternalService";
import MPESA_EXTERNAL_CONFIG from "../config/mpesaConfig";

interface UseExternalMPesaConfig {
  serverUrl: string;
  apiKey?: string;
}

export const useExternalMPesa = (config: UseExternalMPesaConfig) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mpesaService] = useState(
    () => new MPesaExternalService(config.serverUrl, config.apiKey)
  );

  const processPayment = async (
    paymentData: Omit<MPesaPaymentData, "projectId">
  ) => {
    setLoading(true);
    setError(null);

    try {
      

      const result = await mpesaService.processPayment({
        ...paymentData,
        projectId: "reduza-pixel", // ID fixo do nosso projeto
      });

      if (!result.success) {
        throw new Error(result.error || "Falha no pagamento");
      }

      
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      console.error("❌ Erro no pagamento:", errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const checkTransactionStatus = async (
    transactionId: string,
    thirdPartyReference: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await mpesaService.checkTransactionStatus(
        transactionId,
        thirdPartyReference
      );

      if (!result.success) {
        throw new Error(result.error || "Falha na consulta de status");
      }

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = async (customerMsisdn: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await mpesaService.getCustomerName(customerMsisdn);

      if (!result.success) {
        throw new Error(result.error || "Falha na consulta do nome");
      }

      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const healthCheck = async () => {
    try {
      const result = await mpesaService.healthCheck();
      return result;
    } catch (err) {
      console.error("❌ Erro no health check:", err);
      return {
        status: "error",
        details: err instanceof Error ? err.message : "Erro desconhecido",
      };
    }
  };

  return {
    processPayment,
    checkTransactionStatus,
    getCustomerName,
    healthCheck,
    loading,
    error,
    mpesaService,
  };
};

export default useExternalMPesa;
