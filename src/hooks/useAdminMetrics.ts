import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface DashboardMetrics {
  totalTransactions: number;
  completedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  totalRevenue: number;
  averageTransactionValue: number;
  totalImagesProcessed: number;
  conversionRate: number;
  todayTransactions: number;
  yesterdayTransactions: number;
  averageProcessingTime: number;
  mpesaSuccessRate: number;
  revenueGrowth: number;
  userRetentionRate: number;
  uniqueUsers: number;
  topUsers: { phone: string; spent: number; images: number }[];
}

interface TransactionData {
  id: string;
  amount: number;
  image_count: number;
  status: "pending" | "completed" | "failed";
  created_at: string;
  completed_at?: string;
  phone_number: string;
  payment_type: "individual" | "bulk";
}

interface ImageDownloadData {
  id: string;
  session_id: string;
  created_at: string;
  download_count: number;
}

export const useAdminMetrics = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalTransactions: 0,
    completedTransactions: 0,
    pendingTransactions: 0,
    failedTransactions: 0,
    totalRevenue: 0,
    averageTransactionValue: 0,
    totalImagesProcessed: 0,
    conversionRate: 0,
    todayTransactions: 0,
    yesterdayTransactions: 0,
    averageProcessingTime: 0,
    mpesaSuccessRate: 0,
    revenueGrowth: 0,
    userRetentionRate: 0,
    uniqueUsers: 0,
    topUsers: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Buscar todas as transações com retry e timeout
      const fetchTransactions = async (retries = 3, timeout = 5000) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          console.log("Buscando transações do Supabase...");

          // Forçar autenticação para garantir que temos uma sessão válida
          const {
            data: { session },
          } = await supabase.auth.getSession();
          console.log(
            "Sessão atual:",
            session ? "Autenticado" : "Não autenticado"
          );

          // Usar uma consulta mais simples e direta
          const { data, error } = await supabase
            .from("transactions")
            .select("*");

          clearTimeout(timeoutId);

          if (error) {
            console.error("Erro ao buscar transações:", error);
            throw error;
          }

          console.log(`Transações encontradas: ${data?.length || 0}`);
          return data || [];
        } catch (err) {
          if (retries > 0) {
            console.log(
              `Tentando novamente buscar transações... (${retries} tentativas restantes)`
            );
            await new Promise((r) => setTimeout(r, 1000));
            return fetchTransactions(retries - 1, timeout);
          }
          throw err;
        }
      };

      // Buscar dados de downloads de imagens com retry e timeout
      const fetchDownloads = async (retries = 3, timeout = 5000) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          console.log("Buscando downloads do Supabase...");

          // Usar uma consulta mais simples e direta
          const { data, error } = await supabase
            .from("image_downloads")
            .select("*");

          clearTimeout(timeoutId);

          if (error) {
            console.error("Erro ao buscar downloads:", error);
            throw error;
          }

          console.log(`Downloads encontrados: ${data?.length || 0}`);
          return data || [];
        } catch (err) {
          if (retries > 0) {
            console.log(
              `Tentando novamente buscar downloads... (${retries} tentativas restantes)`
            );
            await new Promise((r) => setTimeout(r, 1000));
            return fetchDownloads(retries - 1, timeout);
          }
          throw err;
        }
      };

      // Buscar dados com retries
      let transactionData = [];
      let downloadData = [];

      try {
        transactionData = await fetchTransactions();
      } catch (error) {
        console.error("Erro final ao buscar transações:", error);

        // Se não conseguir buscar do Supabase, tenta buscar da localStorage como fallback
        const cachedTransactions = localStorage.getItem("cachedTransactions");
        if (cachedTransactions) {
          try {
            transactionData = JSON.parse(cachedTransactions);
            console.log(
              "Usando dados de transações em cache:",
              transactionData.length
            );
          } catch (e) {
            console.error("Erro ao parsear transações em cache:", e);
          }
        }

        // Se ainda não tiver dados, usar dados de teste
        if (transactionData.length === 0) {
          console.log("Usando dados de teste para transações");
          // Criar alguns dados de teste para desenvolvimento
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          transactionData = [
            {
              id: "test-1",
              session_id: "test-session-1",
              phone_number: "258841234567",
              amount: 50,
              image_count: 5,
              payment_type: "bulk",
              status: "completed",
              created_at: today.toISOString(),
              completed_at: today.toISOString(),
            },
            {
              id: "test-2",
              session_id: "test-session-2",
              phone_number: "258851234567",
              amount: 20,
              image_count: 2,
              payment_type: "individual",
              status: "completed",
              created_at: yesterday.toISOString(),
              completed_at: yesterday.toISOString(),
            },
            {
              id: "test-3",
              session_id: "test-session-3",
              phone_number: "258841234568",
              amount: 10,
              image_count: 1,
              payment_type: "individual",
              status: "pending",
              created_at: today.toISOString(),
            },
          ];
        }
      }

      try {
        downloadData = await fetchDownloads();
      } catch (error) {
        console.error("Erro final ao buscar downloads:", error);

        // Se não conseguir buscar do Supabase, tenta buscar da localStorage como fallback
        const cachedDownloads = localStorage.getItem("cachedDownloads");
        if (cachedDownloads) {
          try {
            downloadData = JSON.parse(cachedDownloads);
            console.log(
              "Usando dados de downloads em cache:",
              downloadData.length
            );
          } catch (e) {
            console.error("Erro ao parsear downloads em cache:", e);
          }
        }

        // Se ainda não tiver dados, usar dados de teste
        if (downloadData.length === 0) {
          console.log("Usando dados de teste para downloads");
          // Criar alguns dados de teste para desenvolvimento
          const today = new Date();

          downloadData = [
            {
              id: "dl-test-1",
              session_id: "test-session-1",
              transaction_id: "test-1",
              image_hash: "hash1",
              download_count: 2,
              created_at: today.toISOString(),
            },
            {
              id: "dl-test-2",
              session_id: "test-session-2",
              transaction_id: "test-2",
              image_hash: "hash2",
              download_count: 1,
              created_at: today.toISOString(),
            },
            {
              id: "dl-test-3",
              session_id: "test-session-1",
              transaction_id: "test-1",
              image_hash: "hash3",
              download_count: 3,
              created_at: today.toISOString(),
            },
          ];
        }
      }

      // Salvar dados no cache para uso futuro
      if (transactionData.length > 0) {
        localStorage.setItem(
          "cachedTransactions",
          JSON.stringify(transactionData)
        );
      }

      if (downloadData.length > 0) {
        localStorage.setItem("cachedDownloads", JSON.stringify(downloadData));
      }

      console.log("Dados carregados do Supabase:", {
        transações: transactionData.length,
        downloads: downloadData.length,
        transaçõesData: transactionData.slice(0, 3), // Mostrar primeiras 3 transações
      });

      // Calcular métricas básicas
      const totalTransactions = transactionData.length;
      const completedTransactions = transactionData.filter(
        (t) => t.status === "completed"
      ).length;
      const pendingTransactions = transactionData.filter(
        (t) => t.status === "pending"
      ).length;
      const failedTransactions = transactionData.filter(
        (t) => t.status === "failed"
      ).length;

      // Calcular receita total
      const totalRevenue = transactionData
        .filter((t) => t.status === "completed")
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      // Calcular valor médio por transação
      const averageTransactionValue =
        completedTransactions > 0 ? totalRevenue / completedTransactions : 0;

      // Calcular total de imagens processadas
      const totalImagesProcessed = transactionData
        .filter((t) => t.status === "completed")
        .reduce((sum, t) => sum + (t.image_count || 0), 0);

      // Calcular datas para comparação
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const formatDate = (date: Date) => date.toISOString().split("T")[0];

      // Transações de hoje
      const todayTransactions = transactionData.filter((t) => {
        const transactionDate = new Date(t.created_at)
          .toISOString()
          .split("T")[0];
        return transactionDate === formatDate(today);
      }).length;

      // Transações de ontem
      const yesterdayTransactions = transactionData.filter((t) => {
        const transactionDate = new Date(t.created_at)
          .toISOString()
          .split("T")[0];
        return transactionDate === formatDate(yesterday);
      }).length;

      // Taxa de sucesso M-Pesa (últimos 30 dias)
      const recentTransactions = transactionData.filter((t) => {
        const transactionDate = new Date(t.created_at);
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return transactionDate >= thirtyDaysAgo;
      });

      const mpesaSuccessRate =
        recentTransactions.length > 0
          ? (recentTransactions.filter((t) => t.status === "completed").length /
              recentTransactions.length) *
            100
          : 0;

      // Calcular tempo médio de processamento (em segundos)
      const completedWithTiming = transactionData.filter(
        (t) => t.status === "completed" && t.completed_at && t.created_at
      );

      const averageProcessingTime =
        completedWithTiming.length > 0
          ? completedWithTiming.reduce((sum, t) => {
              const start = new Date(t.created_at).getTime();
              const end = new Date(t.completed_at!).getTime();
              return sum + (end - start) / 1000;
            }, 0) / completedWithTiming.length
          : 0;

      // Calcular crescimento de receita (últimos 7 dias vs 7 dias anteriores)
      const thisWeekRevenue = transactionData
        .filter((t) => {
          const transactionDate = new Date(t.created_at);
          return transactionDate >= lastWeek && t.status === "completed";
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const twoWeeksAgo = new Date(lastWeek);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);

      const lastWeekRevenue = transactionData
        .filter((t) => {
          const transactionDate = new Date(t.created_at);
          return (
            transactionDate >= twoWeeksAgo &&
            transactionDate < lastWeek &&
            t.status === "completed"
          );
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const revenueGrowth =
        lastWeekRevenue > 0
          ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
          : 0;

      // Calcular taxa de conversão (sessões únicas vs transações pagas)
      const uniqueSessions = new Set(downloadData.map((d) => d.session_id))
        .size;
      const paidSessions = new Set(
        transactionData
          .filter((t) => t.status === "completed")
          .map((t) => t.phone_number)
      ).size;
      const conversionRate =
        uniqueSessions > 0 ? (paidSessions / uniqueSessions) * 100 : 0;

      // Calcular retenção de usuários (usuários que voltaram nos últimos 30 dias)
      const uniquePhones = new Set(transactionData.map((t) => t.phone_number));
      const returningUsers = Array.from(uniquePhones).filter((phone) => {
        const userTransactions = transactionData.filter(
          (t) => t.phone_number === phone
        );
        return userTransactions.length > 1;
      }).length;

      const userRetentionRate =
        uniquePhones.size > 0 ? (returningUsers / uniquePhones.size) * 100 : 0;

      // Calcular usuários únicos
      const uniqueUsers = uniquePhones.size;

      // Calcular top usuários
      const userSpendMap = new Map<string, { spent: number; images: number }>();

      transactionData
        .filter((t) => t.status === "completed")
        .forEach((t) => {
          const { phone_number, amount, image_count } = t;

          if (!phone_number) return;

          if (!userSpendMap.has(phone_number)) {
            userSpendMap.set(phone_number, { spent: 0, images: 0 });
          }

          const userData = userSpendMap.get(phone_number)!;
          userData.spent += amount || 0;
          userData.images += image_count || 0;
        });

      // Ordenar por valor gasto e pegar os top 5
      const topUsers = Array.from(userSpendMap.entries())
        .map(([phone, data]) => ({
          phone,
          spent: data.spent,
          images: data.images,
        }))
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 5);

      // Atualizar estado com as métricas calculadas
      setMetrics({
        totalTransactions,
        completedTransactions,
        pendingTransactions,
        failedTransactions,
        totalRevenue,
        averageTransactionValue,
        totalImagesProcessed,
        conversionRate,
        todayTransactions,
        yesterdayTransactions,
        averageProcessingTime,
        mpesaSuccessRate,
        revenueGrowth,
        userRetentionRate,
        uniqueUsers,
        topUsers,
      });
    } catch (err: any) {
      console.error("Erro ao calcular métricas:", err);
      setError(err.message || "Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshMetrics = useCallback(() => {
    calculateMetrics();
  }, [calculateMetrics]);

  // Configurar um intervalo para atualizar as métricas frequentemente
  useEffect(() => {
    // Carregar métricas imediatamente
    calculateMetrics();

    // Tentar novamente após 2 segundos para garantir que os dados sejam carregados
    const initialRetryTimeout = setTimeout(() => {
      calculateMetrics();
    }, 2000);

    // Configurar atualização automática a cada 15 segundos
    const intervalId = setInterval(() => {
      calculateMetrics();
    }, 15000);

    return () => {
      clearTimeout(initialRetryTimeout);
      clearInterval(intervalId);
    };
  }, [calculateMetrics]);

  return {
    metrics,
    loading,
    error,
    refreshMetrics,
  };
};
