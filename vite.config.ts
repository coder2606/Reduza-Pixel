import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Plugin customizado para simular API M-Pesa em desenvolvimento
const mpesaDevPlugin = () => {
  return {
    name: "mpesa-dev-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api/mpesa")) {
          return next();
        }
        // Simular resposta da API para desenvolvimento
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization"
        );

        if (req.method === "OPTIONS") {
          res.statusCode = 200;
          res.end();
          return;
        }

        // Health check
        if (req.url === "/api/mpesa" && req.method === "GET") {
          res.statusCode = 200;
          res.end(
            JSON.stringify({
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
            })
          );
          return;
        }

        // Payment endpoint
        if (req.url === "/api/mpesa/payment" && req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", () => {
            try {
              const paymentData = JSON.parse(body);

              // Simular resposta de sucesso para desenvolvimento
              res.statusCode = 200;
              res.end(
                JSON.stringify({
                  success: true,
                  data: {
                    output_ResponseCode: "INS-0",
                    output_ResponseDesc:
                      "Request processed successfully (DEV SIMULATION)",
                    output_TransactionID: `DEV_${Date.now()}`,
                    output_ConversationID: `DEV_CONV_${Date.now()}`,
                  },
                  transactionId: `DEV_${Date.now()}`,
                  conversationId: `DEV_CONV_${Date.now()}`,
                  responseCode: "INS-0",
                  responseDesc:
                    "Request processed successfully (DEV SIMULATION)",
                  service: "mpesa-dev-simulation",
                  platform: "vite-dev-server",
                  project: "reduza-pixel",
                  timestamp: new Date().toISOString(),
                  note: "Esta é uma simulação para desenvolvimento. Em produção, processará pagamentos reais.",
                  simulatedData: paymentData,
                })
              );
            } catch (error) {
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  success: false,
                  error: "Dados de pagamento inválidos",
                  service: "mpesa-dev-simulation",
                })
              );
            }
          });
          return;
        }

        // Status check endpoint
        if (req.url === "/api/mpesa/status" && req.method === "POST") {
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              success: true,
              data: {
                output_ResponseCode: "INS-0",
                output_ResponseDesc: "Transaction found (DEV SIMULATION)",
              },
              service: "mpesa-dev-simulation",
              timestamp: new Date().toISOString(),
              note: "Esta é uma simulação para desenvolvimento.",
            })
          );
          return;
        }

        // Customer name endpoint
        if (req.url === "/api/mpesa/customer-name" && req.method === "POST") {
          res.statusCode = 200;
          res.end(
            JSON.stringify({
              success: true,
              data: {
                output_ResponseCode: "INS-0",
                output_ResponseDesc: "Customer name retrieved (DEV SIMULATION)",
                output_CustomerName: "Cliente de Teste",
              },
              service: "mpesa-dev-simulation",
              timestamp: new Date().toISOString(),
              note: "Esta é uma simulação para desenvolvimento.",
            })
          );
          return;
        }

        // 404 para outras rotas
        res.statusCode = 404;
        res.end(
          JSON.stringify({
            success: false,
            error: "Endpoint não encontrado",
            service: "mpesa-dev-simulation",
          })
        );
      });
    },
  };
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
    mode === "development" && mpesaDevPlugin(),
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
