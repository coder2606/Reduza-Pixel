const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configurar transporter do Nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 587,
  secure: false, // true para 465, false para outras portas
  auth: {
    user: "pagamentos@mpesa.kobedesigner7.com",
    pass: "WWDXJNnqgfta",
  },
  tls: {
    rejectUnauthorized: false, // Apenas para desenvolvimento
  },
  pool: true, // Use pool de conexões
  maxConnections: 5,
  maxMessages: 100,
});

// Rota para testar conexão
app.get("/test-connection", async (req, res) => {
  try {
    console.log("Testando conexão SMTP...");
    await transporter.verify();
    console.log("Conexão SMTP estabelecida com sucesso!");
    res.json({
      success: true,
      message: "Conexão SMTP estabelecida com sucesso!",
    });
  } catch (error) {
    console.error("Erro na conexão SMTP:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Rota para enviar email
app.post("/send-email", async (req, res) => {
  try {
    const { to, subject, type, paymentData } = req.body;

    console.log("Recebido pedido para enviar email:", { to, subject, type });

    // Gerar conteúdo HTML com base no tipo
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
              paymentData.transactionId
            }</p>
            <p><strong>Data:</strong> ${paymentData.date}</p>
            <p><strong>Número de Telefone:</strong> ${
              paymentData.phoneNumber
            }</p>
            <p><strong>Quantidade de Imagens:</strong> ${
              paymentData.imageCount
            }</p>
            ${
              paymentData.discountApplied
                ? `<p><strong>Valor Original:</strong> ${paymentData.originalAmount} MZN</p>
               <p><strong>Desconto Aplicado:</strong> ${paymentData.discountApplied} MZN</p>`
                : ""
            }
            <p><strong>Valor Total:</strong> ${paymentData.amount} MZN</p>
          </div>
          
          <p>Você pode fazer o download das suas imagens processadas a qualquer momento através da nossa plataforma.</p>
          
          <p>Obrigado por utilizar nossos serviços!</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #777; font-size: 12px;">
            <p>Este é um email automático. Por favor, não responda a esta mensagem.</p>
            <p>&copy; ${new Date().getFullYear()} Reduza Pixel. Todos os direitos reservados.</p>
          </div>
        </div>
      `;
    } else if (type === "admin_notification") {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #333;">Nova Transação Realizada</h1>
          </div>
          
          <p>Uma nova transação foi processada com sucesso:</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>ID da Transação:</strong> ${
              paymentData.transactionId
            }</p>
            <p><strong>Data:</strong> ${paymentData.date}</p>
            <p><strong>Número de Telefone:</strong> ${
              paymentData.phoneNumber
            }</p>
            <p><strong>Quantidade de Imagens:</strong> ${
              paymentData.imageCount
            }</p>
            ${
              paymentData.couponCode
                ? `<p><strong>Cupom Utilizado:</strong> ${paymentData.couponCode}</p>`
                : ""
            }
            ${
              paymentData.discountApplied
                ? `<p><strong>Valor Original:</strong> ${paymentData.originalAmount} MZN</p>
               <p><strong>Desconto Aplicado:</strong> ${paymentData.discountApplied} MZN</p>`
                : ""
            }
            <p><strong>Valor Total:</strong> ${paymentData.amount} MZN</p>
          </div>
          
          <p>Acesse o painel administrativo para mais detalhes.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #777; font-size: 12px;">
            <p>Este é um email automático do sistema Reduza Pixel.</p>
          </div>
        </div>
      `;
    }

    // Configurar email
    const mailOptions = {
      from: {
        name: "Reduza Pixel",
        address: "pagamentos@mpesa.kobedesigner7.com",
      },
      to: to,
      subject: subject,
      html: htmlContent,
      headers: {
        "List-Unsubscribe":
          "<mailto:pagamentos@mpesa.kobedesigner7.com?subject=unsubscribe>",
        Precedence: "bulk",
      },
      // Adicionar texto simples como alternativa para clientes de email que não suportam HTML
      text:
        type === "payment_confirmation"
          ? `Confirmação de Pagamento\n\nOlá,\n\nSeu pagamento foi processado com sucesso. Abaixo estão os detalhes da sua transação:\n\nID da Transação: ${paymentData.transactionId}\nData: ${paymentData.date}\nNúmero de Telefone: ${paymentData.phoneNumber}\nQuantidade de Imagens: ${paymentData.imageCount}\nValor Total: ${paymentData.amount} MZN\n\nObrigado por utilizar nossos serviços!`
          : `Nova Transação Realizada\n\nUma nova transação foi processada com sucesso:\n\nID da Transação: ${paymentData.transactionId}\nData: ${paymentData.date}\nNúmero de Telefone: ${paymentData.phoneNumber}\nQuantidade de Imagens: ${paymentData.imageCount}\nValor Total: ${paymentData.amount} MZN`,
    };

    console.log("Enviando email...");

    // Enviar email
    const info = await transporter.sendMail(mailOptions);

    console.log("Email enviado:", info.messageId);

    res.json({
      success: true,
      messageId: info.messageId,
      message: "Email enviado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor de email rodando na porta ${PORT}`);
});

module.exports = app;
