import React, { useState } from 'react';
import { Building2, ChevronDown, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu';
import { Badge } from '@/components/ui/badge';
import { useTenant, Tenant } from '@/contexts/TenantContext';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { toast } from 'sonner';

const getTenantTypeBadgeVariant = (type: Tenant['type']) => {
  const variants: Record<Tenant['type'], string> = {
    master: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    adm: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    revenda: 'bg-green-500/20 text-green-400 border-green-500/30',
    cliente: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  return variants[type] || '';
};

const getTenantTypeLabel = (type: Tenant['type']) => {
  const labels: Record<Tenant['type'], string> = {
    master: 'MASTER',
    adm: 'ADM',
    revenda: 'REVENDA',
    cliente: 'CLIENTE',
  };
  return labels[type] || type.toUpperCase();
};

export const TenantSwitcher: React.FC = () => {
  const { currentTenant, userTenants, hasMultipleTenants, switchTenant, isLoading } = useTenant();
  const { getSetting } = useTenantSettings();
  const [isSwitching, setIsSwitching] = useState(false);

  // Use company_name from settings if available, otherwise fallback to tenant name
  const displayName = getSetting('company_name') || currentTenant?.name || '';
  const logoUrl = getSetting('logo_url') || '';

  const handleSwitch = async (tenantId: string) => {
    if (tenantId === currentTenant?.id) return;
    
    setIsSwitching(true);
    try {
      const result = await switchTenant(tenantId);
      if (result.success) {
        toast.success('Conta alterada com sucesso!');
      } else {
        toast.error(result.error || 'Erro ao trocar de conta');
      }
    } finally {
      setIsSwitching(false);
    }
  };

  if (isLoading || !currentTenant) {
    return null;
  }

  // Single tenant - just show badge
  if (!hasMultipleTenants) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="w-6 h-6 rounded object-contain" />
        ) : (
          <Building2 className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium truncate max-w-[120px]">{displayName}</span>
        <Badge 
          variant="outline" 
          className={`text-xs px-1.5 py-0 ${getTenantTypeBadgeVariant(currentTenant.type)}`}
        >
          {getTenantTypeLabel(currentTenant.type)}
        </Badge>
      </div>
    );
  }

  // Multiple tenants - show dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 h-auto py-1.5 px-3 bg-muted/50 hover:bg-muted"
          disabled={isSwitching}
        >
          {isSwitching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-6 h-6 rounded object-contain" />
          ) : (
            <Building2 className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium truncate max-w-[120px]">{displayName}</span>
          <Badge
            variant="outline" 
            className={`text-xs px-1.5 py-0 ${getTenantTypeBadgeVariant(currentTenant.type)}`}
          >
            {getTenantTypeLabel(currentTenant.type)}
          </Badge>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Trocar Conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userTenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => handleSwitch(tenant.id)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium truncate max-w-[140px]">{tenant.name}</p>
                <Badge 
                  variant="outline" 
                  className={`text-xs px-1.5 py-0 mt-0.5 ${getTenantTypeBadgeVariant(tenant.type)}`}
                >
                  {getTenantTypeLabel(tenant.type)}
                </Badge>
              </div>
            </div>
            {tenant.id === currentTenant.id && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
