import React, { useState } from 'react';
import { Loader2, RefreshCcw, Calendar, CreditCard, Gift } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useReferral } from '@/hooks/useReferral';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { addDays, addMonths, parseISO } from 'date-fns';

interface CustomerItem {
  id: string;
  customer_id: string;
  product_name: string;
  plan_name: string | null;
  price: number | null;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
}

interface RenewalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: CustomerItem | null;
  onSuccess?: () => void;
}

interface RenewalOption {
  value: string;
  label: string;
  days: number;
  months: number;
  multiplier: number;
}

const RENEWAL_OPTIONS: RenewalOption[] = [
  { value: '1month', label: '1 Mês', days: 30, months: 1, multiplier: 1 },
  { value: '3months', label: '3 Meses', days: 90, months: 3, multiplier: 3 },
  { value: '6months', label: '6 Meses', days: 180, months: 6, multiplier: 6 },
  { value: '12months', label: '12 Meses', days: 365, months: 12, multiplier: 12 },
];

export const RenewalModal: React.FC<RenewalModalProps> = ({
  open,
  onOpenChange,
  item,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { customer } = useCustomerAuth();
  const { referralLink } = useReferral(customer?.customerId, { context: 'portal' });
  
  const [selectedOption, setSelectedOption] = useState('1month');
  const [useReferralCredit, setUseReferralCredit] = useState(false);
  const [processing, setProcessing] = useState(false);

  if (!item) return null;

  const availableCredit = referralLink?.available_balance || 0;
  const hasCredit = availableCredit > 0;
  const basePrice = item.price || 0;
  
  const selected = RENEWAL_OPTIONS.find(o => o.value === selectedOption) || RENEWAL_OPTIONS[0];
  const subtotal = basePrice * selected.multiplier;
  const referralCreditApplied = useReferralCredit ? Math.min(availableCredit, subtotal) : 0;
  const total = subtotal - referralCreditApplied;

  // Calculate new expiration date
  const currentExpiration = item.expires_at ? parseISO(item.expires_at) : new Date();
  const baseDate = currentExpiration > new Date() ? currentExpiration : new Date();
  const newExpiration = addMonths(baseDate, selected.months);

  const handleRenew = async () => {
    setProcessing(true);
    try {
      // Create a renewal payment using the RPC function
      const { data, error } = await supabase.rpc('create_renewal_payment', {
        _customer_item_id: item.id,
        _months: selected.months,
        _use_referral_credit: useReferralCredit,
        _referral_credit_amount: referralCreditApplied,
      });

      if (error) {
        console.error('RPC error:', error);
        toast.error(error.message || 'Erro ao processar renovação');
        return;
      }

      // Type guard for the response
      const result = data as { success: boolean; error?: string; payment_id?: string } | null;
      
      if (!result) {
        toast.error('Resposta vazia do servidor');
        return;
      }
      
      if (!result.success) {
        toast.error(result.error || 'Erro ao processar renovação');
        return;
      }

      if (result.payment_id) {
        toast.success('Renovação criada! Redirecionando para pagamento...');
        onOpenChange(false);
        navigate(`/fatura/${result.payment_id}`);
      }
    } catch (err: any) {
      console.error('Error processing renewal:', err);
      toast.error(err?.message || 'Erro ao processar renovação');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSelectedOption('1month');
      setUseReferralCredit(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCcw className="h-5 w-5 text-primary" />
            Renovar Serviço
          </DialogTitle>
          <DialogDescription>
            Escolha o período de renovação para {item.product_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Service Info */}
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <h4 className="font-medium">{item.product_name}</h4>
            {item.plan_name && (
              <p className="text-sm text-muted-foreground">{item.plan_name}</p>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Vence em: {formatDate(item.expires_at)}</span>
            </div>
            <p className="text-lg font-semibold text-primary">
              {formatCurrency(basePrice)}/mês
            </p>
          </div>

          {/* Renewal Period Selection */}
          <div className="space-y-3">
            <Label>Período de Renovação</Label>
            <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
              <div className="grid grid-cols-2 gap-3">
                {RENEWAL_OPTIONS.map((option) => (
                  <div key={option.value}>
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={option.value}
                      className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors"
                    >
                      <span className="font-medium">{option.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(basePrice * option.multiplier)}
                      </span>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* New Expiration Preview */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Calendar className="h-4 w-4" />
              Nova data de vencimento
            </div>
            <p className="text-lg font-semibold">{formatDate(newExpiration.toISOString())}</p>
            <p className="text-xs text-muted-foreground">
              O tempo será adicionado ao período atual
            </p>
          </div>

          <Separator />

          {/* Referral Credit */}
          {hasCredit && (
            <>
              <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-700 dark:text-green-400">
                      Crédito de Indicação
                    </span>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    {formatCurrency(availableCredit)} disponível
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="use-credit" className="text-sm text-green-700 dark:text-green-400">
                    Usar crédito nesta renovação
                  </Label>
                  <Switch
                    id="use-credit"
                    checked={useReferralCredit}
                    onCheckedChange={setUseReferralCredit}
                    disabled={processing}
                  />
                </div>
                {useReferralCredit && referralCreditApplied > 0 && (
                  <p className="text-xs text-green-600">
                    Será aplicado {formatCurrency(referralCreditApplied)} de desconto
                  </p>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal ({selected.label})</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {referralCreditApplied > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Crédito de Indicação</span>
                <span>-{formatCurrency(referralCreditApplied)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose} disabled={processing}>
            Cancelar
          </Button>
          <Button onClick={handleRenew} disabled={processing} className="bg-emerald-600 hover:bg-emerald-700">
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Renovar Agora
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
