// 🚀 API M-Pesa Interna - Reduza Pixel
// Implementação baseada no servidor externo funcional
// Credenciais reais fornecidas pelo usuário

const MPesaSDK = require("mpesa-sdk");

// Verificar se é default export ou named export
const MPesa = MPesaSDK.default || MPesaSDK;

// ✅ CREDENCIAIS REAIS FORNECIDAS PELO USUÁRIO
const MPESA_CONFIG = {
  mode: process.env.NODE_ENV === "production" ? "production" : "production",
  apiKey: process.env.VITE_MPESA_API_KEY || "bd6bzqqcaxtwxb7h002znntya8qlitx2",
  publicKey:
    process.env.VITE_MPESA_PUBLIC_KEY ||
    "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAyrOP7fgXIJgJyp6nP/Vtlu8kW94Qu+gJjfMaTNOSd/mQJChqXiMWsZPH8uOoZGeR/9m7Y8vAU83D96usXUaKoDYiVmxoMBkfmw8DJAtHHt/8LWDdoAS/kpXyZJ5dt19Pv+rTApcjg7AoGczT+yIU7xp4Ku23EqQz70V5Rud+Qgerf6So28Pt3qZ9hxgUA6lgF7OjoYOIAKPqg07pHp2eOp4P6oQW8oXsS+cQkaPVo3nM1f+fctFGQtgLJ0y5VG61ZiWWWFMOjYFkBSbNOyJpQVcMKPcfdDRKq+9r5DFLtFGztPYIAovBm3a1Q6XYDkGYZWtnD8mDJxgEiHWCzog0wZqJtfNREnLf1g2ZOanTDcrEFzsnP2MQwIatV8M6q/fYrh5WejlNm4ujnKUVbnPMYH0wcbXQifSDhg2jcnRLHh9CF9iabkxAzjbYkaG1qa4zG+bCidLCRe0cEQvt0+/lQ40yESvpWF60omTy1dLSd10gl2//0v4IMjLMn9tgxhPp9c+C2Aw7x2Yjx3GquSYhU6IL41lrURwDuCQpg3F30QwIHgy1D8xIfQzno3XywiiUvoq4YfCkN9WiyKz0btD6ZX02RRK6DrXTFefeKjWf0RHREHlfwkhesZ4X168Lxe9iCWjP2d0xUB+lr10835ZUpYYIr4Gon9NTjkoOGwFyS5ECAwEAAQ==",
  origin: process.env.MPESA_ORIGIN || "developer.mpesa.vm.co.mz",
  serviceProviderCode: process.env.VITE_MPESA_SERVICE_PROVIDER_CODE || "901796",
};

// Validação de configuração
const missingVars = [];
if (!MPESA_CONFIG.apiKey) missingVars.push("VITE_MPESA_API_KEY");
if (!MPESA_CONFIG.publicKey) missingVars.push("VITE_MPESA_PUBLIC_KEY");
if (!MPESA_CONFIG.serviceProviderCode)
  missingVars.push("VITE_MPESA_SERVICE_PROVIDER_CODE");

if (missingVars.length > 0) {
  console.warn(
    "⚠️ AVISO: Variáveis M-Pesa não configuradas:",
    missingVars.join(", ")
  );
}

// Inicializar SDK M-Pesa (lazy loading para serverless)
let mpesa = null;
const initializeMPesa = () => {
  try {
    if (!mpesa && MPESA_CONFIG.apiKey && MPESA_CONFIG.publicKey) {
      mpesa = new MPesa(MPESA_CONFIG);
      console.log("✅ SDK M-Pesa inicializado para", MPESA_CONFIG.mode);
    }
    return mpesa;
  } catch (error) {
    console.error("❌ Erro ao inicializar SDK M-Pesa:", error.message);
    return null;
  }
};

// Parser de body para POST requests
const parseBody = async (req) => {
  if (req.method !== "POST") return {};

  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        resolve({});
      }
    });
  });
};

