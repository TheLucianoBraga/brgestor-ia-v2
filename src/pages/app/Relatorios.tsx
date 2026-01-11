import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Receipt,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  ArrowUpDown,
  GitCompare,
  Sparkles,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useReports, DateRange } from '@/hooks/useReports';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { cn } from '@/lib/utils';
import { useExport, ExportColumn } from '@/hooks/useExport';
import { ComparisonCard } from '@/components/relatorios/ComparisonCard';
import { AIInsights } from '@/components/relatorios/AIInsights';

const CHART_HEIGHT = 320;
const CHART_COLORS = ['#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  overdue: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelled: 'bg-muted text-muted-foreground border-muted',
};

const STATUS_LABELS: Record<string, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

const Relatorios: React.FC = () => {
  const today = new Date();
  const [periodPreset, setPeriodPreset] = useState<string>('30d');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortColumn, setSortColumn] = useState<string>('due_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showComparison, setShowComparison] = useState(true);
  const [customRange, setCustomRange] = useState<DateRange>({
    from: startOfMonth(today),
    to: endOfMonth(today),
  });
  const { exportToExcel, exportToPDF } = useExport();

  const dateRange = useMemo((): DateRange => {
    switch (periodPreset) {
      case 'today':
        return { from: today, to: today };
      case '7d':
        return { from: subDays(today, 7), to: today };
      case '30d':
        return { from: subDays(today, 30), to: today };
      case 'this_month':
        return { from: startOfMonth(today), to: today };
      case 'last_month':
        return { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) };
      case 'custom':
        return customRange;
      default:
        return { from: subDays(today, 30), to: today };
    }
  }, [periodPreset, customRange]);

  const { metrics, dailyRevenue, statusDistribution, topServices, transactions, isLoading } = useReports(dateRange, statusFilter);

  const sortedTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    return [...transactions].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof typeof a];
      let bVal: any = b[sortColumn as keyof typeof b];

      if (sortColumn === 'amount') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [transactions, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const transactionColumns: ExportColumn[] = [
    { key: 'client_name', header: 'Cliente', width: 25 },
    { key: 'amount', header: 'Valor', width: 15, format: (v) => formatCurrency(v) },
    { key: 'status', header: 'Status', width: 12, format: (v) => STATUS_LABELS[v] || v },
    { key: 'due_date', header: 'Vencimento', width: 15, format: (v) => v ? format(new Date(v), 'dd/MM/yyyy') : '-' },
    { key: 'paid_at', header: 'Pago em', width: 15, format: (v) => v ? format(new Date(v), 'dd/MM/yyyy') : '-' },
  ];

  const handleExportExcel = () => {
    exportToExcel(sortedTransactions, transactionColumns, {
      filename: `relatorio-${format(dateRange.from, 'yyyy-MM-dd')}-${format(dateRange.to, 'yyyy-MM-dd')}`,
      title: 'Relatório Financeiro',
      subtitle: `Período: ${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')}`
    });
  };

  const handleExportPDF = () => {
    exportToPDF(sortedTransactions, transactionColumns, {
      filename: `relatorio-${format(dateRange.from, 'yyyy-MM-dd')}-${format(dateRange.to, 'yyyy-MM-dd')}`,
      title: 'Relatório Financeiro',
      subtitle: `Período: ${format(dateRange.from, 'dd/MM/yyyy')} a ${format(dateRange.to, 'dd/MM/yyyy')} | Receita: ${formatCurrency(metrics?.currentRevenue || 0)} | ${sortedTransactions.length} transações`
    });
  };

  // Safe metric values
  const safeMetrics = {
    currentRevenue: metrics?.currentRevenue || 0,
    previousRevenue: metrics?.previousRevenue || 0,
    revenueChange: metrics?.revenueChange || 0,
    activeClients: metrics?.activeClients || 0,
    previousActiveClients: metrics?.previousActiveClients || 0,
    totalClients: metrics?.totalClients || 0,
    overdueCount: metrics?.overdueCount || 0,
    overduePercentage: metrics?.overduePercentage || 0,
    previousOverduePercentage: metrics?.previousOverduePercentage || 0,
    averageTicket: metrics?.averageTicket || 0,
    previousAverageTicket: metrics?.previousAverageTicket || 0,
    resellerCount: metrics?.resellerCount || 0,
    resellerActiveItems: metrics?.resellerActiveItems || 0,
    resellerRevenue: metrics?.resellerRevenue || 0,
  };

  if (isLoading) {
    return (
      <div className="page-container space-y-6">
        <PageHeader title="Relatórios" description="Dashboard financeiro" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingSkeleton variant="card" className="h-80" />
          <LoadingSkeleton variant="card" className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6 print:space-y-4">
      <PageHeader
        title="Relatórios"
        description="Dashboard financeiro completo"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 print:hidden">
        <Select value={periodPreset} onValueChange={setPeriodPreset}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="this_month">Este mês</SelectItem>
            <SelectItem value="last_month">Mês passado</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {periodPreset === 'custom' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-64">
                <Calendar className="h-4 w-4 mr-2" />
                {format(customRange.from, 'dd/MM/yyyy')} - {format(customRange.to, 'dd/MM/yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={{ from: customRange.from, to: customRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setCustomRange({ from: range.from, to: range.to });
                  }
                }}
                locale={ptBR}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="paid">Pagos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="overdue">Vencidos</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch id="comparison" checked={showComparison} onCheckedChange={setShowComparison} />
          <Label htmlFor="comparison" className="text-sm flex items-center gap-1">
            <GitCompare className="w-4 h-4" />
            Comparar
          </Label>
        </div>
      </div>

      {/* Comparison Cards */}
      {showComparison && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ComparisonCard
            title="Receita"
            currentValue={safeMetrics.currentRevenue}
            previousValue={safeMetrics.previousRevenue}
            currentLabel="Período atual"
            previousLabel="Período anterior"
            formatValue={formatCurrency}
            icon={Receipt}
          />
          <ComparisonCard
            title="Clientes"
            currentValue={safeMetrics.activeClients}
            previousValue={safeMetrics.previousActiveClients}
            currentLabel="Ativos"
            previousLabel="Período anterior"
            formatValue={(v) => String(v)}
            icon={Users}
          />
          <ComparisonCard
            title="Inadimplência"
            currentValue={safeMetrics.overduePercentage}
            previousValue={safeMetrics.previousOverduePercentage}
            currentLabel="Atual"
            previousLabel="Período anterior"
            formatValue={(v) => `${v.toFixed(1)}%`}
            icon={AlertTriangle}
          />
          <ComparisonCard
            title="Ticket Médio"
            currentValue={safeMetrics.averageTicket}
            previousValue={safeMetrics.previousAverageTicket}
            currentLabel="Atual"
            previousLabel="Período anterior"
            formatValue={formatCurrency}
            icon={BarChart3}
          />
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="rounded-xl bg-muted/30 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita do Período</CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <Receipt className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(safeMetrics.currentRevenue)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              {safeMetrics.revenueChange >= 0 ? (
                <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-rose-500 mr-1" />
              )}
              <span className={safeMetrics.revenueChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                {safeMetrics.revenueChange >= 0 ? '+' : ''}{safeMetrics.revenueChange.toFixed(1)}%
              </span>
              <span className="ml-1">vs anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-muted/30 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Ativos</CardTitle>
            <div className="p-2 rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeMetrics.activeClients}</div>
            <p className="text-xs text-muted-foreground mt-2">de {safeMetrics.totalClients} total (excl. revendas)</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-rose-500/5 shadow-sm hover:shadow-md transition-all border-rose-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inadimplência</CardTitle>
            <div className="p-2 rounded-xl bg-rose-500/10">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">{safeMetrics.overduePercentage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-2">{safeMetrics.overdueCount} cobranças vencidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Reseller Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-xl bg-indigo-500/5 shadow-sm border-indigo-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revendas/Admins</CardTitle>
            <div className="p-2 rounded-xl bg-indigo-500/10">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{safeMetrics.resellerCount}</div>
            <p className="text-xs text-muted-foreground mt-2">Contas de revenda ativas</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-indigo-500/5 shadow-sm border-indigo-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ativos de Revendas</CardTitle>
            <div className="p-2 rounded-xl bg-indigo-500/10">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{safeMetrics.resellerActiveItems}</div>
            <p className="text-xs text-muted-foreground mt-2">Total de ativos nas revendas</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-indigo-500/5 shadow-sm border-indigo-500/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita de Revendas</CardTitle>
            <div className="p-2 rounded-xl bg-indigo-500/10">
              <Receipt className="h-5 w-5 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{formatCurrency(safeMetrics.resellerRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-2">Valor total dos planos de revenda</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights - Análise Inteligente */}
      <AIInsights metrics={safeMetrics} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart - Revenue */}
        <Card className="rounded-xl bg-muted/30 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              Receita por Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: CHART_HEIGHT }}>
              {dailyRevenue && dailyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyRevenue}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => {
                        try {
                          return format(new Date(date), 'dd/MM');
                        } catch {
                          return date;
                        }
                      }}
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Receita']}
                      labelFormatter={(date) => {
                        try {
                          return format(new Date(date), 'dd/MM/yyyy');
                        } catch {
                          return String(date);
                        }
                      }}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: 'white' }}
                      activeDot={{ r: 8, strokeWidth: 2, fill: 'white' }}
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Sem dados para o período</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Status Distribution */}
        <Card className="rounded-xl bg-muted/30 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: CHART_HEIGHT }}>
              {statusDistribution && statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="count"
                      nameKey="status"
                      label={({ status, percent }) => `${status} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {statusDistribution.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => [
                        `${value} cobranças (${formatCurrency(props.payload?.value || 0)})`,
                        name,
                      ]}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>Sem dados para o período</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart - Top Services */}
      <Card className="rounded-xl bg-muted/30 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10">
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            Top 5 Serviços/Planos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: CHART_HEIGHT }}>
            {topServices && topServices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topServices} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} fontSize={12} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={120} fontSize={12} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Receita']} 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[0, 8, 8, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Sem dados para o período</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="rounded-xl bg-muted/30 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Receipt className="w-4 h-4 text-primary" />
            </div>
            Transações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('client_name')}>
                      <div className="flex items-center gap-1">
                        Cliente
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer text-right" onClick={() => handleSort('amount')}>
                      <div className="flex items-center justify-end gap-1">
                        Valor
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">
                        Status
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('due_date')}>
                      <div className="flex items-center gap-1">
                        Vencimento
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => handleSort('paid_at')}>
                      <div className="flex items-center gap-1">
                        Pago em
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTransactions.slice(0, 20).map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.client_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(STATUS_COLORS[transaction.status])}>
                          {STATUS_LABELS[transaction.status] || transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transaction.due_date ? format(new Date(transaction.due_date), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {transaction.paid_at ? format(new Date(transaction.paid_at), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {sortedTransactions.length > 20 && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Mostrando 20 de {sortedTransactions.length} transações
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma transação encontrada para o período selecionado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Relatorios;