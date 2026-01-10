import { useState } from 'react';
import { Brain, Sparkles, BookOpen, Settings2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AIControlPanel } from './AIControlPanel';
import { KnowledgeBaseTab } from './KnowledgeBaseTab';

export function AITab() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl shadow-lg">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">Inteligência Artificial</h2>
          <p className="text-muted-foreground mt-1">
            Configure o comportamento da IA, treine com conhecimento personalizado e monitore o desempenho
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <Tabs defaultValue="controles" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="controles" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <span>Controles & Comportamento</span>
          </TabsTrigger>
          <TabsTrigger value="conhecimento" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span>Base de Conhecimento</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="controles" className="space-y-4">
          <AIControlPanel />
        </TabsContent>

        <TabsContent value="conhecimento" className="space-y-4">
          <KnowledgeBaseTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
