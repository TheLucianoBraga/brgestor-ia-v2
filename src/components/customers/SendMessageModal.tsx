import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll_area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Send,
  Calendar,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  X,
  FileText,
  Repeat,
  Mic,
} from 'lucide-react';
import { useTemplates, MessageTemplate, TEMPLATE_VARIABLES, processTemplateVariables, TEMPLATE_VARIABLE_CATEGORIES } from '@/hooks/useTemplates';
import { useScheduledMessages } from '@/hooks/useScheduledMessages';
import { CustomerWithRelations, CustomerItem } from '@/hooks/useCustomers';
import { useChargeSchedules } from '@/hooks/useChargeSchedules';
import { useTenant } from '@/contexts/TenantContext';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { format, addDays, parseISO, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-postgres';
import { useQuery } from '@tanstack/react-query';

interface SendMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerWithRelations;
}

// Function to calculate final price with discounts
const calculateFinalPrice = (item: CustomerItem): { price: number; discount: number; final: number } => {
  const price = item.price || 0;
  const discount = item.discount || 0;
  const final = Math.max(0, price - discount);
  return { price, discount, final };
};

// Function to generate short payment link (tenant slug or short ID)
const generatePaymentLink = (chargeId?: string, tenantSlug?: string): string => {
  const baseUrl = window.location.origin;
  if (chargeId && tenantSlug) {
    return `${baseUrl}/fatura?id=${chargeId.slice(0, 8)}&t=${tenantSlug}`;
  }
  return '';
};

