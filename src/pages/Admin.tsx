import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminDashboard from "@/components/admin/AdminDashboard";
import RealTimeAnalytics from "@/components/admin/RealTimeAnalytics";
import ConfigurationPanel from "@/components/admin/ConfigurationPanel";
import UserAnalyticsPanel from "@/components/admin/UserAnalyticsPanel";
import { SecuritySettings } from "@/components/admin/SecuritySettings";
import { useAdminMetrics } from "@/hooks/useAdminMetrics";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Shield,
  LogOut,
  CreditCard,
  TrendingUp,
  Users,
  Download,
  Search,
  Eye,
  Filter,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { checkAuthSession, logoutUser } from "@/utils/auth";

interface Transaction {
  id: string;
  session_id: string;
  phone_number: string;
  amount: number;
  image_count: number;
  payment_type: "individual" | "bulk";
  status: "pending" | "completed" | "failed";
  mpesa_transaction_id?: string;
  mpesa_conversation_id?: string;
  created_at: string;
  completed_at?: string;
  // Campos adicionais para desconto
  original_amount?: number;
  discount_amount?: number;
  coupon_code?: string;
  discount_percent?: number;
}

const Admin: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const navigate = useNavigate();

  // Usar o hook de métricas avançadas
  const {
    metrics,
    loading: metricsLoading,
    error: metricsError,
    refreshMetrics,
  } = useAdminMetrics();

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await checkAuthSession();
      if (!isAuth) {
        navigate("/letsgo");
      }
    };
    checkAuth();
  }, [navigate]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Carregar apenas transações para a tabela
      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (transactionError) throw transactionError;

      setTransactions(transactionData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do painel");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/letsgo");
      toast.success("Logout realizado com sucesso");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast.error("Erro ao fazer logout");
    }
  };

  // Carregar dados
  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Concluído
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Pendente
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Falhou
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-MZ", {
      style: "currency",
      currency: "MZN",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  // Filtrar transações
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch =
      transaction.phone_number.includes(searchTerm) ||
      transaction.mpesa_transaction_id?.includes(searchTerm) ||
      transaction.id.includes(searchTerm);

    const matchesStatus =
      statusFilter === "all" || transaction.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (metricsLoading && loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p>Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Painel Administrativo</h1>
              <p className="text-sm text-muted-foreground">
                PixelShaper - Gestão de Pagamentos
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/")} size="sm">
              <Download className="w-4 h-4 mr-2" />
              Ir para App
            </Button>
            <Button variant="destructive" onClick={handleLogout} size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
            <TabsTrigger value="security">Segurança</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {metricsError ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center text-red-600">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                    <p>Erro ao carregar métricas: {metricsError}</p>
                    <Button
                      onClick={refreshMetrics}
                      variant="outline"
                      className="mt-4"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <AdminDashboard metrics={metrics} loading={metricsLoading} />
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <RealTimeAnalytics />
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            {/* Filtros e Busca */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total de Transações
                    </p>
                    <p className="text-2xl font-bold">
                      {metrics.totalTransactions}
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Transações Concluídas
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {metrics.completedTransactions}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Receita Total
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(metrics.totalRevenue)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Imagens Processadas
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {metrics.totalImagesProcessed}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros e Busca
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por telefone, ID da transação..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="failed">Falhou</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de Transações */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Transações ({filteredTransactions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Imagens</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-mono text-sm">
                            {transaction.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>{transaction.phone_number}</TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(transaction.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {transaction.image_count}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(transaction.status)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(transaction.created_at)}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setSelectedTransaction(transaction)
                                  }
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>
                                    Detalhes da Transação
                                  </DialogTitle>
                                </DialogHeader>
                                {selectedTransaction && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-sm font-medium">
                                          ID da Transação
                                        </p>
                                        <p className="text-sm font-mono">
                                          {selectedTransaction.id}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">
                                          Status
                                        </p>
                                        {getStatusBadge(
                                          selectedTransaction.status
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">
                                          Telefone
                                        </p>
                                        <p className="text-sm">
                                          {selectedTransaction.phone_number}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">
                                          Valor Final
                                        </p>
                                        <p className="text-sm font-semibold">
                                          {formatCurrency(
                                            selectedTransaction.amount
                                          )}
                                        </p>
                                      </div>

                                      {/* Mostrar informações de desconto se houver */}
                                      {selectedTransaction.discount_amount &&
                                        selectedTransaction.discount_amount >
                                          0 && (
                                          <>
                                            <div>
                                              <p className="text-sm font-medium">
                                                Valor Original
                                              </p>
                                              <p className="text-sm text-muted-foreground">
                                                {formatCurrency(
                                                  selectedTransaction.original_amount ||
                                                    0
                                                )}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-sm font-medium">
                                                Desconto
                                              </p>
                                              <p className="text-sm text-green-600">
                                                -
                                                {formatCurrency(
                                                  selectedTransaction.discount_amount
                                                )}{" "}
                                                (
                                                {
                                                  selectedTransaction.discount_percent
                                                }
                                                %)
                                              </p>
                                            </div>
                                          </>
                                        )}

                                      {/* Mostrar cupom se houver */}
                                      {selectedTransaction.coupon_code && (
                                        <div>
                                          <p className="text-sm font-medium">
                                            Cupom Aplicado
                                          </p>
                                          <Badge
                                            variant="outline"
                                            className="bg-green-500/10 text-green-500"
                                          >
                                            {selectedTransaction.coupon_code}
                                          </Badge>
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-sm font-medium">
                                          Número de Imagens
                                        </p>
                                        <p className="text-sm">
                                          {selectedTransaction.image_count}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">
                                          Tipo de Pagamento
                                        </p>
                                        <p className="text-sm capitalize">
                                          {selectedTransaction.payment_type}
                                        </p>
                                      </div>
                                      {selectedTransaction.mpesa_transaction_id && (
                                        <div>
                                          <p className="text-sm font-medium">
                                            ID M-Pesa
                                          </p>
                                          <p className="text-sm font-mono">
                                            {
                                              selectedTransaction.mpesa_transaction_id
                                            }
                                          </p>
                                        </div>
                                      )}
                                      {selectedTransaction.mpesa_conversation_id && (
                                        <div>
                                          <p className="text-sm font-medium">
                                            Conversation ID
                                          </p>
                                          <p className="text-sm font-mono text-xs">
                                            {
                                              selectedTransaction.mpesa_conversation_id
                                            }
                                          </p>
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-sm font-medium">
                                          Data de Criação
                                        </p>
                                        <p className="text-sm">
                                          {formatDate(
                                            selectedTransaction.created_at
                                          )}
                                        </p>
                                      </div>
                                      {selectedTransaction.completed_at && (
                                        <div>
                                          <p className="text-sm font-medium">
                                            Data de Conclusão
                                          </p>
                                          <p className="text-sm">
                                            {formatDate(
                                              selectedTransaction.completed_at
                                            )}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredTransactions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma transação encontrada</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <UserAnalyticsPanel />
          </TabsContent>

          {/* Config Tab */}
          <TabsContent value="config" className="space-y-6">
            <ConfigurationPanel />
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <SecuritySettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
