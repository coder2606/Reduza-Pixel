// 📧 API de Email (Serverless) - Reduza Pixel
// Converte a lógica de api/email-server.js para handler serverless da Vercel

const nodemailer = require("nodemailer");

// Transport SMTP (usa env com fallback nos valores existentes)
const smtpUser = process.env.ZOHO_EMAIL_USER;
const smtpPass = process.env.ZOHO_EMAIL_PASSWORD;

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 587,
  secure: false,
  auth: { user: smtpUser, pass: smtpPass },
  tls: { rejectUnauthorized: false },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

const setCors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
};

module.exports = async (req, res) => {
  try {
    setCors(res);
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    const { url, method } = req;

    // GET /api/test-connection
    if (url === "/api/test-connection" && method === "GET") {
      try {
        await transporter.verify();
        return res
          .status(200)
          .json({ success: true, message: "Conexão SMTP ok" });
      } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
      }
    }

    // POST /api/send-email
    if (url === "/api/send-email" && method === "POST") {
      // Parse body manual (serverless)
      const body = await new Promise((resolve) => {
        let data = "";
        req.on("data", (chunk) => (data += chunk));
        req.on("end", () => {
          try {
            resolve(JSON.parse(data || "{}"));
          } catch (_) {
            resolve({});
          }
        });
      });

      const { to, subject, type, paymentData } = body;

      if (!to || !subject || !type) {
        return res
          .status(400)
          .json({ success: false, error: "Campos obrigatórios ausentes" });
      }

      let htmlContent = "";
      if (type === "payment_confirmation") {
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #333;">Confirmação de Pagamento</h1>
            </div>
            <p>Olá,</p>
            <p>Seu pagamento foi processado com sucesso. Abaixo estão os detalhes da sua transação:</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>ID da Transação:</strong> ${
                paymentData?.transactionId || "-"
              }</p>
              <p><strong>Data:</strong> ${paymentData?.date || "-"}</p>
              <p><strong>Número de Telefone:</strong> ${
                paymentData?.phoneNumber || "-"
              }</p>
              <p><strong>Quantidade de Imagens:</strong> ${
                paymentData?.imageCount || "-"
              }</p>
              ${
                paymentData?.discountApplied
                  ? `<p><strong>Valor Original:</strong> ${paymentData?.originalAmount} MZN</p><p><strong>Desconto Aplicado:</strong> ${paymentData?.discountApplied} MZN</p>`
                  : ""
              }
              <p><strong>Valor Total:</strong> ${
                paymentData?.amount || "-"
              } MZN</p>
            </div>
            <p>Obrigado por utilizar nossos serviços!</p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #777; font-size: 12px;">
              <p>Este é um email automático. Por favor, não responda a esta mensagem.</p>
              <p>&copy; ${new Date().getFullYear()} Reduza Pixel.</p>
            </div>
          </div>`;
      } else if (type === "admin_notification") {
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #333;">Nova Transação Realizada</h1>
            </div>
            <p>Uma nova transação foi processada com sucesso:</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>ID da Transação:</strong> ${
                paymentData?.transactionId || "-"
              }</p>
              <p><strong>Data:</strong> ${paymentData?.date || "-"}</p>
              <p><strong>Número de Telefone:</strong> ${
                paymentData?.phoneNumber || "-"
              }</p>
              <p><strong>Quantidade de Imagens:</strong> ${
                paymentData?.imageCount || "-"
              }</p>
              ${
                paymentData?.couponCode
                  ? `<p><strong>Cupom Utilizado:</strong> ${paymentData?.couponCode}</p>`
                  : ""
              }
              ${
                paymentData?.discountApplied
                  ? `<p><strong>Valor Original:</strong> ${paymentData?.originalAmount} MZN</p><p><strong>Desconto Aplicado:</strong> ${paymentData?.discountApplied} MZN</p>`
                  : ""
              }
              <p><strong>Valor Total:</strong> ${
                paymentData?.amount || "-"
              } MZN</p>
            </div>
            <p>Acesse o painel administrativo para mais detalhes.</p>
          </div>`;
      } else if (type === "critical_error") {
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #dc3545; border-radius: 5px; background-color: #f8d7da;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #721c24;">🚨 FALHA CRÍTICA - Ambos Servidores M-Pesa</h1>
            </div>
            <p style="color: #721c24;"><strong>ATENÇÃO:</strong> Uma tentativa de pagamento falhou em ambos os servidores.</p>
            <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h3 style="color: #721c24; margin-top: 0;">Detalhes da Tentativa:</h3>
              <p><strong>Usuário:</strong> ${
                paymentData?.phoneNumber || "-"
              }</p>
              <p><strong>Valor:</strong> ${paymentData?.amount || "-"} MZN</p>
              <p><strong>Data/Hora:</strong> ${
                paymentData?.timestamp || "-"
              }</p>
            </div>
            <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #721c24; margin-top: 0;">Erros Registrados:</h3>
              <p><strong>Servidor Interno:</strong><br/><code style="background: #f8f9fa; padding: 2px 4px; border-radius: 3px;">${
                paymentData?.internalError || "N/A"
              }</code></p>
              <p><strong>Servidor Externo:</strong><br/><code style="background: #f8f9fa; padding: 2px 4px; border-radius: 3px;">${
                paymentData?.externalError || "N/A"
              }</code></p>
            </div>
            <div style="margin-top: 30px; padding: 15px; background-color: #fff3cd; border-radius: 5px; border-left: 4px solid #ffc107;">
              <p style="margin: 0; color: #856404;"><strong>Ação Requerida:</strong> Verificar os servidores M-Pesa imediatamente e contactar o usuário.</p>
            </div>
          </div>`;
      } else if (type === "user_error") {
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ffc107; border-radius: 5px; background-color: #fff3cd;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #856404;">⚠️ Erro de Usuário - Tentativa de Pagamento</h1>
            </div>
            <p style="color: #856404;">Informamos que o usuário ${
              paymentData?.phoneNumber || "-"
            } tentou fazer um pagamento, mas ocorreu um erro de validação.</p>
            <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Usuário:</strong> ${
                paymentData?.phoneNumber || "-"
              }</p>
              <p><strong>Valor Tentado:</strong> ${
                paymentData?.amount || "-"
              } MZN</p>
              <p><strong>Data/Hora:</strong> ${
                paymentData?.timestamp || "-"
              }</p>
              <p><strong>Tipo de Erro:</strong> ${
                paymentData?.errorType || "-"
              }</p>
              <p><strong>Descrição:</strong> ${
                paymentData?.errorMessage || "-"
              }</p>
            </div>
            <div style="margin-top: 20px; padding: 10px; background-color: #d1ecf1; border-radius: 5px; border-left: 4px solid #bee5eb;">
              <p style="margin: 0; color: #0c5460;"><strong>Nota:</strong> Este é um erro de dados/validação do usuário, não um problema do sistema.</p>
            </div>
          </div>`;
      }

      const mailOptions = {
        from: { name: "Reduza Pixel", address: smtpUser },
        to,
        subject,
        html: htmlContent,
        text: `${subject}`,
        headers: {
          "List-Unsubscribe": `<mailto:${smtpUser}?subject=unsubscribe>`,
          Precedence: "bulk",
        },
      };

      const info = await transporter.sendMail(mailOptions);
      return res.status(200).json({ success: true, messageId: info.messageId });
    }

    return res
      .status(404)
      .json({ success: false, error: "Endpoint não encontrado" });
  } catch (error) {
    console.error("❌ Erro geral na API Email:", error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
};