export const SendMessageModal: React.FC<SendMessageModalProps> = ({
  open,
  onOpenChange,
  customer,
}) => {
  const { templates, isLoading: templatesLoading } = useTemplates();
  const { createScheduledMessage } = useScheduledMessages();
  const { createSchedule } = useChargeSchedules();
  const { currentTenant } = useTenant();
  const { settings } = useTenantSettings();

  // Fetch customer portal password
  const { data: portalAuth } = useQuery({
    queryKey: ['customer-portal_password', customer.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('customer_auth')
        .select('plain_password')
        .eq('customer_id', customer.id)
        .maybeSingle();
      return data;
    },
    enabled: open && !!customer.id,
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customContent, setCustomContent] = useState('');
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customAudio, setCustomAudio] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [isSending, setIsSending] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const audioInputRef = React.useRef<HTMLInputElement>(null);

  // Get active templates for WhatsApp
  const whatsappTemplates = useMemo(() => 
    templates.filter(t => t.channel === 'whatsapp' && t.is_active),
    [templates]
  );

  const selectedTemplate = useMemo(() => 
    templates.find(t => t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  // Get main item from customer
  const mainItem = useMemo(() => {
    const activeItems = customer.customer_items?.filter(i => i.status === 'active') || [];
    return activeItems[0] || null;
  }, [customer]);

  // Calculate prices with discounts
  const priceInfo = useMemo(() => {
    if (!mainItem) return { price: 0, discount: 0, final: 0 };
    return calculateFinalPrice(mainItem);
  }, [mainItem]);

  // Generate payment link
  const paymentLink = useMemo(() => {
    const baseUrl = window.location.origin;
    // Se tivermos um tenant slug, geramos o link para a página de faturas do cliente
    if (currentTenant?.id) {
      // Usamos o ID do cliente e do tenant para criar um link de acesso rápido
      return `${baseUrl}/fatura?c=${customer.id.slice(0, 8)}&t=${currentTenant.id.slice(0, 8)}`;
    }
    return `${baseUrl}/portal`;
  }, [currentTenant, customer.id]);

  // Build variables for template
  const templateVariables = useMemo(() => {
    const address = customer.customer_addresses?.[0];
    const vehicle = customer.customer_vehicles?.[0];
    const firstName = customer.full_name.split(' ')[0];
    
    // Period of day
    const hour = new Date().getHours();
    let period = 'Bom dia';
    if (hour >= 12 && hour < 18) period = 'Boa tarde';
    else if (hour >= 18) period = 'Boa noite';

    return {
      primeiro_nome: firstName,
      nome: customer.full_name,
      whatsapp: customer.whatsapp,
      whatsapp_secundario: customer.secondary_phone || '',
      email: customer.email || '',
      cpf_cnpj: customer.cpf_cnpj || '',
      rg_ie: customer.rg_ie || '',
      nascimento: customer.birth_date ? format(new Date(customer.birth_date), 'dd/MM/yyyy') : '',
      genero: customer.gender || '',
      senha_portal: portalAuth?.plain_password || '',
      produto: mainItem?.product_name || '',
      plano: mainItem?.plan_name || '',
      servico: mainItem?.product_name || '',
      status_servico: mainItem?.status || '',
      valor: `R$ ${priceInfo.price.toFixed(2).replace('.', ',')}`,
      desconto: priceInfo.discount > 0 ? `R$ ${priceInfo.discount.toFixed(2).replace('.', ',')}` : '',
      valor_total_desconto: `R$ ${priceInfo.final.toFixed(2).replace('.', ',')}`,
      vencimento: mainItem?.due_date ? format(new Date(mainItem.due_date), 'dd/MM/yyyy') : '',
      dias: mainItem?.due_date ? 
        Math.max(0, Math.ceil((new Date(mainItem.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))).toString() : '',
      link_pagamento: paymentLink,
      data_cadastro: format(new Date(customer.created_at), 'dd/MM/yyyy'),
      cep: address?.cep || '',
      rua: address?.street || '',
      numero: address?.number || '',
      complemento: address?.complement || '',
      bairro: address?.district || '',
      cidade: address?.city || '',
      estado: address?.state || '',
      placa: vehicle?.plate || '',
      marca: vehicle?.brand || '',
      modelo: vehicle?.model || '',
      ano: vehicle?.year || '',
      cor: vehicle?.color || '',
      renavam: vehicle?.renavam || '',
      periodo_dia: period,
      observacoes: customer.notes || '',
      empresa: currentTenant?.name || '',
      link_portal: `${window.location.origin}/auth/login`,
    };
  }, [customer, mainItem, priceInfo, paymentLink, currentTenant, portalAuth]);

  // Get preview content
  const previewContent = useMemo(() => {
    const content = selectedTemplate ? selectedTemplate.content : customContent;
    return processTemplateVariables(content, templateVariables);
  }, [selectedTemplate, customContent, templateVariables]);

  // Get preview image
  const previewImage = useMemo(() => {
    return customImage || null;
  }, [customImage]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedTemplateId('');
      setCustomContent('');
      setCustomImage(null);
      setCustomAudio(null);
      setScheduleDate('');
      setScheduleTime('09:00');
      setRecurrence('none');
      setShowSchedule(false);
    }
  }, [open]);

  // Insert variable into custom content
  const handleInsertVariable = (variable: string) => {
    setCustomContent(prev => prev + variable);
  };

  // Copy message and open WhatsApp
  const handleCopyAndOpenWhatsApp = () => {
    navigator.clipboard.writeText(previewContent);
    toast.success('Mensagem copiada!');
    
    const cleanNumber = customer.whatsapp.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/55${cleanNumber}`;
    window.open(whatsappUrl, '_blank');
    onOpenChange(false);
  };

  // Send message via WAHA
  const handleSend = async () => {
    if (!previewContent.trim() && !customAudio) {
      toast.error('Digite uma mensagem ou envie um áudio');
      return;
    }

    if (!currentTenant?.id) {
      toast.error('Tenant não encontrado');
      return;
    }

    setIsSending(true);
    try {
      const cleanNumber = customer.whatsapp.replace(/\D/g, '');
      
      // Call WAHA API to send message (with or without image/audio)
      let action = 'send_message';
      if (customAudio) action = 'send_voice';
      else if (previewImage) action = 'send_image';
      
      const { data, error } = await supabase.rpc('waha_api', {
        body: {
          action,
          tenantId: currentTenant.id,
          data: {
            phone: `55${cleanNumber}`,
            message: previewContent,
            ...(previewImage && { imageUrl: previewImage, caption: previewContent }),
            ...(customAudio && { audioUrl: customAudio }),
          },
        },
      });

      if (error) throw error;
      
      if (data?.success === false) {
        throw new Error(data.error || 'Erro ao enviar');
      }
      
      toast.success('Mensagem enviada!');
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error sending message:', err);
      toast.error(err.message || 'Erro ao enviar mensagem. Tente usar "Copiar e abrir WhatsApp".');
    } finally {
      setIsSending(false);
    }
  };

  // Schedule message
  const handleSchedule = async () => {
    if (!previewContent.trim()) {
      toast.error('Digite uma mensagem');
      return;
    }

    if (!scheduleDate) {
      toast.error('Selecione uma data');
      return;
    }

    setIsScheduling(true);
    try {
      const [hours, minutes] = scheduleTime.split(':').map(Number);
      const scheduledDate = setMinutes(setHours(parseISO(scheduleDate), hours), minutes);

      if (scheduledDate <= new Date()) {
        toast.error('A data deve ser no futuro');
        setIsScheduling(false);
        return;
      }

      // Create scheduled message
      createScheduledMessage.mutate({
        customer_id: customer.id,
        template_id: selectedTemplateId || null,
        custom_content: selectedTemplateId ? null : previewContent,
        scheduled_at: scheduledDate.toISOString(),
      }, {
        onSuccess: () => {
          toast.success('Mensagem agendada!');
          
          // If recurrence is set, create additional schedules
          if (recurrence !== 'none') {
            for (let i = 1; i <= 3; i++) {
              let nextDate: Date;
              switch (recurrence) {
                case 'daily':
                  nextDate = addDays(scheduledDate, i);
                  break;
                case 'weekly':
                  nextDate = addDays(scheduledDate, i * 7);
                  break;
                case 'monthly':
                  nextDate = addDays(scheduledDate, i * 30);
                  break;
                default:
                  continue;
              }
              
              createScheduledMessage.mutate({
                customer_id: customer.id,
                template_id: selectedTemplateId || null,
                custom_content: selectedTemplateId ? null : previewContent,
                scheduled_at: nextDate.toISOString(),
              });
            }
          }
          
          onOpenChange(false);
        },
        onError: (err: any) => {
          toast.error('Erro ao agendar: ' + err.message);
        },
      });
    } catch (err: any) {
      console.error('Error scheduling message:', err);
      toast.error('Erro ao agendar mensagem');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Enviar Mensagem - {customer.full_name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pr-2">
            {/* Left side - Message composition */}
            <div className="space-y-4 pr-2">
              {/* Customer info card */}
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="text-sm">
                  <p className="font-medium">{customer.full_name}</p>
                  <p className="text-muted-foreground">{customer.whatsapp}</p>
                  {mainItem && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">{mainItem.product_name}</Badge>
                      {mainItem.plan_name && <Badge variant="outline">{mainItem.plan_name}</Badge>}
                      <Badge variant="secondary">{formatCurrency(priceInfo.final)}</Badge>
                      {priceInfo.discount > 0 && (
                        <Badge variant="outline" className="text-green-600 border-green-600/30">
                          -{formatCurrency(priceInfo.discount)}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Template selection or custom message */}
              <Tabs defaultValue="template" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="template" className="flex-1">
                    <FileText className="w-4 h-4 mr-1" />
                    Templates
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="flex-1">
                    <Send className="w-4 h-4 mr-1" />
                    Personalizada
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="template" className="space-y-3 mt-3">
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {whatsappTemplates.length === 0 ? (
                        <SelectItem value="none" disabled>
                          Nenhum template ativo
                        </SelectItem>
                      ) : (
                        whatsappTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  {selectedTemplate && (
                    <div className="p-3 rounded-lg border bg-card text-sm">
                      <p className="text-muted-foreground mb-1">Conteúdo do template:</p>
                      <p className="whitespace-pre-wrap">{selectedTemplate.content}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="custom" className="space-y-3 mt-3">
                  <div>
                    <Textarea
                      placeholder="Digite sua mensagem..."
                      value={customContent}
                      onChange={(e) => setCustomContent(e.target.value)}
                      className="min-h-[150px]"
                    />
                  </div>

                  {/* Variables buttons - all categories */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Inserir variável:</Label>
                    <ScrollArea className="h-[120px] w-full rounded border p-2">
                      <div className="space-y-2">
                        {TEMPLATE_VARIABLE_CATEGORIES.map((category) => (
                          <div key={category.name}>
                            <p className="text-xs font-medium text-muted-foreground mb-1">{category.name}</p>
                            <div className="flex flex-wrap gap-1">
                              {category.variables.map((v) => (
                                <Button
                                  key={v.key}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-6"
                                  onClick={() => handleInsertVariable(v.key)}
                                  title={v.label}
                                >
                                  {v.key}
                                </Button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Media upload - PARA ENVIO */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Imagem (opcional):</Label>
                      {customImage ? (
                        <div className="relative inline-block">
                          <img src={customImage} alt="Preview" className="h-16 rounded" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-5 w-5"
                            onClick={() => setCustomImage(null)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Input
                          type="url"
                          placeholder="URL da imagem..."
                          onChange={(e) => setCustomImage(e.target.value || null)}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Áudio (opcional):</Label>
                      <input
                        type="file"
                        ref={audioInputRef}
                        className="hidden"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setCustomAudio(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => audioInputRef.current?.click()}
                      >
                        <Mic className="w-4 h-4 mr-2" />
                        {customAudio ? 'Áudio Selecionado' : 'Selecionar Áudio'}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Schedule section */}
              {showSchedule && (
                <div className="p-3 rounded-lg border space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Agendar Envio</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSchedule(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Data</Label>
                      <Input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={format(new Date(), 'yyyy-MM_dd')}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Hora</Label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Recorrência</Label>
                    <Select value={recurrence} onValueChange={(v: any) => setRecurrence(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem recorrência</SelectItem>
                        <SelectItem value="daily">Diário</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

              {/* Right side - Preview */}
            <div className="flex flex-col space-y-4 min-h-[300px]">
              <Label className="font-medium">Pré-visualização</Label>
              
              <div className="flex-1 bg-[#e5ddd5] rounded-lg p-4 overflow-y-auto min-h-[300px]">
                <div className="max-w-[280px] ml-auto">
                  {/* WhatsApp message bubble */}
                  <div className="bg-[#dcf8c6] rounded-lg p-3 shadow-sm relative">
                    {previewImage && (
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="rounded mb-2 max-h-40 w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    {customAudio && (
                      <div className="flex items-center gap-2 mb-2 bg-black/5 p-2 rounded">
                        <Mic className="w-4 h-4 text-primary" />
                        <span className="text-xs">Áudio pronto para envio</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 ml-auto"
                          onClick={() => setCustomAudio(null)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                      {previewContent || (customAudio ? '' : 'Sua mensagem aparecerá aqui...')}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] text-gray-500">
                        {format(new Date(), 'HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment link info */}
              {paymentLink && (
                <div className="p-2 rounded bg-muted/50 text-xs">
                  <span className="text-muted-foreground">Link de pagamento: </span>
                  <span className="font-mono break-all">{paymentLink}</span>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleCopyAndOpenWhatsApp}
            disabled={!previewContent.trim()}
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copiar e abrir WhatsApp
          </Button>
          
          <Button
            onClick={handleSend}
            disabled={!previewContent.trim() || isSending}
            className="flex-1"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? 'Enviando...' : 'Enviar'}
          </Button>
          
          {!showSchedule ? (
            <Button
              variant="secondary"
              onClick={() => setShowSchedule(true)}
              className="flex-1"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Agendar
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={handleSchedule}
              disabled={!previewContent.trim() || !scheduleDate || isScheduling}
              className="flex-1"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {isScheduling ? 'Agendando...' : 'Confirmar Agendamento'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

