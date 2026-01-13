// API Service Unificado - Backend Node.js VPS (SEM Supabase)
// Migração completa: 13/01/2026

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://72.60.14.172:3333';

interface ApiResponse<T = any> {
  data: T;
  error?: string | null;
}

class ApiService {
  private baseURL: string;
  private token: string | null;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('brgestor_token');
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    try {
      console.log('🔥 API:', options.method || 'GET', endpoint);
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: { ...this.getHeaders(), ...options.headers },
      });

      const json = await response.json();
      
      if (!response.ok) {
        return { data: null as T, error: json.error || `HTTP ${response.status}` };
      }

      // Backend retorna { data, error } - compatível
      return { data: json.data ?? json, error: json.error };
    } catch (error) {
      console.error('❌ API Error:', error);
      return { data: null as T, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('brgestor_token', token);
    else localStorage.removeItem('brgestor_token');
  }

  // ==========================================
  // AUTH
  // ==========================================
  async login(email: string, password: string) {
    return this.post<{ user: any; access_token: string }>('/auth/login', { email, password });
  }

  async register(email: string, password: string, name: string) {
    return this.post<{ user: any; access_token: string }>('/auth/register', { email, password, name });
  }

  async getUser() {
    return this.get<{ user: any }>('/auth/user');
  }

  async getSignupReferralCode() {
    return this.post<{ ref_code: string }>('/auth/signup/referral-code');
  }

  // ==========================================
  // CUSTOMERS
  // ==========================================
  async getCustomers(params?: { search?: string; customer_tenant_id?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.customer_tenant_id) query.set('customer_tenant_id', params.customer_tenant_id);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    return this.get<any[]>(`/api/customers${query.toString() ? `?${query}` : ''}`);
  }

  async getCustomerById(id: string) {
    return this.get<any>(`/api/customers/${id}`);
  }

  async createCustomer(data: any) {
    return this.post<any>('/api/customers', data);
  }

  async updateCustomer(id: string, data: any) {
    return this.patch<any>(`/api/customers/${id}`, data);
  }

  async deleteCustomer(id: string) {
    return this.delete<any>(`/api/customers/${id}`);
  }

  async getCustomerAuth(customerId: string) {
    return this.get<any>(`/api/customers/${customerId}/auth`);
  }

  async deleteCustomerAddresses(customerId: string) {
    return this.delete<any>(`/api/customers/${customerId}/addresses`);
  }

  async deleteCustomerVehicles(customerId: string) {
    return this.delete<any>(`/api/customers/${customerId}/vehicles`);
  }

  async deleteCustomerItems(customerId: string) {
    return this.delete<any>(`/api/customers/${customerId}/items`);
  }

  // ==========================================
  // CHARGES
  // ==========================================
  async getCharges() {
    return this.get<any[]>('/api/charges');
  }

  async getCustomerCharges(customerId: string) {
    return this.get<any[]>(`/api/customers/${customerId}/charges`);
  }

  async createCharge(data: { customer_id: string; amount: number; due_date: string; description?: string }) {
    return this.post<any>('/api/charges', data);
  }

  async updateCharge(id: string, data: any) {
    return this.patch<any>(`/api/charges/${id}`, data);
  }

  async deleteCharge(id: string) {
    return this.delete<any>(`/api/charges/${id}`);
  }

  // ==========================================
  // COUPONS
  // ==========================================
  async getCoupons() {
    return this.get<any[]>('/api/coupons');
  }

  async createCoupon(data: any) {
    return this.post<any>('/api/coupons', data);
  }

  async updateCoupon(id: string, data: any) {
    return this.patch<any>(`/api/coupons/${id}`, data);
  }

  async deleteCoupon(id: string) {
    return this.delete<any>(`/api/coupons/${id}`);
  }

  async getCouponRedemptions(couponId: string) {
    return this.get<any[]>(`/api/coupons/${couponId}/redemptions`);
  }

  // ==========================================
  // ACTIVITY LOGS
  // ==========================================
  async getActivityLogs(params?: { limit?: number; offset?: number; action?: string; resource?: string; start_date?: string; end_date?: string }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.action) query.set('action', params.action);
    if (params?.resource) query.set('resource', params.resource);
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    return this.get<{ logs: any[]; total: number }>(`/api/activity-logs${query.toString() ? `?${query}` : ''}`);
  }

  async createActivityLog(data: { action: string; resource: string; resource_id?: string; details?: any }) {
    return this.post<any>('/api/activity-logs', data);
  }

  async getActivityLogActions() {
    return this.get<string[]>('/api/activity-logs/actions');
  }

  async getActivityLogResources() {
    return this.get<string[]>('/api/activity-logs/resources');
  }

  // ==========================================
  // PLANS
  // ==========================================
  async getPlans() {
    return this.get<any[]>('/api/plans');
  }

  async createPlan(data: any) {
    return this.post<any>('/api/plans', data);
  }

  async updatePlan(id: string, data: any) {
    return this.patch<any>(`/api/plans/${id}`, data);
  }

  async deletePlan(id: string) {
    return this.delete<any>(`/api/plans/${id}`);
  }

  // Plan Prices
  async getPlanPrices(planId: string) {
    return this.get<any[]>(`/api/plans/${planId}/prices`);
  }

  async getAllPrices() {
    return this.get<any[]>('/api/prices');
  }

  async createPlanPrice(planId: string, data: any) {
    return this.post<any>(`/api/plans/${planId}/prices`, data);
  }

  async updatePrice(id: string, data: any) {
    return this.patch<any>(`/api/prices/${id}`, data);
  }

  // Plan Features
  async getPlanFeatures(planId: string) {
    return this.get<any[]>(`/api/plans/${planId}/features`);
  }

  async getAllFeatures() {
    return this.get<any[]>('/api/features');
  }

  async createPlanFeatures(planId: string, features: any[]) {
    return this.post<any[]>(`/api/plans/${planId}/features`, features);
  }

  async deleteFeature(id: string) {
    return this.delete<any>(`/api/features/${id}`);
  }

  async deletePlanFeatures(planId: string) {
    return this.delete<any>(`/api/plans/${planId}/features`);
  }

  // ==========================================
  // TENANT SETTINGS
  // ==========================================
  async getTenantSettings() {
    return this.get<any[]>('/api/tenant-settings');
  }

  async saveTenantSetting(key: string, value: any) {
    return this.post<any>('/api/tenant-settings', { key, value });
  }

  async saveTenantSettingsBatch(settings: { key: string; value: any }[]) {
    return this.post<any[]>('/api/tenant-settings/batch', settings);
  }

  // ==========================================
  // REFERRALS
  // ==========================================
  async getReferralLinks(params?: { customer_id?: string; is_active?: boolean }) {
    const query = new URLSearchParams();
    if (params?.customer_id) query.set('customer_id', params.customer_id);
    if (params?.is_active !== undefined) query.set('is_active', String(params.is_active));
    return this.get<any[]>(`/api/referrals/links${query.toString() ? `?${query}` : ''}`);
  }

  async createReferralLink(data: { customer_id: string; code?: string; commission_rate?: number }) {
    return this.post<any>('/api/referrals/links', data);
  }

  async updateReferralLink(id: string, data: any) {
    return this.patch<any>(`/api/referrals/links/${id}`, data);
  }

  async getReferrals(referralLinkId?: string) {
    const query = referralLinkId ? `?referral_link_id=${referralLinkId}` : '';
    return this.get<any[]>(`/api/referrals${query}`);
  }

  async getReferralTransactions(referralLinkId?: string) {
    const query = referralLinkId ? `?referral_link_id=${referralLinkId}` : '';
    return this.get<any[]>(`/api/referrals/transactions${query}`);
  }

  async createReferralTransaction(data: { customer_referral_link_id: string; amount: number; type: string; description?: string }) {
    return this.post<any>('/api/referrals/transactions', data);
  }

  // ==========================================
  // CHATBOT
  // ==========================================
  async getChatbotConfig() {
    return this.get<any>('/api/chatbot-config');
  }
}

const api = new ApiService();
export default api;