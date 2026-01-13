import React, { useState } from 'react';
import { Calendar, Clock, Sparkles, Variable, Repeat, Send, Loader2, Trash2, Image as ImageIcon, X, Upload, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase-postgres';
import { toast } from 'sonner';
import { useTenant } from '@/contexts/TenantContext';

interface GroupScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  wahaGroupId: string;
}

export function GroupScheduleModal({ open, onOpenChange, groupId, groupName, wahaGroupId }: GroupScheduleModalProps) {
  const { currentTenant } = useTenant();
  const [message, setMessage] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [recurrence, setRecurrence] = useState('once');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const variables = [
    { name: 'Nome do Grupo', value: '{nome_grupo}' },
    { name: 'Data Atual', value: '{data_atual}' },
    { name: 'Hora Atual', value: '{hora_atual}' },
    { name: 'Link Portal', value: '{link_portal}' },
  ];

  const insertVariable = (variable: string) => {
    setMessage(prev => prev + variable);
  };

  const improveWithAI = async () => {
    if (!message || !currentTenant?.id) return;
    
    setIsImproving(true);
    try {
      const { data, error } = await supabase.rpc('ai_generate', {
        body: {
          type: 'improve_text',
          text: message,
          context: { 
            tenantId: currentTenant.id,
            purpose: 'Mensagem agendada para grupo de WhatsApp'
          }
        }
      });

      if (error) throw error;
      if (data?.text) {
        setMessage(data.text);
        toast.success('Texto melhorado pela IA!');
      }
    } catch (error) {
      console.error('Erro ao melhorar texto:', error);
      toast.error('Erro ao usar IA para melhorar o texto');
    } finally {
      setIsImproving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (imageUrls.length + files.length > 5) {
      toast.error('Máximo de 5 imagens permitido');
      return;
    }

    setIsUploading(true);
    try {
      const newUrls = [...imageUrls];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${currentTenant?.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('group_schedules')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('group_schedules')
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      setImageUrls(newUrls);
      toast.success('Upload concluído!');
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const addImageUrl = () => {
    if (!newImageUrl) return;
    if (imageUrls.length >= 5) {
      toast.error('Máximo de 5 imagens permitido');
      return;
    }
    setImageUrls([...imageUrls, newImageUrl]);
    setNewImageUrl('');
  };

  const removeImageUrl = (index: number) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!message || !scheduledDate || !scheduledTime || !currentTenant?.id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
      
      const { error } = await (supabase as any)
        .from('group_message_schedules')
        .insert({
          tenant_id: currentTenant.id,
          group_id: groupId,
          waha_group_id: wahaGroupId,
          message,
          image_urls: imageUrls,
          scheduled_at: scheduledAt,
          recurrence,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Mensagem agendada com sucesso!');
      onOpenChange(false);
      // Reset form
      setMessage('');
      setScheduledDate('');
      setScheduledTime('');
      setRecurrence('once');
    } catch (error) {
      console.error('Erro ao agendar mensagem:', error);
      toast.error('Erro ao salvar agendamento');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Agendar Mensagem: {groupName}
          </DialogTitle>
          <DialogDescription>
            Configure uma mensagem para ser enviada automaticamente para este grupo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mensagem */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Mensagem</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-[10px] gap-1 text-primary"
                onClick={improveWithAI}
                disabled={isImproving || !message}
              >
                {isImproving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Melhorar com IA
              </Button>
            </div>
            <Textarea 
              placeholder="Digite a mensagem que será enviada..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {variables.map((v) => (
                <Badge 
                  key={v.value} 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-primary/10 transition-colors text-[10px]"
                  onClick={() => insertVariable(v.value)}
                >
                  <Variable className="w-3 h-3 mr-1" />
                  {v.name}
                </Badge>
              ))}
            </div>
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Data
              </Label>
              <Input 
                type="date" 
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-3 h-3" /> Hora
              </Label>
              <Input 
                type="time" 
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          {/* Recorrência */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Repeat className="w-3 h-3" /> Recorrência
            </Label>
            <Select value={recurrence} onValueChange={setRecurrence}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="once">Apenas uma vez</SelectItem>
                <SelectItem value="daily">Diariamente</SelectItem>
                <SelectItem value="weekly">Semanalmente</SelectItem>
                <SelectItem value="monthly">Mensalmente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Imagens */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <ImageIcon className="w-3 h-3" /> Imagens (Máx. 5)
            </Label>
            
            <div className="grid grid-cols-1 gap-2">
              <div className="flex gap-2">
                <Input 
                  placeholder="URL da imagem..."
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="icon" onClick={addImageUrl} title="Adicionar por URL">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="relative">
                <Input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  id="file-upload"
                  onChange={handleFileUpload}
                  disabled={isUploading || imageUrls.length >= 5}
                />
                <Label 
                  htmlFor="file-upload" 
                  className={`flex items-center justify-center gap-2 p-2 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted transition-colors ${isUploading ? 'opacity-50 cursor-not_allowed' : ''}`}
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span className="text-xs font-medium">Fazer Upload de Imagens</span>
                </Label>
              </div>
            </div>
            
            {imageUrls.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mt-2">
                {imageUrls.map((url, index) => (
                  <div key={index} className="relative group aspect-square rounded-md overflow-hidden border bg-muted">
                    <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => removeImageUrl(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Agendar Mensagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

