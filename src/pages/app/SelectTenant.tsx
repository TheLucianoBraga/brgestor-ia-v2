import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Check,
  Loader2,
  LogOut,
  ShieldOff
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { useAuth } from '@/contexts/AuthContext';
import { useTenant, Tenant } from '@/contexts/TenantContext';
import { SetupInitialTenant } from '@/components/SetupInitialTenant';

import { toast } from 'sonner';

/* =========================================================
   Helpers
========================================================= */

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

const getRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    owner: 'Proprietário',
    admin: 'Administrador',
    finance: 'Financeiro',
    support: 'Suporte',
    user: 'Usuário',
  };
  return labels[role] || role;
};

/* =========================================================
   Component
========================================================= */

const SelectTenant: React.FC = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { userTenants, switchTenant, isLoading, currentTenant } = useTenant();

  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    // Já tem tenant selecionado → entra direto
    if (currentTenant || profile?.current_tenant_id) {
      navigate('/app/dashboard');
      return;
    }

    // Se só tiver um tenant, auto-seleciona
    if (!isLoading && userTenants.length === 1 && !isSelecting) {
      handleSelectTenant(userTenants[0].id);
    }
  }, [profile, userTenants, isLoading, navigate, currentTenant, isSelecting]);

  const handleSelectTenant = async (tenantId: string) => {
    setIsSelecting(true);
    setSelectedTenant(tenantId);

    try {
      const result = await switchTenant(tenantId);

      if (!result.success) {
        throw new Error(result.error || 'Erro ao selecionar organização');
      }

      toast.success('Organização selecionada!');
      navigate('/app/dashboard');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Erro ao selecionar organização');
      setSelectedTenant(null);
    } finally {
      setIsSelecting(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    toast.success('Você saiu da sua conta');
    navigate('/auth/login');
  };

  /* =========================================================
     Loading
  ========================================================= */

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            Carregando organizações...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     🚨 SEM TENANT → SETUP INICIAL
  ========================================================= */

  if (userTenants.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
              <ShieldOff className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle>Configuração inicial</CardTitle>
            <CardDescription>
              Nenhuma organização foi encontrada.
              Se este é o primeiro acesso, crie o acesso inicial abaixo.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* 🔥 BOTÃO DE SETUP INICIAL */}
            <SetupInitialTenant />

            <Button
              variant="outline"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* =========================================================
     Múltiplos tenants → seleção normal
  ========================================================= */

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Selecionar Conta</CardTitle>
          <CardDescription>
            Escolha a conta que deseja acessar
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {userTenants.map((tenant) => (
            <Button
              key={tenant.id}
              variant="outline"
              className={`w-full h-auto py-4 px-4 justify-start ${
                selectedTenant === tenant.id
                  ? 'border-primary bg-primary/5'
                  : ''
              }`}
              onClick={() => handleSelectTenant(tenant.id)}
              disabled={isSelecting}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </div>

                  <div className="text-left">
                    <p className="font-medium">{tenant.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`text-xs px-1.5 py-0 ${getTenantTypeBadgeVariant(
                          tenant.type
                        )}`}
                      >
                        {getTenantTypeLabel(tenant.type)}
                      </Badge>

                      <span className="text-xs text-muted-foreground">
                        {getRoleLabel(tenant.role_in_tenant)}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedTenant === tenant.id && isSelecting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : selectedTenant === tenant.id ? (
                  <Check className="w-5 h-5 text-primary" />
                ) : null}
              </div>
            </Button>
          ))}

          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SelectTenant;
