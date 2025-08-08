// Interface para dados de pagamento
interface PaymentData {
  transactionId: string;
  date: string;
  phoneNumber: string;
  imageCount: number;
  amount: string;
  originalAmount?: string;
  discountApplied?: string;
  couponCode?: string;
}

// Interface para resposta de email
interface EmailResponse {
  success: boolean;
  error?: any;
  message?: string;
}

// Base URLs (DEV: pode usar servidor local; PROD: usar Edge Functions do Supabase)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Derivar URL base das Edge Functions a partir do VITE_SUPABASE_URL
// Ex.: https://xxxxxx.supabase.co -> https://xxxxxx.functions.supabase.co
const SUPABASE_FUNCTIONS_BASE = (() => {
  try {
    const url = new URL(SUPABASE_URL);
    const functionsHost = url.host.replace(".supabase.co", ".functions.supabase.co");
    return `https://${functionsHost}`;
  } catch {
    return "";
  }
})();

// Endpoint local opcional apenas em DEV (evita 404: se não configurado, usa Functions)
const EMAIL_SERVER_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_EMAIL_SERVER_URL as string) || ""
  : "";

// Utilitário para chamar uma Edge Function do Supabase
const callSupabaseFunction = async (path: string, init?: RequestInit) => {
  if (!SUPABASE_FUNCTIONS_BASE) throw new Error("SUPABASE_FUNCTIONS_BASE não configurado");
  const url = `${SUPABASE_FUNCTIONS_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (SUPABASE_ANON_KEY) {
    headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
    headers["apikey"] = SUPABASE_ANON_KEY;
  }
  const response = await fetch(url, {
    method: "POST",
    ...init,
    headers: { ...headers, ...(init?.headers as any) },
  });
  return response;
};

// Função para testar conexão com servidor SMTP
export const testEmailConnection = async (): Promise<EmailResponse> => {
  try {
    

    // Em DEV: tenta servidor local se houver; caso contrário, usa Function de teste
    if (EMAIL_SERVER_URL) {
      const response = await fetch(`${EMAIL_SERVER_URL}/test-connection`, {
        method: "GET",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const result = await response.json();
      return { success: result.success, message: result.message || "Teste de conexão concluído" };
    }

    // PROD/sem local: chamar Edge Function de teste
    const response = await fetch(`${SUPABASE_FUNCTIONS_BASE}/test-email-connection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: SUPABASE_ANON_KEY ? `Bearer ${SUPABASE_ANON_KEY}` : "",
        apikey: SUPABASE_ANON_KEY || "",
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    

    return {
      success: result.success,
      message: result.message || "Teste de conexão concluído",
    };
  } catch (error) {
    console.error("❌ Erro no teste SMTP:", error);
    return {
      success: false,
      error: error.message || "Erro desconhecido no teste SMTP",
    };
  }
};

// Função para enviar email de confirmação de pagamento
export const sendPaymentConfirmation = async (
  to: string,
  paymentData: PaymentData
): Promise<EmailResponse> => {
  try {
    

    const body = {
      to,
      subject: "Confirmação de Pagamento - Reduza Pixel",
      type: "payment_confirmation",
      paymentData,
    };

    let response: Response;
    if (EMAIL_SERVER_URL) {
      // DEV com servidor local
      response = await fetch(`${EMAIL_SERVER_URL}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      // PROD (ou DEV sem local): Edge Function Supabase
      response = await callSupabaseFunction("/send-email", {
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro ao enviar email:", errorData);
      return { success: false, error: errorData };
    }

    const data = await response.json();
    

    // Registrar atividade de email
    await logEmailActivity("success", {
      recipient: to,
      transactionId: paymentData.transactionId,
      type: "payment_confirmation",
    });

    return { success: true };
  } catch (error) {
    console.error("Erro ao enviar email:", error);

    // Registrar erro
    await logEmailActivity("error", {
      error: error instanceof Error ? error.message : String(error),
      recipient: to,
      transactionId: paymentData.transactionId,
      type: "payment_confirmation",
    });

    return { success: false, error };
  }
};

// Função para enviar notificação de pagamento para o administrador
export const sendAdminPaymentNotification = async (
  paymentData: PaymentData
): Promise<EmailResponse> => {
  try {
    const adminEmail = "kobedesigner7@gmail.com";

    

    const body = {
      to: adminEmail,
      subject: `Nova Transação: ${paymentData.amount} MZN - ${paymentData.phoneNumber}`,
      type: "admin_notification",
      paymentData,
    };

    let response: Response;
    if (EMAIL_SERVER_URL) {
      // DEV com servidor local
      response = await fetch(`${EMAIL_SERVER_URL}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      // PROD (ou DEV sem local): Edge Function Supabase
      response = await callSupabaseFunction("/send-email", {
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erro ao enviar notificação para admin:", errorData);
      return { success: false, error: errorData };
    }

    const data = await response.json();
    

    // Registrar atividade de email
    await logEmailActivity("success", {
      recipient: adminEmail,
      transactionId: paymentData.transactionId,
      type: "admin_notification",
    });

    return { success: true };
  } catch (error) {
    console.error("Erro ao enviar notificação para admin:", error);

    // Registrar erro
    await logEmailActivity("error", {
      error: error instanceof Error ? error.message : String(error),
      recipient: "kobedesigner7@gmail.com",
      transactionId: paymentData.transactionId,
      type: "admin_notification",
    });

    return { success: false, error };
  }
};

// Função para registrar atividade de email no console (temporário)
const logEmailActivity = async (
  status: "success" | "error",
  data: {
    recipient?: string;
    transactionId?: string;
    type?: string;
    error?: string;
  }
) => {
  console.log(`📧 Email Activity [${status}]:`, {
    recipient: data.recipient,
    transactionId: data.transactionId,
    type: data.type,
    error: data.error,
    timestamp: new Date().toISOString(),
  });
};
