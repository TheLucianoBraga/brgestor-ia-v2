import api from '@/services/api';

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
    try {
      const response = await api.getReferralLinks({ customer_id: customerId, is_active: true });
      const data = response.data?.[0] || null;
      
      // Se não existe e temos tenantId, criar automaticamente (idempotente)
      if (!data && tenantId && createIfMissing) {
        const created = await this.createLink(customerId, tenantId);
        return created;
      }
      
      return data as ReferralLink | null;
    } catch (error) {
      console.error('Error fetching referral link:', error);
      return null;
    }
  },

  /**
   * Cria um novo link de indicação para o cliente
   */
  async createLink(customerId: string, tenantId: string): Promise<ReferralLink | null> {
    try {
      const response = await api.createReferralLink({
        customer_id: customerId,
        commission_rate: 10,
      });
      
      return response.data as ReferralLink;
    } catch (error: any) {
      // Se erro de duplicidade, buscar o existente
      if (error.response?.status === 409 || error.message?.includes('duplicate')) {
        return this.getByCustomerId(customerId, tenantId, false);
      }
      console.error('Error creating referral link:', error);
      return null;
    }
  },

  /**
   * Busca link de indicação pelo customer_tenant_id (para área Cliente/App)
   */
  async getByCustomerTenantId(customerTenantId: string): Promise<ReferralLink | null> {
    try {
      // Primeiro busca o customer_id pelo customer_tenant_id
      const response = await api.getCustomers({ customer_tenant_id: customerTenantId, limit: 1 });
      const customerId = response.data?.[0]?.id;
      
      if (!customerId) return null;

      return this.getByCustomerId(customerId);
    } catch (error) {
      console.error('Error fetching customer by tenant ID:', error);
      return null;
    }
  },

  /**
   * Busca clientes indicados por um referral_link_id
   */
  async getReferredUsers(referralLinkId: string): Promise<ReferredCustomer[]> {
    try {
      const response = await api.getReferrals(referralLinkId);
      const data = response.data || [];

      // Backend já retorna referred_customer_name enriquecido
      const enriched: ReferredCustomer[] = data.map((item: any) => ({
        ...item,
        referred_name: item.referred_customer_name || 'Cliente #' + (item.referred_customer_id?.slice(0, 6) || 'XXXXXX'),
        status: (item.status || 'pending') as 'pending' | 'paid'
      }));

      return enriched;
    } catch (error) {
      console.error('Error fetching referred users:', error);
      return [];
    }
  },

  /**
   * Busca transações de um referral link
   */
  async getTransactions(referralLinkId: string): Promise<ReferralTransaction[]> {
    try {
      const response = await api.getReferralTransactions(referralLinkId);
      return (response.data || []) as ReferralTransaction[];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
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

    try {
      // Criar transação de saque
      await api.createReferralTransaction({
        customer_referral_link_id: params.referralLinkId,
        amount: params.amount,
        type: 'payout',
        description: `Saque de R$ ${params.amount.toFixed(2)} solicitado via PIX`,
      });

      // Zerar saldo disponível
      await api.updateReferralLink(params.referralLinkId, {
        available_balance: 0
      });
    } catch (error) {
      console.error('Error requesting payout:', error);
      throw error;
    }
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

    try {
      // Criar transação de crédito usado
      await api.createReferralTransaction({
        customer_referral_link_id: params.referralLinkId,
        amount: params.amount,
        type: 'credit_used',
        description: `Crédito de R$ ${params.amount.toFixed(2)} reservado para desconto`,
      });

      // Zerar saldo
      await api.updateReferralLink(params.referralLinkId, {
        available_balance: 0
      });

      return { success: true, amount: params.amount };
    } catch (error) {
      console.error('Error using credit:', error);
      throw error;
    }
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

