// Serviço M-Pesa - estrutura EXATA do projeto Cheguei
import { supabase } from "../supabase";

// URL do servidor Express M-Pesa
const MPESA_EXPRESS_SERVER = "http://localhost:3001";

// Interfaces para compatibilidade com o projeto Cheguei
interface PaymentResponse {
  success: boolean;
  data?: any;
  error?: string;
  transactionId?: string;
  conversationId?: string;
  responseCode?: string;
  responseDesc?: string;
  service?: string;
  sdkVersion?: string;
}

interface ServiceStatus {
  expressServer: {
    healthy: boolean;
    message: string;
    details?: any;
  };
  activeService: "mpesa-express-server";
}

class MPesaService {
  private serviceStatus: ServiceStatus = {
    expressServer: {
      healthy: false,
      message: "Não verificado",
    },
    activeService: "mpesa-express-server",
  };

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    console.log(
      "🚀 [MPesaService] Inicializando serviço M-Pesa com SDK oficial..."
    );
    await this.checkServicesHealth();
  }

  // Verificar saúde do servidor Express - igual ao projeto Cheguei
  private async checkExpressServerHealth(): Promise<{
    healthy: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log("🏥 Verificando saúde do servidor Express M-Pesa...");

      const response = await fetch(`${MPESA_EXPRESS_SERVER}/api/mpesa/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const healthData = await response.json();
      console.log("📊 Express Server health:", healthData);

      return {
        healthy: true,
        message: healthData.message || "Servidor Express funcionando",
        details: healthData,
      };
    } catch (error: any) {
      console.error("❌ Erro ao verificar saúde do servidor Express:", error);
      return {
        healthy: false,
        message: `Servidor Express não disponível: ${error.message}`,
        details: { error: error.message },
      };
    }
  }

  // Verificar saúde de todos os serviços
  async checkServicesHealth(): Promise<ServiceStatus> {
    console.log("🔍 [MPesaService] Verificando status dos serviços...");

    try {
      // Verificar servidor Express
      const expressHealth = await this.checkExpressServerHealth();

      this.serviceStatus = {
        expressServer: expressHealth,
        activeService: "mpesa-express-server",
      };

      console.log("📊 Status dos serviços M-Pesa:", this.serviceStatus);
      return this.serviceStatus;
    } catch (error: any) {
      console.error("❌ Erro na verificação dos serviços:", error);
      this.serviceStatus.expressServer = {
        healthy: false,
        message: `Erro na verificação: ${error.message}`,
      };
      return this.serviceStatus;
    }
  }

  // Obter configuração M-Pesa - igual ao projeto Cheguei
  async getMPesaConfig(): Promise<any> {
    try {
      console.log("🔍 Buscando configuração M-Pesa...");

      // CONFIGURAÇÃO PRODUÇÃO
      const config = {
        isActive: true,
        provider: "mpesa",
        displayName: "M-Pesa Moçambique",
        description: "SDK M-Pesa oficial via servidor Express (PRODUÇÃO)",
        apiHost: "developer.mpesa.vm.co.mz", // Host de produção
        serviceProviderCode: "901796", // Código de produção
        mode: "production", // Modo produção
        repositorySource: "nielsero/mpesa-sdk",
        environment: "production",
      };

      console.log(
        "✅ Configuração M-Pesa carregada via SDK oficial (PRODUÇÃO)"
      );
      return config;
    } catch (error: any) {
      console.error("❌ Erro ao buscar configuração M-Pesa:", error);
      throw error;
    }
  }

  // Processar pagamento - ESTRUTURA EXATA do projeto Cheguei
  async processPayment(
    customerMsisdn: string,
    amount: number,
    reference: string,
    thirdPartyReference: string
  ): Promise<PaymentResponse> {
    try {
      console.log("💳 Processando pagamento M-Pesa via servidor Express...");
      console.log("📱 customerMsisdn:", customerMsisdn);
      console.log("💰 Valor:", amount);
      console.log("🔖 Referência:", reference);

      // Verificar se o servidor Express está funcionando
      if (!this.serviceStatus.expressServer.healthy) {
        await this.checkServicesHealth();
        if (!this.serviceStatus.expressServer.healthy) {
          throw new Error("Servidor Express M-Pesa não está disponível");
        }
      }

      // Preparar dados do pagamento - estrutura EXATA do Cheguei
      const paymentData = {
        amount,
        customerMsisdn,
        reference,
        thirdPartyReference,
      };

      console.log("🔄 Chamando servidor Express M-Pesa...");
      console.log("🌐 URL:", `${MPESA_EXPRESS_SERVER}/api/mpesa/payment`);
      console.log("📊 Payload:", paymentData);

      // Fazer requisição para o servidor Express
      const response = await fetch(
        `${MPESA_EXPRESS_SERVER}/api/mpesa/payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(paymentData),
        }
      );

      console.log("📡 Response status:", response.status);

      const responseData = await response.json();
      console.log("📊 Resposta do servidor Express:", responseData);

      if (!response.ok) {
        throw new Error(
          responseData.error ||
            `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Log do resultado
      if (responseData.success) {
        console.log("✅ Pagamento processado com sucesso via SDK oficial");
      } else {
        console.error("❌ Pagamento falhou:", responseData.responseDesc);
      }

      return responseData;
    } catch (error: any) {
      console.error("❌ Erro no pagamento via servidor Express:", error);
      return {
        success: false,
        error: error.message || "Erro no processamento do pagamento",
        service: "mpesa-express-server",
      };
    }
  }

  // Consultar status da transação
  async queryTransactionStatus(
    queryReference: string,
    thirdPartyReference: string
  ): Promise<any> {
    try {
      console.log("🔍 Consultando status da transação via servidor Express...");

      const response = await fetch(`${MPESA_EXPRESS_SERVER}/api/mpesa/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queryReference,
          thirdPartyReference,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `HTTP ${response.status}`);
      }

      console.log("📡 Status da transação:", responseData.data);
      return responseData.data;
    } catch (error: any) {
      console.error("❌ Erro ao consultar status:", error);
      throw error;
    }
  }

  // Consultar nome do cliente
  async queryCustomerName(
    msisdn: string,
    thirdPartyReference: string
  ): Promise<any> {
    try {
      console.log("👤 Consultando nome do cliente via servidor Express...");

      const response = await fetch(
        `${MPESA_EXPRESS_SERVER}/api/mpesa/customer-name`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            msisdn,
            thirdPartyReference,
          }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `HTTP ${response.status}`);
      }

      console.log("📡 Nome do cliente:", responseData.data);
      return responseData.data;
    } catch (error: any) {
      console.error("❌ Erro ao consultar nome:", error);
      throw error;
    }
  }

  // Obter status dos serviços
  getServiceStatus(): ServiceStatus {
    return this.serviceStatus;
  }
}

// Instância singleton
const mpesaService = new MPesaService();

// Exportações de compatibilidade para manter os componentes funcionando
export const checkMPesaServicesHealth = async () => {
  const status = await mpesaService.checkServicesHealth();
  return {
    mpesaEdgeFunction: {
      status: status.expressServer.healthy ? "ok" : ("error" as const),
      message: status.expressServer.message,
      lastChecked: new Date().toISOString(),
    },
    activeService: status.expressServer.healthy
      ? "mpesa-express-server"
      : ("none" as const),
  };
};

export const getMPesaConfig = () => mpesaService.getMPesaConfig();

export const processPayment = (request: {
  customerMsisdn: string;
  amount: number;
  reference?: string;
  thirdPartyReference?: string;
}) => {
  return mpesaService.processPayment(
    request.customerMsisdn,
    request.amount,
    request.reference || `TXN_${Date.now()}`,
    request.thirdPartyReference || `REDUZIR_${Date.now()}`
  );
};

// Exportar tipos e serviço
export type MPesaPaymentResponse = PaymentResponse;
export { mpesaService };
export default mpesaService;
