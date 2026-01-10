import React, { useState } from 'react';
import { Link2, Building2, Mail, User, Phone, Copy, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

interface CreateTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allowedTypes: string[];
  onSuccess?: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  adm: 'Administradora',
  revenda: 'Revenda',
  cliente: 'Cliente',
};

interface CreatedData {
  tenant: {
    id: string;
    name: string;
    type: string;
  };
  owner: {
    id: string;
    email: string;
    name: string;
    whatsapp?: string;
  };
  accessLink: string | null;
  emailSent: boolean;
}

export const CreateTenantModal: React.FC<CreateTenantModalProps> = ({
  open,
  onOpenChange,
  allowedTypes,
  onSuccess,
}) => {
  const { currentTenant } = useTenant();
  
  // Form fields
  const [tenantName, setTenantName] = useState('');
  const [tenantType, setTenantType] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerWhatsapp, setOwnerWhatsapp] = useState('');
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  const [sendInviteWhatsapp, setSendInviteWhatsapp] = useState(true);
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [createdData, setCreatedData] = useState<CreatedData | null>(null);
  const [copied, setCopied] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenantName.trim()) {
      toast.error('Informe o nome da conta');
      return;
    }
    if (!tenantType) {
      toast.error('Selecione o tipo da conta');
      return;
    }
    if (!ownerEmail.trim()) {
      toast.error('Informe o email do responsável');
      return;
    }
    if (!validateEmail(ownerEmail)) {
      toast.error('Email inválido');
      return;
    }
    if (!ownerName.trim()) {
      toast.error('Informe o nome do responsável');
      return;
    }
    if (!ownerWhatsapp.trim()) {
      toast.error('Informe o WhatsApp do responsável');
      return;
    }
    if (!currentTenant) {
      toast.error('Tenant não selecionado');
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-tenant-with-owner', {
        body: {
          tenantName: tenantName.trim(),
          tenantType,
          ownerEmail: ownerEmail.trim().toLowerCase(),
          ownerName: ownerName.trim(),
          ownerWhatsapp: ownerWhatsapp.trim(),
          sendInviteEmail,
          sendInviteWhatsapp,
          parentTenantId: currentTenant.id,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.ok) {
        throw new Error(data.error?.message || 'Erro ao criar conta');
      }

      toast.success('Conta criada com sucesso!');
      setCreatedData(data.data);
      
      if (data.data.emailSent) {
        toast.success('Email de convite enviado!');
      }
      if (data.data.whatsappSent) {
        toast.success('WhatsApp de convite enviado!');
      }

    } catch (err: any) {
      console.error('Error creating tenant:', err);
      toast.error(err.message || 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (createdData?.accessLink) {
      await navigator.clipboard.writeText(createdData.accessLink);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setTenantName('');
    setTenantType('');
    setOwnerEmail('');
    setOwnerName('');
    setOwnerWhatsapp('');
    setSendInviteEmail(true);
    setSendInviteWhatsapp(true);
    setCreatedData(null);
    setCopied(false);
    onOpenChange(false);
    if (createdData) {
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {createdData ? 'Conta Criada' : 'Nova Conta'}
          </DialogTitle>
          <DialogDescription>
            {createdData
              ? 'Conta criada com sucesso! Veja os detalhes abaixo.'
              : 'Crie uma nova conta e vincule um responsável.'}
          </DialogDescription>
        </DialogHeader>

        {!createdData ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tenant Info */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm">Dados da Conta</h4>
              
              <div className="space-y-2">
                <Label htmlFor="tenantName">Nome da conta *</Label>
                <Input
                  id="tenantName"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Ex: Empresa ABC"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenantType">Tipo *</Label>
                <Select value={tenantType} onValueChange={setTenantType} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t] || t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Owner Info */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <User className="w-4 h-4" />
                Responsável
              </h4>
              
              <div className="space-y-2">
                <Label htmlFor="ownerName">Nome *</Label>
                <Input
                  id="ownerName"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Nome completo"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerEmail">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="ownerEmail"
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="pl-9"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerWhatsapp">WhatsApp *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="ownerWhatsapp"
                    value={ownerWhatsapp}
                    onChange={(e) => setOwnerWhatsapp(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="pl-9"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* Send Invite */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendInviteEmail"
                  checked={sendInviteEmail}
                  onCheckedChange={(checked) => setSendInviteEmail(checked === true)}
                  disabled={isLoading}
                />
                <Label htmlFor="sendInviteEmail" className="text-sm font-normal cursor-pointer">
                  Enviar convite por email
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendInviteWhatsapp"
                  checked={sendInviteWhatsapp}
                  onCheckedChange={(checked) => setSendInviteWhatsapp(checked === true)}
                  disabled={isLoading}
                />
                <Label htmlFor="sendInviteWhatsapp" className="text-sm font-normal cursor-pointer">
                  Enviar convite por WhatsApp
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="btn-gradient-primary">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Conta'
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Created Tenant Info */}
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Conta criada</p>
                <p className="font-semibold">{createdData.tenant.name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {TYPE_LABELS[createdData.tenant.type]}
                </p>
              </div>
              
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground">Responsável</p>
                <p className="font-medium">{createdData.owner.name}</p>
                <p className="text-sm text-muted-foreground">{createdData.owner.email}</p>
                {createdData.owner.whatsapp && (
                  <p className="text-sm text-muted-foreground">{createdData.owner.whatsapp}</p>
                )}
              </div>
            </div>

            {/* Access Link */}
            {createdData.accessLink && (
              <div className="space-y-2">
                <Label>Link de acesso</Label>
                <div className="flex gap-2">
                  <Input
                    value={createdData.accessLink}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button onClick={handleCopyLink} variant="outline" size="icon">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="space-y-1">
                  {createdData.emailSent && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✓ Email de convite enviado para {createdData.owner.email}
                    </p>
                  )}
                  {(createdData as any).whatsappSent && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✓ WhatsApp de convite enviado para {createdData.owner.whatsapp}
                    </p>
                  )}
                  {!createdData.emailSent && !(createdData as any).whatsappSent && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Copie o link e envie manualmente para o responsável
                    </p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Fechar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
