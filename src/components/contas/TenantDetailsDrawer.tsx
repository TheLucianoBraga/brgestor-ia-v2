import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Building2, Calendar, Tag } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChildTenant } from '@/hooks/useChildTenants';

interface TenantDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: ChildTenant | null;
}

const TYPE_LABELS: Record<string, string> = {
  master: 'Master',
  adm: 'Administradora',
  revenda: 'Revenda',
  cliente: 'Cliente',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  suspended: 'destructive',
  pending: 'secondary',
};

export const TenantDetailsDrawer: React.FC<TenantDetailsDrawerProps> = ({
  open,
  onOpenChange,
  tenant,
}) => {
  if (!tenant) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Detalhes da Conta
          </SheetTitle>
          <SheetDescription>
            Metadados da conta filha
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Name */}
          <div>
            <h3 className="text-2xl font-bold">{tenant.name}</h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={STATUS_VARIANTS[tenant.status] || 'secondary'}>
                {tenant.status === 'active' ? 'Ativo' : tenant.status === 'suspended' ? 'Suspenso' : tenant.status}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {TYPE_LABELS[tenant.type] || tenant.type}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Tag className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ID</p>
                <p className="font-mono text-sm">{tenant.id}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Building2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium capitalize">{TYPE_LABELS[tenant.type] || tenant.type}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Criado em</p>
                <p className="font-medium">
                  {format(new Date(tenant.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Esta visualização mostra apenas metadados públicos da conta. 
              Dados internos como usuários, configurações e financeiro não são acessíveis.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
