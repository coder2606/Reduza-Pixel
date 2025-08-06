import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useMPesaPayment } from "./useMPesaPayment";
import {
  sendPaymentConfirmation,
  sendAdminPaymentNotification,
} from "@/services/emailService";

interface PaymentModalState {
  isOpen: boolean;
  imageCount: number;
  totalAmount: number;
  sessionId: string;
  imageHashes: string[];
  paymentType: "individual" | "bulk";
}

interface PaymentStatus {
  status: "pending" | "processing" | "completed" | "failed";
  transactionId?: string;
  error?: string;
}

export const usePayment = () => {
  const [paymentModal, setPaymentModal] = useState<PaymentModalState | null>(
    null
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(
    null
  );
  const [paidImages, setPaidImages] = useState<Set<string>>(new Set());
  const [sessionId] = useState(() => generateSessionId());
  const [autoDownloadCallback, setAutoDownloadCallback] = useState<
    ((imageHashes: string[]) => void) | null
  >(null);

  // Hook do servidor M-Pesa externo
  const {
    processPayment: processExternalPayment,
    loading: mpesaLoading,
    error: mpesaError,
  } = useMPesaPayment();

  // Gerar session ID único
  function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Gerar hash único da imagem
  const generateImageHash = useCallback((imageFile: any): string => {
    const content = `${imageFile.file.name}_${imageFile.processedSize}_${imageFile.processedDimensions?.width}x${imageFile.processedDimensions?.height}`;
    return btoa(content).replace(/[^a-zA-Z0-9]/g, "");
  }, []);

  // Verificar se imagem já foi paga
  const isImagePaid = useCallback(
    (imageHash: string): boolean => {
      return paidImages.has(imageHash);
    },
    [paidImages]
  );

  // Carregar imagens já pagas do localStorage
  const loadPaidImages = useCallback(() => {
    try {
      const saved = localStorage.getItem(`paid_images_${sessionId}`);
      if (saved) {
        const paidHashes = JSON.parse(saved);
        setPaidImages(new Set(paidHashes));
      }
    } catch (error) {
      console.error("Erro ao carregar imagens pagas:", error);
    }
  }, [sessionId]);

  // Salvar imagens pagas no localStorage
  const savePaidImages = useCallback(
    (imageHashes: string[]) => {
      try {
        const currentPaid = Array.from(paidImages);
        const newPaid = [...new Set([...currentPaid, ...imageHashes])];
        localStorage.setItem(
          `paid_images_${sessionId}`,
          JSON.stringify(newPaid)
        );
        setPaidImages(new Set(newPaid));
      } catch (error) {
        console.error("Erro ao salvar imagens pagas:", error);
      }
    },
    [paidImages, sessionId]
  );

  // Processar pagamento M-Pesa usando servidor externo reutilizável
  // Servidor: https://mpesa-server-vercel.vercel.app/
  const processPayment = useCallback(
    async (
      customerMsisdn: string,
      amount: number,
      reference: string,
      thirdPartyReference: string
    ) => {
      console.log("🚀 Processando pagamento via servidor M-Pesa externo...");
      console.log("📊 Dados:", {
        customerMsisdn,
        amount,
        reference,
        thirdPartyReference,
      });

      try {
        // Usar servidor M-Pesa externo reutilizável
        const result = await processExternalPayment({
          amount,
          customerMsisdn,
          reference,
        });

        console.log("✅ Resposta do servidor externo:", result);

        // Retornar no formato esperado pelo código existente
        return {
          success: result.success,
          transactionId: result.transactionId,
          conversationId: result.conversationId,
          responseCode: result.responseCode,
          responseDesc: result.responseDesc,
          error: result.error,
        };
      } catch (error) {
        console.error("❌ Erro no pagamento via servidor externo:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro desconhecido",
        };
      }
    },
    [processExternalPayment]
  );

  // Iniciar pagamento
  const initiatePayment = useCallback(
    async (data: {
      imageHashes: string[];
      imageCount: number;
      paymentType: "individual" | "bulk";
      phoneNumber: string;
      amount?: number; // Preço total com possível desconto
      originalAmount?: number; // Valor original sem desconto
      couponCode?: string; // Código do cupom aplicado
      discountPercent?: number; // Percentual de desconto
      email?: string; // Email opcional para envio de comprovante
    }) => {
      try {
        setPaymentStatus({ status: "processing" });

        // Usar o valor fornecido ou calcular 1MT por imagem como padrão
        const amount =
          data.amount !== undefined ? data.amount : data.imageCount * 1.0;
        const reference = `RDP_${Date.now().toString().slice(-10)}`; // Máximo 14 caracteres (RDP_ + 10 dígitos)
        const thirdPartyReference = `${Date.now().toString().slice(-5)}`; // 5 dígitos como no Cheguei

        // Calcular valores de desconto
        const originalAmount = data.originalAmount || amount;
        const discountAmount = originalAmount - amount;

        // Criar transação no banco
        const { data: transaction, error } = await supabase
          .from("transactions")
          .insert({
            session_id: sessionId,
            phone_number: data.phoneNumber,
            amount,
            image_count: data.imageCount,
            payment_type: data.paymentType,
            status: "pending",
            // Campos adicionais para registro de desconto
            original_amount: originalAmount,
            discount_amount: discountAmount,
            coupon_code: data.couponCode || null,
            discount_percent: data.discountPercent || 0,
          })
          .select()
          .single();

        if (error) throw error;

        // Usar o novo método processPayment que segue o padrão do projeto Cheguei
        const mpesaData = await processPayment(
          data.phoneNumber,
          amount,
          reference,
          thirdPartyReference
        );

        if (mpesaData.success) {
          // Atualizar transação como completada
          await supabase
            .from("transactions")
            .update({
              status: "completed",
              mpesa_transaction_id: mpesaData.transactionId,
              mpesa_conversation_id: mpesaData.conversationId,
              completed_at: new Date().toISOString(),
            })
            .eq("id", transaction.id);

          // Marcar imagens como pagas
          savePaidImages(data.imageHashes);

          // Salvar downloads no banco
          for (const imageHash of data.imageHashes) {
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

          setPaymentStatus({
            status: "completed",
            transactionId: transaction.id,
          });

          // Enviar emails de confirmação e notificação
          try {
            // Enviar email para o cliente (se fornecido)
            if (data.email) {
              await sendPaymentConfirmation(data.email, {
                transactionId: transaction.id,
                amount,
                imageCount: data.imageCount,
                date: new Date().toLocaleString("pt-BR"),
                phoneNumber: data.phoneNumber,
                discountApplied:
                  discountAmount > 0 ? discountAmount : undefined,
                originalAmount: discountAmount > 0 ? originalAmount : undefined,
                couponCode: data.couponCode,
              });
              console.log("✅ Email de confirmação enviado para:", data.email);
            }

            // Enviar email para o administrador (sempre)
            await sendAdminPaymentNotification({
              transactionId: transaction.id,
              amount,
              imageCount: data.imageCount,
              date: new Date().toLocaleString("pt-BR"),
              phoneNumber: data.phoneNumber,
              discountApplied: discountAmount > 0 ? discountAmount : undefined,
              originalAmount: discountAmount > 0 ? originalAmount : undefined,
              couponCode: data.couponCode,
            });
            console.log("✅ Email de notificação enviado para o administrador");
          } catch (emailError) {
            // Não interromper o fluxo se o envio de email falhar
            console.error("❌ Erro ao enviar emails:", emailError);
          }

          // ✅ DOWNLOAD AUTOMÁTICO após pagamento bem-sucedido
          if (autoDownloadCallback) {
            try {
              console.log(
                "🚀 Iniciando download automático das imagens pagas..."
              );
              autoDownloadCallback(data.imageHashes);
              toast.success(
                "Pagamento realizado com sucesso! Downloads iniciados automaticamente."
              );
            } catch (error) {
              console.error("Erro no download automático:", error);
              toast.success("Pagamento realizado com sucesso!");
              toast.info(
                "Clique em 'Baixar' para fazer o download das imagens."
              );
            }
          } else {
            toast.success("Pagamento realizado com sucesso!");
          }

          return true;
        } else {
          throw new Error(mpesaData.responseDesc || "Erro no pagamento M-Pesa");
        }
      } catch (error) {
        console.error("Erro no pagamento:", error);
        setPaymentStatus({
          status: "failed",
          error: error instanceof Error ? error.message : "Erro desconhecido",
        });
        toast.error("Erro no pagamento. Tente novamente.");
        return false;
      }
    },
    [sessionId, savePaidImages, processPayment]
  );

  // Abrir modal de pagamento
  const openPaymentModal = useCallback(
    (data: {
      imageHashes: string[];
      imageCount: number;
      paymentType: "individual" | "bulk";
      pricePerImage?: number;
    }) => {
      // Usar preço configurado ou padrão de 1.0
      const pricePerUnit =
        data.pricePerImage !== undefined ? data.pricePerImage : 1.0;

      setPaymentModal({
        isOpen: true,
        imageCount: data.imageCount,
        totalAmount: data.imageCount * pricePerUnit,
        sessionId,
        imageHashes: data.imageHashes,
        paymentType: data.paymentType,
      });
    },
    [sessionId]
  );

  // Fechar modal de pagamento
  const closePaymentModal = useCallback(() => {
    setPaymentModal(null);
    setPaymentStatus(null);
  }, []);

  // Verificar se pode baixar sem pagamento
  const canDownloadWithoutPayment = useCallback(
    (imageHash: string): boolean => {
      return isImagePaid(imageHash);
    },
    [isImagePaid]
  );

  // Registrar download de imagem já paga
  const registerPaidDownload = useCallback(
    async (imageHash: string, filename: string) => {
      try {
        // Atualizar contador de downloads
        const { data: existing } = await supabase
          .from("image_downloads")
          .select("*")
          .eq("session_id", sessionId)
          .eq("image_hash", imageHash)
          .single();

        if (existing) {
          await supabase
            .from("image_downloads")
            .update({
              download_count: existing.download_count + 1,
              last_downloaded_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        }
      } catch (error) {
        console.error("Erro ao registrar download:", error);
      }
    },
    [sessionId]
  );

  return {
    sessionId,
    paymentModal,
    paymentStatus,
    paidImages,
    generateImageHash,
    isImagePaid,
    canDownloadWithoutPayment,
    initiatePayment,
    openPaymentModal,
    closePaymentModal,
    registerPaidDownload,
    loadPaidImages,
    // ✅ NOVO: Função para registrar callback de download automático
    setAutoDownloadCallback,
  };
};
