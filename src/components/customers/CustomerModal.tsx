import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, User, MapPin, Car, Package, Search, Loader2, Wrench, KeyRound, CheckCircle2, AlertCircle, FileX } from 'lucide-react';
import { useFormPersistence } from '@/hooks/useFormPersistence';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { CustomerWithRelations, FullCustomerInsert } from '@/hooks/useCustomers';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useTenantPlans } from '@/hooks/useTenantPlans';
import { useTenantProducts } from '@/hooks/useTenantProducts';
import { useTenantDiscounts } from '@/hooks/useTenantDiscounts';
import { useServices } from '@/hooks/useServices';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';


const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/;
const plateRegex = /^[A-Z]{3}-?\d{1}[A-Z0-9]{1}\d{2}$/i;

const customerSchema = z.object({
  full_name: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100, 'Nome muito longo'),
  whatsapp: z.string().trim().min(10, 'WhatsApp inválido').max(20, 'WhatsApp inválido'),
  email: z.string().trim().max(255, 'Email muito longo').optional().or(z.literal('')).refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), { message: 'Email inválido' }),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional().or(z.literal('')),
  birth_date: z.string().optional().nullable(),
  cpf_cnpj: z.string().max(20, 'CPF/CNPJ muito longo').optional().nullable(),
  rg_ie: z.string().max(20, 'RG/IE muito longo').optional().nullable(),
  pix_key: z.string().max(100, 'Chave PIX muito longa').optional().nullable(),
  gender: z.string().optional().nullable(),
  secondary_phone: z.string().max(20, 'Telefone muito longo').optional().nullable(),
  notes: z.string().max(500, 'Observações muito longas').optional().nullable(),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
  allow_whatsapp: z.boolean().default(true),
  allow_email: z.boolean().default(true),
  allow_portal_notifications: z.boolean().default(true),
  create_portal_access: z.boolean().default(false),
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
    product_name: z.string().max(100).optional().nullable(),
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

