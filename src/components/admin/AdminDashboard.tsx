import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Users,
  FileImage,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Activity,
  BarChart3,
  Zap,
} from "lucide-react";

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

interface AdminDashboardProps {
  metrics: DashboardMetrics;
  loading: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  metrics,
  loading,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-MZ", {
      style: "currency",
      currency: "MZN",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getGrowthColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-muted-foreground";
  };

  const getGrowthIcon = (value: number) => {
    return value >= 0 ? (
      <TrendingUp className="w-4 h-4" />
    ) : (
      <TrendingDown className="w-4 h-4" />
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-8 bg-muted rounded mb-1"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Transações */}
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
                <div className="flex items-center gap-1 mt-1">
                  <span
                    className={`text-xs ${getGrowthColor(
                      metrics.revenueGrowth
                    )}`}
                  >
                    {getGrowthIcon(metrics.revenueGrowth)}
                    {formatPercentage(Math.abs(metrics.revenueGrowth))}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    vs. período anterior
                  </span>
                </div>
              </div>
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Receita Total */}
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
                <div className="flex items-center gap-1 mt-1">
                  <span
                    className={`text-xs ${getGrowthColor(
                      metrics.revenueGrowth
                    )}`}
                  >
                    {getGrowthIcon(metrics.revenueGrowth)}
                    {formatPercentage(Math.abs(metrics.revenueGrowth))}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    crescimento
                  </span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Conversão */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Taxa de Conversão
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatPercentage(metrics.conversionRate)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  de uploads para pagamentos
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Valor Médio por Transação */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Valor Médio (AMV)
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(metrics.averageTransactionValue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  por transação
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Performance e Qualidade */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Imagens Processadas */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Imagens Processadas
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {metrics.totalImagesProcessed.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  total de arquivos
                </p>
              </div>
              <FileImage className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        {/* Taxa de Sucesso M-Pesa */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Sucesso M-Pesa
                </p>
                <p className="text-2xl font-bold">
                  {formatPercentage(metrics.mpesaSuccessRate)}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {metrics.mpesaSuccessRate >= 95 ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-yellow-500" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {metrics.mpesaSuccessRate >= 95 ? "Excelente" : "Atenção"}
                  </span>
                </div>
              </div>
              <Activity className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        {/* Tempo Médio de Processamento */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Tempo Médio
                </p>
                <p className="text-2xl font-bold">
                  {metrics.averageProcessingTime.toFixed(1)}s
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  de processamento
                </p>
              </div>
              <Clock className="w-8 h-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        {/* Retenção de Usuários */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Retenção de Usuários
                </p>
                <p className="text-2xl font-bold">
                  {formatPercentage(metrics.userRetentionRate)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  usuários recorrentes
                </p>
              </div>
              <Users className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status das Transações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Transações Concluídas
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {metrics.completedTransactions}
                </p>
              </div>
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Concluídas
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Transações Pendentes
                </p>
                <p className="text-3xl font-bold text-yellow-600">
                  {metrics.pendingTransactions}
                </p>
              </div>
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                Pendentes
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Transações Falhadas
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {metrics.failedTransactions}
                </p>
              </div>
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                Falhadas
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparação Hoje vs Ontem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Performance Diária
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Hoje</p>
              <p className="text-3xl font-bold text-primary">
                {metrics.todayTransactions}
              </p>
              <p className="text-xs text-muted-foreground">transações</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Ontem</p>
              <p className="text-3xl font-bold text-muted-foreground">
                {metrics.yesterdayTransactions}
              </p>
              <p className="text-xs text-muted-foreground">transações</p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-2">
              {metrics.todayTransactions >= metrics.yesterdayTransactions ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-green-600 font-semibold">
                    +
                    {(
                      ((metrics.todayTransactions -
                        metrics.yesterdayTransactions) /
                        Math.max(metrics.yesterdayTransactions, 1)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                  <span className="text-muted-foreground">vs ontem</span>
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-red-600 font-semibold">
                    {(
                      ((metrics.todayTransactions -
                        metrics.yesterdayTransactions) /
                        Math.max(metrics.yesterdayTransactions, 1)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                  <span className="text-muted-foreground">vs ontem</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Usuários */}
      {metrics.topUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Top Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {metrics.topUsers.map((user, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <Badge className="mb-2 bg-primary">#{index + 1}</Badge>
                      <p
                        className="text-sm font-medium truncate"
                        title={user.phone}
                      >
                        {user.phone}
                      </p>
                      <p className="text-sm font-bold text-green-600">
                        {formatCurrency(user.spent)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.images} imagens
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
