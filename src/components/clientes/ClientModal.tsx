import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, User, MapPin, Car, Package, Search, Loader2, Briefcase } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Customer, CustomerInsert, FullCustomerInsert } from '@/hooks/useCustomers';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useTenantPlans } from '@/hooks/useTenantPlans';
import { useTenantProducts } from '@/hooks/useTenantProducts';
import { useTenantDiscounts } from '@/hooks/useTenantDiscounts';
import { useServices } from '@/hooks/useServices';

const clientSchema = z.object({
  full_name: z.string().trim().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100, 'Nome muito longo'),
  whatsapp: z.string().trim().min(10, 'Telefone inválido').max(20, 'Telefone inválido'),
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo').optional().or(z.literal('')),
  cpf_cnpj: z.string().max(20, 'CPF/CNPJ muito longo').optional().nullable(),
  notes: z.string().max(500, 'Observações muito longas').optional().nullable(),
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
    type: z.enum(['product', 'plan', 'service']).default('product'),
    product_name: z.string().min(1, 'Item obrigatório').max(100),
    plan_name: z.string().max(100).optional().nullable(),
    price: z.coerce.number().min(0).default(0),
    discount: z.coerce.number().min(0).default(0),
    starts_at: z.string().optional().nullable(),
    due_date: z.string().optional().nullable(),
    expires_at: z.string().optional().nullable(),
    status: z.enum(['active', 'expired', 'canceled']).default('active'),
  })).optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Customer | null;
  onSubmit: (data: FullCustomerInsert) => void;
  isLoading?: boolean;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  open,
  onOpenChange,
  client,
  onSubmit,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const isEditing = !!client;

  const { plans: tenantPlans } = useTenantPlans();
  const { products: tenantProducts } = useTenantProducts();
  const { discounts: tenantDiscounts } = useTenantDiscounts();
  const { services } = useServices();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      full_name: '',
      whatsapp: '',
      email: '',
      cpf_cnpj: null,
      notes: null,
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
    if (open) {
      if (client) {
        form.reset({
          full_name: client.full_name,
          email: client.email || '',
          whatsapp: client.whatsapp || '',
          cpf_cnpj: client.cpf_cnpj || '',
          notes: client.notes || '',
          address: {},
          vehicles: [],
          items: [],
        });
      } else {
        form.reset({
          full_name: '',
          whatsapp: '',
          email: '',
          cpf_cnpj: null,
          notes: null,
          address: {},
          vehicles: [],
          items: [],
        });
      }
      setActiveTab('basic');
    }
  }, [open, client, form]);

  const handleFormSubmit = (data: ClientFormData) => {
    onSubmit({
      customer: {
        full_name: data.full_name,
        email: data.email || '',
        whatsapp: data.whatsapp,
        cpf_cnpj: data.cpf_cnpj || '',
        notes: data.notes || '',
      },
      address: data.address,
      vehicles: data.vehicles,
      items: data.items?.map(item => ({
        product_name: item.product_name,
        plan_name: item.plan_name,
        price: item.price,
        discount: item.discount,
        starts_at: item.starts_at,
        due_date: item.due_date,
        expires_at: item.expires_at,
        status: item.status,
      })),
    });
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
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="px-6 flex-shrink-0">
                <TabsList className="grid w-full grid-cols-4">
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
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="email@exemplo.com" {...field} />
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
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Observações</FormLabel>
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
                                onChange={(e) => field.onChange(formatCep(e.target.value))}
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => searchCep(field.value || '')}
                              disabled={isSearchingCep}
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
                            <Input placeholder="Rua, Avenida..." {...field} value={field.value || ''} />
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
                        <FormItem>
                          <FormLabel>Complemento</FormLabel>
                          <FormControl>
                            <Input placeholder="Apto, Bloco..." {...field} value={field.value || ''} />
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
                    <h3 className="text-lg font-medium">Veículos</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendVehicle({
                        plate: '',
                        brand: '',
                        model: '',
                        year: '',
                        color: '',
                        renavam: '',
                        notes: '',
                      })}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Veículo
                    </Button>
                  </div>

                  {vehicleFields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Car className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum veículo cadastrado</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {vehicleFields.map((field, index) => (
                        <div key={field.id} className="border rounded-lg p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">Veículo {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeVehicle(index)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                                    <Input placeholder="Honda" {...field} value={field.value || ''} />
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
                                    <Input placeholder="Civic" {...field} value={field.value || ''} />
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
                                    <Input placeholder="2024" {...field} value={field.value || ''} />
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
                                    <Input placeholder="Preto" {...field} value={field.value || ''} />
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
                                    <Input placeholder="00000000000" {...field} value={field.value || ''} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`vehicles.${index}.notes`}
                              render={({ field }) => (
                                <FormItem className="col-span-2">
                                  <FormLabel>Observações</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Observações do veículo" {...field} value={field.value || ''} />
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

                {/* Items/Products Tab */}
                <TabsContent value="items" className="space-y-4 mt-0">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Produtos / Planos / Serviços</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendItem({
                        type: 'product',
                        product_name: '',
                        plan_name: '',
                        price: 0,
                        discount: 0,
                        starts_at: '',
                        due_date: '',
                        expires_at: '',
                        status: 'active',
                      })}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </div>

                  {itemFields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum produto, plano ou serviço cadastrado</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {itemFields.map((field, index) => {
                        const itemType = form.watch(`items.${index}.type`) || 'product';
                        return (
                        <div key={field.id} className="border rounded-lg p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">Item {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                          
                          {/* Item Type Selector */}
                          <FormField
                            control={form.control}
                            name={`items.${index}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Tipo</FormLabel>
                                <Select 
                                  onValueChange={(value) => {
                                    field.onChange(value);
                                    // Clear the product_name when type changes
                                    form.setValue(`items.${index}.product_name`, '');
                                    form.setValue(`items.${index}.plan_name`, '');
                                    form.setValue(`items.${index}.price`, 0);
                                  }} 
                                  value={field.value || 'product'}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="product">
                                      <span className="flex items-center gap-2">
                                        <Package className="w-4 h-4" /> Produto
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="plan">
                                      <span className="flex items-center gap-2">
                                        <Package className="w-4 h-4" /> Plano
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="service">
                                      <span className="flex items-center gap-2">
                                        <Briefcase className="w-4 h-4" /> Serviço
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {/* Product Selector */}
                            {itemType === 'product' && (
                              <FormField
                                control={form.control}
                                name={`items.${index}.product_name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Produto *</FormLabel>
                                    <Select 
                                      onValueChange={(value) => {
                                        field.onChange(value);
                                        const product = tenantProducts?.find(p => p.name === value);
                                        if (product) {
                                          form.setValue(`items.${index}.price`, product.sale_price);
                                        }
                                      }} 
                                      value={field.value || ''}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {tenantProducts?.filter(p => p.is_active).map(product => (
                                          <SelectItem key={product.id} value={product.name}>
                                            {product.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            {/* Plan Selector */}
                            {itemType === 'plan' && (
                              <FormField
                                control={form.control}
                                name={`items.${index}.product_name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Plano *</FormLabel>
                                    <Select 
                                      onValueChange={(value) => {
                                        field.onChange(value);
                                        const plan = tenantPlans?.find(p => p.name === value);
                                        if (plan) {
                                          form.setValue(`items.${index}.price`, plan.price);
                                        }
                                      }} 
                                      value={field.value || ''}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {tenantPlans?.filter(p => p.is_active).map(plan => (
                                          <SelectItem key={plan.id} value={plan.name}>
                                            {plan.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            {/* Service Selector */}
                            {itemType === 'service' && (
                              <FormField
                                control={form.control}
                                name={`items.${index}.product_name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Serviço *</FormLabel>
                                    <Select 
                                      onValueChange={(value) => {
                                        field.onChange(value);
                                        const service = services?.find(s => s.name === value);
                                        if (service) {
                                          form.setValue(`items.${index}.price`, service.price);
                                        }
                                      }} 
                                      value={field.value || ''}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {services?.filter(s => s.active).map(service => (
                                          <SelectItem key={service.id} value={service.name}>
                                            {service.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
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
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Valor</FormLabel>
                                  <FormControl>
                                    <CurrencyInput
                                      value={field.value || 0}
                                      onChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormMessage />
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
                                    <CurrencyInput
                                      value={field.value || 0}
                                      onChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.due_date`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-primary font-semibold">Vencimento</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="date" 
                                      {...field} 
                                      value={field.value || ''} 
                                      className="border-primary"
                                    />
                                  </FormControl>
                                  <FormMessage />
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
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.expires_at`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Expira em</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} value={field.value || ''} />
                                  </FormControl>
                                  <FormMessage />
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
            </Tabs>

            <Separator />

            <div className="flex justify-end gap-2 p-6 flex-shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="btn-gradient-primary">
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {client ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
