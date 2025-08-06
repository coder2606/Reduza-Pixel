# Configuração Anti-Spam para Emails do Reduza Pixel

Este guia explica como configurar corretamente o domínio `mpesa.kobedesigner7.com` para garantir que os emails enviados não caiam na pasta de spam.

## 1. Configurar Registros DNS

Adicione os seguintes registros DNS ao seu domínio através do painel de controle do seu provedor de hospedagem:

### Registro SPF (Sender Policy Framework)

```
Tipo: TXT
Nome/Host: mpesa (ou @ se for domínio completo)
Valor: v=spf1 include:zoho.com ~all
```

### Registro DKIM (DomainKeys Identified Mail)

```
Tipo: TXT
Nome/Host: zmail._domainkey.mpesa
Valor: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCZWhnzRKn/...
```

> Nota: Este registro já está configurado corretamente no seu domínio.

### Registro DMARC (Domain-based Message Authentication, Reporting & Conformance)

```
Tipo: TXT
Nome/Host: _dmarc.mpesa
Valor: v=DMARC1; p=none; sp=none; rua=mailto:kobedesigner7@gmail.com;
```

> Nota: Adicione este registro se ainda não estiver configurado.

## 2. Verificar Configuração de Email

Após configurar os registros DNS, verifique se estão funcionando corretamente:

1. **Teste SPF**: Use [SPF Record Checker](https://mxtoolbox.com/spf.aspx)
2. **Teste DKIM**: Use [DKIM Record Checker](https://mxtoolbox.com/dkim.aspx)
3. **Teste DMARC**: Use [DMARC Record Checker](https://mxtoolbox.com/dmarc.aspx)

## 3. Boas Práticas para Evitar Spam

### No Conteúdo do Email:

- Evite palavras como "grátis", "promoção", "oferta", etc. em excesso
- Não use CAPS LOCK excessivo
- Mantenha uma proporção equilibrada entre texto e imagens
- Inclua sempre opção de cancelamento de inscrição
- Use seu nome real e endereço físico no rodapé

### Na Configuração Técnica:

- Configure corretamente o cabeçalho "From" com nome e email
- Inclua versão em texto simples além do HTML
- Adicione cabeçalhos "List-Unsubscribe"
- Mantenha o servidor de email com boa reputação

## 4. Solicitar Adição à Lista Branca

Peça aos destinatários para:

1. Adicionar `pagamentos@mpesa.kobedesigner7.com` à lista de contatos
2. Mover emails da pasta Spam para a Caixa de Entrada
3. Marcar como "Não é spam" quando encontrados na pasta de spam

## 5. Monitorar Entregabilidade

Use ferramentas como:

- [Mail Tester](https://www.mail-tester.com/)
- [Google Postmaster Tools](https://postmaster.google.com/)

## 6. Aquecer o IP/Domínio

Ao iniciar o envio de emails:

1. Comece com volumes baixos
2. Aumente gradualmente o número de emails
3. Mantenha consistência no volume e frequência
4. Evite picos súbitos de envio

Seguindo estas práticas, você aumentará significativamente as chances de seus emails serem entregues na caixa de entrada em vez da pasta de spam.
