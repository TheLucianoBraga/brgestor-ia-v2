import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { CustomerModal } from '@/components/customers/CustomerModal';
import { useTenant } from '@/contexts/TenantContext';
import { useCustomers, FullCustomerInsert } from '@/hooks/useCustomers';

const NovoCliente: React.FC = () => {
  const { currentTenant } = useTenant();
  const { createCustomer } = useCustomers();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  if (currentTenant && !['master', 'adm', 'revenda'].includes(currentTenant.type)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const handleSubmit = async (data: FullCustomerInsert) => {
    try {
      await createCustomer.mutateAsync(data);
      navigate('/app/clientes', { replace: true });
    } catch (err) {
      // Erros já são tratados pelo hook (toast). Não bloqueamos a navegação automática.
    }
  };

  return (
    <div className="page-container space-y-8">
      <PageHeader
        title="Novo Cliente"
        description="Crie um novo cliente"
        icon={Users}
        actions={null}
      />

      <CustomerModal
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) navigate('/app/clientes', { replace: true });
        }}
        onSubmit={handleSubmit}
        isLoading={createCustomer.isPending}
      />
    </div>
  );
};

export default NovoCliente;