// Handler principal para Vercel - Serverless Function
module.exports = async (req, res) => {
  try {
    // Headers CORS (sem necessidade de CORS complexo - same origin)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );

    // Handle preflight OPTIONS
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    const { url, method } = req;
    console.log(
      `🚀 M-Pesa API Interna: ${method} ${url} - ${new Date().toISOString()}`
    );

    // Parse body para POST requests
    const body = await parseBody(req);

    // 🩺 Health check endpoint
    if (url === "/api/mpesa" && method === "GET") {
      try {
        const mpesaInstance = initializeMPesa();
        return res.status(200).json({
          status: "healthy",
          service: "mpesa-internal-api",
          timestamp: new Date().toISOString(),
          platform: "vercel-serverless",
          project: "reduza-pixel",
          mpesa: {
            sdkInitialized: !!mpesaInstance,
            hasApiKey: !!MPESA_CONFIG.apiKey,
            hasPublicKey: !!MPESA_CONFIG.publicKey,
            hasServiceProvider: !!MPESA_CONFIG.serviceProviderCode,
            mode: MPESA_CONFIG.mode,
          },
        });
      } catch (error) {
        console.error("❌ Erro no health check:", error.message);
        return res.status(500).json({
          status: "error",
          error: error.message,
          service: "mpesa-internal-api",
        });
      }
    }

    // 💳 Endpoint de pagamento C2B
    if (url === "/api/mpesa/payment" && method === "POST") {
      try {
        const { amount, customerMsisdn, reference, thirdPartyReference } = body;

        console.log("💳 Processando pagamento M-Pesa interno...", {
          amount,
          customerMsisdn: customerMsisdn?.substring(0, 6) + "xxx",
          reference,
          thirdPartyReference,
        });

        // Validação de dados obrigatórios
        if (!amount || !customerMsisdn || !reference || !thirdPartyReference) {
          return res.status(400).json({
            success: false,
            error: "Dados obrigatórios em falta",
            required: [
              "amount",
              "customerMsisdn",
              "reference",
              "thirdPartyReference",
            ],
            service: "mpesa-internal-api",
          });
        }

        // Validação do número de telefone (formato Moçambique)
        const phoneRegex = /^258(84|85)\d{7}$/;
        if (!phoneRegex.test(customerMsisdn)) {
          return res.status(400).json({
            success: false,
            error: "Número de telefone M-Pesa inválido",
            message: "Use formato: 258841234567 ou 258851234567",
            service: "mpesa-internal-api",
          });
        }

        // Inicializar SDK M-Pesa
        const mpesaInstance = initializeMPesa();
        if (!mpesaInstance) {
          throw new Error(
            "SDK M-Pesa não inicializado. Verifique as variáveis de ambiente."
          );
        }

        // 🚀 Processar pagamento usando SDK oficial
        const sdkResponse = await mpesaInstance.c2bPayment({
          amount: parseFloat(amount),
          msisdn: customerMsisdn,
          transactionReference: reference,
          thirdPartyReference: thirdPartyReference,
        });

        console.log("📡 Resposta do SDK M-Pesa:", sdkResponse);

        // Verificar sucesso
        const isSuccess = sdkResponse.output_ResponseCode === "INS-0";

        // Resposta padronizada
        const response = {
          success: isSuccess,
          data: sdkResponse,
          transactionId: sdkResponse.output_TransactionID || "N/A",
          conversationId: sdkResponse.output_ConversationID || "N/A",
          responseCode: sdkResponse.output_ResponseCode,
          responseDesc: sdkResponse.output_ResponseDesc,
          service: "mpesa-internal-api",
          platform: "vercel-serverless-internal",
          project: "reduza-pixel",
          timestamp: new Date().toISOString(),
        };

        return res.status(200).json(response);
      } catch (error) {
        console.error("❌ Erro no pagamento M-Pesa:", error.message);
        return res.status(500).json({
          success: false,
          error: error.message,
          service: "mpesa-internal-api",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 📊 Consultar status de transação
    if (url === "/api/mpesa/status" && method === "POST") {
      try {
        const { transactionId, thirdPartyReference, queryReference } = body;

        if (!transactionId && !thirdPartyReference && !queryReference) {
          return res.status(400).json({
            success: false,
            error: "Pelo menos um identificador é obrigatório",
            required: [
              "transactionId",
              "thirdPartyReference",
              "ou queryReference",
            ],
            service: "mpesa-internal-api",
          });
        }

        const mpesaInstance = initializeMPesa();
        if (!mpesaInstance) {
          throw new Error(
            "SDK M-Pesa não inicializado. Verifique as variáveis de ambiente."
          );
        }

        const statusResponse = await mpesaInstance.queryTransactionStatus({
          queryReference:
            queryReference || transactionId || thirdPartyReference,
          thirdPartyReference:
            thirdPartyReference || transactionId || queryReference,
        });

        console.log("📊 Status da transação:", statusResponse);

        return res.status(200).json({
          success: true,
          data: statusResponse,
          service: "mpesa-internal-api",
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("❌ Erro ao consultar status:", error.message);
        return res.status(500).json({
          success: false,
          error: error.message,
          service: "mpesa-internal-api",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 👤 Buscar nome do cliente
    if (url === "/api/mpesa/customer-name" && method === "POST") {
      try {
        const { customerMsisdn } = body;

        if (!customerMsisdn) {
          return res.status(400).json({
            success: false,
            error: "customerMsisdn é obrigatório",
            service: "mpesa-internal-api",
          });
        }

        const mpesaInstance = initializeMPesa();
        if (!mpesaInstance) {
          throw new Error(
            "SDK M-Pesa não inicializado. Verifique as variáveis de ambiente."
          );
        }

        const nameResponse = await mpesaInstance.queryCustomerName({
          msisdn: customerMsisdn,
          thirdPartyReference: `NAME_${Date.now()}`,
        });

        return res.status(200).json({
          success: true,
          data: nameResponse,
          service: "mpesa-internal-api",
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("❌ Erro ao buscar nome do cliente:", error.message);
        return res.status(500).json({
          success: false,
          error: error.message,
          service: "mpesa-internal-api",
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 404 para rotas não encontradas
    return res.status(404).json({
      success: false,
      error: "Endpoint não encontrado",
      available: [
        "GET /api/mpesa (health check)",
        "POST /api/mpesa/payment",
        "POST /api/mpesa/status",
        "POST /api/mpesa/customer-name",
      ],
      service: "mpesa-internal-api",
    });
  } catch (error) {
    console.error("❌ Erro geral na API M-Pesa:", error.message);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor",
      message: error.message,
      service: "mpesa-internal-api",
      timestamp: new Date().toISOString(),
    });
  }
};
