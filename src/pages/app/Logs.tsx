import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Activity, Download, ChevronDown, ChevronRight, Filter, X, User } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useActivityLog, ActivityLogFilters } from '@/hooks/useActivityLog';
import { useTenantMembers } from '@/hooks/useTenantMembers';

const actionLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  login: { label: 'Login', variant: 'default' },
  logout: { label: 'Logout', variant: 'secondary' },
  create: { label: 'Criação', variant: 'default' },
  update: { label: 'Atualização', variant: 'secondary' },
  delete: { label: 'Exclusão', variant: 'destructive' },
  send: { label: 'Envio', variant: 'default' },
  payment: { label: 'Pagamento', variant: 'default' },
  config_change: { label: 'Configuração', variant: 'outline' },
};

const resourceLabels: Record<string, string> = {
  auth: 'Autenticação',
  client: 'Cliente',
  customer: 'Cliente',
  plan: 'Plano',
  service: 'Serviço',
  charge: 'Cobrança',
  payment: 'Pagamento',
  template: 'Template',
  config: 'Configuração',
  message: 'Mensagem',
  subscription: 'Assinatura',
  coupon: 'Cupom',
  tenant: 'Conta',
  user: 'Usuário',
};

const Logs: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState<ActivityLogFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { logs, total, isLoading, totalPages, uniqueActions, uniqueResources } = useActivityLog(filters, page, pageSize);
  const { members } = useTenantMembers();

  const userMap = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => {
      if (m.user_id && m.profile?.full_name) {
        map[m.user_id] = m.profile.full_name;
      }
    });
    return map;
  }, [members]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleFilterChange = (key: keyof ActivityLogFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v);

  const exportToCSV = () => {
    if (logs.length === 0) return;

    const headers = ['Data/Hora', 'Usuário', 'Ação', 'Recurso', 'Detalhes', 'IP'];
    const rows = logs.map((log) => [
      format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      log.user_id ? userMap[log.user_id] || log.user_id : 'Sistema',
      log.action,
      log.resource,
      JSON.stringify(log.details),
      log.ip_address || '-',
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="page-container space-y-6">
        <PageHeader
          title="Logs de Atividades"
          description="Histórico de ações realizadas no sistema"
        />
        <LoadingSkeleton variant="table" count={10} />
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <PageHeader
        title="Logs de Atividades"
        description="Histórico de ações realizadas no sistema"
        icon={Activity}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={hasActiveFilters ? 'border-primary' : ''}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {Object.values(filters).filter(Boolean).length}
                </Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={logs.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent>
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Filtros</CardTitle>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Data início</Label>
                  <Input
                    type="date"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data fim</Label>
                  <Input
                    type="date"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Select
                    value={filters.userId || ''}
                    onValueChange={(v) => handleFilterChange('userId', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.profile?.full_name || m.user_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ação</Label>
                  <Select
                    value={filters.action || ''}
                    onValueChange={(v) => handleFilterChange('action', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      {uniqueActions.map((action) => (
                        <SelectItem key={action} value={action}>
                          {actionLabels[action]?.label || action}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Recurso</Label>
                  <Select
                    value={filters.resource || ''}
                    onValueChange={(v) => handleFilterChange('resource', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {uniqueResources.map((resource) => (
                        <SelectItem key={resource} value={resource}>
                          {resourceLabels[resource] || resource}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Activity}
                title="Nenhum log encontrado"
                description={hasActiveFilters ? 'Tente ajustar os filtros' : 'As atividades serão registradas aqui'}
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Resumo</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <React.Fragment key={log.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(log.id)}
                      >
                        <TableCell>
                          {log.details && typeof log.details === 'object' && !Array.isArray(log.details) && Object.keys(log.details as object).length > 0 && (
                            expandedRows.has(log.id) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[150px]">
                              {log.user_id ? userMap[log.user_id] || 'Usuário' : 'Sistema'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={actionLabels[log.action]?.variant || 'outline'}>
                            {actionLabels[log.action]?.label || log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {resourceLabels[log.resource] || log.resource}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.details && typeof log.details === 'object' && !Array.isArray(log.details) && Object.keys(log.details as object).length > 0
                            ? Object.entries(log.details as object)
                                .slice(0, 2)
                                .map(([k, v]) => `${k}: ${String(v)}`)
                                .join(', ')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.ip_address || '-'}
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(log.id) && log.details && typeof log.details === 'object' && !Array.isArray(log.details) && Object.keys(log.details as object).length > 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30 p-4">
                            <div className="text-sm">
                              <strong className="text-muted-foreground">Detalhes:</strong>
                              <pre className="mt-2 p-3 bg-background rounded-lg overflow-x-auto text-xs">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, total)} de {total} registros
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1 text-sm">
                    Página {page} de {totalPages || 1}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Logs;
