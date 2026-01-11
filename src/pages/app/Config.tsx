import React from 'react';
import { Settings, Building2, Bell, Link2, Receipt, Users, Brain } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { GeneralSettingsTab } from '@/components/config/GeneralSettingsTab';
import { NotificationSettingsTab } from '@/components/config/NotificationSettingsTab';
import { IntegrationsTab } from '@/components/config/IntegrationsTab';
import { ChargeSettingsTab } from '@/components/config/ChargeSettingsTab';
import { UsersSettingsTab } from '@/components/config/UsersSettingsTab';
import { AITab } from '@/components/config/AITab';

const Config: React.FC = () => {
  const { isLoading } = useTenantSettings();

  if (isLoading) {
    return (
      <div className="page-container">
        <PageHeader
          title="Configurações"
          description="Gerencie as configurações da sua conta e plataforma"
          icon={Settings}
        />
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Configurações"
        description="Gerencie as configurações da sua conta e plataforma"
        icon={Settings}
      />

      <Tabs defaultValue="geral" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-6 h-auto gap-1">
            <TabsTrigger value="geral" className="flex items-center gap-1.5 px-2.5 py-2 text-xs sm:text-sm sm:px-3">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Geral</span>
            </TabsTrigger>
            <TabsTrigger value="notificacoes" className="flex items-center gap-1.5 px-2.5 py-2 text-xs sm:text-sm sm:px-3">
              <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="integracoes" className="flex items-center gap-1.5 px-2.5 py-2 text-xs sm:text-sm sm:px-3">
              <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Integrações</span>
            </TabsTrigger>
            <TabsTrigger value="ia" className="flex items-center gap-1.5 px-2.5 py-2 text-xs sm:text-sm sm:px-3">
              <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Inteligência Artificial</span>
            </TabsTrigger>
            <TabsTrigger value="cobrancas" className="flex items-center gap-1.5 px-2.5 py-2 text-xs sm:text-sm sm:px-3">
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Cobranças</span>
            </TabsTrigger>
            <TabsTrigger value="usuarios" className="flex items-center gap-1.5 px-2.5 py-2 text-xs sm:text-sm sm:px-3">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Usuários</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="geral">
          <GeneralSettingsTab />
        </TabsContent>

        <TabsContent value="notificacoes">
          <NotificationSettingsTab />
        </TabsContent>

        <TabsContent value="integracoes">
          <IntegrationsTab />
        </TabsContent>

        <TabsContent value="ia">
          <AITab />
        </TabsContent>

        <TabsContent value="cobrancas">
          <ChargeSettingsTab />
        </TabsContent>

        <TabsContent value="usuarios">
          <UsersSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Config;
