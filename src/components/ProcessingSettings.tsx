import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings, Zap, FileImage, Monitor } from "lucide-react";
import { ProcessingOptions } from "@/hooks/useImageProcessor";

interface ProcessingSettingsProps {
  options: ProcessingOptions;
  onOptionsChange: (options: ProcessingOptions) => void;
  onProcess: () => void;
  disabled?: boolean;
  hasImages?: boolean;
}

const fileSizeOptions = [
  { value: 50, label: "50 KB" },
  { value: 100, label: "100 KB" },
  { value: 200, label: "200 KB" },
  { value: 250, label: "250 KB" },
  { value: 500, label: "500 KB" },
  { value: 1024, label: "1 MB" },
  { value: 2048, label: "2 MB" },
];

const dimensionOptions = [
  { value: 320, label: "320px" },
  { value: 640, label: "640px" },
  { value: 800, label: "800px" },
  { value: 1024, label: "1024px" },
  { value: 1280, label: "1280px" },
  { value: 1600, label: "1600px" },
  { value: 1920, label: "1920px" },
  { value: 2048, label: "2048px" },
];

const qualityOptions = [
  { value: 0.6, label: "Baixa (Menor tamanho)" },
  { value: 0.8, label: "Média (Balanceada)" },
  { value: 0.9, label: "Alta (Melhor qualidade)" },
  { value: 1.0, label: "Máxima (Original)" },
];

const formatOptions = [
  { value: "original", label: "Manter formato original" },
  { value: "webp", label: "WebP (Melhor compressão)" },
  { value: "jpeg", label: "JPEG (Compatível)" },
  { value: "png", label: "PNG (Sem perda)" },
];

export const ProcessingSettings: React.FC<ProcessingSettingsProps> = ({
  options,
  onOptionsChange,
  onProcess,
  disabled = false,
  hasImages = false,
}) => {
  const handleChange = (
    key: keyof ProcessingOptions,
    value: number | string
  ) => {
    onOptionsChange({ ...options, [key]: value });
  };

  return (
    <Card className="gradient-secondary border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Settings className="w-5 h-5 text-primary" />
          Configurações de Processamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Grid 2 colunas para seletores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tamanho máximo do arquivo */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium h-5">
              <FileImage className="w-4 h-4 text-accent" />
              Tamanho máximo do arquivo
            </Label>
            <Select
              value={options.maxFileSize.toString()}
              onValueChange={(value) =>
                handleChange("maxFileSize", parseInt(value))
              }
              disabled={disabled}
            >
              <SelectTrigger className="bg-card border-border hover:border-primary/50 transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fileSizeOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value.toString()}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dimensão máxima */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium h-5">
              <Monitor className="w-4 h-4 text-accent" />
              Redimensionamento máximo
            </Label>
            <Select
              value={options.maxDimension.toString()}
              onValueChange={(value) =>
                handleChange("maxDimension", parseInt(value))
              }
              disabled={disabled}
            >
              <SelectTrigger className="bg-card border-border hover:border-primary/50 transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dimensionOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value.toString()}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Qualidade */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium h-5">
              <Zap className="w-4 h-4 text-accent" />
              Qualidade da compressão
            </Label>
            <Select
              value={options.quality.toString()}
              onValueChange={(value) =>
                handleChange("quality", parseFloat(value))
              }
              disabled={disabled}
            >
              <SelectTrigger className="bg-card border-border hover:border-primary/50 transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {qualityOptions.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value.toString()}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Formato de saída */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium h-5">
              <FileImage className="w-4 h-4 text-accent" />
              Formato de saída
            </Label>
            <Select
              value={options.outputFormat}
              onValueChange={(value) => handleChange("outputFormat", value)}
              disabled={disabled}
            >
              <SelectTrigger className="bg-card border-border hover:border-primary/50 transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {formatOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botão de processar */}
        <Button
          onClick={onProcess}
          disabled={disabled || !hasImages}
          variant="premium"
          size="lg"
          className="w-full"
        >
          <Zap className="mr-2 w-5 h-5" />
          {disabled ? "Processando..." : "Processar Imagens"}
        </Button>
      </CardContent>
    </Card>
  );
};
