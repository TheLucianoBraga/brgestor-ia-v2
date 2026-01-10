import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Package, FileText, ExternalLink } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { CustomerWithRelations, CustomerItem } from '@/hooks/useCustomers';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';

export interface CustomerChargeInsert {
  customer_id: string;
  description: string;
  amount: number;
  due_date: string;
  generate_invoice?: boolean;
  customer_item_id?: string;
}

interface ChargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charge: any | null;
  customers: CustomerWithRelations[];
  onSubmit: (data: CustomerChargeInsert) => void;
  isLoading?: boolean;
}

export const ChargeModal: React.FC<ChargeModalProps> = ({
  open,
  onOpenChange,
  charge,
  customers,
  onSubmit,
  isLoading,
}) => {
  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<CustomerChargeInsert>();
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithRelations | null>(null);
  const [selectedItem, setSelectedItem] = useState<CustomerItem | null>(null);
  const [generateInvoice, setGenerateInvoice] = useState(false);

  const watchCustomerId = watch('customer_id');

  useEffect(() => {
    if (open) {
      reset(charge ? {
        customer_id: charge.customer_id,
        description: charge.description,
        amount: charge.amount,
        due_date: charge.due_date,
        generate_invoice: false,
      } : {
        customer_id: '',
        description: '',
        amount: 0,
        due_date: new Date().toISOString().split('T')[0],
        generate_invoice: false,
      });
      setSelectedCustomer(null);
      setSelectedItem(null);
      setGenerateInvoice(false);
    }
  }, [open, charge, reset]);

  useEffect(() => {
    if (watchCustomerId) {
      const customer = customers.find(c => c.id === watchCustomerId);
      setSelectedCustomer(customer || null);
      setSelectedItem(null);
    } else {
      setSelectedCustomer(null);
      setSelectedItem(null);
    }
  }, [watchCustomerId, customers]);

  const handleSelectItem = (item: CustomerItem) => {
    setSelectedItem(item);
    setValue('description', `${item.product_name}${item.plan_name ? ` - ${item.plan_name}` : ''}`);
    setValue('amount', item.price || 0);
    if (item.due_date) {
      setValue('due_date', item.due_date.split('T')[0]);
    }
    setValue('customer_item_id', item.id);
  };

  const handleFormSubmit = (data: CustomerChargeInsert) => {
    onSubmit({
      ...data,
      amount: Number(data.amount),
      generate_invoice: generateInvoice,
    });
  };

  const activeCustomers = customers.filter(c => c.status === 'active' || c.status === 'ativo');
  const customerItems = selectedCustomer?.customer_items || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {charge ? 'Editar Cobrança' : 'Nova Cobrança'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Cliente */}
          <div className="space-y-2">
            <Label htmlFor="customer_id">Cliente *</Label>
            <Controller
              name="customer_id"
              control={control}
              rules={{ required: 'Cliente é obrigatório' }}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {activeCustomers.length === 0 ? (
                      <div className="px-2 py-4 text-center text-muted-foreground text-sm">
                        Nenhum cliente ativo encontrado
                      </div>
                    ) : (
                      activeCustomers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex flex-col">
                            <span>{customer.full_name}</span>
                            <span className="text-xs text-muted-foreground">{customer.whatsapp}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.customer_id && (
              <p className="text-xs text-destructive">{errors.customer_id.message}</p>
            )}
          </div>

          {/* Produtos/Planos/Serviços do Cliente */}
          {selectedCustomer && customerItems.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Serviços do Cliente
              </Label>
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {customerItems.map((item) => (
                  <Card 
                    key={item.id} 
                    className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                      selectedItem?.id === item.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleSelectItem(item)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{item.product_name}</p>
                          {item.plan_name && (
                            <p className="text-xs text-muted-foreground">{item.plan_name}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatCurrency(item.price || 0)}</p>
                          <Badge 
                            variant={item.status === 'ativo' || item.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {item.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Clique em um serviço para preencher automaticamente
              </p>
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              {...register('description', { required: 'Descrição é obrigatória' })}
              placeholder="Ex: Mensalidade Janeiro/2026"
              rows={2}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$) *</Label>
            <Controller
              name="amount"
              control={control}
              rules={{ 
                required: 'Valor é obrigatório',
                min: { value: 0.01, message: 'Valor deve ser maior que zero' }
              }}
              render={({ field }) => (
                <CurrencyInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="0,00"
                />
              )}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Vencimento */}
          <div className="space-y-2">
            <Label htmlFor="due_date">Vencimento *</Label>
            <Input
              id="due_date"
              type="date"
              {...register('due_date', { required: 'Data de vencimento é obrigatória' })}
            />
            {errors.due_date && (
              <p className="text-xs text-destructive">{errors.due_date.message}</p>
            )}
          </div>

          {/* Gerar Fatura */}
          <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <div>
                <Label htmlFor="generate_invoice" className="cursor-pointer">
                  Gerar Fatura
                </Label>
                <p className="text-xs text-muted-foreground">
                  Cria um link de pagamento para o cliente
                </p>
              </div>
            </div>
            <Switch
              id="generate_invoice"
              checked={generateInvoice}
              onCheckedChange={setGenerateInvoice}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="btn-gradient-primary">
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {charge ? 'Salvar' : generateInvoice ? 'Criar e Gerar Fatura' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
