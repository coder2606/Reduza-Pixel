import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { authenticator } from "otplib";
import QRCode from "qrcode";

// Configurar o otplib para usar uma fonte de aleatoriedade compatível com o navegador
authenticator.options = {
  window: 30, // Janela de tempo de 30 segundos (aumentar para maior tolerância)
  digits: 6, // Código de 6 dígitos
  algorithm: "sha1",
  step: 30, // Tempo de validade de cada código em segundos
};

interface TwoFactorAuthState {
  isEnabled: boolean;
  isVerified: boolean;
  qrCodeUrl: string | null;
  secret: string | null;
  isLoading: boolean;
}

export const useTwoFactorAuth = () => {
  const [state, setState] = useState<TwoFactorAuthState>({
    isEnabled: false,
    isVerified: false,
    qrCodeUrl: null,
    secret: null,
    isLoading: true,
  });

  // Buscar status atual do 2FA
  const fetchTwoFactorStatus = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("admin_totp_secrets")
        .select("secret_key, verified")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      setState({
        isEnabled: !!data,
        isVerified: data?.verified || false,
        secret: data?.secret_key || null,
        qrCodeUrl: data?.secret_key
          ? await generateQRCode(data.secret_key, user.email || "")
          : null,
        isLoading: false,
      });
    } catch (error) {
      console.error("Erro ao buscar status 2FA:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Gerar QR Code
  const generateQRCode = async (
    secret: string,
    email: string
  ): Promise<string> => {
    // Usar formato otpauth mais compatível com Google Authenticator
    const otpauth = `otpauth://totp/Reduzir%20Pixel%20Admin:${encodeURIComponent(
      email
    )}?secret=${secret}&issuer=Reduzir%20Pixel&algorithm=SHA1&digits=6&period=30`;

    // Opções para melhorar a qualidade do QR code
    const qrOptions = {
      errorCorrectionLevel: "H", // Alta correção de erros
      margin: 1,
      scale: 8,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    };

    return await QRCode.toDataURL(otpauth, qrOptions);
  };

  // Ativar 2FA
  const setupTwoFactor = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuário não autenticado");

      // Gerar novo segredo usando uma abordagem compatível com o navegador
      // Gerar uma string aleatória de 20 caracteres base32
      const generateBrowserCompatibleSecret = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; // Caracteres base32
        let result = "";
        const randomValues = new Uint8Array(20);
        window.crypto.getRandomValues(randomValues);

        for (let i = 0; i < 20; i++) {
          result += chars.charAt(randomValues[i] % chars.length);
        }

        return result;
      };

      const secret = generateBrowserCompatibleSecret();

      // Salvar no banco
      const { error } = await supabase.from("admin_totp_secrets").upsert({
        user_id: user.id,
        secret_key: secret,
        verified: false,
      });

      if (error) throw error;

      const qrCodeUrl = await generateQRCode(secret, user.email || "");

      setState({
        isEnabled: true,
        isVerified: false,
        secret,
        qrCodeUrl,
        isLoading: false,
      });

      return { secret, qrCodeUrl };
    } catch (error) {
      console.error("Erro ao configurar 2FA:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, []);

  // Verificar código 2FA
  const verifyTwoFactorCode = useCallback(
    async (code: string): Promise<boolean> => {
      if (!state.secret) return false;

      try {
        // Limpar o código (remover espaços e outros caracteres não numéricos)
        const cleanedCode = code.replace(/\D/g, "");

        if (cleanedCode.length !== 6) {
          
          return false;
        }

        console.log(
          "Verificando código:",
          cleanedCode,
          "com segredo:",
          state.secret
        );

        // Verificar se o código é válido com janela de tempo maior para desenvolvimento
        const isValid = authenticator.verify({
          token: cleanedCode,
          secret: state.secret,
        });

        

        if (!isValid) return false;

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("Usuário não autenticado");

        // Atualizar status para verificado
        if (!state.isVerified) {
          const { error } = await supabase
            .from("admin_totp_secrets")
            .update({ verified: true })
            .eq("user_id", user.id);

          if (error) throw error;

          setState((prev) => ({ ...prev, isVerified: true }));
        }

        return true;
      } catch (error) {
        console.error("Erro ao verificar código 2FA:", error);
        return false;
      }
    },
    [state.secret, state.isVerified]
  );

  // Desativar 2FA
  const disableTwoFactor = useCallback(
    async (code: string): Promise<boolean> => {
      if (!state.secret) return false;

      try {
        // Verificar código antes de desativar
        const isValid = await verifyTwoFactorCode(code);

        if (!isValid) return false;

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("Usuário não autenticado");

        // Remover registro
        const { error } = await supabase
          .from("admin_totp_secrets")
          .delete()
          .eq("user_id", user.id);

        if (error) throw error;

        setState({
          isEnabled: false,
          isVerified: false,
          secret: null,
          qrCodeUrl: null,
          isLoading: false,
        });

        return true;
      } catch (error) {
        console.error("Erro ao desativar 2FA:", error);
        return false;
      }
    },
    [state.secret, verifyTwoFactorCode]
  );

  return {
    ...state,
    fetchTwoFactorStatus,
    setupTwoFactor,
    verifyTwoFactorCode,
    disableTwoFactor,
  };
};
