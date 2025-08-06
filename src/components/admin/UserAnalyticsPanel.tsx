import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  Users,
  Search,
  Phone,
  User,
  FileBarChart,
  Image as ImageIcon,
  CreditCard,
  Calendar,
  Loader2,
  BarChart3,
  LineChart,
  PieChart,
  Eye,
} from "lucide-react";

interface UserStat {
  phone_number: string;
  transaction_count: number;
  total_spent: number;
  total_images: number;
  last_transaction: string;
  first_transaction: string;
}

interface UserTransaction {
  id: string;
  created_at: string;
  amount: number;
  image_count: number;
  status: string;
  payment_type: string;
}

const UserAnalyticsPanel: React.FC = () => {
  const [userStats, setUserStats] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserStat | null>(null);
  const [userTransactions, setUserTransactions] = useState<UserTransaction[]>(
    []
  );
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      setLoading(true);

      // Buscar todas as transações
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      

      if (!transactions || transactions.length === 0) {
        setUserStats([]);
        return;
      }

      // Agrupar transações por número de telefone
      const userMap = new Map<string, UserStat>();

      transactions.forEach((transaction) => {
        const { phone_number, amount, image_count, created_at, status } =
          transaction;

        if (!phone_number) return;

        if (!userMap.has(phone_number)) {
          userMap.set(phone_number, {
            phone_number,
            transaction_count: 0,
            total_spent: 0,
            total_images: 0,
            last_transaction: created_at,
            first_transaction: created_at,
          });
        }

        const user = userMap.get(phone_number)!;

        user.transaction_count += 1;

        if (status === "completed") {
          user.total_spent += amount || 0;
          user.total_images += image_count || 0;
        }

        // Atualizar primeira e última transação
        if (new Date(created_at) > new Date(user.last_transaction)) {
          user.last_transaction = created_at;
        }

        if (new Date(created_at) < new Date(user.first_transaction)) {
          user.first_transaction = created_at;
        }
      });

      // Converter Map para array e ordenar por total gasto (decrescente)
      const sortedUsers = Array.from(userMap.values()).sort(
        (a, b) => b.total_spent - a.total_spent
      );

      setUserStats(sortedUsers);
    } catch (err: any) {
      console.error("Erro ao carregar estatísticas de usuários:", err);
      toast.error("Erro ao carregar dados de usuários");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTransactions = async (phoneNumber: string) => {
    try {
      setLoadingTransactions(true);

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("phone_number", phoneNumber)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setUserTransactions(data || []);
    } catch (err: any) {
      console.error("Erro ao carregar transações do usuário:", err);
      toast.error("Erro ao carregar histórico de transações");
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleUserSelect = (user: UserStat) => {
    setSelectedUser(user);
    fetchUserTransactions(user.phone_number);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-MZ", {
      style: "currency",
      currency: "MZN",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatPhoneNumber = (phone: string) => {
    // Formatar número de telefone moçambicano
    if (
      phone.length === 9 &&
      (phone.startsWith("84") ||
        phone.startsWith("85") ||
        phone.startsWith("86") ||
        phone.startsWith("87"))
    ) {
      return `(+258) ${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(
        5
      )}`;
    }
    return phone;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500">Concluído</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>;
      case "failed":
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filtrar usuários com base na busca
  const filteredUsers = userStats.filter((user) =>
    user.phone_number.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Análise de Usuários
          </CardTitle>
          <CardDescription>
            Monitore os usuários mais ativos e seu comportamento de compra
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Barra de busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número de telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Tabela de usuários */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2">Carregando dados de usuários...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Transações</TableHead>
                      <TableHead>Total Gasto</TableHead>
                      <TableHead>Imagens</TableHead>
                      <TableHead>Última Atividade</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user.phone_number}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-primary" />
                              {formatPhoneNumber(user.phone_number)}
                            </div>
                          </TableCell>
                          <TableCell>{user.transaction_count}</TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(user.total_spent)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{user.total_images}</Badge>
                          </TableCell>
                          <TableCell>
                            {formatDate(user.last_transaction)}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUserSelect(user)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    Detalhes do Usuário
                                  </DialogTitle>
                                </DialogHeader>

                                {selectedUser && (
                                  <div className="space-y-6">
                                    {/* Resumo do usuário */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <Card>
                                        <CardContent className="pt-6">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <p className="text-sm font-medium text-muted-foreground">
                                                Telefone
                                              </p>
                                              <p className="text-lg font-bold">
                                                {formatPhoneNumber(
                                                  selectedUser.phone_number
                                                )}
                                              </p>
                                            </div>
                                            <Phone className="w-8 h-8 text-primary" />
                                          </div>
                                        </CardContent>
                                      </Card>

                                      <Card>
                                        <CardContent className="pt-6">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <p className="text-sm font-medium text-muted-foreground">
                                                Total Gasto
                                              </p>
                                              <p className="text-lg font-bold text-green-600">
                                                {formatCurrency(
                                                  selectedUser.total_spent
                                                )}
                                              </p>
                                            </div>
                                            <CreditCard className="w-8 h-8 text-green-500" />
                                          </div>
                                        </CardContent>
                                      </Card>

                                      <Card>
                                        <CardContent className="pt-6">
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <p className="text-sm font-medium text-muted-foreground">
                                                Imagens Processadas
                                              </p>
                                              <p className="text-lg font-bold text-blue-600">
                                                {selectedUser.total_images}
                                              </p>
                                            </div>
                                            <ImageIcon className="w-8 h-8 text-blue-500" />
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </div>

                                    {/* Informações adicionais */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium">
                                          Primeira Transação
                                        </p>
                                        <p className="flex items-center gap-2">
                                          <Calendar className="w-4 h-4 text-muted-foreground" />
                                          {formatDate(
                                            selectedUser.first_transaction
                                          )}
                                        </p>
                                      </div>
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium">
                                          Última Transação
                                        </p>
                                        <p className="flex items-center gap-2">
                                          <Calendar className="w-4 h-4 text-muted-foreground" />
                                          {formatDate(
                                            selectedUser.last_transaction
                                          )}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Histórico de transações */}
                                    <div>
                                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                        <FileBarChart className="w-5 h-5" />
                                        Histórico de Transações
                                      </h3>

                                      {loadingTransactions ? (
                                        <div className="flex items-center justify-center py-8">
                                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                          <span className="ml-2">
                                            Carregando transações...
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="overflow-x-auto">
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Valor</TableHead>
                                                <TableHead>Imagens</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Tipo</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {userTransactions.map((tx) => (
                                                <TableRow key={tx.id}>
                                                  <TableCell>
                                                    {formatDate(tx.created_at)}
                                                  </TableCell>
                                                  <TableCell className="font-semibold">
                                                    {formatCurrency(tx.amount)}
                                                  </TableCell>
                                                  <TableCell>
                                                    <Badge variant="outline">
                                                      {tx.image_count}
                                                    </Badge>
                                                  </TableCell>
                                                  <TableCell>
                                                    {getStatusBadge(tx.status)}
                                                  </TableCell>
                                                  <TableCell className="capitalize">
                                                    {tx.payment_type}
                                                  </TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                          {userTransactions.length === 0 && (
                                            <div className="text-center py-4 text-muted-foreground">
                                              Nenhuma transação encontrada
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground"
                        >
                          {userStats.length === 0
                            ? "Nenhum dado de usuário disponível"
                            : "Nenhum usuário encontrado com esse número de telefone"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserAnalyticsPanel;
