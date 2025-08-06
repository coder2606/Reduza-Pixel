import { supabase } from "@/lib/supabase";

export interface AuthUser {
  id: string;
  email: string;
  loginTime: string;
}

export const loginUser = async (email: string, password: string) => {
  try {
    // Tentar login direto primeiro
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      console.error("Erro de login:", error);
      throw error;
    }

    if (data?.user) {
      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || email,
        loginTime: new Date().toISOString(),
      };

      // Salvar no localStorage
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("adminUser", JSON.stringify(authUser));

      return { user: authUser, session: data.session };
    }

    throw new Error("Dados de usuário não encontrados");
  } catch (error: any) {
    console.error("Erro durante login:", error);

    // Mensagens de erro mais específicas
    if (error.message?.includes("Invalid login credentials")) {
      throw new Error("Credenciais inválidas. Verifique o email e senha.");
    } else if (error.message?.includes("Email not confirmed")) {
      throw new Error("Email não confirmado. Verifique sua caixa de entrada.");
    } else if (
      error.message?.includes("Email link is invalid or has expired")
    ) {
      throw new Error("Link de verificação expirado. Solicite um novo.");
    } else if (error.message?.includes("disabled")) {
      throw new Error("Login por email está temporariamente desabilitado.");
    } else if (error.message?.includes("Too many requests")) {
      throw new Error(
        "Muitas tentativas de login. Tente novamente em alguns minutos."
      );
    }

    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await supabase.auth.signOut();
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("adminUser");
  } catch (error) {
    console.error("Erro durante logout:", error);
    // Mesmo com erro, limpar localStorage
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("adminUser");
  }
};

export const getCurrentUser = (): AuthUser | null => {
  try {
    const userString = localStorage.getItem("adminUser");
    if (userString) {
      return JSON.parse(userString);
    }
  } catch (error) {
    console.error("Erro ao recuperar usuário:", error);
  }
  return null;
};

export const isAuthenticated = (): boolean => {
  return localStorage.getItem("isAuthenticated") === "true";
};

export const checkAuthSession = async (): Promise<boolean> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);
    return false;
  }
};

export const resetPassword = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/letsgo?reset=true`,
    });

    if (error) {
      console.error("Erro na recuperação de senha:", error);

      if (error.message?.includes("Email not found")) {
        throw new Error("Email não encontrado no sistema.");
      } else if (error.message?.includes("Email rate limit exceeded")) {
        throw new Error(
          "Limite de emails excedido. Tente novamente em alguns minutos."
        );
      }

      throw error;
    }

    return true;
  } catch (error: any) {
    console.error("Erro durante recuperação:", error);
    throw error;
  }
};
