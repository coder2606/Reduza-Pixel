import React from "react";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
export const Header: React.FC = () => {
  return (
    <header className="relative border-b border-border/50 bg-gradient-secondary backdrop-blur-sm overflow-hidden">
      {/* Background image com overlay */}
      <div
        className="absolute inset-0 opacity-10 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${heroBg})`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-background/60" />

      <div className="relative container mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1">
              <img
                src="/images/logo_white.png"
                alt="PixelShaper"
                className="h-12 w-auto"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-accent/10 border border-accent/20">
              <span className="text-sm font-medium text-accent">
                10MZN/Foto - Pagamento Facil (M-pesa)
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
