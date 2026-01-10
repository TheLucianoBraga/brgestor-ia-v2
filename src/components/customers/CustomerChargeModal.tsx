import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { CustomerChargeInsert } from '@/hooks/useCustomerCharges';

const chargeSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  due_date: z.string().min(1, 'Data de vencimento é obrigatória'),
  description: z.string().min(1, 'Descrição é obrigatória').max(500, 'Descrição muito longa'),
});

type ChargeFormData = z.infer<typeof chargeSchema>;

interface CustomerChargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  onSubmit: (data: CustomerChargeInsert) => void;
  isLoading?: boolean;
}

export const CustomerChargeModal: React.FC<CustomerChargeModalProps> = ({
  open,
  onOpenChange,
  customerId,
  customerName,
  onSubmit,
  isLoading,
}) => {
  const form = useForm<ChargeFormData>({
    resolver: zodResolver(chargeSchema),
    defaultValues: {
      amount: 0,
      due_date: new Date().toISOString().split('T')[0],
      description: '',
    },
  });

  const handleSubmit = (data: ChargeFormData) => {
    onSubmit({
      amount: data.amount,
      due_date: data.due_date,
      description: data.description,
      customer_id: customerId,
    });
  };

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = Number(numbers) / 100;
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Cobrança</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Criar cobrança para {customerName}
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        R$
                      </span>
                      <Input
                        placeholder="0,00"
                        className="pl-10"
                        {...field}
                        value={field.value ? formatCurrency(String(field.value * 100)) : ''}
                        onChange={(e) => {
                          const numbers = e.target.value.replace(/\D/g, '');
                          field.onChange(Number(numbers) / 100);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vencimento *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição da cobrança..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar Cobrança
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
