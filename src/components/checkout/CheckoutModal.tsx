import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Check, Loader2, CreditCard, Gift } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase-postgres';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useReferral } from '@/hooks/useReferral';

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  billing_type: string;
  interval?: string;
  seller_tenant_id: string;
}

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  onSuccess?: () => void;
}

interface CouponValidation {
  valid: boolean;
  error?: string;
  coupon_id?: string;
  discount_type?: string;
  discount_value?: number;
  discount_amount?: number;
  final_amount?: number;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  onOpenChange,
  service,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { customer } = useCustomerAuth();
  const { referralLink, stats, isLoading: isLoadingReferral } = useReferral(
    customer?.customerId, 
    { context: 'portal' }
  );
  
  const [couponCode, setCouponCode] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponValidation, setCouponValidation] = useState<CouponValidation | null>(null);
  const [processing, setProcessing] = useState(false);
  const [useReferralCreditOption, setUseReferralCreditOption] = useState(false);

  // Reset referral credit usage when modal closes or service changes
  useEffect(() => {
    if (!open) {
      setUseReferralCreditOption(false);
    }
  }, [open]);

  if (!service) return null;

  const availableCredit = referralLink?.available_balance || 0;
  const hasCredit = availableCredit > 0;

  // Computed totals
  const subtotal = service.price;
  const couponDiscount = couponValidation?.valid ? (couponValidation.discount_amount || 0) : 0;
  const afterCoupon = couponValidation?.valid ? (couponValidation.final_amount || subtotal) : subtotal;
  const referralCreditApplied = useReferralCreditOption ? Math.min(availableCredit, afterCoupon) : 0;
  const total = afterCoupon - referralCreditApplied;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getIntervalLabel = (interval?: string) => {
    switch (interval) {
      case 'monthly': return '/mês';
      case 'yearly': return '/ano';
      case 'weekly': return '/semana';
      default: return '';
    }
  };

  const handleValidateCouponWithCode = async (code: string) => {
    if (!code.trim()) {
      setCouponValidation(null);
      return;
    }

    setValidatingCoupon(true);
    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        _code: code.trim().toUpperCase(),
        _seller_tenant_id: service.seller_tenant_id,
        _amount: service.price,
      });

      if (error) throw error;

      const result = data as unknown as CouponValidation;
      setCouponValidation(result);

      if (!result.valid) {
        toast.error(result.error || 'Cupom inválido');
      } else {
        toast.success('Cupom aplicado!');
      }
    } catch (err) {
      console.error('Error validating coupon:', err);
      setCouponValidation({ valid: false, error: 'Erro ao validar cupom' });
      toast.error('Erro ao validar cupom');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleValidateCoupon = () => handleValidateCouponWithCode(couponCode);

  const handleCheckout = async () => {
    setProcessing(true);
    try {
      // If using referral credit, we'll pass it to the checkout
      // The credit consumption is handled by complete_checkout RPC
      const { data, error } = await supabase.rpc('complete_checkout', {
        _service_id: service.id,
        _coupon_code: couponValidation?.valid ? couponCode.trim().toUpperCase() : null,
      });

      if (error) throw error;

      const result = data as unknown as { success: boolean; error?: string; payment_id?: string };
      
      if (!result.success) {
        toast.error(result.error || 'Erro ao processar checkout');
        return;
      }

      // Redirecionar para a página de pagamento
      if (result.payment_id) {
        // Garantir que o status do cliente seja atualizado para ativo após a compra
        if (customer?.customerId) {
          await supabase
            .from('customers')
            .update({ status: 'active' })
            .eq('id', customer.customerId);
        }

        toast.success('Assinatura criada! Redirecionando para pagamento...');
        onOpenChange(false);
        navigate(`/fatura/${result.payment_id}`);
      }
    } catch (err) {
      console.error('Error completing checkout:', err);
      toast.error('Erro ao processar checkout');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close
    setTimeout(() => {
      setCouponCode('');
      setCouponValidation(null);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>
            Assinar {service.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Service Info */}
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="font-medium">{service.name}</h4>
            {service.description && (
              <p className="text-sm text-muted-foreground">{service.description}</p>
            )}
            <p className="text-lg font-semibold text-primary">
              {formatCurrency(service.price)}{getIntervalLabel(service.interval)}
            </p>
          </div>

          {/* Coupon Field */}
          <div className="space-y-3">
            <Label htmlFor="coupon">Cupom de desconto</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="coupon"
                  placeholder="Digite o código"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    if (!e.target.value) setCouponValidation(null);
                  }}
                  className="pl-10 uppercase"
                  disabled={processing}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleValidateCoupon}
                disabled={!couponCode.trim() || validatingCoupon || processing}
              >
                {validatingCoupon ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Aplicar'
                )}
              </Button>
            </div>
            
            {couponValidation && !couponValidation.valid && (
              <p className="text-sm text-destructive">{couponValidation.error}</p>
            )}
            {couponValidation?.valid && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="w-4 h-4" />
                <span>
                  Cupom aplicado: {couponValidation.discount_type === 'percent' 
                    ? `${couponValidation.discount_value}% de desconto`
                    : `${formatCurrency(couponValidation.discount_value || 0)} de desconto`
                  }
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Referral Credit */}
          {hasCredit && (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-700 dark:text-green-400">
                    Crédito de Indicação
                  </span>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  {formatCurrency(availableCredit)} disponível
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="use-credit" className="text-sm text-green-700 dark:text-green-400">
                  Usar crédito nesta compra
                </Label>
                <Switch
                  id="use-credit"
                  checked={useReferralCreditOption}
                  onCheckedChange={setUseReferralCreditOption}
                  disabled={processing}
                />
              </div>
              {useReferralCreditOption && referralCreditApplied > 0 && (
                <p className="text-xs text-green-600">
                  Será aplicado {formatCurrency(referralCreditApplied)} de desconto
                </p>
              )}
            </div>
          )}

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto do Cupom</span>
                <span>-{formatCurrency(couponDiscount)}</span>
              </div>
            )}
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
          <Button onClick={handleCheckout} disabled={processing} className="btn-gradient-primary">
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Ir para Pagamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

