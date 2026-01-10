import { Bot, MessageSquare, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useChatbotConfig } from '@/hooks/useChatbot';
import { useChatbotAnalytics } from '@/hooks/useChatbotAnalytics';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export function AnalyticsTab() {
  const { sessions } = useChatbotConfig();
  const { analytics, isLoading: analyticsLoading } = useChatbotAnalytics();

  const resolutionRate = analytics.totalSessions > 0 
    ? Math.round((analytics.resolvedByAI / analytics.totalSessions) * 100) 
    : 0;
  const satisfactionRate = (analytics.positiveRatings + analytics.negativeRatings) > 0
    ? Math.round((analytics.positiveRatings / (analytics.positiveRatings + analytics.negativeRatings)) * 100)
    : 0;

  const chatbotSessions = analytics.totalSessions - analytics.whatsappConversations;

  return (
    <div className="space-y-6">
      {/* Top metrics - Unified */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{analytics.totalSessions}</div>
            <p className="text-xs text-muted-foreground">Total de Atendimentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{resolutionRate}%</div>
            <p className="text-xs text-muted-foreground">Resolvido pela IA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{satisfactionRate}%</div>
            <p className="text-xs text-muted-foreground">Satisfação</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{analytics.avgMessagesPerSession}</div>
            <p className="text-xs text-muted-foreground">Msgs por Atendimento</p>
          </CardContent>
        </Card>
      </div>

      {/* Channel comparison */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Website Chatbot */}
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Chatbot Website
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-primary/5">
                <p className="text-2xl font-bold">{chatbotSessions}</p>
                <p className="text-xs text-muted-foreground">Sessões</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary/5">
                <p className="text-2xl font-bold">{analytics.activeSessions}</p>
                <p className="text-xs text-muted-foreground">Ativas</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary/5">
                <p className="text-2xl font-bold">{analytics.totalActions}</p>
                <p className="text-xs text-muted-foreground">Ações</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Auto-Responder */}
        <Card className="border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              WhatsApp Auto-Responder
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-2xl font-bold text-green-600">{analytics.whatsappConversations}</p>
                <p className="text-xs text-muted-foreground">Conversas</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-2xl font-bold text-green-600">{analytics.whatsappMessages}</p>
                <p className="text-xs text-muted-foreground">Mensagens</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-2xl font-bold text-green-600">
                  {analytics.whatsappConversations > 0 
                    ? Math.round(analytics.whatsappMessages / analytics.whatsappConversations * 10) / 10 
                    : 0}
                </p>
                <p className="text-xs text-muted-foreground">Msgs/Conversa</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atendimentos por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.sessionsOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analytics.sessionsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem dados para exibir
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ações Mais Executadas</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topActions.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.topActions} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="action_type" type="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem ações registradas
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Métricas Detalhadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold">{analytics.totalActions}</p>
              <p className="text-xs text-muted-foreground">Ações Executadas</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-orange-600">{analytics.transferredToHuman}</p>
              <p className="text-xs text-muted-foreground">Transferências</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-green-600">{analytics.positiveRatings}</p>
              <p className="text-xs text-muted-foreground">👍 Positivos</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-red-600">{analytics.negativeRatings}</p>
              <p className="text-xs text-muted-foreground">👎 Negativos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sessões Recentes (Chatbot)</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions && sessions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Início</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mensagens</TableHead>
                  <TableHead>Duração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.slice(0, 10).map((session) => {
                  const messagesCount = Array.isArray(session.messages) ? session.messages.length : 0;
                  const startTime = new Date(session.started_at);
                  const endTime = session.ended_at ? new Date(session.ended_at) : null;
                  const duration = endTime 
                    ? Math.round((endTime.getTime() - startTime.getTime()) / 60000)
                    : null;

                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        {format(startTime, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                          {session.status === 'active' ? 'Ativa' : 'Encerrada'}
                        </Badge>
                      </TableCell>
                      <TableCell>{messagesCount}</TableCell>
                      <TableCell>
                        {duration !== null ? `${duration} min` : 'Em andamento'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma sessão encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
