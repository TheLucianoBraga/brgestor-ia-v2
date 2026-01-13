import { useState } from 'react';
import { CreditCard, Package, Headphones, MessageSquare, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ChatAction {
  type: 'generate_pix' | 'show_plans' | 'create_ticket' | 'transfer_human' | 'show_services' | 'show_charges' | 'confirm_action' | 
        'show_system_metrics' | 'navigate_organizations' | 'show_master_billing' | 'navigate_config' | 'create_internal_ticket' |
        'show_adm_dashboard' | 'list_revendas' | 'show_adm_billing' | 'create_revenda' | 'list_tickets' | 'show_subscription' |
        'show_revenda_dashboard' | 'list_customers' | 'list_pending_charges' | 'send_charge' | 'create_customer' |
        'show_due_date' | 'show_referral' | 'navigate_profile' | 'request_help' | 'generate_payment';
  payload: Record<string, any>;
}

interface ChatActionCardProps {
  action: ChatAction;
  onExecute: (action: ChatAction) => Promise<void> | void;
}

export function ChatActionCard({ action, onExecute }: ChatActionCardProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isExecuted, setIsExecuted] = useState(false);

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      await onExecute(action);
      setIsExecuted(true);
    } catch (error) {
      console.error('Error executing action:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const getActionConfig = () => {
    switch (action.type) {
      case 'generate_pix':
        return {
          icon: CreditCard,
          title: 'Gerar PIX',
          description: 'Clique para gerar o código PIX para pagamento',
          buttonText: 'Gerar PIX',
          color: 'text-green_600',
          bgColor: 'bg-green-50 dark:bg-green-950/30'
        };
      case 'show_plans':
        return {
          icon: Package,
          title: 'Planos Disponíveis',
          description: 'Veja os planos disponíveis para upgrade',
          buttonText: 'Ver Planos',
          color: 'text-blue_600',
          bgColor: 'bg-blue-50 dark:bg-blue-950/30'
        };
      case 'create_ticket':
        return {
          icon: Headphones,
          title: 'Abrir Ticket de Suporte',
          description: action.payload.subject || 'Criar ticket de suporte',
          buttonText: 'Criar Ticket',
          color: 'text-orange_600',
          bgColor: 'bg-orange-50 dark:bg-orange-950/30'
        };
      case 'transfer_human':
        return {
          icon: MessageSquare,
          title: 'Falar com Atendente',
          description: 'Transferir para atendimento humano via WhatsApp',
          buttonText: 'Abrir WhatsApp',
          color: 'text-purple_600',
          bgColor: 'bg-purple-50 dark:bg-purple-950/30'
        };
      case 'show_services':
        return {
          icon: Package,
          title: 'Seus Serviços',
          description: 'Visualize seus serviços ativos',
          buttonText: 'Ver Serviços',
          color: 'text-cyan_600',
          bgColor: 'bg-cyan-50 dark:bg-cyan-950/30'
        };
      case 'show_charges':
        return {
          icon: CreditCard,
          title: 'Suas Faturas',
          description: 'Visualize suas faturas pendentes',
          buttonText: 'Ver Faturas',
          color: 'text-amber_600',
          bgColor: 'bg-amber-50 dark:bg-amber-950/30'
        };
      default:
        return {
          icon: CheckCircle,
          title: 'Ação',
          description: 'Executar ação',
          buttonText: 'Executar',
          color: 'text-gray_600',
          bgColor: 'bg-gray-50 dark:bg-gray-950/30'
        };
    }
  };

  const config = getActionConfig();
  const Icon = config.icon;

  if (isExecuted) {
    return (
      <Card className={cn("border-2 border-dashed border-green-300", config.bgColor)}>
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Ação executada com sucesso!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border transition-all hover:shadow-md", config.bgColor)}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg", config.bgColor)}>
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{config.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {config.description}
            </p>
          </div>
        </div>
        <Button 
          size="sm" 
          className="w-full mt-3"
          onClick={handleExecute}
          disabled={isExecuting}
        >
          {isExecuting ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              {config.buttonText}
              <ExternalLink className="h-3 w-3 ml-1" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

interface ServiceCardProps {
  service: {
    id: string;
    product_name: string;
    status: string;
    due_date?: string | null;
    expires_at?: string | null;
    price?: number | null;
  };
}

export function ServiceCard({ service }: ServiceCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green_200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow_200';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red_200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray_200';
    }
  };

  return (
    <Card className="border">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-sm">{service.product_name}</h4>
            {service.expires_at && (
              <p className="text-xs text-muted-foreground">
                Expira: {new Date(service.expires_at).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
          <Badge className={getStatusColor(service.status)}>
            {service.status === 'active' ? 'Ativo' : service.status}
          </Badge>
        </div>
        {service.price && (
          <p className="text-sm font-semibold text-primary mt-2">
            R$ {service.price.toFixed(2)}/mês
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface ChargeCardProps {
  charge: {
    id: string;
    description: string;
    amount: number;
    due_date: string;
    status: string;
  };
  onPayClick: (chargeId: string) => void;
}

export function ChargeCard({ charge, onPayClick }: ChargeCardProps) {
  const isOverdue = charge.status === 'overdue' || new Date(charge.due_date) < new Date();
  
  return (
    <Card className={cn("border", isOverdue && "border-red-300 bg-red-50/50 dark:bg-red-950/20")}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-sm">{charge.description}</h4>
            <p className="text-xs text-muted-foreground">
              Venc: {new Date(charge.due_date).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-sm">R$ {charge.amount.toFixed(2)}</p>
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">Vencida</Badge>
            )}
          </div>
        </div>
        <Button 
          size="sm" 
          className="w-full mt-2"
          variant={isOverdue ? "destructive" : "default"}
          onClick={() => onPayClick(charge.id)}
        >
          <CreditCard className="h-3 w-3 mr-1" />
          Pagar Agora
        </Button>
      </CardContent>
    </Card>
  );
}

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    price: number;
    description?: string | null;
  };
  onSelectClick: (planId: string) => void;
}

export function PlanCard({ plan, onSelectClick }: PlanCardProps) {
  return (
    <Card className="border hover:border-primary transition-colors">
      <CardContent className="p-3">
        <h4 className="font-medium text-sm">{plan.name}</h4>
        {plan.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {plan.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-3">
          <p className="font-bold text-primary">
            R$ {plan.price.toFixed(2)}<span className="text-xs font-normal">/mês</span>
          </p>
          <Button size="sm" variant="outline" onClick={() => onSelectClick(plan.id)}>
            Escolher
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
