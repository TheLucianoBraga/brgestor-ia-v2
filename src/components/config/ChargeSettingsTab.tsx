import React, { useState, useEffect } from 'react';
import { Receipt, Clock, Plus, X, Save, Loader2, RefreshCw, Play, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { useTemplates } from '@/hooks/useTemplates';
import { useChargeScheduleGenerator } from '@/hooks/useChargeScheduleGenerator';

export const ChargeSettingsTab: React.FC = () => {
  const { settings, updateMultipleSettings } = useTenantSettings();
  const { templates } = useTemplates();
  const { pendingCount, isLoadingCount, regenerateAllSchedules, testScheduledCharges } = useChargeScheduleGenerator();
  
  const [chargeEnabled, setChargeEnabled] = useState(false);
  const [sendOnDueDate, setSendOnDueDate] = useState(true);
  const [daysBeforeDue, setDaysBeforeDue] = useState<number[]>([3, 1]);
  const [daysAfterDue, setDaysAfterDue] = useState<number[]>([1, 3, 7]);
  const [chargeSendTime, setChargeSendTime] = useState('09:00');
  const [templateBeforeDue, setTemplateBeforeDue] = useState('');
  const [templateOnDueDate, setTemplateOnDueDate] = useState('');
  const [templateAfterDue, setTemplateAfterDue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [newDayBefore, setNewDayBefore] = useState('');
  const [newDayAfter, setNewDayAfter] = useState('');

  useEffect(() => {
    if (settings) {
      setChargeEnabled(settings['charge_automation_enabled'] === 'true');
      setSendOnDueDate(settings['charge_send_on_due_date'] !== 'false');
      setChargeSendTime(settings['charge_send_time'] || '09:00');
      setTemplateBeforeDue(settings['charge_template_before_due'] || '');
      setTemplateOnDueDate(settings['charge_template_on_due_date'] || '');
      setTemplateAfterDue(settings['charge_template_after_due'] || '');
      
      try {
        const beforeDays = settings['charge_days_before_due'];
        if (beforeDays) setDaysBeforeDue(JSON.parse(beforeDays));
        
        const afterDays = settings['charge_days_after_due'];
        if (afterDays) setDaysAfterDue(JSON.parse(afterDays));
      } catch (e) {
        console.error('Error parsing charge days settings:', e);
      }
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateMultipleSettings.mutateAsync({
        charge_automation_enabled: chargeEnabled.toString(),
        charge_send_on_due_date: sendOnDueDate.toString(),
        charge_days_before_due: JSON.stringify(daysBeforeDue),
        charge_days_after_due: JSON.stringify(daysAfterDue),
        charge_send_time: chargeSendTime,
        charge_template_before_due: templateBeforeDue,
        charge_template_on_due_date: templateOnDueDate,
        charge_template_after_due: templateAfterDue,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addDayBefore = () => {
    const day = parseInt(newDayBefore);
    if (!isNaN(day) && day > 0 && !daysBeforeDue.includes(day)) {
      setDaysBeforeDue([...daysBeforeDue, day].sort((a, b) => b - a));
      setNewDayBefore('');
    }
  };

  const addDayAfter = () => {
    const day = parseInt(newDayAfter);
    if (!isNaN(day) && day > 0 && !daysAfterDue.includes(day)) {
      setDaysAfterDue([...daysAfterDue, day].sort((a, b) => a - b));
      setNewDayAfter('');
    }
  };

  const removeDayBefore = (day: number) => {
    setDaysBeforeDue(daysBeforeDue.filter(d => d !== day));
  };

  const removeDayAfter = (day: number) => {
    setDaysAfterDue(daysAfterDue.filter(d => d !== day));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Cobranças Automáticas
            </CardTitle>
            <CardDescription>
              Configure o envio automático de lembretes e cobranças via WhatsApp
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="charge-enabled" className="text-sm">Ativar automação</Label>
            <Switch
              id="charge-enabled"
              checked={chargeEnabled}
              onCheckedChange={setChargeEnabled}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Days before due */}
          <div className="space-y-3">
            <Label>Dias para enviar ANTES do vencimento</Label>
            <div className="flex flex-wrap gap-2">
              {daysBeforeDue.map((day) => (
                <Badge key={day} variant="secondary" className="gap-1">
                  {day} dia{day > 1 ? 's' : ''} antes
                  <button
                    onClick={() => removeDayBefore(day)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                placeholder="Ex: 5"
                value={newDayBefore}
                onChange={(e) => setNewDayBefore(e.target.value)}
                className="w-24"
              />
              <Button variant="outline" size="sm" onClick={addDayBefore}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* On due date */}
          <div className="space-y-3">
            <Label>Enviar no dia do vencimento</Label>
            <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
              <Switch
                checked={sendOnDueDate}
                onCheckedChange={setSendOnDueDate}
              />
              <span className="text-sm">
                {sendOnDueDate ? (
                  <Badge variant="default" className="bg-green-600">Ativado</Badge>
                ) : (
                  <Badge variant="outline">Desativado</Badge>
                )}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Enviar cobrança automaticamente no dia do vencimento
            </p>
          </div>

          {/* Days after due */}
          <div className="space-y-3">
            <Label>Dias para enviar APÓS vencimento</Label>
            <div className="flex flex-wrap gap-2">
              {daysAfterDue.map((day) => (
                <Badge key={day} variant="destructive" className="gap-1">
                  {day} dia{day > 1 ? 's' : ''} após
                  <button
                    onClick={() => removeDayAfter(day)}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                placeholder="Ex: 5"
                value={newDayAfter}
                onChange={(e) => setNewDayAfter(e.target.value)}
                className="w-24"
              />
              <Button variant="outline" size="sm" onClick={addDayAfter}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Send time */}
        <div className="space-y-2">
          <Label htmlFor="charge-time" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Horário de envio
          </Label>
          <Input
            id="charge-time"
            type="time"
            value={chargeSendTime}
            onChange={(e) => setChargeSendTime(e.target.value)}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            Horário em que as mensagens serão enviadas
          </p>
        </div>

        {/* Templates */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="template-before">Template (antes do vencimento)</Label>
            <Select value={templateBeforeDue || 'default'} onValueChange={(v) => setTemplateBeforeDue(v === 'default' ? '' : v)}>
              <SelectTrigger id="template-before">
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Mensagem padrão</SelectItem>
                {templates
                  .filter((t) => t.is_active)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.type})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-on-due">Template (no dia do vencimento)</Label>
            <Select value={templateOnDueDate || 'default'} onValueChange={(v) => setTemplateOnDueDate(v === 'default' ? '' : v)}>
              <SelectTrigger id="template-on-due">
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Mensagem padrão</SelectItem>
                {templates
                  .filter((t) => t.is_active)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.type})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-after">Template (após vencimento)</Label>
            <Select value={templateAfterDue || 'default'} onValueChange={(v) => setTemplateAfterDue(v === 'default' ? '' : v)}>
              <SelectTrigger id="template-after">
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Mensagem padrão</SelectItem>
                {templates
                  .filter((t) => t.is_active)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.type})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {templates.filter((t) => t.is_active).length === 0 && (
          <p className="text-xs text-amber-600">
            Nenhum template ativo. <a href="/app/templates" className="underline">Criar template</a>
          </p>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>

        {/* Action buttons */}
        <div className="pt-4 border-t space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {isLoadingCount ? (
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                ) : (
                  <strong>{pendingCount}</strong>
                )}{' '}
                agendamentos pendentes
              </span>
            </div>
            
            <Button
              variant="outline"
              onClick={() => regenerateAllSchedules.mutate()}
              disabled={regenerateAllSchedules.isPending}
            >
              {regenerateAllSchedules.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Regenerar Agendamentos
            </Button>

            <Button
              variant="secondary"
              onClick={() => testScheduledCharges.mutate()}
              disabled={testScheduledCharges.isPending}
            >
              {testScheduledCharges.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Testar Processamento
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Use "Regenerar Agendamentos" para criar agendamentos para clientes existentes. 
            Use "Testar Processamento" para enviar manualmente as cobranças pendentes que já estão no horário.
          </p>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Como funciona</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Ao criar um novo serviço para o cliente, os agendamentos são criados automaticamente</li>
            <li>As mensagens são enviadas no horário configurado via WhatsApp</li>
            <li>Você pode acompanhar o status das cobranças na lista de clientes</li>
            <li>Configure templates personalizados em "Templates de Mensagem"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
