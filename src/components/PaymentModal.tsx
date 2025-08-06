import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CreditCard,
  Smartphone,
  CheckCircle,
  XCircle,
  Percent,
} from "lucide-react";
import { usePayment } from "@/hooks/usePayment";
import { useSystemConfig } from "@/hooks/useSystemConfig";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  sendPaymentConfirmation,
  sendAdminPaymentNotification,
} from "@/services/emailService";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  imageCount: number;
  totalAmount: number;
  sessionId: string;
  imageHashes: string[];
  paymentType: "individual" | "bulk";
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  imageCount,
  totalAmount,
  sessionId,
  imageHashes,
  paymentType,
}) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [appliedPrice, setAppliedPrice] = useState(totalAmount);
  const [pricePerImage, setPricePerImage] = useState(1.0);
  const [couponCode, setCouponCode] = useState("");
  const [couponInfo, setCouponInfo] = useState({
    active: false,
    code: "",
    discountPercent: 0,
  });
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const { initiatePayment, paymentStatus } = usePayment();
  const {
    config,
    loading: configLoading,
    validateCoupon,
    incrementCouponUse,
  } = useSystemConfig();

  // Efeito para atualizar o preço quando as configurações carregarem
  useEffect(() => {
    if (config) {
      // Definir o preço por imagem
      const basePrice = config.payment_enabled ? config.price_per_image : 0;
      setPricePerImage(basePrice);

      // Calcular o preço total sem desconto (cupom não é aplicado automaticamente)
      const finalPrice = basePrice * imageCount;
      setAppliedPrice(finalPrice);
    }
  }, [config, imageCount]);

  // Função para aplicar cupom
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !config) {
      setCouponError("Digite um código de cupom válido");
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError(null);

    try {
      const validationResult = validateCoupon(couponCode.trim());

      if (!validationResult.valid) {
        setCouponError(validationResult.message || "Cupom inválido");
        setCouponInfo({
          active: false,
          code: "",
          discountPercent: 0,
        });

        // Restaurar preço original
        const basePrice = config.payment_enabled ? config.price_per_image : 0;
        setAppliedPrice(basePrice * imageCount);
        return;
      }

      // Cupom válido, aplicar desconto
      const basePrice = config.payment_enabled ? config.price_per_image : 0;
      const discount = config.coupon_discount_percent;
      const discountedPrice = basePrice * imageCount * (1 - discount / 100);

      setAppliedPrice(discountedPrice);
      setCouponInfo({
        active: true,
        code: couponCode,
        discountPercent: discount,
      });

      toast.success(`Cupom ${couponCode} aplicado com sucesso!`);
    } catch (error) {
      console.error("Erro ao aplicar cupom:", error);
      setCouponError("Erro ao processar o cupom");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handlePayment = async () => {
    // Se o preço for zero (cupom 100%), não precisamos de validação de telefone
    if (appliedPrice > 0) {
      if (!phoneNumber.trim()) {
        toast.error("Por favor, insira seu número de telefone");
        return;
      }

      // Validar formato do telefone moçambicano (formato M-Pesa: apenas 25884XXXXXXX ou 25885XXXXXXX)
      // Aceita somente: 25884XXXXXX (Vodacom) ou 25885XXXXXX (Vodacom)
      const phoneRegex = /^258(84|85|86|87)\d{7}$/;
      const cleanPhone = phoneNumber.replace(/\s/g, "");
      if (!phoneRegex.test(cleanPhone)) {
        toast.error(
          "Por favor, insira um número M-Pesa válido (ex: 258841234567)"
        );
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Caso especial para cupom de 100% (preço zero)
      if (appliedPrice <= 0) {
        // Incrementar uso do cupom
        if (couponInfo.active && couponInfo.code) {
          await incrementCouponUse(couponInfo.code);
        }

        // Criar uma transação "gratuita" no banco para rastreamento
        const originalPrice = pricePerImage * imageCount;
        const { data: transaction, error } = await supabase
          .from("transactions")
          .insert({
            session_id: sessionId,
            phone_number: "CUPOM_100%",
            amount: 0,
            image_count: imageCount,
            payment_type: paymentType,
            status: "completed",
            completed_at: new Date().toISOString(),
            // Campos adicionais para registro de desconto
            original_amount: originalPrice,
            discount_amount: originalPrice,
            coupon_code: couponInfo.code,
            discount_percent: couponInfo.discountPercent,
          })
          .select()
          .single();

        if (error) {
          console.error("Erro ao registrar transação gratuita:", error);
          throw error;
        }

        // Salvar downloads no banco
        for (const imageHash of imageHashes) {
          await supabase.from("image_downloads").insert({
            session_id: sessionId,
            transaction_id: transaction.id,
            image_hash: imageHash,
            original_filename: `image_${imageHash}`,
            download_count: 1,
            first_downloaded_at: new Date().toISOString(),
            last_downloaded_at: new Date().toISOString(),
          });
        }

        // Enviar emails se o cliente forneceu um email
        try {
          if (email.trim()) {
            await sendPaymentConfirmation(email.trim(), {
              transactionId: transaction.id,
              amount: 0,
              imageCount: imageCount,
              date: new Date().toLocaleString("pt-BR"),
              phoneNumber: "CUPOM_100%",
              discountApplied: originalPrice,
              originalAmount: originalPrice,
              couponCode: couponInfo.code,
            });
            
          }

          // Sempre enviar email para o administrador
          await sendAdminPaymentNotification({
            transactionId: transaction.id,
            amount: 0,
            imageCount: imageCount,
            date: new Date().toLocaleString("pt-BR"),
            phoneNumber: "CUPOM_100%",
            discountApplied: originalPrice,
            originalAmount: originalPrice,
            couponCode: couponInfo.code,
          });
        } catch (emailError) {
          // Não interromper o fluxo se o envio de email falhar
          console.error("❌ Erro ao enviar emails:", emailError);
        }

        onPaymentSuccess();
        onClose();
        toast.success("Download iniciado automaticamente!");
        return;
      }

      // Processamento normal para pagamentos com valor
      const originalPrice = pricePerImage * imageCount;
      const success = await initiatePayment({
        imageHashes,
        imageCount,
        paymentType,
        phoneNumber: phoneNumber.replace(/\s/g, ""),
        amount: appliedPrice, // Usar o preço com desconto se aplicável
        originalAmount: originalPrice,
        couponCode: couponInfo.active ? couponInfo.code : undefined,
        discountPercent: couponInfo.active ? couponInfo.discountPercent : 0,
        email: email.trim() || undefined, // Incluir email apenas se fornecido
      });

      if (success) {
        // Se o pagamento foi bem-sucedido e um cupom foi usado, incrementar o uso
        if (couponInfo.active && couponInfo.code) {
          await incrementCouponUse(couponInfo.code);
        }

        onPaymentSuccess();
        onClose();
        setPhoneNumber("");
      }
    } catch (error) {
      console.error("Erro no pagamento:", error);
      toast.error("Erro ao processar o pagamento. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Formatar número de telefone moçambicano - apenas 84 e 85 (Vodacom M-Pesa)
    const cleaned = value.replace(/\D/g, "");

    // Se já começa com 258, manter como está
    if (cleaned.startsWith("258")) {
      return cleaned;
    }
    // Se começa com 84 ou 85, adicionar 258
    else if (cleaned.startsWith("84") || cleaned.startsWith("85")) {
      return `258${cleaned}`;
    }
    // Se começa com 8 e o segundo dígito é 4 ou 5, adicionar 25
    else if (
      cleaned.startsWith("8") &&
      (cleaned[1] === "4" || cleaned[1] === "5")
    ) {
      return `25${cleaned}`;
    }

    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const getStatusIcon = () => {
    switch (paymentStatus?.status) {
      case "processing":
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <CreditCard className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (paymentStatus?.status) {
      case "processing":
        return "Processando pagamento...";
      case "completed":
        return "Pagamento realizado com sucesso!";
      case "failed":
        return paymentStatus.error || "Erro no pagamento";
      default:
        return "Aguardando pagamento";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md"
        aria-describedby="payment-dialog-description"
      >
        <DialogHeader>
          <div className="flex flex-col items-center mb-4">
            <img
              src="/images/mpesa_banner_logo.svg"
              alt="M-Pesa Logo"
              className="h-12 mb-2"
            />
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Pagamento M-Pesa
            </DialogTitle>
          </div>
          <p id="payment-dialog-description" className="sr-only">
            Formulário para pagamento via M-Pesa. Insira seu número de telefone
            Vodacom.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo do pagamento */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Tipo de pagamento:
                  </span>
                  <Badge
                    variant={paymentType === "bulk" ? "default" : "secondary"}
                  >
                    {paymentType === "bulk" ? "Lote" : "Individual"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Imagens:
                  </span>
                  <span className="font-medium">{imageCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Valor por imagem:
                  </span>
                  <span className="font-medium">
                    {pricePerImage.toFixed(2)} MT
                  </span>
                </div>

                {/* Campo de cupom */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="coupon"
                      className="text-sm text-muted-foreground flex items-center gap-1"
                    >
                      <Percent className="w-3 h-3" />
                      Cupom de desconto
                    </Label>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      id="coupon"
                      type="text"
                      placeholder="Digite o código"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        setCouponError(null);
                      }}
                      disabled={isApplyingCoupon || couponInfo.active}
                      className="bg-background text-foreground border-border"
                    />
                    <Button
                      variant={couponInfo.active ? "outline" : "secondary"}
                      size="sm"
                      onClick={
                        couponInfo.active
                          ? () => {
                              setCouponInfo({
                                active: false,
                                code: "",
                                discountPercent: 0,
                              });
                              setCouponCode("");
                              setCouponError(null);
                              // Restaurar preço original
                              if (config) {
                                const basePrice = config.payment_enabled
                                  ? config.price_per_image
                                  : 0;
                                setAppliedPrice(basePrice * imageCount);
                              }
                            }
                          : handleApplyCoupon
                      }
                      disabled={
                        isApplyingCoupon ||
                        (!couponInfo.active && !couponCode.trim())
                      }
                    >
                      {isApplyingCoupon ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : couponInfo.active ? (
                        "Remover"
                      ) : (
                        "Aplicar"
                      )}
                    </Button>
                  </div>

                  {couponError && (
                    <p className="text-xs text-destructive">{couponError}</p>
                  )}
                </div>

                {couponInfo.active && (
                  <div className="flex justify-between items-center bg-background border border-green-500/20 p-2 rounded-md">
                    <span className="text-sm text-green-500 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Cupom aplicado: {couponInfo.code}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-green-500/10 text-green-500 border-green-500/20"
                    >
                      -{couponInfo.discountPercent}%
                    </Badge>
                  </div>
                )}

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total:</span>
                    <span className="text-lg font-bold text-primary">
                      {appliedPrice.toFixed(2)} MT
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status do pagamento */}
          {paymentStatus && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon()}
                  <span className="text-sm">{getStatusText()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulário de pagamento */}
          {!paymentStatus || paymentStatus.status === "failed" ? (
            <div className="space-y-4">
              {/* Mostrar campo de telefone apenas se o preço não for zero (cupom de 100%) */}
              {appliedPrice > 0 ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Número de telefone M-Pesa</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="25884XXXXXXX ou 25885XXXXXXX"
                      value={phoneNumber}
                      onChange={handlePhoneChange}
                      disabled={isProcessing}
                    />
                    <p className="text-xs text-muted-foreground">
                      Digite o número Vodacom registrado no M-Pesa (apenas
                      números que começam com 25884 ou 25885)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email (opcional para receber comprovante)
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isProcessing}
                    />
                    <p className="text-xs text-muted-foreground">
                      Forneça seu email para receber o comprovante de pagamento
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                    <p className="text-sm text-green-500 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Cupom de 100% aplicado! Não é necessário pagamento.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email (opcional para receber comprovante)
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isProcessing}
                    />
                    <p className="text-xs text-muted-foreground">
                      Forneça seu email para receber o comprovante de download
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handlePayment}
                  disabled={
                    (appliedPrice > 0 && !phoneNumber.trim()) || isProcessing
                  }
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      {appliedPrice <= 0 ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirmar Download
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pagar {appliedPrice.toFixed(2)} MT
                        </>
                      )}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isProcessing}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : paymentStatus.status === "completed" ? (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold text-green-600">
                  Pagamento realizado!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Suas imagens serão baixadas automaticamente.
                </p>
              </div>
              <Button onClick={onClose} className="w-full">
                Fechar
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
