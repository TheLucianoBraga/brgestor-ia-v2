import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Building2, MoreVertical, Eye, Power, PowerOff, Mail, Copy, User } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu';
import { toast } from 'sonner';

export interface TenantWithOwner {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: string;
  trial_ends_at?: string | null;
  parent_tenant_id?: string | null;
  owner?: {
    id: string;
    name: string;
    email: string;
  } | null;
  accessLink?: string | null;
  subscription?: {
    plan_name: string;
    ends_at: string | null;
  } | null;
}

interface TenantCardProps {
  tenant: TenantWithOwner;
  onViewDetails: (tenant: TenantWithOwner) => void;
  onToggleStatus: (tenant: TenantWithOwner) => void;
  onResendInvite?: (tenant: TenantWithOwner) => void;
}

const TYPE_LABELS: Record<string, string> = {
  master: 'Master',
  adm: 'ADM',
  revenda: 'Revenda',
  cliente: 'Cliente',
};

const TYPE_COLORS: Record<string, string> = {
  master: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple_300',
  adm: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue_300',
  revenda: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green_300',
  cliente: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange_300',
};

export const TenantCard: React.FC<TenantCardProps> = ({
  tenant,
  onViewDetails,
  onToggleStatus,
  onResendInvite,
}) => {
  const isActive = tenant.status === 'active';
  const hasOwner = !!tenant.owner;

  const handleCopyLink = async () => {
    if (tenant.accessLink) {
      await navigator.clipboard.writeText(tenant.accessLink);
      toast.success('Link copiado!');
    } else {
      toast.error('Link de acesso não disponível');
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold leading-tight truncate">{tenant.name}</h3>
            <p className="text-xs text-muted-foreground">
              Criado em {format(new Date(tenant.created_at), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails(tenant)}>
              <Eye className="w-4 h-4 mr-2" />
              Ver detalhes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleStatus(tenant)}>
              {isActive ? (
                <>
                  <PowerOff className="w-4 h-4 mr-2" />
                  Suspender
                </>
              ) : (
                <>
                  <Power className="w-4 h-4 mr-2" />
                  Ativar
                </>
              )}
            </DropdownMenuItem>
            
            {hasOwner && (
              <>
                <DropdownMenuSeparator />
                {onResendInvite && (
                  <DropdownMenuItem onClick={() => onResendInvite(tenant)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Reenviar convite
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar link de acesso
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={TYPE_COLORS[tenant.type] || 'bg_muted'}>
            {TYPE_LABELS[tenant.type] || tenant.type}
          </Badge>
          <Badge variant={isActive ? 'default' : 'destructive'}>
            {isActive ? 'Ativo' : 'Suspenso'}
          </Badge>
          {!hasOwner && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
              Sem responsável
            </Badge>
          )}
        </div>

        {/* Owner Info */}
        {hasOwner && (
          <div className="flex items-start gap-2 pt-2 border-t">
            <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{tenant.owner!.name}</p>
              <p className="text-xs text-muted-foreground truncate">{tenant.owner!.email}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
