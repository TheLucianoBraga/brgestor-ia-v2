import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Coupon, CouponInsert } from '@/hooks/useCoupons';

const couponSchema = z.object({
  code: z.string().min(3, 'Código deve ter pelo menos 3 caracteres').max(20),
  discount_type: z.enum(['percent', 'fixed']),
  discount_value: z.number().min(0.01, 'Valor deve ser maior que 0'),
  max_redemptions: z.number().min(1).nullable().optional(),
  expires_at: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

type FormData = z.infer<typeof couponSchema>;

interface CouponModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coupon?: Coupon | null;
  onSubmit: (data: CouponInsert) => void;
  isLoading?: boolean;
}

export const CouponModal: React.FC<CouponModalProps> = ({
  open,
  onOpenChange,
  coupon,
  onSubmit,
  isLoading,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: '',
      discount_type: 'percent',
      discount_value: 10,
      max_redemptions: null,
      expires_at: null,
      active: true,
    },
  });

  const discountType = watch('discount_type');

  useEffect(() => {
    if (coupon) {
      reset({
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        max_redemptions: coupon.max_redemptions,
        expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : null,
        active: coupon.active,
      });
    } else {
      reset({
        code: '',
        discount_type: 'percent',
        discount_value: 10,
        max_redemptions: null,
        expires_at: null,
        active: true,
      });
    }
  }, [coupon, reset]);

  const handleFormSubmit = (data: FormData) => {
    onSubmit({
      code: data.code.toUpperCase(),
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      max_redemptions: data.max_redemptions ?? null,
      expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
      active: data.active ?? true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{coupon ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
          <DialogDescription>
            {coupon
              ? 'Atualize as informações do cupom de desconto.'
              : 'Crie um novo cupom de desconto para seus clientes.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código do Cupom</Label>
            <Input
              id="code"
              placeholder="EX: PROMO10"
              {...register('code')}
              className="uppercase"
            />
            {errors.code && (
              <p className="text-sm text-destructive">{errors.code.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount_type">Tipo de Desconto</Label>
              <Select
                value={discountType}
                onValueChange={(value: 'percent' | 'fixed') =>
                  setValue('discount_type', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentual (%)</SelectItem>
                  <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_value">
                {discountType === 'percent' ? 'Percentual' : 'Valor'}
              </Label>
              <Input
                id="discount_value"
                type="number"
                step={discountType === 'percent' ? '1' : '0.01'}
                min="0"
                max={discountType === 'percent' ? '100' : undefined}
                placeholder={discountType === 'percent' ? '10' : '50.00'}
                {...register('discount_value', { valueAsNumber: true })}
              />
              {errors.discount_value && (
                <p className="text-sm text-destructive">
                  {errors.discount_value.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_redemptions">Limite de Usos</Label>
              <Input
                id="max_redemptions"
                type="number"
                min="1"
                placeholder="Ilimitado"
                {...register('max_redemptions', {
                  setValueAs: (v) => (v === '' ? null : parseInt(v, 10)),
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires_at">Data de Expiração</Label>
              <Input
                id="expires_at"
                type="date"
                {...register('expires_at', {
                  setValueAs: (v) => (v === '' ? null : v),
                })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="active">Cupom Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Cupons inativos não podem ser utilizados
              </p>
            </div>
            <Switch
              id="active"
              checked={watch('active')}
              onCheckedChange={(checked) => setValue('active', checked)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="btn-gradient-primary">
              {isLoading ? 'Salvando...' : coupon ? 'Salvar' : 'Criar Cupom'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
