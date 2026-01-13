import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll_area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  User,
  MapPin,
  Car,
  Package,
  MessageSquare,
  Send,
  Receipt,
  UserX,
  UserCheck,
  Plus,
  Trash2,
  Save,
  Search,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { CustomerWithRelations, FullCustomerInsert } from '@/hooks/useCustomers';
import { useCustomerCharges, CustomerChargeInsert } from '@/hooks/useCustomerCharges';
import { CustomerChargeModal } from './CustomerChargeModal';
import { SendMessageModal } from './SendMessageModal';
import { toast } from 'sonner';
import { AITextAssistant } from '@/components/ui/AITextAssistant';
import { format, isToday, isBefore, addDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMutation } from '@tanstack/react-query';

const customerSchema = z.object({
  full_name: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100, 'Nome muito longo'),
  whatsapp: z.string().trim().min(10, 'WhatsApp inválido').max(20, 'WhatsApp inválido'),
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  birth_date: z.string().optional().nullable(),
  cpf_cnpj: z.string().max(20, 'CPF/CNPJ muito longo').optional().nullable(),
  rg_ie: z.string().max(20, 'RG/IE muito longo').optional().nullable(),
  pix_key: z.string().max(100, 'Chave PIX muito longa').optional().nullable(),
  gender: z.string().optional().nullable(),
  secondary_phone: z.string().max(20, 'Telefone muito longo').optional().nullable(),
  notes: z.string().max(500, 'Observações muito longas').optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
  allow_whatsapp: z.boolean().default(true),
  allow_email: z.boolean().default(true),
  allow_portal_notifications: z.boolean().default(true),
  address: z.object({
    cep: z.string().max(10).optional().nullable(),
    street: z.string().max(200).optional().nullable(),
    number: z.string().max(20).optional().nullable(),
    complement: z.string().max(100).optional().nullable(),
    district: z.string().max(100).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(2).optional().nullable(),
  }).optional(),
  vehicles: z.array(z.object({
    plate: z.string().max(10).optional().nullable(),
    brand: z.string().max(50).optional().nullable(),
    model: z.string().max(50).optional().nullable(),
    year: z.string().max(4).optional().nullable(),
    color: z.string().max(30).optional().nullable(),
    renavam: z.string().max(20).optional().nullable(),
    notes: z.string().max(200).optional().nullable(),
  })).optional(),
  items: z.array(z.object({
    product_name: z.string().min(1, 'Produto obrigatório').max(100),
    plan_name: z.string().max(100).optional().nullable(),
    price: z.coerce.number().min(0).default(0),
    discount: z.coerce.number().min(0).default(0),
    starts_at: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    expires_at: z.string().optional().nullable(),
    status: z.enum(['active', 'expired', 'canceled']).default('active'),
  })).optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerWithRelations | null;
  onUpdate: (data: FullCustomerInsert & { id: string }) => void;
  onToggleStatus: (id: string, active: boolean) => void;
  isUpdating?: boolean;
}

