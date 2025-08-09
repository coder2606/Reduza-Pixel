import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Plugin customizado para simular APIs em desenvolvimento
const devApiPlugin = () => {
  return {
    name: "dev-api-simulator",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Simular endpoints M-Pesa
        if (req.url?.startsWith("/api/mpesa")) {
          return handleMPesaEndpoints(req, res);
        }
        
        // Simular endpoints de Email
        if (req.url?.startsWith("/api/send-email") || req.url?.startsWith("/api/test-connection")) {
          return handleEmailEndpoints(req, res);
        }
        
        return next();
      });
    },
  };
};

// Handler para endpoints M-Pesa em desenvolvimento
const handleMPesaEndpoints = (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Health check
  if (req.url === "/api/mpesa" && req.method === "GET") {
    res.statusCode = 200;
    res.end(JSON.stringify({
      status: "healthy",
      service: "mpesa-dev-simulation",
      timestamp: new Date().toISOString(),
      note: "Esta é uma simulação para desenvolvimento. Em produção, usará a API real.",
      mpesa: {
        sdkInitialized: true,
        hasApiKey: true,
        hasPublicKey: true,
        hasServiceProvider: true,
        mode: "development-simulation",
      },
    }));
    return;
  }

  // Payment endpoint
  if (req.url === "/api/mpesa/payment" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const paymentData = JSON.parse(body);
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          data: {
            output_ResponseCode: "INS-0",
            output_ResponseDesc: "Request processed successfully (DEV SIMULATION)",
            output_TransactionID: `DEV_${Date.now()}`,
            output_ConversationID: `DEV_CONV_${Date.now()}`,
          },
          transactionId: `DEV_${Date.now()}`,
          conversationId: `DEV_CONV_${Date.now()}`,
          responseCode: "INS-0",
          responseDesc: "Request processed successfully (DEV SIMULATION)",
          service: "mpesa-dev-simulation",
          platform: "vite-dev-server",
          project: "reduza-pixel",
          timestamp: new Date().toISOString(),
          note: "Esta é uma simulação para desenvolvimento. Em produção, processará pagamentos reais.",
          simulatedData: paymentData,
        }));
      } catch (error) {
        res.statusCode = 400;
        res.end(JSON.stringify({
          success: false,
          error: "Dados de pagamento inválidos",
          service: "mpesa-dev-simulation",
        }));
      }
    });
    return;
  }

  // Status check endpoint
  if (req.url === "/api/mpesa/status" && req.method === "POST") {
    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      data: {
        output_ResponseCode: "INS-0",
        output_ResponseDesc: "Transaction found (DEV SIMULATION)",
      },
      service: "mpesa-dev-simulation",
      timestamp: new Date().toISOString(),
      note: "Esta é uma simulação para desenvolvimento.",
    }));
    return;
  }

  // Customer name endpoint
  if (req.url === "/api/mpesa/customer-name" && req.method === "POST") {
    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      data: {
        output_ResponseCode: "INS-0",
        output_ResponseDesc: "Customer name retrieved (DEV SIMULATION)",
        output_CustomerName: "Cliente de Teste",
      },
      service: "mpesa-dev-simulation",
      timestamp: new Date().toISOString(),
      note: "Esta é uma simulação para desenvolvimento.",
    }));
    return;
  }

  // 404 para outras rotas
  res.statusCode = 404;
  res.end(JSON.stringify({
    success: false,
    error: "Endpoint não encontrado",
    service: "mpesa-dev-simulation",
  }));
};

// Handler para endpoints de Email em desenvolvimento
const handleEmailEndpoints = (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Test connection
  if (req.url === "/api/test-connection" && req.method === "GET") {
    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      message: "Conexão SMTP ok (DEV SIMULATION)",
      service: "email-dev-simulation",
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // Send email
  if (req.url === "/api/send-email" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const emailData = JSON.parse(body);
        console.log("📧 Email simulado (DEV):", {
          to: emailData.to,
          subject: emailData.subject,
          type: emailData.type,
        });
        
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          messageId: `dev-email-${Date.now()}`,
          message: "Email enviado com sucesso (DEV SIMULATION)",
          service: "email-dev-simulation",
          timestamp: new Date().toISOString(),
          simulatedData: {
            to: emailData.to,
            subject: emailData.subject,
            type: emailData.type,
          },
        }));
      } catch (error) {
        res.statusCode = 400;
        res.end(JSON.stringify({
          success: false,
          error: "Dados de email inválidos",
          service: "email-dev-simulation",
        }));
      }
    });
    return;
  }

  // 404 para outras rotas
  res.statusCode = 404;
  res.end(JSON.stringify({
    success: false,
    error: "Endpoint de email não encontrado",
    service: "email-dev-simulation",
  }));
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "development" && devApiPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: [
          "console.log",
          "console.info",
          "console.debug",
          "console.trace",
        ],
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
        },
      },
    },
    sourcemap: false,
  },
}));
