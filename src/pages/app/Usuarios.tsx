import React, { useState } from 'react';
import { Users, Plus, UserMinus, UserCheck, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { InviteUserModal } from '@/components/usuarios/InviteUserModal';
import { useTenantMembers, TenantMember } from '@/hooks/useTenantMembers';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const Usuarios: React.FC = () => {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
  const {
    members,
    isLoading,
    seatInfo,
    seatInfoLoading,
    createInvite,
    deactivateMember,
    reactivateMember,
    removeMember,
  } = useTenantMembers();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [memberToDeactivate, setMemberToDeactivate] = useState<TenantMember | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TenantMember | null>(null);

  const handleCreateInvite = async () => {
    const result = await createInvite.mutateAsync();
    return result;
  };

  const handleDeactivate = (member: TenantMember) => {
    setMemberToDeactivate(member);
  };

  const handleRemove = (member: TenantMember) => {
    setMemberToRemove(member);
  };

  const confirmDeactivate = () => {
    if (memberToDeactivate) {
      deactivateMember.mutate(memberToDeactivate.user_id, {
        onSuccess: () => setMemberToDeactivate(null),
      });
    }
  };

  const confirmRemove = () => {
    if (memberToRemove) {
      removeMember.mutate(memberToRemove.user_id, {
        onSuccess: () => setMemberToRemove(null),
      });
    }
  };

  const handleReactivate = (member: TenantMember) => {
    reactivateMember.mutate(member.user_id);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Proprietário';
      case 'admin': return 'Administrador';
      case 'user': return 'Usuário';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
      case 'admin':
        return Shield;
      default:
        return UserIcon;
    }
  };

  const canInvite = !seatInfo.hasLimit || (seatInfo.available !== null && seatInfo.available > 0);
  const seatsMessage = seatInfo.hasLimit && seatInfo.available !== null && seatInfo.available <= 0
    ? 'Limite de assentos atingido. Faça upgrade do plano para convidar mais usuários.'
    : undefined;

  const activeMembers = members.filter(m => m.status === 'active');
  const inactiveMembers = members.filter(m => m.status !== 'active');

  if (isLoading || seatInfoLoading) {
    return (
      <div className="page-container">
        <LoadingSkeleton variant="card" count={4} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Usuários"
        description="Gerencie os membros do seu tenant"
        icon={Users}
        actions={
          <div className="flex items-center gap-4">
            {seatInfo.hasLimit && (
              <div className="text-sm">
                <span className="text-muted-foreground">Assentos: </span>
                <span className={cn(
                  "font-semibold",
                  seatInfo.available !== null && seatInfo.available <= 0 ? "text-destructive" : "text-foreground"
                )}>
                  {seatInfo.current}/{seatInfo.max}
                </span>
              </div>
            )}
            <Button onClick={() => setIsInviteModalOpen(true)} className="btn-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Convidar Usuário
            </Button>
          </div>
        }
      />

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário no tenant"
          description="Convide usuários para colaborar neste tenant."
          actionLabel="Convidar Usuário"
          onAction={() => setIsInviteModalOpen(true)}
        />
      ) : (
        <div className="space-y-6">
          {/* Active Members */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Membros Ativos ({activeMembers.length})
            </h3>
            <div className="grid gap-3">
              {activeMembers.map((member) => {
                const RoleIcon = getRoleIcon(member.role_in_tenant);
                const isCurrentUser = member.user_id === user?.id;

                return (
                  <Card key={member.user_id} className="transition-all hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <RoleIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">
                                {member.profile?.full_name || 'Usuário'}
                              </p>
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-xs">Você</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="secondary" className="text-xs">
                                {getRoleLabel(member.role_in_tenant)}
                              </Badge>
                              <span>·</span>
                              <span>
                                Desde {format(new Date(member.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isCurrentUser && member.role_in_tenant !== 'owner' && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeactivate(member)}
                            >
                              <UserMinus className="w-4 h-4 mr-1" />
                              Desativar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemove(member)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Inactive Members */}
          {inactiveMembers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Membros Inativos ({inactiveMembers.length})
              </h3>
              <div className="grid gap-3">
                {inactiveMembers.map((member) => {
                  const RoleIcon = getRoleIcon(member.role_in_tenant);

                  return (
                    <Card key={member.user_id} className="opacity-60 transition-all hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <RoleIcon className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {member.profile?.full_name || 'Usuário'}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  Inativo
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivate(member)}
                              disabled={!canInvite}
                            >
                              <UserCheck className="w-4 h-4 mr-1" />
                              Reativar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemove(member)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <InviteUserModal
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
        onCreateInvite={handleCreateInvite}
        isLoading={createInvite.isPending}
        canInvite={canInvite}
        seatsMessage={seatsMessage}
      />

      <ConfirmDialog
        open={!!memberToDeactivate}
        onOpenChange={(open) => !open && setMemberToDeactivate(null)}
        title="Desativar Usuário"
        description={`Tem certeza que deseja desativar "${memberToDeactivate?.profile?.full_name || 'este usuário'}"? Ele perderá o acesso ao tenant, mas poderá ser reativado depois.`}
        confirmLabel="Desativar"
        variant="destructive"
        onConfirm={confirmDeactivate}
        isLoading={deactivateMember.isPending}
      />

      <ConfirmDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title="Remover Usuário"
        description={`Tem certeza que deseja remover "${memberToRemove?.profile?.full_name || 'este usuário'}" permanentemente? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={confirmRemove}
        isLoading={removeMember.isPending}
      />
    </div>
  );
};

export default Usuarios;
