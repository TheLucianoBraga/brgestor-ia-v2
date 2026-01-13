import React, { useState } from 'react';
import { Ticket, Plus, Edit, ToggleLeft, ToggleRight, Trash2, Percent, DollarSign, AlertCircle } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { CouponModal } from '@/components/cupons/CouponModal';
import { useCoupons, Coupon, CouponInsert } from '@/hooks/useCoupons';
import { useTenant } from '@/contexts/TenantContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const Cupons: React.FC = () => {
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  const {
    coupons,
    isLoading,
    createCoupon,
    updateCoupon,
    toggleCouponStatus,
    deleteCoupon,
  } = useCoupons();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);

  const handleCreate = () => {
    setEditingCoupon(null);
    setIsModalOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setIsModalOpen(true);
  };

  const handleSubmit = (data: CouponInsert) => {
    if (editingCoupon) {
      updateCoupon.mutate(
        { id: editingCoupon.id, ...data },
        { onSuccess: () => setIsModalOpen(false) }
      );
    } else {
      createCoupon.mutate(data, {
        onSuccess: () => setIsModalOpen(false),
      });
    }
  };

  const handleToggleStatus = (coupon: Coupon) => {
    toggleCouponStatus.mutate({
      id: coupon.id,
      active: !coupon.active,
    });
  };

  const handleDelete = (coupon: Coupon) => {
    setDeletingCoupon(coupon);
  };

  const confirmDelete = () => {
    if (deletingCoupon) {
      deleteCoupon.mutate(deletingCoupon.id, {
        onSuccess: () => setDeletingCoupon(null),
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  // Check tenant type - master, adm, and revenda can access
  const canAccessCoupons = currentTenant?.type === 'master' || currentTenant?.type === 'adm' || currentTenant?.type === 'revenda';

  if (tenantLoading || isLoading) {
    return (
      <div className="page-container">
        <LoadingSkeleton variant="card" count={6} />
      </div>
    );
  }

  // Redirect if not allowed
  if (!canAccessCoupons) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Cupons"
        description="Crie e gerencie cupons de desconto"
        icon={Ticket}
        actions={
          <Button onClick={handleCreate} className="btn-gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            Novo Cupom
          </Button>
        }
      />

      {coupons.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Nenhum cupom ativo"
          description="Crie cupons de desconto para campanhas promocionais e fidelização."
          actionLabel="Criar Cupom"
          onAction={handleCreate}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coupons.map((coupon) => (
            <Card
              key={coupon.id}
              className={cn(
                'transition-all hover:shadow_md',
                !coupon.active && 'opacity_60'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {coupon.discount_type === 'percent' ? (
                        <Percent className="w-5 h-5 text-primary" />
                      ) : (
                        <DollarSign className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base font-mono">
                        {coupon.code}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={coupon.active ? 'default' : 'secondary'}>
                          {coupon.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        {isExpired(coupon.expires_at) && (
                          <Badge variant="destructive">Expirado</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">
                      {coupon.discount_type === 'percent'
                        ? `${coupon.discount_value}%`
                        : formatCurrency(coupon.discount_value)}
                    </p>
                    <p className="text-xs text-muted-foreground">desconto</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div className="flex justify-between">
                    <span>Usos</span>
                    <span className="font-medium text-foreground">
                      {coupon.redemption_count || 0}
                      {coupon.max_redemptions && ` / ${coupon.max_redemptions}`}
                    </span>
                  </div>
                  {coupon.expires_at && (
                    <div className="flex justify-between">
                      <span>Expira em</span>
                      <span className="font-medium text-foreground">
                        {format(new Date(coupon.expires_at), "dd 'de' MMM, yyyy", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(coupon)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(coupon)}
                  >
                    {coupon.active ? (
                      <>
                        <ToggleRight className="w-4 h-4 mr-1" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 mr-1" />
                        Ativar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(coupon)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CouponModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        coupon={editingCoupon}
        onSubmit={handleSubmit}
        isLoading={createCoupon.isPending || updateCoupon.isPending}
      />

      <ConfirmDialog
        open={!!deletingCoupon}
        onOpenChange={(open) => !open && setDeletingCoupon(null)}
        title="Excluir Cupom"
        description={`Tem certeza que deseja excluir o cupom "${deletingCoupon?.code}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteCoupon.isPending}
      />
    </div>
  );
};

export default Cupons;
