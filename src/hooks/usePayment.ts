import { useState, useCallback, useEffect } from "react";
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
  // Usar sessionId persistente do localStorage ou gerar novo
  const [sessionId] = useState(() => {
    const savedSessionId = localStorage.getItem("reduza_pixel_session_id");
    if (savedSessionId) {
      return savedSessionId;
    } else {
      const newSessionId = generateSessionId();
      localStorage.setItem("reduza_pixel_session_id", newSessionId);
      return newSessionId;
    }
  });
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

  // Verificar se imagem já foi paga (verificação completa: cache local + banco de dados específico da sessão + banco de dados global)
  const isImagePaid = useCallback(
    async (imageHash: string): Promise<boolean> => {
      try {
        // Primeiro verificar no cache local para performance
        if (paidImages.has(imageHash)) {
          return true;
        }

        // Verificar no banco de dados para a sessão atual
        const { data: sessionData, error: sessionError } = await supabase
          .from("image_downloads")
          .select("id")
          .eq("image_hash", imageHash)
          .eq("session_id", sessionId) // Verificar para a sessão atual
          .not("transaction_id", "is", null)
          .limit(1);

        if (sessionError) {
          console.error(
            "Erro ao verificar imagem paga na sessão:",
            sessionError
          );
          return false;
        }

        // Se encontrou na sessão atual
        if (sessionData && sessionData.length > 0) {
          // Adicionar ao cache local para futuras verificações
          savePaidImages([imageHash]);
          return true;
        }

        // Imagem não está paga na sessão atual
        return false;
      } catch (error) {
        console.error("Erro ao verificar pagamento da imagem:", error);
        return false;
      }
    },
    [paidImages, savePaidImages, sessionId]
  );

  // Carregar imagens pagas do banco de dados e sincronizar com localStorage
  const loadPaidImages = useCallback(async () => {
    try {
      // Carregar do banco de dados imagens com pagamento confirmado
      // Usar session_id para garantir que apenas imagens desta sessão sejam carregadas
      const { data: paidDownloads, error } = await supabase
        .from("image_downloads")
        .select("image_hash")
        .eq("session_id", sessionId)
        .not("transaction_id", "is", null);

      if (error) {
        console.error("Erro ao carregar imagens pagas do banco:", error);
        return;
      }

      // Processar imagens pagas do banco de dados
      if (paidDownloads && paidDownloads.length > 0) {
        const dbPaidHashes = paidDownloads.map((d) => d.image_hash);
        const uniqueHashes = [...new Set(dbPaidHashes)];

        // Atualizar localStorage e estado com imagens do banco
        localStorage.setItem(
          `paid_images_${sessionId}`,
          JSON.stringify(uniqueHashes)
        );
        setPaidImages(new Set(uniqueHashes));

        // Imagens pagas carregadas com sucesso
      } else {
        // Limpar cache local se não houver imagens pagas no banco
        setPaidImages(new Set());
        localStorage.removeItem(`paid_images_${sessionId}`);
      }
    } catch (error) {
      console.error("Erro ao carregar imagens pagas:", error);
    }
  }, [sessionId]);

  // Processar pagamento M-Pesa usando servidor externo reutilizável
  // Servidor: https://mpesa-server-vercel.vercel.app/
  const processPayment = useCallback(
    async (
      customerMsisdn: string,
      amount: number,
      reference: string,
      thirdPartyReference: string
    ) => {
      // Processando pagamento via servidor M-Pesa externo

      try {
        // Usar servidor M-Pesa externo reutilizável
        const result = await processExternalPayment({
          amount,
          customerMsisdn,
          reference,
        });

        // Resposta recebida do servidor externo

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
              // Email de confirmação enviado com sucesso
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
            // Email de notificação enviado para o administrador
          } catch (emailError) {
            // Não interromper o fluxo se o envio de email falhar
            console.error("❌ Erro ao enviar emails:", emailError);
          }

          // ✅ DOWNLOAD AUTOMÁTICO após pagamento bem-sucedido
          if (autoDownloadCallback) {
            try {
              // Iniciando download automático das imagens pagas
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
    [sessionId, savePaidImages, processPayment, autoDownloadCallback]
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
    async (imageHash: string): Promise<boolean> => {
      return await isImagePaid(imageHash);
    },
    [isImagePaid]
  );

  // Registrar download de imagem já paga
  const registerPaidDownload = useCallback(
    async (imageHash: string, filename: string) => {
      try {
        // Verificar se existe registro de pagamento para esta imagem
        // Não usar maybeSingle que causa erro quando há múltiplos registros
        const { data: paidDownloads, error: paidCheckError } = await supabase
          .from("image_downloads")
          .select("id, download_count")
          .eq("image_hash", imageHash)
          .not("transaction_id", "is", null) // Apenas registros com transação
          .order("last_downloaded_at", { ascending: false }) // Obter o mais recente
          .limit(1);

        if (paidCheckError) {
          console.error("Erro ao verificar pagamento:", paidCheckError);
          return;
        }

        // Se encontrou um registro pago, atualizar contagem
        if (paidDownloads && paidDownloads.length > 0) {
          const paidDownload = paidDownloads[0];
          const { error: updateError } = await supabase
            .from("image_downloads")
            .update({
              download_count: (paidDownload.download_count || 0) + 1,
              last_downloaded_at: new Date().toISOString(),
            })
            .eq("id", paidDownload.id);

          if (updateError) {
            console.error("Erro ao atualizar download:", updateError);
          } else {
            // Re-download registrado com sucesso
          }
          return;
        }

        // Verificar se há qualquer registro para essa imagem (gratuito)
        const { data: existingDownloads, error: checkError } = await supabase
          .from("image_downloads")
          .select("id, download_count")
          .eq("image_hash", imageHash)
          .order("last_downloaded_at", { ascending: false })
          .limit(1);

        if (checkError) {
          console.error("Erro ao verificar download existente:", checkError);
          return;
        }

        if (existingDownloads && existingDownloads.length > 0) {
          // Atualizar o registro existente
          const existingDownload = existingDownloads[0];
          const { error: updateError } = await supabase
            .from("image_downloads")
            .update({
              download_count: (existingDownload.download_count || 0) + 1,
              last_downloaded_at: new Date().toISOString(),
            })
            .eq("id", existingDownload.id);

          if (updateError) {
            console.error("Erro ao atualizar download:", updateError);
          } else {
            // Download não pago atualizado
          }
        } else {
          // Nunca criar registros gratuitos automaticamente
          // Tentativa de download sem registro de pagamento
        }
      } catch (error) {
        console.error("Erro ao registrar download:", error);
      }
    },
    [sessionId]
  );

  // ✅ Carregar imagens pagas e limpar sessões antigas na inicialização
  useEffect(() => {
    const initializePaymentSystem = async () => {
      // Carregar imagens pagas
      await loadPaidImages();

      // Limpar sessões antigas (mais de 30 dias)
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Verificar se a sessão atual tem mais de 30 dias
        const sessionCreationString = localStorage.getItem(
          "reduza_pixel_session_created_at"
        );
        if (sessionCreationString) {
          const sessionCreation = new Date(sessionCreationString);
          if (sessionCreation < thirtyDaysAgo) {
            // Sessão atual expirada, criar nova
            // Sessão atual expirada, criando nova
            const newSessionId = generateSessionId();
            localStorage.setItem("reduza_pixel_session_id", newSessionId);
            localStorage.setItem(
              "reduza_pixel_session_created_at",
              new Date().toISOString()
            );
            // Recarregar a página para aplicar nova sessão
            window.location.reload();
            return;
          }
        } else {
          // Não tem data de criação, registrar agora
          localStorage.setItem(
            "reduza_pixel_session_created_at",
            new Date().toISOString()
          );
        }
      } catch (error) {
        console.error("Erro ao verificar idade da sessão:", error);
      }
    };

    initializePaymentSystem();
  }, [loadPaidImages]);

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
