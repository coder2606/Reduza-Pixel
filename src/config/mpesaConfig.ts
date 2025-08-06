// 🔧 Configuração do servidor M-Pesa externo
// URL do servidor reutilizável: https://mpesa-server-vercel.vercel.app/

export const MPESA_EXTERNAL_CONFIG = {
  // URL do servidor M-Pesa reutilizável
  serverUrl: "https://mpesa-server-vercel.vercel.app",

  // API Key (opcional - se o servidor tiver autenticação)
  // Para usar sem autenticação, deixe undefined
  apiKey: import.meta.env.VITE_MPESA_API_KEY || undefined,

  // ID do nosso projeto (para identificação no servidor)
  projectId: "reduza-pixel",

  // Configurações padrão
  defaults: {
    // Prefixo para referências de transação
    referencePrefix: "RDP_", // Reduza Pixel

    // Timeout para requisições (em ms)
    timeout: 30000, // 30 segundos
  },
};

// Validação da configuração
if (!MPESA_EXTERNAL_CONFIG.serverUrl) {
  console.error("❌ ERRO: URL do servidor M-Pesa não configurada");
}

// Log da configuração (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log("🔧 Configuração M-Pesa Externa:", {
    serverUrl: MPESA_EXTERNAL_CONFIG.serverUrl,
    projectId: MPESA_EXTERNAL_CONFIG.projectId,
    hasApiKey: !!MPESA_EXTERNAL_CONFIG.apiKey,
  });
}

export default MPESA_EXTERNAL_CONFIG;