interface CustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: CustomerWithRelations | null;
  onSubmit: (data: FullCustomerInsert) => void;
  isLoading?: boolean;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  open,
  onOpenChange,
  customer,
  onSubmit,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [customProductMode, setCustomProductMode] = useState<Record<number, boolean>>({});
  const [customPlanMode, setCustomPlanMode] = useState<Record<number, boolean>>({});
  const [isCreatingAccess, setIsCreatingAccess] = useState(false);
  const isEditing = !!customer;
  
  const { plans: tenantPlans } = useTenantPlans();
  const { products: tenantProducts } = useTenantProducts();
  const { discounts: tenantDiscounts } = useTenantDiscounts();
  const { services } = useServices();
  
  // Check if customer has portal access
  const { data: portalAccess, refetch: refetchPortalAccess } = useQuery({
    queryKey: ['customer-portal-access', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return null;
      const { data, error } = await supabase
        .from('customer_auth')
        .select('id, email, is_active, created_at')
        .eq('customer_id', customer.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id && open,
  });
  

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      full_name: '',
      whatsapp: '',
      email: '',
      password: '',
      birth_date: null,
      cpf_cnpj: null,
      rg_ie: null,
      pix_key: null,
      gender: null,
      secondary_phone: null,
      notes: null,
      status: 'active',
      allow_whatsapp: true,
      allow_email: true,
      allow_portal_notifications: true,
      create_portal_access: false,
      address: {},
      vehicles: [],
      items: [],
    },
  });

  // Persistência de formulário - apenas para novos clientes
  const { clearDraft, hasDraft, discardDraft } = useFormPersistence({
    form,
    key: 'customer_modal',
    excludeFields: ['password'], // Não persistir senha
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
    if (open) {
      if (customer) {
        const address = customer.customer_addresses?.[0];
        form.reset({
          full_name: customer.full_name,
          whatsapp: customer.whatsapp,
          email: customer.email,
          password: '',
          birth_date: customer.birth_date,
          cpf_cnpj: customer.cpf_cnpj,
          rg_ie: customer.rg_ie,
          pix_key: (customer as any).pix_key,
          gender: customer.gender,
          secondary_phone: customer.secondary_phone,
          notes: customer.notes,
          status: customer.status as 'active' | 'inactive' | 'pending',
          allow_whatsapp: customer.allow_whatsapp,
          allow_email: customer.allow_email,
          allow_portal_notifications: customer.allow_portal_notifications,
          create_portal_access: false,
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
        // Limpar rascunho quando editando cliente existente
        clearDraft();
      } else if (!hasDraft()) {
        // Só reseta se NÃO tiver rascunho salvo
        form.reset({
          full_name: '',
          whatsapp: '',
          email: '',
          password: '',
          birth_date: null,
          cpf_cnpj: null,
          rg_ie: null,
          pix_key: null,
          gender: null,
          secondary_phone: null,
          notes: null,
          status: 'active',
          allow_whatsapp: true,
          allow_email: true,
          allow_portal_notifications: true,
          create_portal_access: false,
          address: {},
          vehicles: [],
          items: [],
        });
      }
      setActiveTab('basic');
      setCustomProductMode({});
      setCustomPlanMode({});
    }
  }, [open, customer, form, clearDraft, hasDraft]);

  const handleSubmit = (data: CustomerFormData) => {
    // Limpar rascunho ao submeter
    clearDraft();
    
    const today = new Date().toISOString().split('T')[0];
    
    const validItems = data.items?.filter(i => i.product_name).map(i => ({
      ...i,
      product_name: i.product_name as string,
      // Se starts_at vazio, usar data atual
      starts_at: i.starts_at || today,
      // expires_at é opcional - se vazio, manda null (sem expiração)
      expires_at: i.expires_at || null,
    }));

    // Se não tiver itens válidos, o status fica como "pending"
    const hasValidItems = validItems && validItems.length > 0;
    const customerStatus = hasValidItems ? data.status : 'pending';

    const payload: FullCustomerInsert = {
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
        status: customerStatus,
        allow_whatsapp: data.allow_whatsapp,
        allow_email: data.allow_email,
        allow_portal_notifications: data.allow_portal_notifications,
      },
      address: data.address,
      vehicles: data.vehicles,
      items: validItems,
      password: data.create_portal_access && data.password ? data.password : undefined,
    };
    onSubmit(payload);
  };

  // Format phone - supports international (+) or defaults to Brazil
  const formatPhone = (value: string) => {
    // If starts with +, it's international - just clean and limit to 15 chars
    if (value.startsWith('+')) {
      const cleaned = '+' + value.slice(1).replace(/\D/g, '').slice(0, 14);
      return cleaned;
    }
    
    // Otherwise, format as Brazilian phone
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogTitle className="text-xl">
            {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="px-6 flex-shrink-0">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basic" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">Dados</span>
                  </TabsTrigger>
                  <TabsTrigger value="address" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="hidden sm:inline">Endereço</span>
                  </TabsTrigger>
                  <TabsTrigger value="vehicles" className="flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    <span className="hidden sm:inline">Veículos</span>
                  </TabsTrigger>
                  <TabsTrigger value="items" className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span className="hidden sm:inline">Produtos</span>
                  </TabsTrigger>
                  <TabsTrigger value="services" className="flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    <span className="hidden sm:inline">Serviços</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4" style={{ maxHeight: 'calc(85vh - 200px)' }}>
                {/* Basic Tab */}
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
                          <FormLabel>Celular/WhatsApp *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="(00) 00000-0000 ou +1234567890" 
                              {...field}
                              onChange={(e) => field.onChange(formatPhone(e.target.value))}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Use + para números internacionais
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email <span className="text-muted-foreground text-xs font-normal">(opcional)</span></FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@exemplo.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Portal Access Section */}
                    <div className="md:col-span-2 rounded-lg border p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-5 h-5 text-primary" />
                        <span className="font-medium">Acesso ao Portal</span>
                      </div>
                      
                      {isEditing ? (
                        // Editing mode - show portal access status
                        portalAccess ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">
                                Acesso ativo desde {new Date(portalAccess.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => form.setValue('create_portal_access', !form.watch('create_portal_access'))}
                            >
                              {form.watch('create_portal_access') ? 'Cancelar' : 'Alterar Senha'}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <span className="text-muted-foreground">
                                Cliente sem acesso ao portal
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => form.setValue('create_portal_access', true)}
                              disabled={!form.watch('email')}
                            >
                              <KeyRound className="w-4 h-4 mr-1" />
                              Liberar Acesso
                            </Button>
                          </div>
                        )
                      ) : (
                        // Creating mode - toggle switch
                        <FormField
                          control={form.control}
                          name="create_portal_access"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm">Criar acesso ao portal</FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  O cliente poderá fazer login com email e senha
                                </p>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={!form.watch('email')}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Password field - shown when creating access */}
                      {form.watch('create_portal_access') && (
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                {isEditing && portalAccess ? 'Nova Senha' : 'Senha de Acesso'} *
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="password" 
                                  placeholder="Mínimo 6 caracteres" 
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {!form.watch('email') && (
                        <p className="text-xs text-amber-600">
                          Preencha o email acima para liberar acesso ao portal
                        </p>
                      )}
                    </div>

                    <FormField
                      control={form.control}
                      name="birth_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Aniversário</FormLabel>
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
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Ativo</SelectItem>
                              <SelectItem value="inactive">Inativo</SelectItem>
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
                      name="address.complement"
                      render={({ field }) => (
                        <FormItem>
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
                      Adicione os veículos do cliente
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendVehicle({ plate: '', brand: '', model: '', year: '', color: '', renavam: '', notes: '' })}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Veículo
                    </Button>
                  </div>

                  {vehicleFields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                      <Car className="w-8 h-8 mx-auto mb-2 opacity-50" />
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
                                    <Input 
                                      placeholder="ABC-1234 ou ABC1D23" 
                                      {...field} 
                                      value={field.value || ''} 
                                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                    />
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
                                <FormLabel>Observação</FormLabel>
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
                      Adicione produtos/planos do cliente
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendItem({ product_name: '', plan_name: '', price: 0, discount: 0, starts_at: '', due_date: '', expires_at: '', status: 'active' })}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Produto
                    </Button>
                  </div>

                  {(() => {
                    // Filter out service items for this tab
                    const productItems = itemFields.filter((_, idx) => {
                      const planName = form.watch(`items.${idx}.plan_name`);
                      const productName = form.watch(`items.${idx}.product_name`);
                      const isServiceItem = planName === '__service__' || services.some(s => s.name === productName);
                      return !isServiceItem;
                    });
                    
                    if (productItems.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          Nenhum produto cadastrado
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-4">
                        {itemFields.map((field, index) => {
                          // Skip service items in this tab
                          const planName = form.watch(`items.${index}.plan_name`);
                          const productName = form.watch(`items.${index}.product_name`);
                          const isServiceItem = planName === '__service__' || services.some(s => s.name === productName);
                          
                          if (isServiceItem) return null;
                          
                          return (
                            <div key={field.id} className="p-4 border rounded-lg bg-card space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Produto {index + 1}</span>
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
                          {/* Due date at top for visibility */}
                          <FormField
                            control={form.control}
                            name={`items.${index}.due_date`}
                            render={({ field }) => (
                              <FormItem className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                <FormLabel className="text-primary font-semibold">📅 Dia de Vencimento (Cobrança)</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} value={field.value || ''} />
                                </FormControl>
                                <p className="text-xs text-muted-foreground mt-1">Data para geração das cobranças recorrentes</p>
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name={`items.${index}.product_name`}
                              render={({ field }) => {
                                const isKnownProduct = tenantProducts.some(p => p.name === field.value);
                                const showCustomInput = customProductMode[index] || (field.value && !isKnownProduct);
                                
                                return (
                                  <FormItem>
                                    <FormLabel>Produto</FormLabel>
                                    {!showCustomInput ? (
                                      <Select 
                                        onValueChange={(value) => {
                                          if (value === '__none__') {
                                            field.onChange('');
                                          } else if (value === '__custom__') {
                                            setCustomProductMode(prev => ({ ...prev, [index]: true }));
                                            field.onChange('');
                                          } else {
                                            field.onChange(value);
                                            const selectedProduct = tenantProducts.find(p => p.name === value);
                                            if (selectedProduct) {
                                              form.setValue(`items.${index}.price`, selectedProduct.sale_price);
                                            }
                                          }
                                        }} 
                                        value={field.value || '__none__'}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecione o produto" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="__none__">Nenhum</SelectItem>
                                          {tenantProducts.filter(p => p.is_active).map(product => (
                                            <SelectItem key={product.id} value={product.name}>
                                              {product.name}
                                            </SelectItem>
                                          ))}
                                          <SelectItem value="__custom__">+ Digitar manualmente</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <div className="space-y-2">
                                        <FormControl>
                                          <Input 
                                            placeholder="Digite o nome do produto" 
                                            value={field.value || ''}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            autoFocus
                                          />
                                        </FormControl>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="text-xs h-7"
                                          onClick={() => {
                                            setCustomProductMode(prev => ({ ...prev, [index]: false }));
                                            field.onChange('');
                                          }}
                                        >
                                          ← Voltar para lista
                                        </Button>
                                      </div>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                );
                              }}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.plan_name`}
                              render={({ field }) => {
                                const isKnownPlan = tenantPlans.some(p => p.name === field.value);
                                const showCustomInput = customPlanMode[index] || (field.value && !isKnownPlan);
                                
                                return (
                                  <FormItem>
                                    <FormLabel>Plano</FormLabel>
                                    {!showCustomInput ? (
                                      <Select 
                                        onValueChange={(value) => {
                                          if (value === '__none__') {
                                            field.onChange('');
                                          } else if (value === '__custom__') {
                                            setCustomPlanMode(prev => ({ ...prev, [index]: true }));
                                            field.onChange('');
                                          } else {
                                            field.onChange(value);
                                            // Só atualiza o preço se não tiver produto selecionado
                                            const currentProduct = form.getValues(`items.${index}.product_name`);
                                            if (!currentProduct) {
                                              const selectedPlan = tenantPlans.find(p => p.name === value);
                                              if (selectedPlan) {
                                                form.setValue(`items.${index}.price`, selectedPlan.price);
                                              }
                                            }
                                          }
                                        }} 
                                        value={field.value || '__none__'}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Selecione o plano" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="__none__">Nenhum</SelectItem>
                                          {tenantPlans.filter(p => p.is_active).map(plan => (
                                            <SelectItem key={plan.id} value={plan.name}>
                                              {plan.name}
                                            </SelectItem>
                                          ))}
                                          <SelectItem value="__custom__">+ Digitar manualmente</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    ) : (
                                      <div className="space-y-2">
                                        <FormControl>
                                          <Input 
                                            placeholder="Digite o nome do plano" 
                                            value={field.value || ''}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            autoFocus
                                          />
                                        </FormControl>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          className="text-xs h-7"
                                          onClick={() => {
                                            setCustomPlanMode(prev => ({ ...prev, [index]: false }));
                                            field.onChange('');
                                          }}
                                        >
                                          ← Voltar para lista
                                        </Button>
                                      </div>
                                    )}
                                  </FormItem>
                                );
                              }}
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
                                    <CurrencyInput
                                      value={field.value || 0}
                                      onChange={field.onChange}
                                      placeholder="R$ 0,00"
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
                                  <FormLabel>Desconto (R$)</FormLabel>
                                  <FormControl>
                                    <CurrencyInput
                                      value={field.value || 0}
                                      onChange={field.onChange}
                                      placeholder="R$ 0,00"
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
                          );
                        })}
                      </div>
                    );
                  })()}
                </TabsContent>

                {/* Services Tab */}
                <TabsContent value="services" className="space-y-4 mt-0">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Adicione serviços contratados pelo cliente
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendItem({ product_name: '', plan_name: '__service__', price: 0, discount: 0, starts_at: '', due_date: '', expires_at: '', status: 'active' })}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Serviço
                    </Button>
                  </div>

                  {services.filter(s => s.active).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                      <Wrench className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum serviço disponível</p>
                      <p className="text-xs mt-1">Cadastre serviços na página de Serviços</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Show existing service items */}
                      {itemFields.filter((_, idx) => {
                        const planName = form.watch(`items.${idx}.plan_name`);
                        return planName === '__service__' || services.some(s => s.name === form.watch(`items.${idx}.product_name`));
                      }).length === 0 && (
                        <div className="text-center py-4 text-muted-foreground border border-dashed rounded-lg">
                          <Wrench className="w-6 h-6 mx-auto mb-2 opacity-50" />
                          Nenhum serviço vinculado
                        </div>
                      )}
                      
                      {itemFields.map((field, index) => {
                        const planName = form.watch(`items.${index}.plan_name`);
                        const productName = form.watch(`items.${index}.product_name`);
                        const isServiceItem = planName === '__service__' || services.some(s => s.name === productName);
                        
                        if (!isServiceItem) return null;
                        
                        return (
                          <div key={field.id} className="p-4 border rounded-lg bg-card space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Serviço</span>
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
                            
                            {/* Due date for service */}
                            <FormField
                              control={form.control}
                              name={`items.${index}.due_date`}
                              render={({ field }) => (
                                <FormItem className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                                  <FormLabel className="text-primary font-semibold">📅 Dia de Vencimento</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} value={field.value || ''} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              <FormField
                                control={form.control}
                                name={`items.${index}.product_name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Serviço *</FormLabel>
                                    <Select 
                                      onValueChange={(value) => {
                                        field.onChange(value);
                                        const selectedService = services.find(s => s.name === value);
                                        if (selectedService) {
                                          form.setValue(`items.${index}.price`, selectedService.price);
                                          form.setValue(`items.${index}.plan_name`, '__service__');
                                        }
                                      }} 
                                      value={field.value || ''}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecione o serviço" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {services.filter(s => s.active).map(service => (
                                          <SelectItem key={service.id} value={service.name}>
                                            {service.name} - R$ {service.price.toFixed(2)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
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
                                    <FormLabel>Valor (R$)</FormLabel>
                                    <FormControl>
                                      <CurrencyInput
                                        value={field.value || 0}
                                        onChange={field.onChange}
                                        placeholder="R$ 0,00"
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
                                    <FormLabel>Desconto (R$)</FormLabel>
                                    <FormControl>
                                      <CurrencyInput
                                        value={field.value || 0}
                                        onChange={field.onChange}
                                        placeholder="R$ 0,00"
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
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

              </div>

              {/* Footer */}
              <DialogFooter className="px-6 py-4 border-t">
                {!isEditing && hasDraft() && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={discardDraft}
                    className="mr-auto text-muted-foreground hover:text-destructive"
                  >
                    <FileX className="w-4 h-4 mr-1" />
                    Descartar rascunho
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading} className="btn-gradient-primary">
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isEditing ? 'Salvar' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
