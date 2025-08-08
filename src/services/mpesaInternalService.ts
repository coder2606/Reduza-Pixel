// 🚀 Serviço M-Pesa usando API interna (sem problemas CORS!)
// Substituição do mpesaExternalService para resolver problemas CORS

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
  service?: string;
  timestamp?: string;
}

interface MPesaStatusQuery {
  transactionId?: string;
  thirdPartyReference?: string;
  queryReference?: string;
}

interface MPesaCustomerNameQuery {
  customerMsisdn: string;
}

class MPesaInternalService {
  private baseUrl: string;

  constructor() {
    // ✅ API interna - sem problemas CORS (same-origin)
    this.baseUrl = "/api/mpesa";
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Log para debug (sempre ativo para diagnóstico)
    console.log("🚀 M-Pesa Internal API Request:", {
      endpoint,
      method: options.method || "GET",
      timestamp: new Date().toISOString(),
    });

    const defaultOptions: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);

      // Log da resposta
      console.log("📡 M-Pesa Internal API Response:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        timestamp: new Date().toISOString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();

      // Log do resultado
      console.log("✅ M-Pesa Internal API Success:", {
        success: result.success,
        hasTransactionId: !!result.transactionId,
        responseCode: result.responseCode,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      console.error("❌ M-Pesa Internal API Error:", {
        error: error.message,
        endpoint,
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  /**
   * Formatar número de telefone para M-Pesa (padrão Moçambique)
   * Formatos aceitos: 84xxxxxxx, 85xxxxxxx
   */
  private formatPhoneNumber(msisdn: string): string {
    // Remove espaços, traços e outros caracteres
    const cleanNumber = msisdn.replace(/\D/g, "");

    // Se já tem código do país (258), mantém
    if (cleanNumber.startsWith("258") && cleanNumber.length === 12) {
      return cleanNumber;
    }

    // Se começa com 84 ou 85, adiciona código do país
    if (/^(84|85)\d{7}$/.test(cleanNumber)) {
      return `258${cleanNumber}`;
    }

    // Se tem 9 dígitos e começa com 8, adiciona 258
    if (cleanNumber.length === 9 && cleanNumber.startsWith("8")) {
      return `258${cleanNumber}`;
    }

    // Retorna como está se não conseguir formatar
    return cleanNumber;
  }

  /**
   * Verificar se a API está funcionando
   */
  async healthCheck(): Promise<any> {
    return this.makeRequest("");
  }

  /**
   * Processar pagamento M-Pesa C2B
   */
  async processPayment(paymentData: MPesaPaymentData): Promise<MPesaResponse> {
    // Formatar número de telefone
    const formattedMsisdn = this.formatPhoneNumber(paymentData.customerMsisdn);

    const requestData = {
      ...paymentData,
      customerMsisdn: formattedMsisdn,
    };

    // Log para debug (sempre ativo para diagnóstico)
    console.log("💳 M-Pesa Internal Payment Request:", {
      amount: requestData.amount,
      customerMsisdn: formattedMsisdn.substring(0, 6) + "xxx", // Mascarar número
      reference: requestData.reference,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await this.makeRequest<MPesaResponse>("/payment", {
        method: "POST",
        body: JSON.stringify(requestData),
      });

      return result;
    } catch (error) {
      // Log de erro específico para pagamentos
      console.error("❌ MPESA INTERNAL PAYMENT ERROR:", {
        error: error.message,
        amount: paymentData.amount,
        reference: paymentData.reference,
        timestamp: new Date().toISOString(),
      });

      // Lançar erro com contexto
      throw new Error(`Erro no pagamento M-Pesa: ${error.message}`);
    }
  }

  /**
   * Consultar status de uma transação
   */
  async queryTransactionStatus(
    query: MPesaStatusQuery
  ): Promise<MPesaResponse> {
    return this.makeRequest<MPesaResponse>("/status", {
      method: "POST",
      body: JSON.stringify(query),
    });
  }

  /**
   * Buscar nome do cliente pelo número de telefone
   */
  async queryCustomerName(
    query: MPesaCustomerNameQuery
  ): Promise<MPesaResponse> {
    const formattedMsisdn = this.formatPhoneNumber(query.customerMsisdn);

    return this.makeRequest<MPesaResponse>("/customer-name", {
      method: "POST",
      body: JSON.stringify({
        customerMsisdn: formattedMsisdn,
      }),
    });
  }

  /**
   * Gerar referência única para transação
   */
  generateTransactionReference(prefix = "RDP"): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Validar número de telefone M-Pesa
   */
  validatePhoneNumber(msisdn: string): boolean {
    const formatted = this.formatPhoneNumber(msisdn);
    const phoneRegex = /^258(84|85)\d{7}$/;
    return phoneRegex.test(formatted);
  }
}

// Instância singleton para reutilização
export const mpesaInternalService = new MPesaInternalService();
export default mpesaInternalService;

// Log da inicialização
if (import.meta.env.DEV) {
  console.log("🚀 M-Pesa Internal Service inicializado");
  console.log("📍 Base URL:", "/api/mpesa");
  console.log("✅ Same-origin API - sem problemas CORS!");
}
