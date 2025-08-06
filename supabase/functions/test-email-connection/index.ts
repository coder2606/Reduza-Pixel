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
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  }

  try {
    // Configuração do cliente SMTP
    const client = new SmtpClient();
    await client.connectTLS({
      hostname: "smtp.zoho.com",
      port: 465,
      username: Deno.env.get("ZOHO_EMAIL_USER") || "",
      password: Deno.env.get("ZOHO_EMAIL_PASSWORD") || "",
    });

    await client.close();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Conexão com servidor SMTP estabelecida com sucesso",
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
    console.error("Erro ao testar conexão com servidor SMTP:", error);
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
