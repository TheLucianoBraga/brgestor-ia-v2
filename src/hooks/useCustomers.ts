import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useTenant } from '@/contexts/TenantContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantSettings } from '@/hooks/useTenantSettings';
import { logActivityDirect } from '@/hooks/useActivityLog';
import { toast } from 'sonner';
import { getFriendlyErrorMessage } from '@/lib/errorMessages';
import { addDays, setHours, setMinutes, parseISO } from 'date-fns';

export interface Customer {
  id: string;
  tenant_id: string;
  full_name: string;
  whatsapp: string;
  email: string;
  cpf_cnpj: string | null;
  rg_ie: string | null;
  pix_key?: string | null;
  birth_date: string | null;
  gender: string | null;
  secondary_phone: string | null;
  status: string;
  notes: string | null;
  allow_whatsapp: boolean;
  allow_email: boolean;
  allow_portal_notifications: boolean;
  created_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
}

export interface CustomerVehicle {
  id: string;
  customer_id: string;
  plate: string | null;
  brand: string | null;
  model: string | null;
  year: string | null;
  color: string | null;
  renavam: string | null;
  notes: string | null;
}

export interface CustomerItem {
  id: string;
  customer_id: string;
  product_name: string;
  plan_name: string | null;
  price: number;
  starts_at: string | null;
  due_date: string | null;
  expires_at: string | null;
  status: string;
  discount: number;
  created_at: string;
}

export interface CustomerWithRelations extends Customer {
  customer_addresses: CustomerAddress[];
  customer_vehicles: CustomerVehicle[];
  customer_items: CustomerItem[];
}

// Alias for backwards compatibility
export type CustomerWithItems = CustomerWithRelations;

export interface CustomerInsert {
  full_name: string;
  whatsapp: string;
  email: string;
  cpf_cnpj?: string | null;
  rg_ie?: string | null;
  pix_key?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  secondary_phone?: string | null;
  status?: string;
  notes?: string | null;
  allow_whatsapp?: boolean;
  allow_email?: boolean;
  allow_portal_notifications?: boolean;
}

