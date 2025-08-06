import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validação das variáveis de ambiente
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Configuração Supabase inválida:", {
    url: supabaseUrl ? "✅ Presente" : "❌ Ausente",
    key: supabaseAnonKey ? "✅ Presente" : "❌ Ausente",
  });
  throw new Error(
    "Configuração do Supabase não encontrada. Verifique as variáveis de ambiente."
  );
}

// Supabase configurado com sucesso

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Tipos para as tabelas
export interface Transaction {
  id: string;
  session_id: string;
  phone_number: string;
  amount: number;
  image_count: number;
  mpesa_transaction_id?: string;
  mpesa_conversation_id?: string;
  status: "pending" | "processing" | "completed" | "failed";
  payment_type: "individual" | "bulk";
  created_at: string;
  completed_at?: string;
  updated_at: string;
}

export interface ImageDownload {
  id: string;
  session_id: string;
  transaction_id?: string;
  image_hash: string;
  original_filename: string;
  download_count: number;
  first_downloaded_at?: string;
  last_downloaded_at?: string;
  created_at: string;
  updated_at: string;
}
