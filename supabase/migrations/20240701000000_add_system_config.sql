-- Criar tabela de configuração do sistema
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_per_image DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
  max_images_per_upload INTEGER NOT NULL DEFAULT 50,
  coupon_enabled BOOLEAN NOT NULL DEFAULT false,
  payment_enabled BOOLEAN NOT NULL DEFAULT true,
  active_coupon VARCHAR(50) DEFAULT '',
  coupon_discount_percent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir configuração padrão se não existir
INSERT INTO system_config (
  price_per_image, 
  max_images_per_upload, 
  coupon_enabled, 
  payment_enabled, 
  active_coupon, 
  coupon_discount_percent
)
SELECT 
  1.00, 
  50, 
  false, 
  true, 
  '', 
  0
WHERE NOT EXISTS (SELECT 1 FROM system_config);

-- Adicionar políticas RLS para system_config
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Permitir que usuários autenticados leiam as configurações
CREATE POLICY "Allow authenticated users to read system_config" 
  ON system_config 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Permitir que usuários autenticados atualizem as configurações
CREATE POLICY "Allow authenticated users to update system_config" 
  ON system_config 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Permitir que usuários anônimos leiam apenas as configurações
CREATE POLICY "Allow anonymous users to read system_config" 
  ON system_config 
  FOR SELECT 
  USING (true);