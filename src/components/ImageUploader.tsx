import React, { useCallback, useState, useEffect } from "react";
import { Upload, Image as ImageIcon, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImageUploaderProps {
  onImagesAdded: (files: File[]) => void;
  disabled?: boolean;
  existingImages?: File[]; // Imagens já selecionadas
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImagesAdded,
  disabled = false,
  existingImages = [],
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewImages, setPreviewImages] = useState<
    { file: File; preview: string }[]
  >([]);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));

      if (imageFiles.length > 0) {
        // Verificar limite de 50 imagens
        const totalImages = previewImages.length + imageFiles.length;
        if (totalImages > 50) {
          alert(
            `Máximo de 50 imagens permitido. Você já tem ${previewImages.length} imagens selecionadas.`
          );
          return;
        }

        // Criar previews para as novas imagens
        const newPreviews = imageFiles.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
        }));

        setPreviewImages((prev) => [...prev, ...newPreviews]);
        onImagesAdded(imageFiles);
      }
    },
    [onImagesAdded, disabled]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        // Verificar limite de 50 imagens
        const totalImages = previewImages.length + files.length;
        if (totalImages > 50) {
          alert(
            `Máximo de 50 imagens permitido. Você já tem ${previewImages.length} imagens selecionadas.`
          );
          return;
        }

        // Criar previews para as novas imagens
        const newPreviews = files.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
        }));

        setPreviewImages((prev) => [...prev, ...newPreviews]);
        onImagesAdded(files);
      }

      // Reset input
      e.target.value = "";
    },
    [onImagesAdded, disabled]
  );

  const handleClick = useCallback(() => {
    if (disabled) return;

    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*";
    input.onchange = (e) => handleFileSelect(e as any);
    input.click();
  }, [handleFileSelect, disabled]);

  // Limpar URLs de preview quando o componente for desmontado
  useEffect(() => {
    return () => {
      previewImages.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [previewImages]);

  // Adicionar previews para imagens existentes
  useEffect(() => {
    if (existingImages && existingImages.length > 0) {
      const newPreviews = existingImages
        .filter((file) => !previewImages.some((p) => p.file.name === file.name))
        .map((file) => ({
          file,
          preview: URL.createObjectURL(file),
        }));

      if (newPreviews.length > 0) {
        setPreviewImages((prev) => [...prev, ...newPreviews]);
      }
    }
  }, [existingImages]);

  // Remover uma imagem da preview
  const removeImage = useCallback((index: number) => {
    setPreviewImages((prev) => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index].preview);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Removido o bloco de preview das imagens selecionadas */}
      {/* Área de upload */}
      <div
        className={cn(
          "upload-area cursor-pointer border-2 border-dashed border-primary/20 rounded-lg p-6 transition-all",
          isDragOver && "border-primary bg-primary/5",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 p-4 rounded-full bg-primary/10 border border-primary/20">
            {isDragOver ? (
              <Upload className="w-8 h-8 text-primary animate-bounce" />
            ) : (
              <Plus className="w-8 h-8 text-primary" />
            )}
          </div>

          <h3 className="text-xl font-semibold mb-2 text-foreground">
            {isDragOver ? "Solte as imagens aqui" : "Adicionar mais imagens"}
          </h3>

          <p className="text-muted-foreground mb-4 max-w-md">
            Suporta JPG, PNG, GIF, WebP e outros formatos. Máximo de 50 imagens
            por vez.
          </p>

          <Button
            variant="accent"
            size="lg"
            disabled={disabled}
            className="pointer-events-none"
          >
            <Upload className="mr-2 w-5 h-5" />
            Selecionar Imagens
          </Button>
        </div>
      </div>
    </div>
  );
};
