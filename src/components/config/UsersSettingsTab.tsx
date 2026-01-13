import React, { useState } from 'react';
import { Users, UserPlus, Crown, Shield, User, MoreVertical, Copy, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTenantMembers } from '@/hooks/useTenantMembers';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export const UsersSettingsTab: React.FC = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const { members, isLoading, seatInfo, createInvite, deactivateMember, removeMember, reactivateMember } = useTenantMembers();
  
  const [inviteCode, setInviteCode] = useState<number | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const handleCreateInvite = async () => {
    const result = await createInvite.mutateAsync();
    if (result?.code) {
      setInviteCode(result.code);
    }
  };

  const handleCopyInvite = () => {
    if (inviteCode) {
      const inviteUrl = `${window.location.origin}/signup?ref=${inviteCode}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopiedInvite(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopiedInvite(false), 3000);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-amber-500" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-500" />;
      default:
        return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Proprietário</Badge>;
      case 'admin':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Admin</Badge>;
      default:
        return <Badge variant="secondary">Usuário</Badge>;
    }
  };

  const usagePercentage = seatInfo.hasLimit && seatInfo.max 
    ? (seatInfo.current / seatInfo.max) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Seat Usage */}
      {seatInfo.hasLimit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Limite de Usuários
            </CardTitle>
            <CardDescription>
              Uso de assentos do seu plano atual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Usuários ativos</span>
              <span className="font-medium">
                {seatInfo.current} / {seatInfo.max}
              </span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
            {seatInfo.available !== null && seatInfo.available <= 2 && (
              <p className="text-xs text-amber-600">
                {seatInfo.available === 0 
                  ? 'Limite atingido. Faça upgrade para adicionar mais usuários.'
                  : `Apenas ${seatInfo.available} assento(s) disponível(is).`
                }
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invite Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Convidar Usuário
          </CardTitle>
          <CardDescription>
            Crie um link de convite para adicionar novos membros à sua equipe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {inviteCode ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Link de convite gerado:</p>
              <div className="flex gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono overflow-x-auto">
                  {`${window.location.origin}/signup?ref=${inviteCode}`}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopyInvite}>
                  {copiedInvite ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Compartilhe este link. O usuário será adicionado automaticamente ao criar uma conta.
              </p>
            </div>
          ) : (
            <Button 
              onClick={handleCreateInvite} 
              disabled={createInvite.isPending || (seatInfo.hasLimit && seatInfo.available === 0)}
            >
              {createInvite.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Gerar Link de Convite
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Membros da Equipe
          </CardTitle>
          <CardDescription>
            Gerencie os usuários com acesso a esta conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRoleIcon(member.role_in_tenant)}
                        <span className="font-medium">
                          {member.profile?.full_name || 'Usuário'}
                        </span>
                        {member.user_id === user?.id && (
                          <Badge variant="outline" className="text-xs">Você</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role_in_tenant)}</TableCell>
                    <TableCell>
                      {member.status === 'active' ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.user_id !== user?.id && member.role_in_tenant !== 'owner' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.status === 'active' ? (
                              <DropdownMenuItem onClick={() => setConfirmDeactivate(member.user_id)}>
                                Desativar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => reactivateMember.mutate(member.user_id)}>
                                Reativar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-destructive" 
                              onClick={() => setConfirmRemove(member.user_id)}
                            >
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={!!confirmDeactivate}
        onOpenChange={(open) => !open && setConfirmDeactivate(null)}
        title="Desativar usuário"
        description="O usuário perderá acesso à plataforma. Você pode reativar a qualquer momento."
        confirmLabel="Desativar"
        onConfirm={() => {
          if (confirmDeactivate) {
            deactivateMember.mutate(confirmDeactivate);
            setConfirmDeactivate(null);
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmRemove}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
        title="Remover usuário"
        description="Esta ação é permanente. O usuário será removido completamente da equipe."
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={() => {
          if (confirmRemove) {
            removeMember.mutate(confirmRemove);
            setConfirmRemove(null);
          }
        }}
      />
    </div>
  );
};
