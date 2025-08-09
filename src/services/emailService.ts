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

// URL do servidor de email interno (serverless)
const EMAIL_SERVER_URL = "/api";

// Função para testar conexão com servidor SMTP
export const testEmailConnection = async (): Promise<EmailResponse> => {
  try {
    // Usar o servidor Express local
    const response = await fetch(`${EMAIL_SERVER_URL}/test-connection`, {
      method: "GET",
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
    // Chamar servidor local de email
    const response = await fetch(`${EMAIL_SERVER_URL}/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        subject: "Confirmação de Pagamento - Reduza Pixel",
        type: "payment_confirmation",
        paymentData,
      }),
    });

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

    // Chamar servidor local de email
    const response = await fetch(`${EMAIL_SERVER_URL}/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: adminEmail,
        subject: `Nova Transação: ${paymentData.amount} MZN - ${paymentData.phoneNumber}`,
        type: "admin_notification",
        paymentData,
      }),
    });

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

// Função para notificar admin sobre falha crítica nos servidores M-Pesa
export const sendCriticalErrorNotification = async (
  phoneNumber: string,
  amount: number,
  internalError: string,
  externalError: string
): Promise<EmailResponse> => {
  try {
    const adminEmail = "kobedesigner7@gmail.com";

    const errorData = {
      phoneNumber,
      amount: amount.toString(),
      timestamp: new Date().toLocaleString('pt-MZ'),
      internalError,
      externalError,
      userId: phoneNumber,
    };

    const response = await fetch(`${EMAIL_SERVER_URL}/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: adminEmail,
        subject: "🚨 CRÍTICO: Tentativa de Pagamento - Ambos Servidores Falharam",
        type: "critical_error",
        paymentData: errorData,
      }),
    });

    if (!response.ok) {
      console.error("❌ Falha ao enviar email crítico:", response.status);
      return { success: false, error: `HTTP ${response.status}` };
    }

    console.log("✅ Email crítico enviado para admin");
    return { success: true };
  } catch (error) {
    console.error("❌ Erro fatal ao enviar email crítico:", error);
    return { success: false, error };
  }
};

// Função para notificar admin sobre erro de usuário (dados inválidos, etc)
export const sendUserErrorNotification = async (
  phoneNumber: string,
  amount: number,
  errorType: string,
  errorMessage: string
): Promise<EmailResponse> => {
  try {
    const adminEmail = "kobedesigner7@gmail.com";

    const errorData = {
      phoneNumber,
      amount: amount.toString(),
      timestamp: new Date().toLocaleString('pt-MZ'),
      errorType,
      errorMessage,
      userId: phoneNumber,
    };

    const response = await fetch(`${EMAIL_SERVER_URL}/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: adminEmail,
        subject: `⚠️ Erro de Usuário: ${errorType} - ${phoneNumber}`,
        type: "user_error",
        paymentData: errorData,
      }),
    });

    if (!response.ok) {
      console.error("⚠️ Falha ao enviar email de erro de usuário:", response.status);
      return { success: false, error: `HTTP ${response.status}` };
    }

    console.log("📧 Email de erro de usuário enviado para admin");
    return { success: true };
  } catch (error) {
    console.error("❌ Erro ao enviar email de erro de usuário:", error);
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
