import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Upload, Image as ImageIcon, Layers, FileX } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Service, ServiceInsert } from '@/hooks/useServices';
import { useImageUpload } from '@/hooks/useImageUpload';

const serviceSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  price: z.coerce.number().min(0, 'Preço deve ser positivo'),
  short_description: z.string().optional(),
  long_description: z.string().optional(),
  images: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  commission_type: z.enum(['percentage', 'fixed']),
  commission_value: z.coerce.number().min(0).default(0),
  recurrence_enabled: z.boolean().default(false),
  recurrence_value: z.coerce.number().min(0).default(0),
  duration_months: z.coerce.number().min(0).default(1),
  cta_text: z.string().optional(),
  display_order: z.coerce.number().min(0).default(0),
  active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  // Variation fields
  parent_service_id: z.string().nullable().optional(),
  is_variation: z.boolean().default(false),
  variation_label: z.string().nullable().optional(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  onSubmit: (data: ServiceInsert) => void;
  isLoading?: boolean;
  allServices?: Service[]; // List of all services for parent selection
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
  open,
  onOpenChange,
  service,
  onSubmit,
  isLoading,
  allServices = [],
}) => {
  const [newBenefit, setNewBenefit] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const { uploadImage, isUploading } = useImageUpload();

  // Filter available parent services (exclude current service and its variations)
  const availableParentServices = allServices.filter(s => 
    s.id !== service?.id && !s.is_variation
  );

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      price: 0,
      short_description: '',
      long_description: '',
      images: [],
      benefits: [],
      commission_type: 'percentage',
      commission_value: 10,
      recurrence_enabled: false,
      recurrence_value: 5,
      duration_months: 1,
      cta_text: '',
      display_order: 0,
      active: true,
      is_featured: false,
      parent_service_id: null,
      is_variation: false,
      variation_label: null,
    },
  });

  // Persistência de formulário - apenas para novos serviços
  const { clearDraft, hasDraft, discardDraft } = useFormPersistence({
    form,
    key: 'service_modal',
  });

  const images = form.watch('images') || [];
  const benefits = form.watch('benefits') || [];
  const recurrenceEnabled = form.watch('recurrence_enabled');
  const commissionType = form.watch('commission_type');
  const isVariation = form.watch('is_variation');

  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name,
        price: service.price,
        short_description: service.short_description || '',
        long_description: service.long_description || '',
        images: service.images || [],
        benefits: service.benefits || [],
        commission_type: service.commission_type || 'percentage',
        commission_value: service.commission_value || 10,
        recurrence_enabled: service.recurrence_enabled || false,
        recurrence_value: service.recurrence_value || 5,
        duration_months: service.duration_months || 1,
        cta_text: service.cta_text || '',
        display_order: service.display_order || 0,
        active: service.active ?? true,
        is_featured: service.is_featured || false,
        parent_service_id: service.parent_service_id || null,
        is_variation: service.is_variation || false,
        variation_label: service.variation_label || null,
      });
      // Limpar rascunho quando editando serviço existente
      clearDraft();
    } else if (!hasDraft()) {
      // Só reseta se NÃO tiver rascunho salvo
      form.reset({
        name: '',
        price: 0,
        short_description: '',
        long_description: '',
        images: [],
        benefits: [],
        commission_type: 'percentage',
        commission_value: 10,
        recurrence_enabled: false,
        recurrence_value: 5,
        duration_months: 1,
        cta_text: '',
        display_order: 0,
        active: true,
        is_featured: false,
        parent_service_id: null,
        is_variation: false,
        variation_label: null,
      });
    }
  }, [service, form, open, clearDraft, hasDraft]);

  const handleAddBenefit = () => {
    if (newBenefit.trim()) {
      form.setValue('benefits', [...benefits, newBenefit.trim()]);
      setNewBenefit('');
    }
  };

  const handleRemoveBenefit = (index: number) => {
    form.setValue('benefits', benefits.filter((_, i) => i !== index));
  };

  const handleAddImageUrl = () => {
    if (newImageUrl.trim()) {
      form.setValue('images', [...images, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    form.setValue('images', images.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadImage(file, { folder: 'services' });
      if (result?.url) {
        const currentImages = form.getValues('images') || [];
        form.setValue('images', [...currentImages, result.url], { shouldDirty: true });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
    
    // Reset input para permitir upload do mesmo arquivo novamente
    e.target.value = '';
  };

  const handleSubmit = (data: ServiceFormData) => {
    // Limpar rascunho ao submeter
    clearDraft();
    
    onSubmit({
      name: data.name,
      description: data.short_description || null,
      short_description: data.short_description || null,
      long_description: data.long_description || null,
      images: data.images,
      benefits: data.benefits,
      billing_type: data.duration_months === 0 ? 'one_time' : 'recurring',
      interval: data.duration_months === 0 ? null : 
                data.duration_months === 1 ? 'monthly' : 
                data.duration_months === 3 ? 'quarterly' :
                data.duration_months === 6 ? 'semiannual' : 'yearly',
      price: data.price,
      commission_type: data.commission_type,
      commission_value: data.commission_value,
      recurrence_enabled: data.recurrence_enabled,
      recurrence_value: data.recurrence_value,
      duration_months: data.duration_months,
      cta_text: data.cta_text || 'Assinar',
      display_order: data.display_order,
      is_featured: data.is_featured,
      active: data.active,
      parent_service_id: data.parent_service_id || null,
      is_variation: data.is_variation || false,
      variation_label: data.variation_label || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {service ? 'Editar Serviço' : 'Novo Serviço'}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(90vh-100px)] px-6 pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Nome e Preço */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do serviço" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço (R$) *</FormLabel>
                      <FormControl>
                        <CurrencyInput
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Descrição Curta */}
              <FormField
                control={form.control}
                name="short_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição Curta *</FormLabel>
                    <FormControl>
                      <Input placeholder="Uma linha descrevendo o serviço" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Descrição Longa */}
              <FormField
                control={form.control}
                name="long_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição Longa</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descrição detalhada do serviço..." 
                        className="resize-none"
                        rows={4}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Imagens */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  <Label className="font-medium">Imagens</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                    <Button type="button" variant="outline" size="sm" asChild disabled={isUploading}>
                      <span>
                        <Upload className="h-4 w-4 mr-1" />
                        {isUploading ? 'Enviando...' : 'Enviar Imagem'}
                      </span>
                    </Button>
                  </label>
                  <span className="text-sm text-muted-foreground">ou adicione via URL abaixo</span>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="https://exemplo.com/imagem.jpg"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                  />
                  <Button type="button" size="icon" onClick={handleAddImageUrl}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {images.map((img, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={img} 
                          alt={`Imagem ${index + 1}`} 
                          className="h-16 w-16 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Benefícios */}
              <div className="space-y-3">
                <Label className="font-medium">Benefícios</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Acesso imediato"
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBenefit())}
                  />
                  <Button type="button" size="icon" onClick={handleAddBenefit}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {benefits.length > 0 && (
                  <div className="space-y-2">
                    {benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                        <span className="flex-1 text-sm">{benefit}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBenefit(index)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Comissão Inicial */}
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-4">
                <div>
                  <Label className="font-medium flex items-center gap-2">
                    <span className="text-primary">%</span> Comissão Inicial de Afiliados
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Valor único pago ao indicador na primeira compra do indicado
                  </p>
                </div>
                
                <FormField
                  control={form.control}
                  name="commission_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="percentage" id="percentage" />
                            <Label htmlFor="percentage">% Porcentagem</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="fixed" id="fixed" />
                            <Label htmlFor="fixed">$ Valor Fixo</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commission_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            {commissionType === 'percentage' ? '%' : 'R$'}
                          </span>
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0"
                            className="pl-10"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Recorrência */}
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium flex items-center gap-2">
                      <span className="text-primary">$</span> Recorrência para Indicador (Revshare)
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Valor pago ao indicador a cada renovação do serviço pelo indicado (a partir do 2º pagamento)
                    </p>
                  </div>
                  <FormField
                    control={form.control}
                    name="recurrence_enabled"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {recurrenceEnabled && (
                  <FormField
                    control={form.control}
                    name="recurrence_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                            <Input 
                              type="number" 
                              step="0.01" 
                              min="0"
                              className="pl-10"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Duração */}
              <div className="p-4 rounded-lg border space-y-4">
                <div>
                  <Label className="font-medium flex items-center gap-2">
                    📅 Duração do Serviço
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Quantidade de meses que o serviço fica ativo após a compra. Use 0 para serviço sem expiração (vitalício).
                  </p>
                </div>
                
                <FormField
                  control={form.control}
                  name="duration_months"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            min="0"
                            className="w-24"
                            {...field} 
                          />
                          <span className="text-muted-foreground">mês</span>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* CTA e Ordem */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cta_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto do Botão CTA</FormLabel>
                      <FormControl>
                        <Input placeholder="Assinar (padrão)" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="display_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordem de Exibição</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Variation Section */}
              {availableParentServices.length > 0 && (
                <div className="p-4 rounded-lg border border-dashed space-y-4">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Agrupamento de Variações</Label>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="is_variation"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              if (!checked) {
                                form.setValue('parent_service_id', null);
                                form.setValue('variation_label', null);
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Este serviço é uma variação de outro</FormLabel>
                      </FormItem>
                    )}
                  />

                  {isVariation && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="parent_service_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Serviço Principal</FormLabel>
                            <Select
                              value={field.value || ''}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableParentServices.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="variation_label"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rótulo da Variação</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ex: Mensal, Anual, Premium" 
                                value={field.value || ''}
                                onChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Switches */}
              <div className="flex items-center gap-6">
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Serviço ativo</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_featured"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0 flex items-center gap-1">
                        <span>⭐</span> Destaque
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit */}
              <div className="flex items-center gap-2">
                {!service && hasDraft() && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={discardDraft}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <FileX className="w-4 h-4 mr-1" />
                    Descartar
                  </Button>
                )}
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};