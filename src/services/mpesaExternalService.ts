// 🚀 Serviço M-Pesa usando servidor externo reutilizável
// Baseado no README: https://github.com/coder2606/mpesa-server-vercel

interface MPesaPaymentData {
  amount: number;
  customerMsisdn: string;
  reference: string;
  thirdPartyReference: string;
  projectId?: string;
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

class MPesaExternalService {
  private serverUrl: string;
  private apiKey?: string;

  constructor(serverUrl: string, apiKey?: string) {
    this.serverUrl = serverUrl.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = apiKey;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin:
        typeof window !== "undefined"
          ? window.location.origin
          : "https://www.reduzapixel.online",
    };

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    return headers;
  }

  /**
   * Formatar número de telefone para M-Pesa (padrão Moçambique)
   * Formatos aceitos: 84xxxxxxx, 85xxxxxxx, 86xxxxxxx, 87xxxxxxx
   */
  private formatPhoneNumber(msisdn: string): string {
    // Remover todos os caracteres não numéricos
    const cleaned = msisdn.replace(/\D/g, "");

    // Se já tem 258 no início e 12 dígitos total (258 + 9 dígitos)
    if (cleaned.startsWith("258") && cleaned.length === 12) {
      return cleaned;
    }

    // Se tem 9 dígitos e começa com 8 (ex: 857690235)
    if (cleaned.length === 9 && cleaned.startsWith("8")) {
      const formatted = "258" + cleaned;

      return formatted;
    }

    // Se tem 11 dígitos e começa com 258 mas falta um dígito
    if (cleaned.length === 11 && cleaned.startsWith("258")) {
      const formatted = "258" + cleaned.substring(3);

      return formatted;
    }

    // Se não começar com 258, verificar se é número moçambicano válido (servidor aceita apenas 84 e 85)
    if (!cleaned.startsWith("258")) {
      // Números moçambicanos aceitos pelo servidor: 84, 85 (Vodacom e mCel)
      if (cleaned.length >= 9 && /^8[4-5]/.test(cleaned)) {
        const formatted = "258" + cleaned;
        console.log(
          "📞 Adicionando código do país para número moçambicano:",
          formatted
        );
        return formatted;
      }
    }

    return cleaned;
  }

  /**
   * Validar dados do pagamento
   */
  private validatePaymentData(paymentData: MPesaPaymentData): {
    isValid: boolean;
    error?: string;
  } {
    // Validar valor mínimo
    if (paymentData.amount < 1) {
      return { isValid: false, error: "Valor mínimo é 1 MT" };
    }

    // Validar valor máximo (limite padrão M-Pesa)
    if (paymentData.amount > 999999) {
      return { isValid: false, error: "Valor máximo excedido" };
    }

    // Validar número de telefone moçambicano
    const cleaned = paymentData.customerMsisdn.replace(/\D/g, "");

    // Verificar se é um número moçambicano válido (servidor aceita apenas 84 e 85)
    const isValidMozNumber =
      (cleaned.length === 9 && /^8[4-5]/.test(cleaned)) || // 84, 85 + 7 dígitos
      (cleaned.length === 12 &&
        cleaned.startsWith("258") &&
        /^2588[4-5]/.test(cleaned)); // 258 + 84/85 + 7 dígitos

    if (!isValidMozNumber) {
      return {
        isValid: false,
        error:
          "Número deve ser moçambicano (84/85 + 7 dígitos) - servidor só aceita Vodacom e mCel",
      };
    }

    // Validar referência
    if (!paymentData.reference || paymentData.reference.length < 3) {
      return { isValid: false, error: "Referência inválida" };
    }

    return { isValid: true };
  }

  /**
   * Processar pagamento M-Pesa através do servidor externo
   */
  async processPayment(paymentData: MPesaPaymentData): Promise<MPesaResponse> {
    try {
      // Validar dados antes de processar
      const validation = this.validatePaymentData(paymentData);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Formatar número de telefone
      const formattedMsisdn = this.formatPhoneNumber(
        paymentData.customerMsisdn
      );

      // Log apenas em desenvolvimento para debug
      if (import.meta.env.DEV) {
        console.log("📊 Dados M-Pesa:", {
          ...paymentData,
          customerMsisdn: formattedMsisdn,
        });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 segundos

      try {
        const response = await fetch(`${this.serverUrl}/api/mpesa/payment`, {
          method: "POST",
          mode: "cors",
          credentials: "omit",
          headers: this.getHeaders(),
          body: JSON.stringify({
            ...paymentData,
            customerMsisdn: formattedMsisdn, // Usar número formatado
            projectId: paymentData.projectId || "reduza-pixel", // ID do nosso projeto
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: MPesaResponse = await response.json();
        return result;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error("❌ Erro na comunicação com servidor M-Pesa:", error);

      let errorMessage = "Erro desconhecido";
      if (error instanceof Error) {
        errorMessage = error.message;

        // Logs específicos para debug
        if (error.name === "AbortError") {
          console.error(
            "🕐 Timeout: Servidor M-Pesa não respondeu em 45 segundos"
          );
          errorMessage =
            "Timeout: Servidor M-Pesa não respondeu. Tente novamente.";
        } else if (error.message.includes("CORS")) {
          console.error("🚫 Erro CORS: Servidor M-Pesa bloqueou a requisição");
          errorMessage =
            "Erro de conexão com servidor de pagamento. Tente novamente.";
        } else if (error.message.includes("Network")) {
          console.error("🌐 Erro de rede: Problema de conectividade");
          errorMessage =
            "Erro de conexão. Verifique sua internet e tente novamente.";
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Consultar status de transação
   */
  async checkTransactionStatus(
    transactionId: string,
    thirdPartyReference: string
  ): Promise<MPesaResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(`${this.serverUrl}/api/mpesa/status`, {
          method: "POST",
          mode: "cors",
          credentials: "omit",
          headers: this.getHeaders(),
          body: JSON.stringify({
            transactionId,
            thirdPartyReference,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error("❌ Erro ao consultar status:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Erro ao consultar status",
      };
    }
  }

  /**
   * Consultar nome do cliente
   */
  async getCustomerName(customerMsisdn: string): Promise<MPesaResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(
          `${this.serverUrl}/api/mpesa/customer-name`,
          {
            method: "POST",
            mode: "cors",
            credentials: "omit",
            headers: this.getHeaders(),
            body: JSON.stringify({
              customerMsisdn,
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error("❌ Erro ao consultar nome do cliente:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Erro ao consultar nome",
      };
    }
  }

  /**
   * Health check do servidor
   */
  async healthCheck(): Promise<{ status: string; details?: any }> {
    try {
      const response = await fetch(`${this.serverUrl}/api/health`);

      if (!response.ok) {
        return { status: "error", details: `HTTP ${response.status}` };
      }

      const result = await response.json();
      return { status: "healthy", details: result };
    } catch (error) {
      return {
        status: "error",
        details: error instanceof Error ? error.message : "Erro desconhecido",
      };
    }
  }
}

export default MPesaExternalService;
export type { MPesaPaymentData, MPesaResponse };
