# Implementação da API REST do Zoho Mail

## Por que usar a API REST em vez de SMTP?

O Zoho Mail recomenda oficialmente o uso de suas APIs REST para integração programática, em vez de SMTP tradicional. As vantagens incluem:

- **Maior confiabilidade**: Menos problemas de timeout e conectividade
- **Melhor desempenho**: Respostas mais rápidas e menor latência
- **Segurança aprimorada**: Autenticação OAuth 2.0 em vez de senhas
- **Monitoramento**: Rastreamento de entregas e estatísticas no painel do Zoho
- **Recursos avançados**: Anexos, formatação HTML, agendamento, etc.

## Passo 1: Obter Access Token do Zoho Developer Console

1. Acesse [Zoho Developer Console](https://api-console.zoho.com/)
2. Crie uma aplicação "Server-based Application" com os seguintes detalhes:

   - **Nome da Aplicação**: Reduza Pixel Email Service
   - **Homepage URL**: https://lnuwmvoezwictmcqlgvd.supabase.co
   - **Authorized Redirect URIs**: https://lnuwmvoezwictmcqlgvd.supabase.co/functions/v1/send-email
   - **Scopes necessários**: ZohoMail.messages.CREATE, ZohoMail.accounts.READ, ZohoMail.folders.READ

3. Gere o Access Token:

```bash
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "client_id=SEU_CLIENT_ID" \
  -d "client_secret=SEU_CLIENT_SECRET" \
  -d "code=SEU_AUTHORIZATION_CODE" \
  -d "redirect_uri=https://lnuwmvoezwictmcqlgvd.supabase.co/functions/v1/send-email"
```

## Passo 2: Configurar Variáveis de Ambiente no Supabase

Configure as seguintes variáveis no Supabase:

```
ZOHO_ACCESS_TOKEN=seu_access_token_aqui
ZOHO_MAIL_DOMAIN=mpesa.kobedesigner7.com
```

## Passo 3: Implementar Edge Functions com API REST

A API REST do Zoho Mail usa endpoints como:

```
POST https://mail.zoho.com/api/accounts/{account_id}/messages
```

Exemplo de implementação para Edge Function:

```typescript
// Edge Function para envio de email via REST API
serve(async (req) => {
  try {
    const { to, subject, type, paymentData } = await req.json();

    const accessToken = Deno.env.get("ZOHO_ACCESS_TOKEN");
    const accountId = Deno.env.get("ZOHO_ACCOUNT_ID");

    const emailData = {
      fromAddress: "pagamentos@mpesa.kobedesigner7.com",
      toAddress: to,
      subject: subject,
      content: generateHTMLContent(type, paymentData),
      mailFolderId: "sent",
    };

    const response = await fetch(
      `https://mail.zoho.com/api/accounts/${accountId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.data.messageId,
        message: "Email enviado via REST API",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
```

## Vantagens desta Abordagem

1. **Eliminação de Timeouts**: A API REST é mais rápida e confiável que SMTP
2. **Segurança**: Usa OAuth 2.0 em vez de senhas de aplicativo
3. **Monitoramento**: Rastreamento de entregas no painel do Zoho
4. **Facilidade**: Implementação mais simples e robusta

## Próximos Passos

1. **Configurar o Access Token** no Zoho Developer Console
2. **Obter o Account ID** via API do Zoho Mail
3. **Atualizar as Edge Functions** para usar a API REST

Após implementar esta solução, os problemas de timeout e conectividade serão resolvidos, proporcionando uma experiência de envio de email mais confiável e eficiente.
