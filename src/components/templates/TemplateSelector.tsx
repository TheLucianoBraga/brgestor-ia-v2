import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ChevronDown, FileText, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll_area';
import { Badge } from '@/components/ui/badge';
import { useTemplates, TEMPLATE_TYPES, processTemplateVariables } from '@/hooks/useTemplates';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TemplateSelectorProps {
  customerName: string;
  customerPhone: string;
  productName?: string;
  amount?: number;
  dueDate?: string;
  onSend?: (templateId: string, message: string) => void;
  className?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function TemplateSelector({
  customerName,
  customerPhone,
  productName,
  amount,
  dueDate,
  onSend,
  className = '',
}: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const { templates, isLoading } = useTemplates();
  const navigate = useNavigate();

  // Filtrar templates ativos de cobrança/whatsapp
  const chargeTemplates = templates.filter(
    (t) => t.is_active && t.channel === 'whatsapp' && 
    ['aviso_vencimento', 'vence_hoje', 'apos_vencimento', 'cobranca'].includes(t.type)
  );

  // Sugestão inteligente baseada na data de vencimento
  const getSuggestedTemplate = () => {
    if (!dueDate) return null;
    
    const today = new Date();
    const due = new Date(dueDate);
    const daysUntilDue = differenceInDays(due, today);
    
    // Vence hoje ou amanhã
    if (daysUntilDue >= 0 && daysUntilDue <= 1) {
      return chargeTemplates.find(t => t.type === 'vence_hoje') || 
             chargeTemplates.find(t => t.type === 'aviso_vencimento');
    }
    
    // Já venceu
    if (daysUntilDue < 0) {
      const daysOverdue = Math.abs(daysUntilDue);
      // Vencido há mais de 5 dias = cobrança forte
      if (daysOverdue >= 5) {
        return chargeTemplates.find(t => t.type === 'cobranca') || 
               chargeTemplates.find(t => t.type === 'apos_vencimento');
      }
      // Vencido recentemente = após vencimento
      return chargeTemplates.find(t => t.type === 'apos_vencimento') || 
             chargeTemplates.find(t => t.type === 'cobranca');
    }
    
    // Vence nos próximos dias
    return chargeTemplates.find(t => t.type === 'aviso_vencimento');
  };

  const handleSelectTemplate = (template: typeof templates[0]) => {
    // Preparar variáveis para substituição
    const variables: Record<string, string> = {
      nome: customerName,
      primeiro_nome: customerName.split(' ')[0],
      whatsapp: customerPhone,
      produto: productName || '',
      servico: productName || '',
      valor: amount ? formatCurrency(amount) : '',
      vencimento: dueDate ? format(new Date(dueDate), 'dd/MM/yyyy') : '',
      dias: dueDate ? Math.abs(differenceInDays(new Date(dueDate), new Date())).toString() : '',
      periodo_dia: new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite',
    };

    // Processar template com variáveis
    const processedMessage = processTemplateVariables(template.content, variables);
    
    // Montar URL do WhatsApp
    const encodedMessage = encodeURIComponent(processedMessage);
    const whatsappUrl = `https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${encodedMessage}`;
    
    if (onSend) {
      onSend(template.id, processedMessage);
    }
    
    // Abrir WhatsApp
    window.open(whatsappUrl, '_blank');
    setOpen(false);
  };

  const suggestedTemplate = getSuggestedTemplate();

  const getTypeLabel = (type: string) => {
    return TEMPLATE_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'aviso_vencimento':
        return <Clock className="h-3.5 w-3.5 text-amber-500" />;
      case 'vence_hoje':
        return <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />;
      case 'apos_vencimento':
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case 'cobranca':
        return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      default:
        return <FileText className="h-3.5 w-3.5" />;
    }
  };

  if (isLoading) {
    return (
      <Button size="icon" variant="ghost" disabled className={className}>
        <MessageCircle className="w-5 h-5" />
      </Button>
    );
  }

  if (chargeTemplates.length === 0) {
    // Fallback: enviar mensagem padrão
    const defaultMessage = encodeURIComponent(
      `Olá ${customerName}! 👋\n\n` +
      `Este é um lembrete sobre o vencimento do seu serviço${productName ? ` *${productName}*` : ''}.\n\n` +
      (dueDate ? `📅 Vencimento: ${format(new Date(dueDate), 'dd/MM/yyyy')}\n` : '') +
      (amount ? `💰 Valor: ${formatCurrency(amount)}\n\n` : '\n') +
      `Por favor, entre em contato caso precise de ajuda! 🙏`
    );
    const whatsappUrl = `https://wa.me/${customerPhone.replace(/\D/g, '')}?text=${defaultMessage}`;
    
    return (
      <Button
        size="icon"
        variant="ghost"
        className={`h-10 w-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          window.open(whatsappUrl, '_blank');
        }}
      >
        <MessageCircle className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={`h-10 w-10 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MessageCircle className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">Enviar Cobrança</h4>
          <p className="text-xs text-muted-foreground">Escolha um template para {customerName}</p>
        </div>
        
        <ScrollArea className="max-h-64">
          <div className="p-2 space-y-1">
            {suggestedTemplate && (
              <div className="mb-2">
                <p className="text-xs text-muted-foreground px-2 mb-1">✨ Sugerido</p>
                <button
                  className="w-full text-left p-2 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/30"
                  onClick={() => handleSelectTemplate(suggestedTemplate)}
                >
                  <div className="flex items-center gap-2">
                    {getTypeIcon(suggestedTemplate.type)}
                    <span className="font-medium text-sm">{suggestedTemplate.name}</span>
                    <Badge variant="default" className="ml-auto text-[10px] h-5">
                      Ideal
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {suggestedTemplate.content.substring(0, 80)}...
                  </p>
                </button>
              </div>
            )}
            
            {chargeTemplates.length > (suggestedTemplate ? 1 : 0) && (
              <>
                <p className="text-xs text-muted-foreground px-2 mb-1">Todos os templates</p>
                {chargeTemplates
                  .filter(t => t.id !== suggestedTemplate?.id)
                  .map((template) => (
                    <button
                      key={template.id}
                      className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <div className="flex items-center gap-2">
                        {getTypeIcon(template.type)}
                        <span className="font-medium text-sm">{template.name}</span>
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {getTypeLabel(template.type)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {template.content.substring(0, 60)}...
                      </p>
                    </button>
                  ))}
              </>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-2 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => {
              setOpen(false);
              navigate('/app/templates');
            }}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Gerenciar Templates
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}