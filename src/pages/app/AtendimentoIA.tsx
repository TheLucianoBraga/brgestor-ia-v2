import { useState } from 'react';
import { Bot, Globe, MessageSquare, BarChart3, Settings2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useTenantSettings } from '@/hooks/useTenantSettings';

// Components
import { WebsiteTab } from '@/components/atendimento/WebsiteTab';
import { WhatsAppTab } from '@/components/atendimento/WhatsAppTab';
import { AnalyticsTab } from '@/components/atendimento/AnalyticsTab';
import { ConfigTab } from '@/components/atendimento/ConfigTab';

export default function AtendimentoIA() {
  const { getSetting, isLoading } = useTenantSettings();
  
  const chatbotEnabled = getSetting('ai_chatbot_enabled') === 'true';
  const waEnabled = getSetting('wa_auto_enabled') === 'true';

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Atendimento IA"
        description="Configure atendimento automatizado para Website (Chatbot) e WhatsApp (Auto-Responder)"
        icon={Bot}
        actions={
          <div className="flex items-center gap-2">
            {chatbotEnabled && (
              <Badge variant="default" className="gap-1">
                <Globe className="h-3 w-3" /> Website
              </Badge>
            )}
            {waEnabled && (
              <Badge variant="default" className="gap-1 bg-green-600">
                <MessageSquare className="h-3 w-3" /> WhatsApp
              </Badge>
            )}
            {!chatbotEnabled && !waEnabled && (
              <Badge variant="secondary">Inativo</Badge>
            )}
          </div>
        }
      />

      <Tabs defaultValue="website" className="space-y-4">
        <TabsList className="flex sm:grid sm:grid-cols-4 w-full lg:w-[500px] overflow-x-auto no-scrollbar justify-start sm:justify-center">
          <TabsTrigger value="website" className="gap-1.5 text-xs">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Website</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-1.5 text-xs">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 text-xs">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5 text-xs">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="website">
          <WebsiteTab />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppTab />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>

        <TabsContent value="config">
          <ConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