export const CustomerDetailsDrawer: React.FC<CustomerDetailsDrawerProps> = ({
  open,
  onOpenChange,
  customer,
  onUpdate,
  onToggleStatus,
  isUpdating,
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);

  const { charges, isLoading: chargesLoading, createCharge, markAsPaid, cancelCharge } = useCustomerCharges(customer?.id);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      full_name: '',
      whatsapp: '',
      email: '',
      status: 'active',
      allow_whatsapp: true,
      allow_email: true,
      allow_portal_notifications: true,
      address: {},
      vehicles: [],
      items: [],
    },
  });

  const { fields: vehicleFields, append: appendVehicle, remove: removeVehicle } = useFieldArray({
    control: form.control,
    name: 'vehicles',
  });

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    if (open && customer) {
      const address = customer.customer_addresses?.[0];
      form.reset({
        full_name: customer.full_name,
        whatsapp: customer.whatsapp,
        email: customer.email,
        birth_date: customer.birth_date,
        cpf_cnpj: customer.cpf_cnpj,
        rg_ie: customer.rg_ie,
        pix_key: (customer as any).pix_key,
        gender: customer.gender,
        secondary_phone: customer.secondary_phone,
        notes: customer.notes,
        status: customer.status as 'active' | 'inactive',
        allow_whatsapp: customer.allow_whatsapp,
        allow_email: customer.allow_email,
        allow_portal_notifications: customer.allow_portal_notifications,
        address: address ? {
          cep: address.cep,
          street: address.street,
          number: address.number,
          complement: address.complement,
          district: address.district,
          city: address.city,
          state: address.state,
        } : {},
        vehicles: customer.customer_vehicles?.map(v => ({
          plate: v.plate,
          brand: v.brand,
          model: v.model,
          year: v.year,
          color: v.color,
          renavam: v.renavam,
          notes: v.notes,
        })) || [],
        items: customer.customer_items?.map(i => ({
          product_name: i.product_name,
          plan_name: i.plan_name,
          price: i.price,
          discount: i.discount,
          starts_at: i.starts_at,
          due_date: i.due_date,
          expires_at: i.expires_at,
          status: i.status as 'active' | 'expired' | 'canceled',
        })) || [],
      });
      setActiveTab('basic');
    }
  }, [open, customer, form]);

  const handleSubmit = (data: CustomerFormData) => {
    if (!customer) return;

    const today = new Date().toISOString().split('T')[0];
    
    const validItems = data.items?.filter(i => i.product_name).map(i => ({
      ...i,
      product_name: i.product_name,
      // Se starts_at vazio, usar data atual
      starts_at: i.starts_at || today,
      // expires_at é opcional - se vazio, manda null (sem expiração)
      expires_at: i.expires_at || null,
    }));

    const payload: FullCustomerInsert & { id: string } = {
      id: customer.id,
      customer: {
        full_name: data.full_name,
        whatsapp: data.whatsapp,
        email: data.email,
        birth_date: data.birth_date || null,
        cpf_cnpj: data.cpf_cnpj || null,
        rg_ie: data.rg_ie || null,
        pix_key: data.pix_key || null,
        gender: data.gender || null,
        secondary_phone: data.secondary_phone || null,
        notes: data.notes || null,
        status: data.status,
        allow_whatsapp: data.allow_whatsapp,
        allow_email: data.allow_email,
        allow_portal_notifications: data.allow_portal_notifications,
      },
      address: data.address,
      vehicles: data.vehicles,
      items: validItems,
    };
    onUpdate(payload);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCpfCnpj = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      if (numbers.length <= 3) return numbers;
      if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
      if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
    } else {
      if (numbers.length <= 2) return numbers;
      if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
      if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
      if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
      return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
    }
  };

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const searchCep = useCallback(async (cep: string) => {
    const numbers = cep.replace(/\D/g, '');
    if (numbers.length !== 8) return;

    setIsSearchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${numbers}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      form.setValue('address.street', data.logradouro || '');
      form.setValue('address.district', data.bairro || '');
      form.setValue('address.city', data.localidade || '');
      form.setValue('address.state', data.uf || '');
      toast.success('Endereço preenchido automaticamente');
    } catch (error) {
      toast.error('Erro ao buscar CEP');
    } finally {
      setIsSearchingCep(false);
    }
  }, [form]);

  const handleWhatsApp = () => {
    if (!customer) return;
    const cleanNumber = customer.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanNumber}`, '_blank');
  };

  const handleToggleStatus = () => {
    if (!customer) return;
    onToggleStatus(customer.id, customer.status === 'inactive');
  };

  const handleCreateCharge = (data: CustomerChargeInsert) => {
    createCharge.mutate(data, {
      onSuccess: () => setIsChargeModalOpen(false),
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getChargeStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; className: string }> = {
      pending: { variant: 'secondary', label: 'Pendente', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
      paid: { variant: 'default', label: 'Pago', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
      overdue: { variant: 'destructive', label: 'Vencido', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
      cancelled: { variant: 'outline', label: 'Cancelado', className: 'bg-muted text-muted_foreground' },
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (!customer) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-2xl p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 bg-primary/10 border border-primary/20">
                <AvatarFallback className="bg-transparent text-primary text-lg font-semibold">
                  {getInitials(customer.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <SheetTitle className="text-xl">{customer.full_name}</SheetTitle>
                <p className="text-sm text-muted-foreground">{customer.whatsapp} • {customer.email}</p>
              </div>
              <Badge variant={customer.status === 'active' ? 'default' : 'secondary'} className={customer.status === 'active' ? 'bg-emerald-500/20 text-emerald_400' : ''}>
                {customer.status === 'active' ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setIsSendMessageOpen(true)}>
                <Send className="w-4 h-4 mr-2 text-green-500" />
                Enviar Mensagem
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsChargeModalOpen(true)}>
                <Receipt className="w-4 h-4 mr-2" />
                Gerar Cobrança
              </Button>
              <Button variant="outline" size="sm" onClick={handleToggleStatus}>
                {customer.status === 'active' ? (
                  <>
                    <UserX className="w-4 h-4 mr-2" />
                    Desativar
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Ativar
                  </>
                )}
              </Button>
            </div>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="px-6 pt-2">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="basic" className="text-xs sm:text-sm">
                      <User className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Dados</span>
                    </TabsTrigger>
                    <TabsTrigger value="address" className="text-xs sm:text-sm">
                      <MapPin className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Endereço</span>
                    </TabsTrigger>
                    <TabsTrigger value="vehicles" className="text-xs sm:text-sm">
                      <Car className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Veículos</span>
                    </TabsTrigger>
                    <TabsTrigger value="items" className="text-xs sm:text-sm">
                      <Package className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Produtos</span>
                    </TabsTrigger>
                    <TabsTrigger value="charges" className="text-xs sm:text-sm">
                      <Receipt className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Cobranças</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1 px-6 py-4">
                  {/* Basic Info Tab */}
                  <TabsContent value="basic" className="space-y-4 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Nome Completo *</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome do cliente" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="whatsapp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>WhatsApp *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="(00) 00000-0000" 
                                {...field}
                                onChange={(e) => field.onChange(formatPhone(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="email@exemplo.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="secondary_phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone Secundário</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="(00) 0000-0000" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => field.onChange(formatPhone(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cpf_cnpj"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF/CNPJ</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="000.000.000-00" 
                                {...field}
                                value={field.value || ''}
                                onChange={(e) => field.onChange(formatCpfCnpj(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="rg_ie"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>RG/IE</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="00.000.000-0" 
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="pix_key"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Chave PIX</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="CPF, e-mail, telefone ou chave aleatória" 
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="birth_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de Nascimento</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gênero</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Masculino</SelectItem>
                                <SelectItem value="female">Feminino</SelectItem>
                                <SelectItem value="other">Outro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Separator className="md:col-span-2" />

                      <div className="md:col-span-2 space-y-4">
                        <h4 className="text-sm font-medium">Preferências de Comunicação</h4>
                        <div className="flex flex-wrap gap-6">
                          <FormField
                            control={form.control}
                            name="allow_whatsapp"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2">
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <FormLabel className="!mt-0">WhatsApp</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="allow_email"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2">
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <FormLabel className="!mt-0">Email</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="allow_portal_notifications"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2">
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <FormLabel className="!mt-0">Portal</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <div className="flex items-center justify-between">
                              <FormLabel>Observações</FormLabel>
                              <AITextAssistant 
                                value={field.value || ''} 
                                onUpdate={(val) => field.onChange(val)}
                              />
                            </div>
                            <FormControl>
                              <Textarea 
                                placeholder="Observações sobre o cliente..."
                                rows={3}
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  {/* Address Tab */}
                  <TabsContent value="address" className="space-y-4 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="address.cep"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CEP</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input 
                                  placeholder="00000-000" 
                                  {...field}
                                  value={field.value || ''}
                                  onChange={(e) => {
                                    const formatted = formatCep(e.target.value);
                                    field.onChange(formatted);
                                    if (formatted.replace(/\D/g, '').length === 8) {
                                      searchCep(formatted);
                                    }
                                  }}
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => searchCep(field.value || '')}
                                disabled={isSearchingCep || !field.value || field.value.replace(/\D/g, '').length < 8}
                              >
                                {isSearchingCep ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Search className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address.street"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Rua</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome da rua" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address.number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                              <Input placeholder="123" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address.complement"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Complemento</FormLabel>
                            <FormControl>
                              <Input placeholder="Apt, Bloco, etc" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address.district"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bairro</FormLabel>
                            <FormControl>
                              <Input placeholder="Bairro" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address.city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input placeholder="Cidade" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="address.state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="UF" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  {/* Vehicles Tab */}
                  <TabsContent value="vehicles" className="space-y-4 mt-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        Veículos do cliente
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendVehicle({ plate: '', brand: '', model: '', year: '', color: '', renavam: '', notes: '' })}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>

                    {vehicleFields.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum veículo cadastrado
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {vehicleFields.map((field, index) => (
                          <div key={field.id} className="p-4 border rounded-lg bg-card space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Veículo {index + 1}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeVehicle(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <FormField
                                control={form.control}
                                name={`vehicles.${index}.plate`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Placa</FormLabel>
                                    <FormControl>
                                      <Input placeholder="ABC-1234" {...field} value={field.value || ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`vehicles.${index}.brand`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Marca</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Marca" {...field} value={field.value || ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`vehicles.${index}.model`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Modelo</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Modelo" {...field} value={field.value || ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`vehicles.${index}.year`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Ano</FormLabel>
                                    <FormControl>
                                      <Input placeholder="2024" maxLength={4} {...field} value={field.value || ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`vehicles.${index}.color`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Cor</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Cor" {...field} value={field.value || ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`vehicles.${index}.renavam`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Renavam</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Renavam" {...field} value={field.value || ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={form.control}
                              name={`vehicles.${index}.notes`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Observações</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Observações do veículo" {...field} value={field.value || ''} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Items Tab */}
                  <TabsContent value="items" className="space-y-4 mt-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        Produtos/Planos do cliente
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendItem({ product_name: '', plan_name: '', price: 0, discount: 0, starts_at: '', due_date: '', expires_at: '', status: 'active' })}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>

                    {itemFields.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum produto cadastrado
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {itemFields.map((field, index) => (
                          <div key={field.id} className="p-4 border rounded-lg bg-card space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Item {index + 1}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <FormField
                                control={form.control}
                                name={`items.${index}.product_name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Produto *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Nome do produto" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`items.${index}.plan_name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Plano</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Nome do plano" {...field} value={field.value || ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`items.${index}.status`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="active">Ativo</SelectItem>
                                        <SelectItem value="expired">Expirado</SelectItem>
                                        <SelectItem value="canceled">Cancelado</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`items.${index}.price`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Preço</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        step="0.01" 
                                        placeholder="0,00" 
                                        {...field}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`items.${index}.discount`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Desconto</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        step="0.01" 
                                        placeholder="0,00" 
                                        {...field}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`items.${index}.starts_at`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Início</FormLabel>
                                    <FormControl>
                                      <Input type="date" {...field} value={field.value || ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`items.${index}.due_date`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Vencimento</FormLabel>
                                    <FormControl>
                                      <Input type="date" {...field} value={field.value || ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`items.${index}.expires_at`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Expiração</FormLabel>
                                    <FormControl>
                                      <Input type="date" {...field} value={field.value || ''} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Charges Tab */}
                  <TabsContent value="charges" className="space-y-4 mt-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        Histórico de cobranças
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsChargeModalOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Cobrança
                      </Button>
                    </div>

                    {chargesLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Carregando...
                      </div>
                    ) : charges.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhuma cobrança encontrada
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {charges.map((charge) => (
                          <div key={charge.id} className="p-4 border rounded-lg bg-card flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{charge.description}</div>
                              <div className="text-sm text-muted-foreground">
                                Vence: {format(new Date(charge.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">{formatCurrency(charge.amount)}</div>
                              {getChargeStatusBadge(charge.status)}
                            </div>
                            {charge.status === 'pending' && (
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-500"
                                  onClick={() => markAsPaid.mutate(charge.id)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => cancelCharge.mutate(charge.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-background flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </Tabs>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <CustomerChargeModal
        open={isChargeModalOpen}
        onOpenChange={setIsChargeModalOpen}
        customerId={customer.id}
        customerName={customer.full_name}
        onSubmit={handleCreateCharge}
        isLoading={createCharge.isPending}
      />

      <SendMessageModal
        open={isSendMessageOpen}
        onOpenChange={setIsSendMessageOpen}
        customer={customer}
      />
    </>
  );
};
