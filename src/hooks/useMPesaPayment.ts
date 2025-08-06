// 🎯 Hook React simplificado para pagamentos M-Pesa
// Usa automaticamente o servidor externo configurado
// Servidor: https://mpesa-server-vercel.vercel.app/

import { useState } from "react";
import MPesaExternalService, {
  MPesaResponse,
} from "../services/mpesaExternalService";
import MPESA_EXTERNAL_CONFIG from "../config/mpesaConfig";

interface PaymentData {
  amount: number;
  customerMsisdn: string;
  reference?: string; // Opcional - será gerado automaticamente se não fornecido
}

export const useMPesaPayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Instância do serviço M-Pesa (configuração automática)
  const [mpesaService] = useState(
    () =>
      new MPesaExternalService(
        MPESA_EXTERNAL_CONFIG.serverUrl,
        MPESA_EXTERNAL_CONFIG.apiKey
      )
  );

  /**
   * Processar pagamento M-Pesa
   */
  const processPayment = async (
    paymentData: PaymentData
  ): Promise<MPesaResponse> => {
    setLoading(true);
    setError(null);

    try {
      
      
      

      // Gerar referência única se não fornecida (máximo 20 caracteres)
      const reference =
        paymentData.reference ||
        `${MPESA_EXTERNAL_CONFIG.defaults.referencePrefix}${Date.now()
          .toString()
          .slice(-10)}`; // RDP_ + 10 dígitos = 14 chars

      // Gerar thirdPartyReference no EXATO formato do projeto Cheguei (5 dígitos conforme documentação)
      const thirdPartyReference = `${Date.now().toString().slice(-5)}`;

      const result = await mpesaService.processPayment({
        amount: paymentData.amount,
        customerMsisdn: paymentData.customerMsisdn,
        reference,
        thirdPartyReference,
        projectId: MPESA_EXTERNAL_CONFIG.projectId,
      });

      if (!result.success) {
        throw new Error(result.error || "Falha no processamento do pagamento");
      }

      
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      console.error("❌ Erro no pagamento M-Pesa:", errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Verificar saúde do servidor M-Pesa
   */
  const checkServerHealth = async () => {
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

  /**
   * Consultar status de transação
   */
  const checkTransactionStatus = async (
    transactionId: string,
    reference: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await mpesaService.checkTransactionStatus(
        transactionId,
        reference
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

  return {
    processPayment,
    checkServerHealth,
    checkTransactionStatus,
    loading,
    error,
    config: MPESA_EXTERNAL_CONFIG,
  };
};

export default useMPesaPayment;
