import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { TenantWithOwner } from '@/components/contas/TenantCard';

export interface ChildTenant extends TenantWithOwner {}

export function useChildTenants() {
  const { currentTenant } = useTenant();
  const [children, setChildren] = useState<ChildTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    if (!currentTenant) {
      setChildren([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch tenants
      const { data: tenants, error: fetchError } = await supabase
        .from('tenants')
        .select('id, name, type, status, created_at, trial_ends_at, parent_tenant_id')
        .or(`parent_tenant_id.eq.${currentTenant.id},owner_tenant_id.eq.${currentTenant.id}`)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (!tenants || tenants.length === 0) {
        setChildren([]);
        setIsLoading(false);
        return;
      }

      // Fetch owners (admin members) for each tenant
      const tenantIds = tenants.map(t => t.id);
      
      const { data: members } = await supabase
        .from('tenant_members')
        .select('tenant_id, user_id, role_in_tenant')
        .in('tenant_id', tenantIds)
        .in('role_in_tenant', ['admin', 'owner'])
        .eq('status', 'active');

      const userIds = members?.map(m => m.user_id).filter(Boolean) || [];
      
      let profiles: { user_id: string; full_name: string | null }[] = [];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        profiles = profilesData || [];
      }

      // Get user emails from auth (we'll use the profile name and try to get email)
      // Since we can't access auth.users directly, we'll use ref_codes with user info
      // Try to get ref_codes for access links (first_access has owner info in payload)
      const { data: refCodes } = await supabase
        .from('ref_codes')
        .select('owner_tenant_id, payload, code, kind')
        .in('owner_tenant_id', tenantIds)
        .in('kind', ['first_access', 'signup_revenda', 'signup_cliente', 'signup_adm'])
        .eq('active', true);

      // Fetch active subscriptions for each tenant
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('buyer_tenant_id, ends_at, status, plans(name)')
        .in('buyer_tenant_id', tenantIds)
        .eq('status', 'active');

      // Build tenant list with owners
      const tenantsWithOwners: ChildTenant[] = tenants.map(tenant => {
        const member = members?.find(m => m.tenant_id === tenant.id);
        const profile = member ? profiles.find(p => p.user_id === member.user_id) : null;
        // Prefer first_access ref_code (has payload), fallback to signup ref_codes
        const refCodeWithPayload = refCodes?.find(r => r.owner_tenant_id === tenant.id && r.kind === 'first_access');
        const refCode = refCodeWithPayload || refCodes?.find(r => r.owner_tenant_id === tenant.id);
        const subscription = subscriptions?.find(s => s.buyer_tenant_id === tenant.id);
        
        // Try to get owner info from ref_code payload first, then profile
        let owner: ChildTenant['owner'] = null;
        
        if (refCodeWithPayload?.payload && typeof refCodeWithPayload.payload === 'object') {
          const payload = refCodeWithPayload.payload as { email?: string; name?: string; user_id?: string };
          if (payload.email || payload.name) {
            owner = {
              id: payload.user_id || member?.user_id || '',
              name: payload.name || profile?.full_name || 'Responsável',
              email: payload.email || '',
            };
          }
        }
        
        // Fallback to profile info if no payload
        if (!owner && profile) {
          owner = {
            id: member?.user_id || '',
            name: profile.full_name || 'Responsável',
            email: '', // Email not stored in profiles table
          };
        }

        const accessLink = refCode ? `${window.location.origin}/r/${refCode.code}` : null;

        return {
          ...tenant,
          owner,
          accessLink,
          subscription: subscription ? {
            plan_name: (subscription.plans as any)?.name || 'Plano',
            ends_at: subscription.ends_at,
          } : null,
        };
      });

      setChildren(tenantsWithOwners);
    } catch (err: any) {
      console.error('Error fetching child tenants:', err);
      setError(err.message);
      setChildren([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const updateStatus = useCallback(async (tenantId: string, newStatus: 'active' | 'suspended') => {
    try {
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ status: newStatus })
        .eq('id', tenantId)
        .eq('parent_tenant_id', currentTenant?.id);

      if (updateError) throw updateError;

      await fetchChildren();
      return { success: true };
    } catch (err: any) {
      console.error('Error updating tenant status:', err);
      return { success: false, error: err.message };
    }
  }, [currentTenant, fetchChildren]);

  const resendInvite = useCallback(async (tenantId: string, email: string) => {
    try {
      // Get the existing ref_code for this tenant
      const { data: refCode } = await supabase
        .from('ref_codes')
        .select('code, payload')
        .eq('owner_tenant_id', tenantId)
        .eq('kind', 'first_access')
        .eq('active', true)
        .single();

      if (!refCode) {
        return { success: false, error: 'Link de acesso não encontrado' };
      }

      const accessLink = `${window.location.origin}/r/${refCode.code}`;
      const payload = refCode.payload as { name?: string } | null;
      const name = payload?.name || 'Responsável';

      // Try to send email
      const { data, error } = await supabase.functions.invoke('send-invite-email', {
        body: { email, name, accessLink },
      });

      if (error) {
        // If function doesn't exist, just return the link
        return { success: true, accessLink, emailSent: false };
      }

      return { success: true, accessLink, emailSent: data?.ok };
    } catch (err: any) {
      console.error('Error resending invite:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Determine what types the current tenant can create
  const getAllowedTypes = useCallback(() => {
    if (!currentTenant) return [];
    
    switch (currentTenant.type) {
      case 'master':
        return ['adm', 'revenda', 'cliente'];
      case 'adm':
        return ['revenda', 'cliente'];
      case 'revenda':
        return ['cliente'];
      default:
        return [];
    }
  }, [currentTenant]);

  return {
    children,
    isLoading,
    error,
    refetch: fetchChildren,
    updateStatus,
    resendInvite,
    getAllowedTypes,
  };
}
