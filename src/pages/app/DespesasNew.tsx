import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Receipt, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  Calendar,
  MessageSquare,
  Bot,
  Sparkles,
  DollarSign,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Repeat,
  Bell,
  BarChart3,
  PieChart,
  Send,
  Phone,
  Zap
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useExpenses } from '@/hooks/useExpenses';
import { ExpenseAIChat } from '@/components/despesas/ExpenseAIChat';
import { ExpenseQuickAdd } from '@/components/despesas/ExpenseQuickAdd';
import { ExpenseCalendar } from '@/components/despesas/ExpenseCalendar';
import { ExpenseMetrics } from '@/components/despesas/ExpenseMetrics';
import { ExpenseList } from '@/components/despesas/ExpenseList';
import { ExpenseInsights } from '@/components/despesas/ExpenseInsights';
import { WhatsAppReminders } from '@/components/despesas/WhatsAppReminders';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

const DespesasNew = () => {
  usePageTitle();
  
  const [activeView, setActiveView] = useState<'list' | 'calendar' | 'analytics'>('list');
  const [chatOpen, setChatOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  
  const { expenses, isLoading, totals } = useExpenses({});

  const metrics = {
    totalPending: totals?.pending || 0,
    totalPaid: totals?.paid || 0,
    totalOverdue: totals?.overdue || 0,
    totalMonth: (totals?.pending || 0) + (totals?.paid || 0) + (totals?.overdue || 0),
    pendingCount: expenses?.filter(e => e.status === 'pending').length || 0,
    overdueCount: expenses?.filter(e => e.status === 'overdue').length || 0,
    upcomingCount: expenses?.filter(e => {
      const dueDate = new Date(e.due_date);
      const today = new Date();
      const diff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
      return diff >= 0 && diff <= 7 && e.status === 'pending';
    }).length || 0,
  };

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Despesas Inteligentes"
        description="Gestão de despesas com IA, lembretes automáticos e insights em tempo real"
        icon={Receipt}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChatOpen(true)}
              className="gap-2"
            >
              <Bot className="w-4 h-4" />
              Assistente IA
            </Button>
            <Button
              onClick={() => setQuickAddOpen(true)}
              className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
            >
              <Plus className="w-4 h-4" />
              Nova Despesa
            </Button>
          </div>
        }
      />

      {/* AI Insights Banner */}
      <ExpenseInsights metrics={metrics} expenses={expenses} />

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total do Mês */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total do Mês
            </CardTitle>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(metrics.totalMonth)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Todas as despesas deste mês
            </p>
          </CardContent>
        </Card>

        {/* Pendentes */}
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-amber-200 dark:border-amber-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
            <Clock className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(metrics.totalPending)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.pendingCount} {metrics.pendingCount === 1 ? 'despesa' : 'despesas'}
            </p>
          </CardContent>
        </Card>

        {/* Vencidas */}
        <Card className="bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950 dark:to-red-950 border-rose-200 dark:border-rose-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vencidas
            </CardTitle>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              {formatCurrency(metrics.totalOverdue)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {metrics.overdueCount} {metrics.overdueCount === 1 ? 'despesa vencida' : 'despesas vencidas'}
            </p>
          </CardContent>
        </Card>

        {/* Pagas */}
        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagas
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(metrics.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Despesas quitadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle & WhatsApp Reminders */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="w-full sm:w-auto">
          <TabsList className="grid w-full sm:w-auto grid-cols-3">
            <TabsTrigger value="list" className="gap-2">
              <Receipt className="w-4 h-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="w-4 h-4" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Análises
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <WhatsAppReminders upcomingExpenses={metrics.upcomingCount} />
      </div>

      {/* Main Content */}
      {activeView === 'list' && (
        <ExpenseList expenses={expenses} isLoading={isLoading} />
      )}

      {activeView === 'calendar' && (
        <ExpenseCalendar expenses={expenses} isLoading={isLoading} />
      )}

      {activeView === 'analytics' && (
        <ExpenseMetrics expenses={expenses} totals={totals} />
      )}

      {/* AI Chat Assistant - Floating */}
      <ExpenseAIChat open={chatOpen} onOpenChange={setChatOpen} />

      {/* Quick Add Modal */}
      <ExpenseQuickAdd open={quickAddOpen} onOpenChange={setQuickAddOpen} />

      {/* Smart Actions Bar - Fixed Bottom on Mobile */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background border-t border-border p-4 shadow-lg z-40">
        <div className="flex gap-2 max-w-screen-xl mx-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => setChatOpen(true)}
          >
            <MessageSquare className="w-4 h-4" />
            Chat IA
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
          >
            <Phone className="w-4 h-4" />
            WhatsApp
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-2 bg-gradient-to-r from-violet-600 to-indigo-600"
            onClick={() => setQuickAddOpen(true)}
          >
            <Zap className="w-4 h-4" />
            Rápido
          </Button>
        </div>
      </div>

      {/* Spacing for fixed mobile bar */}
      <div className="h-20 lg:hidden" />
    </div>
  );
};

export default DespesasNew;
