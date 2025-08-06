import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Loader2,
  Save,
  Settings,
  Tag,
  CreditCard,
  Percent,
} from "lucide-react";

interface SystemConfig {
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

const ConfigurationPanel: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar configurações
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("system_config")
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setConfig(data);
        } else {
          // Se não existir configuração, criar uma padrão
          const defaultConfig: Omit<
            SystemConfig,
            "id" | "created_at" | "updated_at"
          > = {
            price_per_image: 1,
            max_images_per_upload: 50,
            coupon_enabled: false,
            payment_enabled: true,
            active_coupon: "",
            coupon_discount_percent: 0,
            coupon_valid_until: null,
            coupon_max_uses: 100,
            coupon_current_uses: 0,
          };

          const { data: newConfig, error: insertError } = await supabase
            .from("system_config")
            .insert(defaultConfig)
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }

          setConfig(newConfig);
        }
      } catch (err: any) {
        console.error("Erro ao carregar configurações:", err);
        setError(err.message);
        toast.error("Erro ao carregar configurações do sistema");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Salvar configurações
  const saveConfig = async () => {
    if (!config) return;

    try {
      setSaving(true);

      // Validações
      if (config.price_per_image <= 0) {
        toast.error("O preço por imagem deve ser maior que zero");
        return;
      }

      if (config.max_images_per_upload <= 0) {
        toast.error("O limite de imagens deve ser maior que zero");
        return;
      }

      if (
        config.coupon_enabled &&
        (!config.active_coupon || config.coupon_discount_percent <= 0)
      ) {
        toast.error(
          "Com cupom ativado, é necessário definir um código e percentual de desconto"
        );
        return;
      }

      if (
        config.coupon_discount_percent < 0 ||
        config.coupon_discount_percent > 100
      ) {
        toast.error("O percentual de desconto deve estar entre 0 e 100");
        return;
      }

      const { error } = await supabase
        .from("system_config")
        .update({
          price_per_image: config.price_per_image,
          max_images_per_upload: config.max_images_per_upload,
          coupon_enabled: config.coupon_enabled,
          payment_enabled: config.payment_enabled,
          active_coupon: config.active_coupon,
          coupon_discount_percent: config.coupon_discount_percent,
          coupon_valid_until: config.coupon_valid_until,
          coupon_max_uses: config.coupon_max_uses,
          coupon_current_uses: config.coupon_current_uses,
          updated_at: new Date().toISOString(),
        })
        .eq("id", config.id);

      if (error) {
        throw error;
      }

      toast.success("Configurações salvas com sucesso");
    } catch (err: any) {
      console.error("Erro ao salvar configurações:", err);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-500">
            <p>Erro ao carregar configurações: {error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações do Sistema
          </CardTitle>
          <CardDescription>
            Configure os parâmetros de funcionamento do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preço por imagem */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="price" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Preço por Imagem (MZN)
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config?.payment_enabled || false}
                  onCheckedChange={(checked) =>
                    setConfig((prev) =>
                      prev ? { ...prev, payment_enabled: checked } : null
                    )
                  }
                  id="payment-enabled"
                />
                <Label htmlFor="payment-enabled" className="text-sm">
                  {config?.payment_enabled
                    ? "Pagamento Ativado"
                    : "Pagamento Desativado"}
                </Label>
              </div>
            </div>
            <Input
              id="price"
              type="number"
              min="0"
              step="0.5"
              value={config?.price_per_image || 0}
              onChange={(e) =>
                setConfig((prev) =>
                  prev
                    ? {
                        ...prev,
                        price_per_image: parseFloat(e.target.value) || 0,
                      }
                    : null
                )
              }
              disabled={!config?.payment_enabled}
            />
            {!config?.payment_enabled && (
              <p className="text-sm text-amber-500">
                Atenção: Com o pagamento desativado, todas as imagens serão
                processadas gratuitamente.
              </p>
            )}
          </div>

          {/* Limite de imagens */}
          <div className="space-y-2">
            <Label htmlFor="max-images" className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Limite de Imagens por Upload
            </Label>
            <Input
              id="max-images"
              type="number"
              min="1"
              max="500"
              value={config?.max_images_per_upload || 50}
              onChange={(e) =>
                setConfig((prev) =>
                  prev
                    ? {
                        ...prev,
                        max_images_per_upload: parseInt(e.target.value) || 50,
                      }
                    : null
                )
              }
            />
          </div>

          {/* Cupom de desconto */}
          <div className="space-y-4 border p-4 rounded-md">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="coupon-enabled"
                className="flex items-center gap-2"
              >
                <Percent className="w-4 h-4 text-primary" />
                Cupom de Desconto
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config?.coupon_enabled || false}
                  onCheckedChange={(checked) =>
                    setConfig((prev) =>
                      prev ? { ...prev, coupon_enabled: checked } : null
                    )
                  }
                  id="coupon-enabled"
                />
                <Label htmlFor="coupon-enabled" className="text-sm">
                  {config?.coupon_enabled
                    ? "Cupons Ativados"
                    : "Cupons Desativados"}
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coupon-code">Código do Cupom Ativo</Label>
                <Input
                  id="coupon-code"
                  value={config?.active_coupon || ""}
                  onChange={(e) =>
                    setConfig((prev) =>
                      prev ? { ...prev, active_coupon: e.target.value } : null
                    )
                  }
                  disabled={!config?.coupon_enabled}
                  placeholder="Ex: PROMO50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount-percent">
                  Percentual de Desconto (%)
                </Label>
                <Input
                  id="discount-percent"
                  type="number"
                  min="0"
                  max="100"
                  value={config?.coupon_discount_percent || 0}
                  onChange={(e) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            coupon_discount_percent:
                              parseInt(e.target.value) || 0,
                          }
                        : null
                    )
                  }
                  disabled={!config?.coupon_enabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coupon-valid-until">Validade do Cupom</Label>
                <Input
                  id="coupon-valid-until"
                  type="datetime-local"
                  value={
                    config?.coupon_valid_until
                      ? new Date(config.coupon_valid_until)
                          .toISOString()
                          .slice(0, 16)
                      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                          .toISOString()
                          .slice(0, 16)
                  }
                  onChange={(e) => {
                    const date = e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null;
                    setConfig((prev) =>
                      prev ? { ...prev, coupon_valid_until: date } : null
                    );
                  }}
                  disabled={!config?.coupon_enabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coupon-max-uses">Limite de Usos</Label>
                <Input
                  id="coupon-max-uses"
                  type="number"
                  min="0"
                  value={config?.coupon_max_uses || 0}
                  onChange={(e) =>
                    setConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            coupon_max_uses: parseInt(e.target.value) || 0,
                          }
                        : null
                    )
                  }
                  disabled={!config?.coupon_enabled}
                />
                <p className="text-xs text-muted-foreground">
                  0 = ilimitado. Atual: {config?.coupon_current_uses || 0} usos
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={saveConfig} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ConfigurationPanel;
