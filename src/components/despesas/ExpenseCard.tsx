import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown_menu';
import { ExpenseWithRelations } from '@/hooks/useExpenses';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays,
  Building2,
  RefreshCcw,
  ShoppingCart,
  Zap,
  Car,
  Home,
  Briefcase,
  CreditCard,
  Package,
  Utensils,
  Wifi,
  Smartphone,
  CalendarClock,
  Bell,
  MessageCircle,
  RotateCcw,
} from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ExpenseCardProps {
  expense: ExpenseWithRelations;
  onEdit: () => void;
  onDelete: () => void;
  onMarkPaid: () => void;
  onCancel: () => void;
  onPostpone: (days: number) => void;
  onReactivate: () => void;
}

// Category icon mapping
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  alimentação: Utensils,
  transporte: Car,
  moradia: Home,
  energia: Zap,
  internet: Wifi,
  telefone: Smartphone,
  escritório: Briefcase,
  compras: ShoppingCart,
  cartão: CreditCard,
  outros: Package,
};

const getCategoryIcon = (categoryName?: string) => {
  if (!categoryName) return Package;
  const normalized = categoryName.toLowerCase();
  for (const [key, icon] of Object.entries(categoryIcons)) {
    if (normalized.includes(key)) return icon;
  }
  return Package;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const ExpenseCard: React.FC<ExpenseCardProps> = ({
  expense,
  onEdit,
  onDelete,
  onMarkPaid,
  onCancel,
  onPostpone,
  onReactivate,
}) => {
  const isPending = expense.status === 'pending';
  const isOverdue = expense.status === 'overdue';
  const isPaid = expense.status === 'paid';
  const isCancelled = expense.status === 'cancelled';
  const canPay = isPending || isOverdue;

  const handleReminder = (type: 'whatsapp' | 'notification') => {
    if (type === 'whatsapp') {
      const message = encodeURIComponent(`Olá! Gostaria de lembrar do vencimento da despesa: ${expense.description} no valor de ${formatCurrency(expense.amount)} para o dia ${format(new Date(expense.due_date), "dd/MM/yyyy")}.`);
      window.open(`https://wa.me/?text=${message}`, '_blank');
      toast.success('Lembrete via WhatsApp preparado!');
    } else {
      toast.success('Notificação de lembrete agendada no sistema');
    }
  };

  const CategoryIcon = getCategoryIcon(expense.category?.name);
  const dueDate = new Date(expense.due_date);

  const getDateLabel = () => {
    if (isPaid && expense.paid_at) {
      return `Pago ${format(new Date(expense.paid_at), "dd/MM/yy", { locale: ptBR })}`;
    }
    if (isToday(dueDate)) return 'Vence hoje';
    if (isTomorrow(dueDate)) return 'Vence amanhã';
    if (isOverdue) return `Vencido ${format(dueDate, "dd/MM", { locale: ptBR })}`;
    return format(dueDate, "dd/MM/yyyy", { locale: ptBR });
  };

  const getBorderColor = () => {
    if (isPaid) return 'border-l-emerald_500';
    if (isOverdue) return 'border-l_destructive';
    if (isPending) return 'border-l-amber_500';
    return 'border-l_muted';
  };

  const getCategoryBgColor = () => {
    if (expense.category?.color) {
      return { backgroundColor: `${expense.category.color}20` };
    }
    if (isPaid) return { backgroundColor: 'rgba(16, 185, 129, 0.1)' };
    if (isOverdue) return { backgroundColor: 'rgba(239, 68, 68, 0.1)' };
    return { backgroundColor: 'rgba(59, 130, 246, 0.1)' };
  };

  const getCategoryIconColor = () => {
    if (expense.category?.color) return expense.category.color;
    if (isPaid) return '#10b981';
    if (isOverdue) return '#ef4444';
    return '#3b82f6';
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl border-l-4 bg-card shadow-sm transition-all duration-200",
        "hover:shadow-md hover:bg-muted/30",
        getBorderColor(),
        isPaid && "opacity-80",
        isCancelled && "opacity-50"
      )}
    >
      {/* Mobile: Row with icon + content + price */}
      <div className="flex items-start gap-3 sm:hidden">
        {/* Category Icon - Mobile */}
        <div 
          className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
          style={getCategoryBgColor()}
        >
          <CategoryIcon 
            className="w-5 h-5" 
            style={{ color: getCategoryIconColor() }}
          />
        </div>

        {/* Content - Mobile */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm truncate flex-1">
              {expense.description}
            </h3>
            <p className={cn(
              "text-base font-bold tabular-nums whitespace-nowrap",
              isPaid && "text-emerald-600",
              isOverdue && "text-destructive"
            )}>
              {formatCurrency(expense.amount)}
            </p>
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                <span>{getDateLabel()}</span>
              </div>
              {expense.is_recurring && (
                <RefreshCcw className="w-3 h-3" />
              )}
            </div>
            <Badge 
              variant={isPaid ? "default" : isOverdue ? "destructive" : "secondary"}
              className={cn(
                "text-[10px] py-0 h-5",
                isPaid && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              )}
            >
              {isPaid ? 'Pago' : isOverdue ? 'Vencido' : isPending ? 'Pendente' : 'Cancelado'}
            </Badge>
          </div>

          {expense.category && (
            <Badge 
              variant="outline" 
              className="text-[10px] py-0 h-4 mt-2"
              style={{ 
                borderColor: expense.category.color || undefined,
                color: expense.category.color || undefined 
              }}
            >
              {expense.category.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Desktop: Action buttons visible on hover */}
      <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {canPay && (
          <Button
            size="sm"
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              onMarkPaid();
            }}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Pagar
          </Button>
        )}
      </div>

      {/* Mobile: Full-width action buttons */}
      <div className="flex sm:hidden items-center gap-2 pt-2 border-t border-border/50">
        {canPay && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onMarkPaid();
            }}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-sm font-medium"
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Pagar Despesa
          </Button>
        )}

        {isCancelled && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onReactivate();
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12 text-sm font-medium"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Reativar Despesa
          </Button>
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className={cn("h-12 w-12", !canPay && !isCancelled && "flex-1")}
            >
              <MoreHorizontal className="w-5 h-5" />
              {!canPay && !isCancelled && <span className="ml-2">Opções</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>

            {canPay && (
              <>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <CalendarClock className="w-4 h-4 mr-2" />
                    Adiar Vencimento
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => onPostpone(1)}>
                      <Clock className="w-4 h-4 mr-2" />
                      +1 dia
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPostpone(7)}>
                      <Clock className="w-4 h-4 mr-2" />
                      +7 dias
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPostpone(30)}>
                      <Clock className="w-4 h-4 mr-2" />
                      +30 dias
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Bell className="w-4 h-4 mr-2" />
                    Lembretes
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleReminder('whatsapp')}>
                      <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
                      Lembrar via WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleReminder('notification')}>
                      <Bell className="w-4 h-4 mr-2 text-blue-500" />
                      Notificação do Sistema
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={onCancel} className="text-amber-600">
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: Original layout */}
      {/* Category Icon - Desktop */}
      <div 
        className="hidden sm:flex flex-shrink-0 w-12 h-12 rounded-xl items-center justify-center"
        style={getCategoryBgColor()}
      >
        <CategoryIcon 
          className="w-6 h-6" 
          style={{ color: getCategoryIconColor() }}
        />
      </div>

      {/* Main Content - Desktop */}
      <div className="hidden sm:block flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base truncate">
            {expense.description}
          </h3>
          {expense.is_recurring && (
            <RefreshCcw className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          )}
        </div>
        
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 flex-shrink-0">
            <CalendarDays className="w-4 h-4 flex-shrink-0 text-muted-foreground/70" />
            <span className="whitespace-nowrap">{getDateLabel()}</span>
          </div>
          
          {expense.supplier && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Building2 className="w-4 h-4 flex-shrink-0" />
              <span className="truncate max-w-[120px]">{expense.supplier}</span>
            </div>
          )}

          {expense.category && (
            <Badge 
              variant="outline" 
              className="text-xs py-0.5 h-5 flex-shrink-0"
              style={{ 
                borderColor: expense.category.color || undefined,
                color: expense.category.color || undefined 
              }}
            >
              {expense.category.name}
            </Badge>
          )}
        </div>

        {/* Allocations - Desktop only */}
        {expense.allocations && expense.allocations.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {expense.allocations.map((alloc) => (
              <Badge key={alloc.id} variant="secondary" className="text-xs py-0">
                {alloc.cost_center?.name}: {alloc.percentage}%
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Amount & Actions - Desktop */}
      <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <p className={cn(
            "text-xl font-bold tabular-nums whitespace-nowrap",
            isPaid && "text-emerald-600",
            isOverdue && "text-destructive"
          )}>
            {formatCurrency(expense.amount)}
          </p>
          <Badge 
            variant={isPaid ? "default" : isOverdue ? "destructive" : "secondary"}
            className={cn(
              "text-xs mt-1",
              isPaid && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
            )}
          >
            {isPaid ? 'Pago' : isOverdue ? 'Vencido' : isPending ? 'Pendente' : 'Cancelado'}
          </Badge>
        </div>

        {/* Pay Button - Desktop */}
        {canPay && (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onMarkPaid();
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md h-10 px-4 min-h-[48px]"
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Pagar
          </Button>
        )}

        {/* Context Menu - Desktop */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 flex-shrink-0 min-h-[48px] min-w-[48px]"
            >
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>

            {canPay && (
              <>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <CalendarClock className="w-4 h-4 mr-2" />
                    Adiar Vencimento
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => onPostpone(1)}>
                      <Clock className="w-4 h-4 mr-2" />
                      +1 dia
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPostpone(3)}>
                      <Clock className="w-4 h-4 mr-2" />
                      +3 dias
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPostpone(7)}>
                      <Clock className="w-4 h-4 mr-2" />
                      +7 dias
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPostpone(15)}>
                      <Clock className="w-4 h-4 mr-2" />
                      +15 dias
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPostpone(30)}>
                      <Clock className="w-4 h-4 mr-2" />
                      +30 dias
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Bell className="w-4 h-4 mr-2" />
                    Lembretes
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleReminder('whatsapp')}>
                      <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
                      Lembrar via WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleReminder('notification')}>
                      <Bell className="w-4 h-4 mr-2 text-blue-500" />
                      Notificação do Sistema
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={onCancel} className="text-amber-600">
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};