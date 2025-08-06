import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  X,
  Image as ImageIcon,
  FileImage,
  CheckCircle,
  AlertCircle,
  Loader2,
  DownloadCloud,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { ImageFile } from "@/hooks/useImageProcessor";
import { cn } from "@/lib/utils";
import { usePayment } from "@/hooks/usePayment";

interface ImageListProps {
  images: ImageFile[];
  onDownload: (image: ImageFile) => void;
  onDownloadAll: () => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getCompressionRatio = (original: number, processed: number): number => {
  return Math.round((1 - processed / original) * 100);
};

const StatusIcon: React.FC<{ status: ImageFile["status"] }> = ({ status }) => {
  switch (status) {
    case "pending":
      return <FileImage className="w-4 h-4 text-muted-foreground" />;
    case "processing":
      return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
    case "completed":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "error":
      return <AlertCircle className="w-4 h-4 text-destructive" />;
    default:
      return <FileImage className="w-4 h-4" />;
  }
};

const ImageCard: React.FC<{
  image: ImageFile;
  onDownload: () => void;
  onRemove: () => void;
}> = ({ image, onDownload, onRemove }) => {
  const compressionRatio = image.processedSize
    ? getCompressionRatio(image.originalSize, image.processedSize)
    : 0;

  const { generateImageHash, isImagePaid } = usePayment();
  const imageHash = generateImageHash(image);
  const isPaid = isImagePaid(imageHash);

  return (
    <Card className="gradient-secondary border-border/50 hover:border-primary/30 transition-all duration-300 group">
      <CardContent className="p-4">
        <div className="flex flex-col items-center mb-3">
          {/* Preview da imagem */}
          <div className="w-24 h-24 rounded-md overflow-hidden mb-2 border border-border/30 bg-muted flex items-center justify-center">
            <img
              src={URL.createObjectURL(image.file)}
              alt={image.file.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <StatusIcon status={image.status} />
            <span className="font-medium truncate text-sm">
              {image.file.name}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Tamanho original:</span>
            <span>{formatFileSize(image.originalSize)}</span>
          </div>

          <div className="flex justify-between">
            <span>Dimensões originais:</span>
            <span>
              {image.originalDimensions.width} ×{" "}
              {image.originalDimensions.height}
            </span>
          </div>

          {image.processedSize && (
            <>
              <div className="flex justify-between">
                <span>Tamanho processado:</span>
                <span className="text-green-400">
                  {formatFileSize(image.processedSize)}
                </span>
              </div>

              {image.processedDimensions && (
                <div className="flex justify-between">
                  <span>Dimensões processadas:</span>
                  <span>
                    {image.processedDimensions.width} ×{" "}
                    {image.processedDimensions.height}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span>Compressão:</span>
                <Badge
                  variant={compressionRatio > 50 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {compressionRatio}% menor
                </Badge>
              </div>
            </>
          )}
        </div>

        {image.status === "processing" && (
          <div className="mt-3">
            <Progress value={50} className="h-2" />
          </div>
        )}

        {image.status === "completed" && (
          <div className="mt-3 space-y-2">
            {isPaid ? (
              <Button
                onClick={onDownload}
                variant="accent"
                size="sm"
                className="w-full"
              >
                <CheckCircle2 className="mr-2 w-4 h-4" />
                Baixar (Pago)
              </Button>
            ) : (
              <Button
                onClick={onDownload}
                variant="default"
                size="sm"
                className="w-full"
              >
                <CreditCard className="mr-2 w-4 h-4" />
                Pagar e Baixar
              </Button>
            )}
            {isPaid && (
              <Badge
                variant="secondary"
                className="w-full justify-center text-xs"
              >
                ✓ Já pago
              </Badge>
            )}
          </div>
        )}

        {image.status === "error" && (
          <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
            Erro ao processar imagem
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ImageList: React.FC<ImageListProps> = ({
  images,
  onDownload,
  onDownloadAll,
  onRemove,
  onClearAll,
}) => {
  const completedImages = images.filter((img) => img.status === "completed");
  const hasImages = images.length > 0;

  if (!hasImages) {
    return (
      <Card className="gradient-secondary border-border/50">
        <CardContent className="p-8 text-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nenhuma imagem carregada ainda
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          Imagens ({images.length})
        </h3>
        <div className="flex gap-2">
          {completedImages.length > 0 && (
            <Button onClick={onDownloadAll} variant="accent" size="sm">
              <DownloadCloud className="mr-2 w-4 h-4" />
              Baixar Todas ({completedImages.length})
            </Button>
          )}
          <Button onClick={onClearAll} variant="outline" size="sm">
            Limpar Todas
          </Button>
        </div>
      </div>

      {/* Lista de imagens em grid 4 colunas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
        {images.slice(0, 16).map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            onDownload={() => onDownload(image)}
            onRemove={() => onRemove(image.id)}
          />
        ))}
      </div>

      {images.length > 16 && (
        <div className="text-center p-2 text-sm text-muted-foreground bg-muted/20 rounded border">
          Mostrando 16 de {images.length} imagens. Use "Limpar Todas" para
          remover algumas.
        </div>
      )}
    </div>
  );
};
