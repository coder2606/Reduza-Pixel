import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { usePayment } from "./usePayment";
import { useSystemConfig } from "./useSystemConfig";

export interface ImageFile {
  id: string;
  file: File;
  originalSize: number;
  processedSize?: number;
  originalDimensions: { width: number; height: number };
  processedDimensions?: { width: number; height: number };
  processedBlob?: Blob;
  processedUrl?: string;
  status: "pending" | "processing" | "completed" | "error";
}

export interface ProcessingOptions {
  maxFileSize: number; // em KB
  maxDimension: number; // em pixels
  quality: number; // 0.1 a 1.0
  outputFormat: "original" | "webp" | "png" | "jpeg"; // formato de saída
}

export const useImageProcessor = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    imageHashes: string[];
    imageCount: number;
    paymentType: "individual" | "bulk";
  } | null>(null);

  // Obter configurações do sistema
  const { config, getCurrentPricePerImage, getMaxImagesPerUpload } =
    useSystemConfig();

  const {
    generateImageHash,
    isImagePaid,
    canDownloadWithoutPayment,
    registerPaidDownload,
    openPaymentModal,
    closePaymentModal,
    setAutoDownloadCallback,
  } = usePayment();

  const addImages = useCallback((files: File[]) => {
    const newImages: ImageFile[] = [];

    // Verificar o limite máximo de imagens permitido
    const maxImages = getMaxImagesPerUpload();
    const totalImages = images.length + files.length;

    if (totalImages > maxImages) {
      toast.error(
        `Limite máximo de ${maxImages} imagens excedido. Você já tem ${images.length} imagens.`
      );
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} não é uma imagem válida`);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const imageFile: ImageFile = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          originalSize: file.size,
          originalDimensions: { width: img.width, height: img.height },
          status: "pending",
        };

        setImages((prev) => [...prev, imageFile]);
        URL.revokeObjectURL(img.src);
      };

      img.onerror = () => {
        toast.error(`Erro ao carregar ${file.name}`);
        URL.revokeObjectURL(img.src);
      };

      img.src = URL.createObjectURL(file);
    });
  }, []);

  const processImage = useCallback(
    async (imageFile: ImageFile, options: ProcessingOptions): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
          const { width: originalWidth, height: originalHeight } =
            imageFile.originalDimensions;

          // Calcular novas dimensões mantendo proporção
          let newWidth = originalWidth;
          let newHeight = originalHeight;

          if (
            originalWidth > options.maxDimension ||
            originalHeight > options.maxDimension
          ) {
            const ratio = Math.min(
              options.maxDimension / originalWidth,
              options.maxDimension / originalHeight
            );
            newWidth = Math.round(originalWidth * ratio);
            newHeight = Math.round(originalHeight * ratio);
          }

          canvas.width = newWidth;
          canvas.height = newHeight;

          if (ctx) {
            // Melhorar qualidade do redimensionamento
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            // Determinar o formato de saída
            let outputMimeType = "image/jpeg";
            let fileExtension = "jpg";

            if (options.outputFormat === "original") {
              outputMimeType = imageFile.file.type;
              fileExtension = imageFile.file.name.split(".").pop() || "jpg";
            } else if (options.outputFormat === "webp") {
              outputMimeType = "image/webp";
              fileExtension = "webp";
            } else if (options.outputFormat === "png") {
              outputMimeType = "image/png";
              fileExtension = "png";
            } else if (options.outputFormat === "jpeg") {
              outputMimeType = "image/jpeg";
              fileExtension = "jpg";
            }

            canvas.toBlob(
              (blob) => {
                if (blob) {
                  // Verificar se o tamanho do arquivo está dentro do limite
                  const targetSizeBytes = options.maxFileSize * 1024;
                  if (blob.size <= targetSizeBytes) {
                    resolve(blob);
                  } else {
                    // Tentar compressão adicional reduzindo a qualidade (apenas para JPEG e WebP)
                    if (
                      outputMimeType === "image/jpeg" ||
                      outputMimeType === "image/webp"
                    ) {
                      const reducedQuality = Math.max(
                        0.1,
                        options.quality * 0.7
                      );
                      canvas.toBlob(
                        (compressedBlob) => {
                          if (compressedBlob) {
                            resolve(compressedBlob);
                          } else {
                            reject(new Error("Erro na compressão adicional"));
                          }
                        },
                        outputMimeType,
                        reducedQuality
                      );
                    } else {
                      // Para PNG, não há compressão de qualidade, apenas aceitar o resultado
                      resolve(blob);
                    }
                  }
                } else {
                  reject(new Error("Erro ao processar imagem"));
                }
              },
              outputMimeType,
              outputMimeType === "image/png" ? undefined : options.quality
            );
          } else {
            reject(new Error("Erro ao criar contexto do canvas"));
          }

          URL.revokeObjectURL(img.src);
        };

        img.onerror = () => {
          reject(new Error("Erro ao carregar imagem"));
          URL.revokeObjectURL(img.src);
        };

        img.src = URL.createObjectURL(imageFile.file);
      });
    },
    []
  );

  const processImages = useCallback(
    async (options: ProcessingOptions) => {
      setIsProcessing(true);
      const pendingImages = images.filter((img) => img.status === "pending");

      for (const imageFile of pendingImages) {
        try {
          setImages((prev) =>
            prev.map((img) =>
              img.id === imageFile.id
                ? { ...img, status: "processing" as const }
                : img
            )
          );

          const processedBlob = await processImage(imageFile, options);
          const processedUrl = URL.createObjectURL(processedBlob);

          // Obter dimensões da imagem processada
          const imgElement = new Image();
          imgElement.onload = () => {
            setImages((prev) =>
              prev.map((imgFile) =>
                imgFile.id === imageFile.id
                  ? {
                      ...imgFile,
                      status: "completed" as const,
                      processedSize: processedBlob.size,
                      processedBlob,
                      processedUrl,
                      processedDimensions: {
                        width: imgElement.width,
                        height: imgElement.height,
                      },
                    }
                  : imgFile
              )
            );
            URL.revokeObjectURL(imgElement.src);
          };
          imgElement.src = processedUrl;
        } catch (error) {
          console.error("Erro ao processar imagem:", error);
          setImages((prev) =>
            prev.map((img) =>
              img.id === imageFile.id
                ? { ...img, status: "error" as const }
                : img
            )
          );
          toast.error(`Erro ao processar ${imageFile.file.name}`);
        }
      }

      setIsProcessing(false);
      toast.success("Processamento concluído!");
    },
    [images, processImage]
  );

  const downloadImage = useCallback(
    async (imageFile: ImageFile, outputFormat?: string) => {
      if (!imageFile.processedBlob) return;

      const imageHash = generateImageHash(imageFile);

      // Verificar se a imagem já foi paga ou se o pagamento está desativado
      if (isImagePaid(imageHash) || (config && !config.payment_enabled)) {
        // Download direto (já pago)
        const link = document.createElement("a");
        link.href = URL.createObjectURL(imageFile.processedBlob);

        // Determinar a extensão do arquivo baseado no formato de saída
        const originalName = imageFile.file.name.split(".")[0];
        let extension = "jpg";

        if (outputFormat === "webp") extension = "webp";
        else if (outputFormat === "png") extension = "png";
        else if (outputFormat === "jpeg") extension = "jpg";
        else if (outputFormat === "original") {
          extension = imageFile.file.name.split(".").pop() || "jpg";
        }

        link.download = `resized_${originalName}.${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        // Registrar download
        await registerPaidDownload(
          imageHash,
          `resized_${originalName}.${extension}`
        );
        toast.success("Imagem baixada!");
      } else {
        // Abrir modal de pagamento
        setPaymentModal({
          isOpen: true,
          imageHashes: [imageHash],
          imageCount: 1,
          paymentType: "individual",
        });

        // Usar o hook de pagamento com o preço atual
        openPaymentModal({
          imageHashes: [imageHash],
          imageCount: 1,
          paymentType: "individual",
          pricePerImage: getCurrentPricePerImage(),
        });
      }
    },
    [
      generateImageHash,
      isImagePaid,
      registerPaidDownload,
      openPaymentModal,
      getCurrentPricePerImage,
      config,
    ]
  );

  const downloadAllImages = useCallback(
    (outputFormat?: string) => {
      const completedImages = images.filter(
        (img) => img.status === "completed"
      );

      if (completedImages.length === 0) {
        toast.error("Nenhuma imagem processada para download");
        return;
      }

      // Verificar quais imagens já foram pagas
      const paidImages: ImageFile[] = [];
      const unpaidImages: ImageFile[] = [];

      completedImages.forEach((img) => {
        const imageHash = generateImageHash(img);
        if (isImagePaid(imageHash)) {
          paidImages.push(img);
        } else {
          unpaidImages.push(img);
        }
      });

      // Se todas já foram pagas, baixar diretamente
      if (unpaidImages.length === 0) {
        paidImages.forEach((img) => downloadImage(img, outputFormat));
        toast.success(`${paidImages.length} imagens baixadas!`);
        return;
      }

      // Se há imagens não pagas, abrir modal de pagamento
      const imageHashes = unpaidImages.map((img) => generateImageHash(img));
      setPaymentModal({
        isOpen: true,
        imageHashes,
        imageCount: unpaidImages.length,
        paymentType: "bulk",
      });

      // Usar o hook de pagamento com o preço atual
      openPaymentModal({
        imageHashes,
        imageCount: unpaidImages.length,
        paymentType: "bulk",
        pricePerImage: getCurrentPricePerImage(),
      });
    },
    [
      images,
      downloadImage,
      generateImageHash,
      isImagePaid,
      openPaymentModal,
      getCurrentPricePerImage,
    ]
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id);
      if (imageToRemove?.processedUrl) {
        URL.revokeObjectURL(imageToRemove.processedUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    images.forEach((img) => {
      if (img.processedUrl) {
        URL.revokeObjectURL(img.processedUrl);
      }
    });
    setImages([]);
  }, [images, getMaxImagesPerUpload]);

  // Função para lidar com sucesso do pagamento
  const handlePaymentSuccess = useCallback(() => {
    if (paymentModal) {
      // Baixar as imagens que foram pagas
      const completedImages = images.filter(
        (img) => img.status === "completed"
      );
      const imageHashes = paymentModal.imageHashes;

      completedImages.forEach((img) => {
        const imageHash = generateImageHash(img);
        if (imageHashes.includes(imageHash)) {
          downloadImage(img);
        }
      });

      setPaymentModal(null);
    }
  }, [paymentModal, images, generateImageHash, downloadImage]);

  // ✅ Registrar callback de download automático
  useEffect(() => {
    const autoDownload = (imageHashes: string[]) => {
      console.log("🚀 Download automático iniciado para:", imageHashes);

      imageHashes.forEach(async (hash) => {
        const image = images.find((img) => generateImageHash(img) === hash);
        if (image && image.status === "completed") {
          console.log(`📥 Baixando automaticamente: ${image.file.name}`);
          await downloadImage(image, "original"); // Usar formato original por padrão
        }
      });
    };

    setAutoDownloadCallback(() => autoDownload);
  }, [images, downloadImage, generateImageHash, setAutoDownloadCallback]);

  return {
    images,
    isProcessing,
    addImages,
    processImages,
    downloadImage,
    downloadAllImages,
    removeImage,
    clearAll,
    paymentModal,
    handlePaymentSuccess,
    closePaymentModal: () => setPaymentModal(null),
  };
};
