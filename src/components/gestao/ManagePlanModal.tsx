import React, { useState, useEffect } from 'react';
import { Crown, Calendar, X } from 'lucide-react';
import { format, addMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { usePlans } from '@/hooks/usePlans';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ManagePlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name: string;
    type: string;
    trial_ends_at: string | null;
  } | null;
  onSuccess?: () => void;
}

export const ManagePlanModal: React.FC<ManagePlanModalProps> = ({
  open,
  onOpenChange,
  tenant,
  onSuccess,
}) => {
  const { plans, isLoading: isLoadingPlans } = usePlans();
  const [selectedPlanId, setSelectedPlanId] = useState<string>('none');
  const [validityDate, setValidityDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  // Fetch current subscription for tenant
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!tenant?.id) return;

      const { data } = await supabase
        .from('subscriptions')
        .select('*, plans(name)')
        .eq('buyer_tenant_id', tenant.id)
        .eq('status', 'active')
        .maybeSingle();

      setCurrentSubscription(data);

      if (data?.plan_id) {
        setSelectedPlanId(data.plan_id);
      } else {
        setSelectedPlanId('none');
      }

      // Set validity date from subscription or trial
      if (data?.ends_at) {
        setValidityDate(format(new Date(data.ends_at), 'yyyy-MM-dd'));
      } else if (tenant.trial_ends_at) {
        setValidityDate(format(new Date(tenant.trial_ends_at), 'yyyy-MM-dd'));
      } else {
        setValidityDate(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
      }
    };

    if (open && tenant) {
      fetchSubscription();
    }
  }, [open, tenant]);

  const handleAddMonths = (months: number) => {
    const currentDate = validityDate ? new Date(validityDate) : new Date();
    setValidityDate(format(addMonths(currentDate, months), 'yyyy-MM-dd'));
  };

  const handleSave = async () => {
    if (!tenant) return;

    setIsSubmitting(true);
    try {
      const plan = selectedPlanId !== 'none' ? plans.find(p => p.id === selectedPlanId) : null;
      
      // Build tenant update object
      const tenantUpdate: { trial_ends_at: string; type?: string } = { 
        trial_ends_at: validityDate 
      };
      
      // Update tenant type based on plan_type if plan is selected
      if (plan?.plan_type && ['adm', 'revenda'].includes(plan.plan_type)) {
        tenantUpdate.type = plan.plan_type;
      }
      
      // Update tenant
      await supabase
        .from('tenants')
        .update(tenantUpdate)
        .eq('id', tenant.id);

      // Handle subscription
      if (selectedPlanId !== 'none' && plan) {
        if (currentSubscription) {
          // Update existing subscription
          await supabase
            .from('subscriptions')
            .update({
              plan_id: selectedPlanId,
              ends_at: validityDate,
              price: plan?.base_price || 0,
            })
            .eq('id', currentSubscription.id);
        } else {
          // Get parent tenant for seller
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('parent_tenant_id')
            .eq('id', tenant.id)
            .single();

          // Create new subscription
          await supabase
            .from('subscriptions')
            .insert({
              buyer_tenant_id: tenant.id,
              seller_tenant_id: tenantData?.parent_tenant_id || tenant.id,
              plan_id: selectedPlanId,
              kind: 'plan',
              price: plan?.base_price || 0,
              status: 'active',
              starts_at: new Date().toISOString(),
              ends_at: validityDate,
            });
        }
      } else if (currentSubscription) {
        // Remove subscription if no plan selected
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('id', currentSubscription.id);
      }

      toast.success('Plano atualizado com sucesso!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar plano');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!tenant) return;

    setIsSubmitting(true);
    try {
      // Suspend the tenant
      await supabase
        .from('tenants')
        .update({ status: 'suspended' })
        .eq('id', tenant.id);

      // Cancel subscription if exists
      if (currentSubscription) {
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('id', currentSubscription.id);
      }

      toast.success('Acesso revogado com sucesso!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao revogar acesso');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            Gerenciar Plano
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{tenant.name}</p>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Plano</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Selecione um plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum plano</SelectItem>
                {plans
                  .filter(p => p.active)
                  .map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - R$ {plan.base_price?.toFixed(2) || '0,00'}/mês
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Validade do acesso</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={validityDate}
                onChange={(e) => setValidityDate(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddMonths(1)}
              className="text-xs"
            >
              +1 mês
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddMonths(3)}
              className="text-xs"
            >
              +3 meses
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddMonths(6)}
              className="text-xs"
            >
              +6 meses
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddMonths(12)}
              className="text-xs"
            >
              +12 meses
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={handleRevoke}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" />
              Revogar Acesso
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSubmitting}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
