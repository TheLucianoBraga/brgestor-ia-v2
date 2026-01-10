import { useState, useEffect } from 'react';
import { format } from 'date-fns';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, Loader2, MessageSquare, User, CreditCard, MapPin, Car, FileText } from 'lucide-react';
import { useTemplates, MessageTemplate, TEMPLATE_VARIABLE_CATEGORIES } from '@/hooks/useTemplates';
import { useCustomers } from '@/hooks/useCustomers';
import { ScheduledMessageInsert } from '@/hooks/useScheduledMessages';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ScheduleMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ScheduledMessageInsert) => void;
  isLoading?: boolean;
}

export function ScheduleMessageModal({
  open,
  onOpenChange,
  onSave,
  isLoading,
}: ScheduleMessageModalProps) {
  const { templates } = useTemplates();
  const { customers } = useCustomers();

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customContent, setCustomContent] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const activeTemplates = templates.filter(t => t.is_active);
  const activeCustomers = customers.filter(c => c.status === 'active');

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

  useEffect(() => {
    if (!open) {
      setSelectedTemplate('');
      setSelectedCustomer('');
      setCustomContent('');
      setScheduledDate('');
      setScheduledTime('');
    }
  }, [open]);

  useEffect(() => {
    if (selectedTemplateData) {
      setCustomContent(selectedTemplateData.content);
    }
  }, [selectedTemplateData]);

  const getPreviewContent = () => {
    if (!customContent) return '';
    let preview = customContent;
    
    if (selectedCustomerData) {
      preview = preview.replace(/{{nome}}/g, selectedCustomerData.full_name);
      preview = preview.replace(/{{whatsapp}}/g, selectedCustomerData.whatsapp || '');
      preview = preview.replace(/{{email}}/g, selectedCustomerData.email || '');
    }
    
    // Replace remaining variables with examples
    preview = preview.replace(/{{valor}}/g, 'R$ 99,90');
    preview = preview.replace(/{{vencimento}}/g, '15/01/2026');
    preview = preview.replace(/{{produto}}/g, 'Plano Premium');
    preview = preview.replace(/{{link_pagamento}}/g, 'https://pay.example.com/abc');
    
    return preview;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    
    onSave({
      template_id: selectedTemplate || null,
      customer_id: selectedCustomer || null,
      scheduled_at: scheduledAt,
      custom_content: customContent || null,
    });
  };

  const isValid = scheduledDate && scheduledTime && (selectedTemplate || customContent.trim()) && selectedCustomer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Agendar Mensagem
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex gap-4 h-[calc(90vh-120px)]">
          {/* Left side - Form */}
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Hora *
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Destinatário *
              </Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {activeCustomers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.full_name} - {customer.whatsapp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <Label htmlFor="template" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Template (opcional)
              </Label>
              <Select value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template ou escreva abaixo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (mensagem personalizada)</SelectItem>
                  {activeTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo da Mensagem *</Label>
              <Textarea
                id="content"
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                placeholder="Digite ou selecione um template..."
                className="min-h-[150px] font-mono text-sm"
              />
              <ScrollArea className="h-[120px]">
                <div className="space-y-2">
                  {TEMPLATE_VARIABLE_CATEGORIES.map((category) => {
                    const IconComponent = {
                      'User': User,
                      'CreditCard': CreditCard,
                      'MapPin': MapPin,
                      'Car': Car,
                      'FileText': FileText,
                    }[category.icon] || FileText;
                    
                    return (
                      <div key={category.name} className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <IconComponent className="h-3 w-3" />
                          {category.name}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {category.variables.map((v) => (
                            <Badge
                              key={v.key}
                              variant="outline"
                              className="cursor-pointer hover:bg-primary hover:text-primary-foreground hover:border-primary text-xs py-0 px-1.5 font-normal"
                              onClick={() => setCustomContent(prev => prev + v.key)}
                              title={`${v.label}: ${v.example}`}
                            >
                              {v.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Submit */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!isValid || isLoading}
                className="flex-1"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Agendar Mensagem
              </Button>
            </div>
          </div>

          {/* Right side - Preview */}
          <div className="w-72 flex flex-col">
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="py-3 flex-shrink-0">
                <CardTitle className="text-sm">Preview da Mensagem</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="bg-[#075E54] rounded-lg p-3 space-y-2">
                    <div className="bg-[#DCF8C6] rounded-lg p-3 text-sm text-gray-800 shadow-sm">
                      <p className="whitespace-pre-wrap break-words">
                        {getPreviewContent() || 'Sua mensagem aparecerá aqui...'}
                      </p>
                      <div className="text-right text-xs text-gray-500 mt-1">
                        {scheduledTime || '--:--'} ✓✓
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {selectedCustomerData && (
              <Card className="mt-4">
                <CardHeader className="py-2">
                  <CardTitle className="text-xs text-muted-foreground">Destinatário</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <p className="font-medium text-sm">{selectedCustomerData.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedCustomerData.whatsapp}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
