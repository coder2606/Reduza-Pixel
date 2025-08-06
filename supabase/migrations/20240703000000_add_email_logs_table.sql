-- Criar tabela para registrar logs de email
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'success' ou 'error'
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar políticas de segurança
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Permitir inserção por usuários anônimos (necessário para registrar logs sem autenticação)
CREATE POLICY "Allow anonymous inserts to email_logs"
ON public.email_logs FOR INSERT TO anon WITH CHECK (true);

-- Permitir inserção por usuários autenticados
CREATE POLICY "Allow authenticated users to insert email_logs"
ON public.email_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Permitir seleção apenas por usuários autenticados
CREATE POLICY "Allow authenticated users to select email_logs"
ON public.email_logs FOR SELECT TO authenticated USING (true);

-- Comentários para documentação
COMMENT ON TABLE public.email_logs IS 'Registros de atividades de envio de email';
COMMENT ON COLUMN public.email_logs.type IS 'Tipo de registro: success ou error';
COMMENT ON COLUMN public.email_logs.details IS 'Detalhes do envio ou erro em formato JSON';