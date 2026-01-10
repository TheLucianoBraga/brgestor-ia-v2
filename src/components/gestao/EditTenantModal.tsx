import React, { useState, useEffect } from 'react';
import { Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: {
    id: string;
    name: string;
    type: string;
  } | null;
  onSuccess?: () => void;
}

export const EditTenantModal: React.FC<EditTenantModalProps> = ({
  open,
  onOpenChange,
  tenant,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTenantDetails = async () => {
      if (!tenant) return;
      
      setName(tenant.name);
      setIsLoading(true);
      
      try {
        // Buscar o dono do tenant para pegar email e whatsapp
        // Primeiro pegamos o user_id do dono
        const { data: memberData, error: memberError } = await supabase
          .from('tenant_members')
          .select('user_id')
          .eq('tenant_id', tenant.id)
          .in('role_in_tenant', ['owner', 'admin'])
          .limit(1)
          .maybeSingle();

        if (memberError) throw memberError;

        if (memberData?.user_id) {
          // Agora buscamos os dados do usuário na tabela profiles
          // Nota: O email e whatsapp podem estar em metadados ou tabelas específicas
          // mas vamos tentar buscar o que estiver disponível no profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', memberData.user_id)
            .maybeSingle();

          if (profileError) throw profileError;

          if (profileData) {
            const profile = profileData as any;
            // Se o email não estiver no profile, tentamos pegar do auth (se possível)
            // mas como estamos no client, vamos exibir o que temos
            setEmail(profile.email || 'Verifique no convite');
            setWhatsapp(profile.whatsapp || 'Verifique no convite');
          }
        }
      } catch (err) {
        console.error('Erro ao buscar detalhes do tenant:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (open && tenant) {
      fetchTenantDetails();
    }
  }, [open, tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !name.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ name: name.trim() })
        .eq('id', tenant.id);

      if (error) throw error;

      toast.success('Conta atualizada com sucesso!');
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar conta');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!tenant) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Editar {tenant.type === 'revenda' ? 'Revenda' : 'Admin'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da conta"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 pt-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">E-mail (Somente leitura)</Label>
              <Input
                value={isLoading ? 'Carregando...' : email}
                readOnly
                className="bg-secondary/50 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">WhatsApp (Somente leitura)</Label>
              <Input
                value={isLoading ? 'Carregando...' : whatsapp}
                readOnly
                className="bg-secondary/50 cursor-not-allowed"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
