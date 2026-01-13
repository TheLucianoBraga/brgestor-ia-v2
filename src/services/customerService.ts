import api from '@/services/api';

// ========== Types ==========
export interface CustomerData {
  id: string;
  tenant_id: string;
  customer_tenant_id?: string | null;
  full_name: string;
  email: string;
  whatsapp: string;
  secondary_phone?: string | null;
  cpf_cnpj?: string | null;
  rg_ie?: string | null;
  pix_key?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  status: string;
  notes?: string | null;
  allow_whatsapp: boolean;
  allow_email: boolean;
  allow_portal_notifications: boolean;
  created_at: string;
  referrer_customer_id?: string | null;
}

export interface CustomerAddress {
  id?: string;
  customer_id: string;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
}

export type CustomerUpdate = Partial<Omit<CustomerData, 'id' | 'tenant_id' | 'created_at'>>;

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

// ========== Service Functions ==========

export const customerService = {
  /**
   * Buscar customer por ID
   */
  async getById(customerId: string): Promise<CustomerData | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  },

  /**
   * Buscar customer por customer_tenant_id (usado no App/Cliente)
   */
  async getByTenantId(customerTenantId: string): Promise<CustomerData | null> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_tenant_id', customerTenantId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Atualizar dados do customer
   */
  async update(customerId: string, updates: CustomerUpdate): Promise<CustomerData> {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Buscar endereço do customer
   */
  async getAddress(customerId: string): Promise<CustomerAddress | null> {
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (error) throw error;
    return data || {
      customer_id: customerId,
      cep: null,
      street: null,
      number: null,
      complement: null,
      district: null,
      city: null,
      state: null,
    };
  },

  /**
   * Atualizar ou criar endereço
   */
  async upsertAddress(customerId: string, address: Partial<CustomerAddress>): Promise<CustomerAddress> {
    // Check if address exists
    const { data: existing } = await supabase
      .from('customer_addresses')
      .select('id')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (existing?.id) {
      // Update existing
      const { data, error } = await supabase
        .from('customer_addresses')
        .update(address)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('customer_addresses')
        .insert({ customer_id: customerId, ...address })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  /**
   * Buscar CEP via ViaCEP
   */
  async searchCep(cep: string): Promise<Partial<CustomerAddress> | null> {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        return null;
      }

      return {
        cep: data.cep,
        street: data.logradouro,
        district: data.bairro,
        city: data.localidade,
        state: data.uf,
        complement: data.complemento || null,
      };
    } catch {
      return null;
    }
  },

  /**
   * Alterar senha do customer
   */
  async changePassword(customerId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    // Verify current password
    const { data: authData, error: authError } = await supabase
      .from('customer_auth')
      .select('password_hash')
      .eq('customer_id', customerId)
      .single();

    if (authError) throw authError;

    // Simple hash comparison
    const currentHash = btoa(currentPassword);
    if (authData.password_hash !== currentHash) {
      return false;
    }

    // Update password
    const newHash = btoa(newPassword);
    const { error } = await supabase
      .from('customer_auth')
      .update({ password_hash: newHash })
      .eq('customer_id', customerId);

    if (error) throw error;
    return true;
  },
};

