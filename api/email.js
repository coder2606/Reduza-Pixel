// 📧 API de Email (Serverless) - Reduza Pixel
// Converte a lógica de api/email-server.js para handler serverless da Vercel

const nodemailer = require("nodemailer");

// Transport SMTP (usa env com fallback nos valores existentes)
const smtpUser = process.env.ZOHO_EMAIL_USER || "pagamentos@mpesa.kobedesigner7.com";
const smtpPass = process.env.ZOHO_EMAIL_PASSWORD || "WWDXJNnqgfta";

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
        return res.status(200).json({ success: true, message: "Conexão SMTP ok" });
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
        return res.status(400).json({ success: false, error: "Campos obrigatórios ausentes" });
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
              <p><strong>ID da Transação:</strong> ${paymentData?.transactionId || "-"}</p>
              <p><strong>Data:</strong> ${paymentData?.date || "-"}</p>
              <p><strong>Número de Telefone:</strong> ${paymentData?.phoneNumber || "-"}</p>
              <p><strong>Quantidade de Imagens:</strong> ${paymentData?.imageCount || "-"}</p>
              ${paymentData?.discountApplied ? `<p><strong>Valor Original:</strong> ${paymentData?.originalAmount} MZN</p><p><strong>Desconto Aplicado:</strong> ${paymentData?.discountApplied} MZN</p>` : ""}
              <p><strong>Valor Total:</strong> ${paymentData?.amount || "-"} MZN</p>
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
              <p><strong>ID da Transação:</strong> ${paymentData?.transactionId || "-"}</p>
              <p><strong>Data:</strong> ${paymentData?.date || "-"}</p>
              <p><strong>Número de Telefone:</strong> ${paymentData?.phoneNumber || "-"}</p>
              <p><strong>Quantidade de Imagens:</strong> ${paymentData?.imageCount || "-"}</p>
              ${paymentData?.couponCode ? `<p><strong>Cupom Utilizado:</strong> ${paymentData?.couponCode}</p>` : ""}
              ${paymentData?.discountApplied ? `<p><strong>Valor Original:</strong> ${paymentData?.originalAmount} MZN</p><p><strong>Desconto Aplicado:</strong> ${paymentData?.discountApplied} MZN</p>` : ""}
              <p><strong>Valor Total:</strong> ${paymentData?.amount || "-"} MZN</p>
            </div>
            <p>Acesse o painel administrativo para mais detalhes.</p>
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

    return res.status(404).json({ success: false, error: "Endpoint não encontrado" });
  } catch (error) {
    console.error("❌ Erro geral na API Email:", error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
};


