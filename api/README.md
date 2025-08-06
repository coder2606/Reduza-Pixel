# Servidor de Email - Reduza Pixel

Este é um servidor Express simples para envio de emails usando Nodemailer e Zoho Mail SMTP.

## Configuração

1. **Instalar dependências**:

   ```bash
   cd api
   npm install
   ```

2. **Iniciar o servidor**:
   ```bash
   npm start
   ```

O servidor será iniciado na porta 3001 por padrão.

## Endpoints

### Testar Conexão SMTP

```
GET /test-connection
```

Testa a conexão com o servidor SMTP do Zoho.

### Enviar Email

```
POST /send-email
```

**Corpo da requisição**:

```json
{
  "to": "destinatario@email.com",
  "subject": "Assunto do Email",
  "type": "payment_confirmation",
  "paymentData": {
    "transactionId": "123456",
    "date": "01/01/2023",
    "phoneNumber": "258841234567",
    "imageCount": 10,
    "amount": "100",
    "originalAmount": "150",
    "discountApplied": "50",
    "couponCode": "DESCONTO50"
  }
}
```

## Tipos de Email

### Confirmação de Pagamento

Use `type: "payment_confirmation"` para enviar um email de confirmação de pagamento ao cliente.

### Notificação de Admin

Use `type: "admin_notification"` para enviar uma notificação de nova transação ao administrador.

## Configurações SMTP

As configurações SMTP do Zoho estão definidas no arquivo `email-server.js`:

```javascript
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 587,
  secure: false,
  auth: {
    user: "pagamentos@mpesa.kobedesigner7.com",
    pass: "WWDXJNnqgfta",
  },
});
```