export interface AddressInsert {
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface VehicleInsert {
  plate?: string | null;
  brand?: string | null;
  model?: string | null;
  year?: string | null;
  color?: string | null;
  renavam?: string | null;
  notes?: string | null;
}

export interface ItemInsert {
  product_name: string;
  plan_name?: string | null;
  price?: number;
  starts_at?: string | null;
  due_date?: string | null;
  expires_at?: string | null;
  status?: string;
  discount?: number;
}

export interface FullCustomerInsert {
  customer: CustomerInsert;
  address?: AddressInsert;
  vehicles?: VehicleInsert[];
  items?: ItemInsert[];
  password?: string; // Optional password for creating customer with auth
}

export const useCustomers = () => {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { settings } = useTenantSettings();

  // Wrapper for generating charge schedules using dynamic import
  const generateChargeSchedules = async (
    customerId: string,
    customerItemId: string,
    dueDate: string,
    tenantId: string
  ) => {
    // Dynamically import to avoid circular dependency issues
    const { generateChargeSchedulesForItem } = await import('./useChargeScheduleGenerator');
    await generateChargeSchedulesForItem(customerId, customerItemId, dueDate, tenantId);
  };

  const customersQuery = useQuery({
    queryKey: ['customers', currentTenant?.id],
    queryFn: async () => {
      if (!currentTenant?.id) return [];

      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          customer_addresses (*),
          customer_vehicles (*),
          customer_items (*)
        `)
        .eq('tenant_id', currentTenant.id)
        .order('status', { ascending: false }) // pending first (p > a alphabetically DESC)
        .order('full_name');

      if (error) throw error;
      return data as CustomerWithRelations[];
    },
    enabled: !!currentTenant?.id,
  });

  const createCustomer = useMutation({
    mutationFn: async (data: FullCustomerInsert) => {
      if (!currentTenant?.id) throw new Error('Tenant não selecionado');

      let customerId: string;
      let newCustomer: Customer;

      // If password is provided, use the SQL function to create customer with auth
      if (data.password) {
        const { data: result, error: rpcError } = await supabase.rpc('create_customer_with_auth', {
          p_tenant_id: currentTenant.id,
          p_full_name: data.customer.full_name,
          p_email: data.customer.email,
          p_whatsapp: data.customer.whatsapp,
          p_password: data.password,
          p_cpf_cnpj: data.customer.cpf_cnpj || null,
          p_birth_date: data.customer.birth_date || null,
          p_notes: data.customer.notes || null,
          p_pix_key: data.customer.pix_key || null,
        });

        if (rpcError) throw rpcError;
        
        const rpcResult = result as { success: boolean; error?: string; customer_id?: string };
        
        if (!rpcResult.success) {
          throw new Error(rpcResult.error || 'Erro ao criar cliente com autenticação');
        }

        customerId = rpcResult.customer_id!;
        
        // Fetch the created customer
        const { data: fetchedCustomer, error: fetchError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customerId)
          .single();
        
        if (fetchError) throw fetchError;
        newCustomer = fetchedCustomer;
      } else {
        // Create customer without auth (traditional method)
        const { data: createdCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            ...data.customer,
            tenant_id: currentTenant.id,
          })
          .select()
          .single();

        if (customerError) throw customerError;
        newCustomer = createdCustomer;
        customerId = newCustomer.id;
      }

      // Create address if provided
      if (data.address && Object.values(data.address).some(v => v)) {
        const { error: addressError } = await supabase
          .from('customer_addresses')
          .insert({
            ...data.address,
            customer_id: customerId,
          });
        if (addressError) throw addressError;
      }

      // Create vehicles if provided
      if (data.vehicles && data.vehicles.length > 0) {
        const vehiclesWithCustomerId = data.vehicles
          .filter(v => v.plate || v.model)
          .map(v => ({ ...v, customer_id: customerId }));
        
        if (vehiclesWithCustomerId.length > 0) {
          const { error: vehiclesError } = await supabase
            .from('customer_vehicles')
            .insert(vehiclesWithCustomerId);
          if (vehiclesError) throw vehiclesError;
        }
      }

      // Create items if provided
      if (data.items && data.items.length > 0) {
        const itemsWithCustomerId = data.items
          .filter(i => i.product_name)
          .map(i => ({ 
            ...i, 
            customer_id: customerId,
            // Convert empty strings to null for date fields
            starts_at: i.starts_at || null,
            due_date: i.due_date || null,
            expires_at: i.expires_at || null,
          }));
        
        if (itemsWithCustomerId.length > 0) {
          const { data: createdItems, error: itemsError } = await supabase
            .from('customer_items')
            .insert(itemsWithCustomerId)
            .select();
          if (itemsError) throw itemsError;

          // Generate charge schedules for items with due dates
          if (createdItems) {
            for (const item of createdItems) {
              if (item.due_date) {
                await generateChargeSchedules(
                  customerId,
                  item.id,
                  item.due_date,
                  currentTenant.id
                );
              }
            }
          }
        }
      }

      return newCustomer;
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente criado com sucesso!');
      // Log activity
      if (currentTenant?.id) {
        logActivityDirect(currentTenant.id, user?.id || null, 'create', 'customer', {
          customer_id: newCustomer.id,
          customer_name: newCustomer.full_name,
        });
      }
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyErrorMessage(error));
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...data }: FullCustomerInsert & { id: string }) => {
      // Update customer
      const { error: customerError } = await supabase
        .from('customers')
        .update(data.customer)
        .eq('id', id);

      if (customerError) throw customerError;

      // Handle portal access - create or update (SYNCS BOTH portal and app passwords)
      if (data.password && data.customer.email) {
        // Check if customer already has portal access
        const { data: existingAuth } = await supabase
          .from('customer_auth')
          .select('id')
          .eq('customer_id', id)
          .maybeSingle();

        if (existingAuth) {
          // Update existing password - use sync function that updates BOTH portal and app
          const { data: syncResult, error: syncError } = await supabase.rpc('update_customer_password_sync', {
            p_customer_id: id,
            p_new_password: data.password,
          });
          
          if (syncError) {
            console.error('Error updating password sync:', syncError);
            throw new Error(`Erro ao atualizar senha: ${syncError.message}`);
          }
          
          const syncResultObj = syncResult as { success?: boolean; error?: string; updated_app?: boolean } | null;
          if (syncResultObj && !syncResultObj.success) {
            throw new Error(syncResultObj.error || 'Erro ao atualizar senha');
          }
          
          console.log('Password sync result:', syncResultObj);
        } else {
          // Create new portal access using the RPC function
          const { data: result, error: rpcError } = await supabase.rpc('create_customer_auth_only', {
            p_customer_id: id,
            p_email: data.customer.email,
            p_password: data.password,
          });

          console.log('RPC create_customer_auth_only result:', result, 'error:', rpcError);

          if (rpcError) {
            console.error('RPC error:', rpcError);
            throw new Error(`Erro ao criar acesso: ${rpcError.message}`);
          }
          
          // Check if RPC returned success false
          const resultObj = result as { success?: boolean; error?: string } | null;
          if (resultObj && !resultObj.success) {
            throw new Error(resultObj.error || 'Erro ao criar acesso ao portal');
          }
          
          // Save plain password for messaging
          await supabase
            .from('customer_auth')
            .update({ plain_password: data.password })
            .eq('customer_id', id);
        }
      }

      // Handle address - upsert
      if (data.address) {
        // Delete existing and insert new
        await api.deleteCustomerAddresses(id);
        
        if (Object.values(data.address).some(v => v)) {
          const { error: addressError } = await supabase
            .from('customer_addresses')
            .insert({ ...data.address, customer_id: id });
          if (addressError) throw addressError;
        }
      }

      // Handle vehicles - replace all
      if (data.vehicles !== undefined) {
        await api.deleteCustomerVehicles(id);
        
        const validVehicles = data.vehicles.filter(v => v.plate || v.model);
        if (validVehicles.length > 0) {
          const { error: vehiclesError } = await supabase
            .from('customer_vehicles')
            .insert(validVehicles.map(v => ({ ...v, customer_id: id })));
          if (vehiclesError) throw vehiclesError;
        }
      }

      // Handle items - replace all and regenerate charge schedules
      if (data.items !== undefined) {
        // Delete old items
        await api.deleteCustomerItems(id);
        
        // Delete pending charge schedules for this customer
        await supabase
          .from('charge_schedules')
          .delete()
          .eq('customer_id', id)
          .eq('status', 'pending');
        
        const validItems = data.items.filter(i => i.product_name);
        if (validItems.length > 0) {
          const { data: createdItems, error: itemsError } = await supabase
            .from('customer_items')
            .insert(validItems.map(i => ({ 
              ...i, 
              customer_id: id,
              starts_at: i.starts_at || null,
              due_date: i.due_date || null,
              expires_at: i.expires_at || null,
            })))
            .select();
          if (itemsError) throw itemsError;

          // Generate charge schedules for items with due dates
          if (createdItems && currentTenant?.id) {
            for (const item of createdItems) {
              if (item.due_date) {
                await generateChargeSchedules(
                  id,
                  item.id,
                  item.due_date,
                  currentTenant.id
                );
              }
            }
          }
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-portal_access', variables.id] });
      toast.success('Cliente atualizado com sucesso!');
      // Log activity
      if (currentTenant?.id) {
        logActivityDirect(currentTenant.id, user?.id || null, 'update', 'customer', {
          customer_id: variables.id,
        });
      }
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyErrorMessage(error));
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.deleteCustomer(id);
      if (error) throw new Error(error);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Cliente excluído com sucesso!');
      // Log activity
      if (currentTenant?.id) {
        logActivityDirect(currentTenant.id, user?.id || null, 'delete', 'customer', {
          customer_id: deletedId,
        });
      }
    },
    onError: (error: unknown) => {
      toast.error(getFriendlyErrorMessage(error));
    },
  });

  // Get unique plan names for filter
  const planNames = Array.from(
    new Set(
      customersQuery.data?.flatMap(c => 
        c.customer_items?.map(item => item.plan_name || item.product_name) || []
      ).filter(Boolean) || []
    )
  );

  return {
    customers: customersQuery.data || [],
    isLoading: customersQuery.isLoading,
    planNames,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  };
};

