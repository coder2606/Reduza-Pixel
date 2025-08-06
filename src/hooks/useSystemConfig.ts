import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface SystemConfig {
  id: string;
  price_per_image: number;
  max_images_per_upload: number;
  coupon_enabled: boolean;
  payment_enabled: boolean;
  active_coupon: string;
  coupon_discount_percent: number;
  coupon_valid_until: string | null;
  coupon_max_uses: number;
  coupon_current_uses: number;
  created_at: string;
  updated_at: string;
}

export const useSystemConfig = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("system_config")
        .select("*")
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setConfig(data);
    } catch (err: any) {
      console.error("Erro ao carregar configurações do sistema:", err);
      setError(err.message || "Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  // Calcular preço com desconto se aplicável
  const calculatePrice = (basePrice: number, quantity: number): number => {
    if (!config || !config.payment_enabled) {
      return 0; // Se o pagamento estiver desativado, o preço é zero
    }

    let price = basePrice * quantity;

    // Aplicar desconto se o cupom estiver ativado
    if (config.coupon_enabled && config.coupon_discount_percent > 0) {
      const discountMultiplier = 1 - config.coupon_discount_percent / 100;
      price = price * discountMultiplier;
    }

    return price;
  };

  // Verificar se o cupom é válido
  const validateCoupon = (
    couponCode: string
  ): { valid: boolean; message?: string } => {
    if (!config || !config.coupon_enabled) {
      return {
        valid: false,
        message: "Cupons não estão habilitados no momento.",
      };
    }

    // Verificar se o código é válido
    if (couponCode.toLowerCase() !== config.active_coupon.toLowerCase()) {
      return { valid: false, message: "Código de cupom inválido." };
    }

    // Verificar se o cupom expirou
    if (config.coupon_valid_until) {
      const validUntil = new Date(config.coupon_valid_until);
      const now = new Date();
      if (now > validUntil) {
        return { valid: false, message: "Este cupom expirou." };
      }
    }

    // Verificar se atingiu o limite de usos
    if (
      config.coupon_max_uses > 0 &&
      config.coupon_current_uses >= config.coupon_max_uses
    ) {
      return { valid: false, message: "Este cupom atingiu o limite de usos." };
    }

    return { valid: true };
  };

  // Obter o preço por imagem atual
  const getCurrentPricePerImage = (): number => {
    if (!config || !config.payment_enabled) {
      return 0;
    }
    return config.price_per_image;
  };

  // Obter o limite de imagens por upload
  const getMaxImagesPerUpload = (): number => {
    if (!config) {
      return 50; // Valor padrão
    }
    return config.max_images_per_upload;
  };

  // Verificar se o pagamento está ativado
  const isPaymentEnabled = (): boolean => {
    return config?.payment_enabled || false;
  };

  // Obter informações sobre o cupom ativo
  const getActiveCouponInfo = () => {
    if (!config || !config.coupon_enabled) {
      return {
        active: false,
        code: "",
        discountPercent: 0,
        validUntil: null,
        maxUses: 0,
        currentUses: 0,
        remainingUses: 0,
      };
    }

    const remainingUses =
      config.coupon_max_uses > 0
        ? config.coupon_max_uses - config.coupon_current_uses
        : -1; // -1 indica ilimitado

    return {
      active: true,
      code: config.active_coupon,
      discountPercent: config.coupon_discount_percent,
      validUntil: config.coupon_valid_until,
      maxUses: config.coupon_max_uses,
      currentUses: config.coupon_current_uses,
      remainingUses,
    };
  };

  // Incrementar o uso do cupom
  const incrementCouponUse = async (couponCode: string): Promise<boolean> => {
    if (
      !config ||
      !config.coupon_enabled ||
      config.active_coupon.toLowerCase() !== couponCode.toLowerCase()
    ) {
      return false;
    }

    try {
      const { error } = await supabase
        .from("system_config")
        .update({
          coupon_current_uses: config.coupon_current_uses + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);

      if (error) throw error;

      // Atualizar o estado local
      setConfig({
        ...config,
        coupon_current_uses: config.coupon_current_uses + 1,
      });

      return true;
    } catch (err) {
      console.error("Erro ao incrementar uso do cupom:", err);
      return false;
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return {
    config,
    loading,
    error,
    fetchConfig,
    calculatePrice,
    validateCoupon,
    getCurrentPricePerImage,
    getMaxImagesPerUpload,
    isPaymentEnabled,
    getActiveCouponInfo,
    incrementCouponUse,
  };
};
