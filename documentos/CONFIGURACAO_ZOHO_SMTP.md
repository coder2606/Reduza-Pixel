# Configuração do Zoho Mail SMTP no Supabase

Este guia explica como configurar as credenciais do Zoho Mail SMTP no Supabase para permitir o envio de emails a partir das Edge Functions.

## Passo 1: Configurar Variáveis de Ambiente no Supabase

No painel do Supabase, vá para **Settings > API > Environment Variables** e adicione as seguintes variáveis:

```
ZOHO_EMAIL_USER=pagamentos@mpesa.kobedesigner7.com
ZOHO_EMAIL_PASSWORD=sua_senha_de_aplicativo_aqui
ADMIN_EMAIL=kobedesigner7@gmail.com
```

> **Importante**: Para `ZOHO_EMAIL_PASSWORD`, você deve usar uma **Senha de Aplicativo** gerada no Zoho Mail, não a senha normal da conta.

## Passo 2: Configurar Conta Zoho Mail

### Verificar Configuração do Domínio

Certifique-se de que seu domínio `mpesa.kobedesigner7.com` está corretamente configurado no Zoho Mail com os seguintes registros DNS:

1. **Registros MX**:

   ```
   MX @ mx.zoho.com (Prioridade: 10)
   MX @ mx2.zoho.com (Prioridade: 20)
   ```

2. **Registro SPF**:

   ```
   TXT @ v=spf1 include:zoho.com ~all
   ```

3. **Registro DKIM**:
   ```
   TXT zoho._domainkey v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCZWhnzRKn/... (valor completo fornecido pelo Zoho)
   ```

### Gerar Senha de Aplicativo

1. Faça login na conta Zoho Mail (`pagamentos@mpesa.kobedesigner7.com`)
2. Vá para **Configurações > Contas > Segurança > Senhas de Aplicativo**
3. Clique em **Gerar Nova Senha**
4. Dê um nome como "Reduza Pixel App"
5. Copie a senha gerada (exemplo: `WWDXJNnqgfta`)
6. Adicione esta senha como `ZOHO_EMAIL_PASSWORD` no Supabase

## Passo 3: Configurações SMTP do Zoho

As configurações SMTP do Zoho Mail são:

```
Host: smtp.zoho.com
Porta: 587
Segurança: TLS
Autenticação: Sim
Usuário: pagamentos@mpesa.kobedesigner7.com
Senha: Senha de Aplicativo gerada
```

## Passo 4: Testar a Conexão

Após configurar as variáveis no Supabase, use a página de teste de email no aplicativo para verificar se a conexão SMTP está funcionando corretamente.

## Solução de Problemas

Se encontrar problemas de conexão:

1. **Verifique as credenciais**: Confirme que a senha de aplicativo está correta
2. **Verifique os registros DNS**: Certifique-se de que MX, SPF e DKIM estão configurados
3. **Verifique o firewall**: Certifique-se de que a porta 587 não está bloqueada
4. **Verifique os logs**: Analise os logs da Edge Function para identificar erros específicos

> **Nota**: Se persistirem problemas de timeout ou conectividade com SMTP, considere usar a API REST do Zoho Mail, que é mais confiável para aplicações web.
