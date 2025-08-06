# Guia de Deploy na Vercel

Este guia fornece instruções detalhadas para fazer o deploy do projeto Reduza Pixel na Vercel, garantindo segurança e desempenho.

## Pré-requisitos

- Conta na Vercel (https://vercel.com)
- Acesso ao repositório Git do projeto
- Credenciais do Supabase

## Passo a Passo para Deploy

### 1. Preparação do Projeto

Antes de fazer o deploy, execute o script de preparação para produção:

```bash
npm run prepare-prod
```

Este script:

- Remove console.logs e debuggers
- Remove comentários TODO
- Remove URLs de desenvolvimento
- Limpa informações sensíveis do código

### 2. Configuração na Vercel

1. **Acesse o Dashboard da Vercel**:

   - Faça login em https://vercel.com
   - Clique em "New Project"

2. **Importe o Repositório**:

   - Selecione o repositório do projeto
   - Clique em "Import"

3. **Configure o Projeto**:

   - **Framework Preset**: Selecione "Vite"
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Configure Variáveis de Ambiente**:

   - Clique em "Environment Variables"
   - Adicione as seguintes variáveis:

   ```
   VITE_SUPABASE_URL=sua_url_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima_supabase
   VITE_MPESA_API_KEY=sua_chave_mpesa
   VITE_MPESA_PUBLIC_KEY=sua_chave_publica_mpesa
   VITE_MPESA_SERVICE_PROVIDER_CODE=seu_codigo_provedor_servico_mpesa
   VITE_DISABLE_LOGS=true
   VITE_DISABLE_WARNINGS=true
   ```

5. **Configurações Avançadas**:
   - Clique em "Settings" > "General"
   - Em "Build & Development Settings", verifique se:
     - Framework Preset está como "Vite"
     - Node.js Version está como "18.x" ou superior

### 3. Deploy

1. **Inicie o Deploy**:

   - Clique em "Deploy"
   - Aguarde o processo de build e deploy

2. **Verifique o Deploy**:
   - Após o deploy, clique no link fornecido para verificar o site
   - Teste todas as funcionalidades principais

### 4. Configurações Pós-Deploy

#### Domínio Personalizado

1. Acesse "Settings" > "Domains"
2. Adicione seu domínio personalizado
3. Siga as instruções para configurar os registros DNS

#### Análise de Performance

1. Acesse "Analytics" para monitorar o desempenho
2. Verifique métricas de Web Vitals e otimize conforme necessário

#### Monitoramento de Erros

1. Acesse "Monitoring" para configurar alertas
2. Configure integrações com serviços como Sentry se necessário

### 5. Segurança Adicional

#### Headers de Segurança

O arquivo `vercel.json` já inclui headers de segurança importantes:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co https://api.m-pesa.com; font-src 'self'; object-src 'none'; media-src 'self'; frame-src 'none';"
        }
      ]
    }
  ]
}
```

#### Proteção de Rotas

Certifique-se de que as rotas administrativas (`/think`) estão protegidas adequadamente:

1. Implemente a autenticação de dois fatores conforme descrito em `AUTENTICACAO_2FA.md`
2. Verifique se as políticas RLS no Supabase estão configuradas corretamente

## Verificações Finais

Antes de considerar o deploy concluído, verifique:

1. **Funcionalidade**:

   - Autenticação (login/logout)
   - Upload e processamento de imagens
   - Pagamentos M-Pesa
   - Painel administrativo

2. **Segurança**:

   - Nenhuma informação sensível exposta no frontend
   - Headers de segurança funcionando
   - Autenticação e autorização funcionando

3. **Performance**:

   - Tempo de carregamento inicial
   - Responsividade em dispositivos móveis
   - Tamanho dos pacotes JavaScript

4. **SEO e Acessibilidade**:
   - Meta tags configuradas
   - Elementos semânticos
   - Contraste de cores adequado

## Solução de Problemas

### Erros de Build

Se encontrar erros durante o build:

1. Verifique os logs de build na Vercel
2. Certifique-se de que todas as dependências estão instaladas
3. Verifique se há erros de sintaxe no código

### Problemas de Conexão com Supabase

1. Verifique se as variáveis de ambiente estão configuradas corretamente
2. Verifique se as políticas RLS permitem acesso aos dados necessários
3. Verifique se o projeto Supabase está ativo e funcionando

### Problemas com M-Pesa

1. Verifique se as credenciais M-Pesa estão corretas
2. Verifique se o serviço M-Pesa está disponível
3. Teste a integração em ambiente de desenvolvimento

## Manutenção Contínua

Para manter o projeto funcionando corretamente:

1. **Monitoramento**:

   - Configure alertas para erros e problemas de desempenho
   - Monitore o uso de recursos

2. **Atualizações**:

   - Mantenha as dependências atualizadas
   - Aplique patches de segurança quando necessário

3. **Backups**:
   - Configure backups regulares do banco de dados Supabase
   - Documente procedimentos de recuperação

---

Este guia fornece uma base sólida para o deploy do projeto Reduza Pixel na Vercel. Adapte conforme necessário para atender às necessidades específicas do seu ambiente.
