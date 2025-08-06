import React, { useState } from "react";
import { Header } from "@/components/Header";
import { ImageUploader } from "@/components/ImageUploader";
import { ProcessingSettings } from "@/components/ProcessingSettings";
import { ImageList } from "@/components/ImageList";
import { PaymentModal } from "@/components/PaymentModal";

import {
  useImageProcessor,
  ProcessingOptions,
} from "@/hooks/useImageProcessor";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Shield, Clock, Heart } from "lucide-react";

const Index = () => {
  const {
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
    closePaymentModal,
    loadingDownloads,
    isDownloadingAll,
  } = useImageProcessor();

  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>(
    {
      maxFileSize: 250, // 250 KB como padrão
      maxDimension: 1280, // 1280px como padrão
      quality: 0.8, // 80% de qualidade como padrão
      outputFormat: "original", // Manter formato original como padrão
    }
  );

  const handleProcess = () => {
    processImages(processingOptions);
  };

  const features = [
    {
      icon: Zap,
      title: "Processamento Rápido",
      description: "Redimensione múltiplas imagens em segundos",
    },
    {
      icon: Shield,
      title: "Privacidade Total",
      description: "Suas imagens nunca saem do seu navegador",
    },
    {
      icon: Clock,
      title: "Disponível 24/7",
      description: "Use quando quiser, sem limitações",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 py-8">
        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4 animate-fade-in mb-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="gradient-secondary border-border/50 hover:border-primary/30 transition-all duration-300"
            >
              <CardContent className="p-4 text-center">
                <feature.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Área principal de upload e configurações */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upload Area */}
            <div className="animate-fade-in">
              <ImageUploader
                onImagesAdded={addImages}
                disabled={isProcessing}
              />

              {/* Lista de imagens dentro do card de upload */}
              {images.length > 0 && (
                <div className="mt-6">
                  <ImageList
                    images={images}
                    onDownload={downloadImage}
                    onDownloadAll={downloadAllImages}
                    onRemove={removeImage}
                    onClearAll={clearAll}
                    loadingDownloads={loadingDownloads}
                    isDownloadingAll={isDownloadingAll}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar com configurações */}
          <div className="space-y-6 animate-fade-in">
            <ProcessingSettings
              options={processingOptions}
              onOptionsChange={setProcessingOptions}
              onProcess={handleProcess}
              disabled={isProcessing}
              hasImages={images.length > 0}
            />

            {/* Estatísticas rápidas */}
            {images.length > 0 && (
              <Card className="gradient-secondary border-border/50">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3 text-foreground">
                    Estatísticas
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total de imagens:
                      </span>
                      <Badge variant="secondary">{images.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Processadas:
                      </span>
                      <Badge variant="default">
                        {
                          images.filter((img) => img.status === "completed")
                            .length
                        }
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pendentes:</span>
                      <Badge variant="outline">
                        {
                          images.filter((img) => img.status === "pending")
                            .length
                        }
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-gradient-secondary backdrop-blur-sm mt-16">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">
              Essa ferramenta é propriedade da empresa de comunicação,{" "}
              <a
                className="hover:text-primary"
                href="https://kobedesigner7.com"
                target="_blank"
              >
                Kobe Designer 7, Lda.
              </a>
            </p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()}{" "}
              <a
                className="hover:text-primary"
                href="https://kobedesigner7.com"
                target="_blank"
              >
                Kobe Designer 7, Lda.
              </a>{" "}
              Reduza Pixel.
            </p>
          </div>
        </div>
      </footer>

      {/* Modal de Pagamento */}
      {paymentModal && (
        <PaymentModal
          isOpen={paymentModal.isOpen}
          onClose={closePaymentModal}
          onPaymentSuccess={handlePaymentSuccess}
          imageCount={paymentModal.imageCount}
          totalAmount={paymentModal.totalAmount}
          sessionId={paymentModal.sessionId}
          imageHashes={paymentModal.imageHashes}
          paymentType={paymentModal.paymentType}
        />
      )}
    </div>
  );
};

export default Index;
