import { supabase } from '@/lib/supabase-postgres';

// ==================== TYPES ====================
export interface ReferralLink {
  id: string;
  customer_id: string;
  tenant_id: string;
  ref_code: number;
  is_active: boolean;
  total_referrals: number;
  total_earned: number;
  available_balance: number;
  created_at?: string;
}

export interface ReferredCustomer {
  id: string;
  referred_customer_id: string;
  referred_name: string;
  status: 'pending' | 'paid';
  commission_amount: number;
  created_at: string;
}

export interface ReferralTransaction {
  id: string;
  type: 'payout' | 'credit_used';
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  pix_key: string | null;
  notes: string | null;
  created_at: string;
}

export interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  confirmedReferrals: number;
  totalEarned: number;
  availableBalance: number;
}

export const MIN_PAYOUT_AMOUNT = 50;

// ==================== SERVICE ====================
export const referralService = {
  /**
   * Busca o link de indicação pelo customer_id
   * Se não existir e createIfMissing=true, cria automaticamente
   */
  async getByCustomerId(customerId: string, tenantId?: string, createIfMissing = true): Promise<ReferralLink | null> {
    let query = supabase
      .from('customer_referral_links')
      .select('*')
      .eq('customer_id', customerId)
      .eq('is_active', true);
    
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) {
      console.error('Error fetching referral link:', error);
      return null;
    }
    
    // Se não existe e temos tenantId, criar automaticamente (idempotente)
    if (!data && tenantId && createIfMissing) {
      const created = await this.createLink(customerId, tenantId);
      return created;
    }
    
    return data as ReferralLink | null;
  },

  /**
   * Cria um novo link de indicação para o cliente
   */
  async createLink(customerId: string, tenantId: string): Promise<ReferralLink | null> {
    const { data, error } = await supabase
      .from('customer_referral_links')
      .insert({
        customer_id: customerId,
        tenant_id: tenantId,
        is_active: true,
        total_referrals: 0,
        total_earned: 0,
        available_balance: 0
      })
      .select()
      .single();
    
    if (error) {
      // Se erro de duplicidade, buscar o existente
      if (error.code === '23505') {
        return this.getByCustomerId(customerId, tenantId, false);
      }
      console.error('Error creating referral link:', error);
      return null;
    }
    
    return data as ReferralLink;
  },

  /**
   * Busca link de indicação pelo customer_tenant_id (para área Cliente/App)
   */
  async getByCustomerTenantId(customerTenantId: string): Promise<ReferralLink | null> {
    // Primeiro busca o customer_id pelo customer_tenant_id
    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('customer_tenant_id', customerTenantId)
      .limit(1);

    const customerId = customers?.[0]?.id;
    if (!customerId) return null;

    return this.getByCustomerId(customerId);
  },

  /**
   * Busca clientes indicados por um referral_link_id
   */
  async getReferredUsers(referralLinkId: string): Promise<ReferredCustomer[]> {
    const { data, error } = await supabase
      .from('customer_referrals')
      .select('id, referred_customer_id, status, commission_amount, created_at')
      .eq('referral_link_id', referralLinkId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referred users:', error);
      return [];
    }

    // Enriquecer com nomes dos clientes
    const enriched: ReferredCustomer[] = await Promise.all(
      (data || []).map(async (item) => {
        let referred_name = 'Cliente #' + (item.referred_customer_id?.slice(0, 6) || 'XXXXXX');
        
        if (item.referred_customer_id) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('full_name')
            .eq('id', item.referred_customer_id)
            .maybeSingle();
          
          if (customerData) {
            referred_name = customerData.full_name;
          }
        }

        return {
          ...item,
          referred_name,
          status: (item.status || 'pending') as 'pending' | 'paid'
        };
      })
    );

    return enriched;
  },

  /**
   * Busca transações de um referral link
   */
  async getTransactions(referralLinkId: string): Promise<ReferralTransaction[]> {
    const { data, error } = await supabase
      .from('referral_transactions')
      .select('*')
      .eq('customer_referral_link_id', referralLinkId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return (data || []) as ReferralTransaction[];
  },

  /**
   * Solicitar saque via PIX (mínimo R$50)
   */
  async requestPayout(params: {
    referralLinkId: string;
    customerId: string;
    tenantId: string;
    amount: number;
    pixKey: string;
  }): Promise<void> {
    if (params.amount < MIN_PAYOUT_AMOUNT) {
      throw new Error(`Saldo mínimo para saque: R$ ${MIN_PAYOUT_AMOUNT},00`);
    }

    // Criar transação de saque
    const { error } = await supabase
      .from('referral_transactions')
      .insert({
        customer_referral_link_id: params.referralLinkId,
        customer_id: params.customerId,
        tenant_id: params.tenantId,
        type: 'payout',
        amount: params.amount,
        status: 'pending',
        pix_key: params.pixKey,
        notes: `Saque de R$ ${params.amount.toFixed(2)} solicitado via PIX`
      });

    if (error) throw error;

    // Zerar saldo disponível
    await supabase
      .from('customer_referral_links')
      .update({ available_balance: 0 })
      .eq('id', params.referralLinkId);
  },

  /**
   * Usar saldo como crédito para desconto
   */
  async useAsCredit(params: {
    referralLinkId: string;
    customerId: string;
    tenantId: string;
    amount: number;
  }): Promise<{ success: boolean; amount: number }> {
    if (params.amount <= 0) {
      throw new Error('Saldo insuficiente');
    }

    // Criar transação de crédito usado
    const { error } = await supabase
      .from('referral_transactions')
      .insert({
        customer_referral_link_id: params.referralLinkId,
        customer_id: params.customerId,
        tenant_id: params.tenantId,
        type: 'credit_used',
        amount: params.amount,
        status: 'completed',
        notes: `Crédito de R$ ${params.amount.toFixed(2)} reservado para desconto`
      });

    if (error) throw error;

    // Zerar saldo
    await supabase
      .from('customer_referral_links')
      .update({ available_balance: 0 })
      .eq('id', params.referralLinkId);

    return { success: true, amount: params.amount };
  },

  /**
   * Calcula estatísticas a partir dos dados
   */
  calculateStats(referralLink: ReferralLink | null, referredUsers: ReferredCustomer[]): ReferralStats {
    return {
      totalReferrals: referralLink?.total_referrals || 0,
      pendingReferrals: referredUsers.filter(u => u.status === 'pending').length,
      confirmedReferrals: referredUsers.filter(u => u.status === 'paid').length,
      totalEarned: referralLink?.total_earned || 0,
      availableBalance: referralLink?.available_balance || 0
    };
  },

  /**
   * Gera a URL de indicação baseada no contexto
   * Formato unificado: /r/{ref_code}
   */
  generateReferralUrl(refCode: number, context: 'portal' | 'cliente'): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    // URL unificada para indicações
    return `${origin}/r/${refCode}`;
  }
};

