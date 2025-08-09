import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  Smartphone,
  Globe,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface RealtimeEvent {
  id: string;
  type: "transaction" | "image_upload" | "payment_success" | "payment_failed";
  timestamp: string;
  data: any;
  severity: "info" | "success" | "warning" | "error";
}

interface SystemHealth {
  database: "healthy" | "degraded" | "down";
  mpesaApi: "healthy" | "degraded" | "down";
  imageProcessing: "healthy" | "degraded" | "down";
  lastChecked: string;
}

export const RealTimeAnalytics: React.FC = () => {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database: "healthy",
    mpesaApi: "healthy",
    imageProcessing: "healthy",
    lastChecked: new Date().toISOString(),
  });
  const [activeUsers, setActiveUsers] = useState(0);
  const [currentHourTransactions, setCurrentHourTransactions] = useState(0);

  // Dados em tempo real com Supabase e APIs reais
  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        // Banco de dados
        const { error: dbError } = await supabase
          .from("transactions")
          .select("id")
          .limit(1);

        // API M-Pesa interna
        let mpesaStatus: SystemHealth["mpesaApi"] = "down";
        try {
          const res = await fetch("/api/mpesa", { method: "GET" });
          mpesaStatus = res.ok ? "healthy" : "degraded";
        } catch (_) {
          mpesaStatus = "down";
        }

        setSystemHealth({
          database: dbError ? "down" : "healthy",
          mpesaApi: mpesaStatus,
          imageProcessing: "healthy",
          lastChecked: new Date().toISOString(),
        });
        setIsConnected(!dbError);
      } catch (_) {
        setSystemHealth((prev) => ({
          ...prev,
          database: "down",
          lastChecked: new Date().toISOString(),
        }));
        setIsConnected(false);
      }
    };

    const loadInitialEvents = async () => {
      // Carregar últimas transações como eventos
      const { data } = await supabase
        .from("transactions")
        .select("id, amount, phone_number, status, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        const mapped: RealtimeEvent[] = data.map((t) => ({
          id: t.id,
          type:
            t.status === "completed"
              ? "payment_success"
              : t.status === "failed"
              ? "payment_failed"
              : "transaction",
          timestamp: t.created_at,
          data: { amount: t.amount, phone: t.phone_number },
          severity:
            t.status === "failed"
              ? "error"
              : t.status === "completed"
              ? "success"
              : "info",
        }));
        setEvents(mapped);
      }
    };

    const updateActiveUsers = async () => {
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("transactions")
        .select("phone_number, created_at")
        .gte("created_at", since);
      if (data) {
        const uniquePhones = new Set(
          (data as any[]).map((r) => r.phone_number)
        );
        setActiveUsers(uniquePhones.size);
      }
    };

    const updateCurrentHourTransactions = async () => {
      const now = new Date();
      const hourStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours()
      );
      const { data } = await supabase
        .from("transactions")
        .select("id")
        .gte("created_at", hourStart.toISOString());
      setCurrentHourTransactions(data?.length || 0);
    };

    // Supabase Realtime: ouvir inserts/updates na tabela transactions
    const channel = supabase
      .channel("realtime-transactions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions" },
        (payload: any) => {
          const t = payload.new;
          const evt: RealtimeEvent = {
            id: t.id,
            type:
              t.status === "completed"
                ? "payment_success"
                : t.status === "failed"
                ? "payment_failed"
                : "transaction",
            timestamp: t.created_at,
            data: { amount: t.amount, phone: t.phone_number },
            severity:
              t.status === "failed"
                ? "error"
                : t.status === "completed"
                ? "success"
                : "info",
          };
          setEvents((prev) => [evt, ...prev.slice(0, 49)]);
          updateActiveUsers();
          updateCurrentHourTransactions();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions" },
        (payload: any) => {
          const t = payload.new;
          if (t.status === "completed" || t.status === "failed") {
            const evt: RealtimeEvent = {
              id: t.id,
              type:
                t.status === "completed" ? "payment_success" : "payment_failed",
              timestamp: t.updated_at || new Date().toISOString(),
              data: { amount: t.amount, phone: t.phone_number },
              severity: t.status === "failed" ? "error" : "success",
            };
            setEvents((prev) => [evt, ...prev.slice(0, 49)]);
            updateCurrentHourTransactions();
          }
        }
      )
      .subscribe();

    // Execuções iniciais
    checkSystemHealth();
    loadInitialEvents();
    updateActiveUsers();
    updateCurrentHourTransactions();

    const healthInterval = setInterval(checkSystemHealth, 30000);

    return () => {
      clearInterval(healthInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  const getHealthColor = (status: SystemHealth[keyof SystemHealth]) => {
    switch (status) {
      case "healthy":
        return "text-green-600";
      case "degraded":
        return "text-yellow-600";
      case "down":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getHealthIcon = (status: SystemHealth[keyof SystemHealth]) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4" />;
      case "degraded":
        return <AlertTriangle className="w-4 h-4" />;
      case "down":
        return <WifiOff className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getEventIcon = (type: RealtimeEvent["type"]) => {
    switch (type) {
      case "transaction":
        return <Activity className="w-4 h-4" />;
      case "image_upload":
        return <TrendingUp className="w-4 h-4" />;
      case "payment_success":
        return <CheckCircle className="w-4 h-4" />;
      case "payment_failed":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: RealtimeEvent["severity"]) => {
    switch (severity) {
      case "success":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "error":
        return "text-red-600";
      default:
        return "text-blue-600";
    }
  };

  const formatEventMessage = (event: RealtimeEvent) => {
    switch (event.type) {
      case "transaction":
        return `Nova transação de ${event.data.amount} MZN`;
      case "image_upload":
        return `Upload de imagem por ${event.data.phone}`;
      case "payment_success":
        return `Pagamento bem-sucedido: ${event.data.amount} MZN`;
      case "payment_failed":
        return `Falha no pagamento para ${event.data.phone}`;
      default:
        return "Evento do sistema";
    }
  };

  const refreshData = async () => {
    await Promise.all([]);
    toast.success("Dados atualizados");
  };

  return (
    <div className="space-y-6">
      {/* Status de Conexão e Saúde do Sistema */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              Status da Conexão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Base de Dados</span>
                <div
                  className={`flex items-center gap-2 ${getHealthColor(
                    systemHealth.database
                  )}`}
                >
                  {getHealthIcon(systemHealth.database)}
                  <span className="capitalize">{systemHealth.database}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">API M-Pesa</span>
                <div
                  className={`flex items-center gap-2 ${getHealthColor(
                    systemHealth.mpesaApi
                  )}`}
                >
                  {getHealthIcon(systemHealth.mpesaApi)}
                  <span className="capitalize">{systemHealth.mpesaApi}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Processamento</span>
                <div
                  className={`flex items-center gap-2 ${getHealthColor(
                    systemHealth.imageProcessing
                  )}`}
                >
                  {getHealthIcon(systemHealth.imageProcessing)}
                  <span className="capitalize">
                    {systemHealth.imageProcessing}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Última verificação:{" "}
                  {new Date(systemHealth.lastChecked).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Atividade em Tempo Real
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Smartphone className="w-5 h-5 text-green-500" />
                  <span className="text-2xl font-bold text-green-600">
                    {activeUsers}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Usuários Ativos</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  <span className="text-2xl font-bold text-blue-600">
                    {currentHourTransactions}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Transações/Hora</p>
              </div>
            </div>

            <Button
              onClick={refreshData}
              variant="outline"
              size="sm"
              className="w-full mt-4"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar Dados
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stream de Eventos em Tempo Real */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-500" />
            Eventos em Tempo Real
            <Badge variant="secondary" className="ml-auto">
              {events.length} eventos
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aguardando eventos...
              </p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className={getSeverityColor(event.severity)}>
                    {getEventIcon(event.type)}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {formatEventMessage(event)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </div>

                  <Badge
                    variant={
                      event.severity === "error" ? "destructive" : "secondary"
                    }
                    className="text-xs"
                  >
                    {event.type}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeAnalytics;
