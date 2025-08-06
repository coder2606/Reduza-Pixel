// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const { to, subject, type, paymentData } = await req.json();

    // Configuração do cliente SMTP
    const client = new SmtpClient();
    await client.connectTLS({
      hostname: "smtp.zoho.com",
      port: 465,
      username: Deno.env.get("ZOHO_EMAIL_USER") || "",
      password: Deno.env.get("ZOHO_EMAIL_PASSWORD") || "",
    });

    // Gerar conteúdo HTML com base no tipo de email
    let htmlContent = "";

    if (type === "payment_confirmation") {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://seudominio.com/logo.png" alt="Reduza Pixel Logo" style="max-width: 150px;">
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
            <img src="https://seudominio.com/logo.png" alt="Reduza Pixel Logo" style="max-width: 150px;">
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

    // Enviar email
    await client.send({
      from: Deno.env.get("ZOHO_EMAIL_USER") || "",
      to,
      subject,
      content: "Enviando email...",
      html: htmlContent,
    });

    await client.close();

    return new Response(
      JSON.stringify({
        success: true,
        messageId: `email-${Date.now()}`,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erro ao enviar email:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 500,
      }
    );
  }
});
