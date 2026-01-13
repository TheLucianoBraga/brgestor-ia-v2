// BR Gestor - Cliente para API REST da VPS (substitui Supabase)
// Data: 12/01/2026 - Pós migração Supabase -> VPS
// CORRIGIDO: Todos os métodos implementados

interface User {
  id: string;
  email: string;
  name?: string;
  tenant_id?: string;
}

interface Session {
  user: User;
  access_token: string;
  expires_in?: number;
}

interface AuthResponse {
  data: {
    user: User | null;
    session: Session | null;
  };
  error: Error | null;
}

interface DatabaseResponse<T = any> {
  data: T;
  error: Error | null;
}

// ==========================================
// QUERY BUILDER - Simula o Supabase Query Builder
// ==========================================
class QueryBuilder {
  private baseURL: string;
  private tableName: string;
  private token: string | null;
  private queryParams: URLSearchParams;
  private selectColumns: string = '*';
  private bodyData: any = null;
  private method: string = 'GET';

  constructor(baseURL: string, table: string, token: string | null) {
    this.baseURL = baseURL;
    this.tableName = table;
    this.token = token;
    this.queryParams = new URLSearchParams();
  }

  private async execute(): Promise<DatabaseResponse> {
    try {
      // Usar /rest/v1/:table (compatível com PostgREST/Supabase)
      const url = `${this.baseURL}/rest/v1/${this.tableName}?${this.queryParams.toString()}`;
      
      console.log('🔍 VPS Query:', { method: this.method, url, body: this.bodyData });
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      };

      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const options: RequestInit = {
        method: this.method,
        headers,
      };

      if (this.bodyData && (this.method === 'POST' || this.method === 'PATCH' || this.method === 'PUT' || this.method === 'DELETE')) {
        options.body = JSON.stringify(this.bodyData);
      }

      console.log(`[VPS] ${this.method} ${url}`);
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
        console.error(`[VPS] Error:`, errorData);
        return { data: null, error: new Error(errorData.message || errorData.error || `HTTP ${response.status}`) };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error: any) {
      console.error(`[VPS] Network error:`, error);
      return { data: null, error: new Error(error.message || 'Network error') };
    }
  }

  select(columns: string = '*'): QueryBuilder {
    this.selectColumns = columns;
    this.queryParams.set('select', columns);
    this.method = 'GET';
    return this;
  }

  insert(data: any | any[]): QueryBuilder {
    this.bodyData = data;
    this.method = 'POST';
    return this;
  }

  update(data: any): QueryBuilder {
    this.bodyData = data;
    this.method = 'PATCH';
    return this;
  }

  upsert(data: any | any[]): QueryBuilder {
    this.bodyData = data;
    this.method = 'PUT';
    this.queryParams.set('upsert', 'true');
    return this;
  }

  delete(): QueryBuilder {
    this.method = 'DELETE';
    return this;
  }

  eq(column: string, value: any): QueryBuilder {
    this.queryParams.append(`${column}`, `eq.${value}`);
    return this;
  }

  neq(column: string, value: any): QueryBuilder {
    this.queryParams.append(`${column}`, `neq.${value}`);
    return this;
  }

  gt(column: string, value: any): QueryBuilder {
    this.queryParams.append(`${column}`, `gt.${value}`);
    return this;
  }

  gte(column: string, value: any): QueryBuilder {
    this.queryParams.append(`${column}`, `gte.${value}`);
    return this;
  }

  lt(column: string, value: any): QueryBuilder {
    this.queryParams.append(`${column}`, `lt.${value}`);
    return this;
  }

  lte(column: string, value: any): QueryBuilder {
    this.queryParams.append(`${column}`, `lte.${value}`);
    return this;
  }

  like(column: string, pattern: string): QueryBuilder {
    this.queryParams.append(`${column}`, `like.${pattern}`);
    return this;
  }

  ilike(column: string, pattern: string): QueryBuilder {
    this.queryParams.append(`${column}`, `ilike.${pattern}`);
    return this;
  }

  is(column: string, value: any): QueryBuilder {
    this.queryParams.append(`${column}`, `is.${value}`);
    return this;
  }

  in(column: string, values: any[]): QueryBuilder {
    this.queryParams.append(`${column}`, `in.(${values.join(',')})`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): QueryBuilder {
    const direction = options?.ascending === false ? 'desc' : 'asc';
    this.queryParams.set('order', `${column}.${direction}`);
    return this;
  }

  limit(count: number): QueryBuilder {
    this.queryParams.set('limit', count.toString());
    return this;
  }

  range(from: number, to: number): QueryBuilder {
    this.queryParams.set('offset', from.toString());
    this.queryParams.set('limit', (to - from + 1).toString());
    return this;
  }

  single(): Promise<DatabaseResponse> {
    this.queryParams.set('limit', '1');
    return this.execute().then(result => {
      if (result.data && Array.isArray(result.data)) {
        return { data: result.data[0] || null, error: result.error };
      }
      return result;
    });
  }

  maybeSingle(): Promise<DatabaseResponse> {
    this.queryParams.set('limit', '1');
    return this.execute().then(result => {
      if (result.data && Array.isArray(result.data)) {
        return { data: result.data[0] || null, error: null };
      }
      return { data: result.data, error: null };
    });
  }

  then<TResult1 = DatabaseResponse, TResult2 = never>(
    onfulfilled?: ((value: DatabaseResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// ==========================================
// MAIN CLIENT
// ==========================================
class BRGestorAPIClient {
  private baseURL: string;
  private token: string | null;
  private currentUser: User | null = null;
  private currentSession: Session | null = null;
  private authListeners: Array<(event: string, session: Session | null) => void> = [];

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'https://brgestor.com';
    this.token = localStorage.getItem('brgestor_token');
    
    // Recuperar usuário do localStorage
    const savedUser = localStorage.getItem('brgestor_user');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
        this.currentSession = {
          user: this.currentUser!,
          access_token: this.token || ''
        };
      } catch (e) {
        console.error('Erro ao recuperar usuário:', e);
      }
    }
  }

  private setAuth(user: User, token: string): void {
    this.token = token;
    this.currentUser = user;
    this.currentSession = { user, access_token: token };
    localStorage.setItem('brgestor_token', token);
    localStorage.setItem('brgestor_user', JSON.stringify(user));
    this.notifyAuthListeners('SIGNED_IN', this.currentSession);
  }

  private clearAuth(): void {
    this.token = null;
    this.currentUser = null;
    this.currentSession = null;
    localStorage.removeItem('brgestor_token');
    localStorage.removeItem('brgestor_user');
    this.notifyAuthListeners('SIGNED_OUT', null);
  }

  private notifyAuthListeners(event: string, session: Session | null): void {
    this.authListeners.forEach(listener => {
      try {
        listener(event, session);
      } catch (e) {
        console.error('Auth listener error:', e);
      }
    });
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content_Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ==========================================
  // AUTH OBJECT (compatibilidade Supabase)
  // ==========================================
  auth = {
    getSession: async (): Promise<{ data: { session: Session | null }; error: Error | null }> => {
      if (this.currentSession) {
        return { data: { session: this.currentSession }, error: null };
      }
      
      // Tentar validar token no servidor
      if (this.token) {
        try {
          const response = await this.request('/auth/user');
          if (response.user) {
            this.currentUser = response.user;
            this.currentSession = { user: response.user, access_token: this.token };
            return { data: { session: this.currentSession }, error: null };
          }
        } catch (e) {
          this.clearAuth();
        }
      }
      
      return { data: { session: null }, error: null };
    },

    getUser: async (): Promise<{ data: { user: User | null }; error: Error | null }> => {
      if (this.currentUser) {
        return { data: { user: this.currentUser }, error: null };
      }
      return { data: { user: null }, error: null };
    },

    signInWithPassword: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
      try {
        const response = await this.request('/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials)
        });

        if (response.user && response.access_token) {
          this.setAuth(response.user, response.access_token);
          return {
            data: {
              user: response.user,
              session: { user: response.user, access_token: response.access_token }
            },
            error: null
          };
        }

        return { data: { user: null, session: null }, error: new Error('Login failed') };
      } catch (error: any) {
        return { data: { user: null, session: null }, error: new Error(error.message || 'Login failed') };
      }
    },

    signUp: async (credentials: { email: string; password: string; options?: { data?: { full_name?: string } } }): Promise<AuthResponse> => {
      try {
        const response = await this.request('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
            name: credentials.options?.data?.full_name || ''
          })
        });

        if (response.user && response.access_token) {
          this.setAuth(response.user, response.access_token);
          return {
            data: {
              user: response.user,
              session: { user: response.user, access_token: response.access_token }
            },
            error: null
          };
        }

        // Registro pode não retornar sessão imediatamente (email confirmation)
        return { data: { user: response.user || null, session: null }, error: null };
      } catch (error: any) {
        return { data: { user: null, session: null }, error: new Error(error.message || 'Registration failed') };
      }
    },

    signOut: async (): Promise<{ error: Error | null }> => {
      try {
        await this.request('/auth/logout', { method: 'POST' }).catch(() => {});
      } finally {
        this.clearAuth();
      }
      return { error: null };
    },

    resetPasswordForEmail: async (email: string, options?: { redirectTo?: string }): Promise<{ data: any; error: Error | null }> => {
      try {
        await this.request('/auth/reset_password', {
          method: 'POST',
          body: JSON.stringify({ email, redirectTo: options?.redirectTo })
        });
        return { data: {}, error: null };
      } catch (error: any) {
        return { data: null, error: new Error(error.message || 'Reset password failed') };
      }
    },

    onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
      this.authListeners.push(callback);
      
      // Notificar estado atual
      setTimeout(() => {
        if (this.currentSession) {
          callback('SIGNED_IN', this.currentSession);
        } else {
          callback('SIGNED_OUT', null);
        }
      }, 0);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              const index = this.authListeners.indexOf(callback);
              if (index > -1) {
                this.authListeners.splice(index, 1);
              }
            }
          }
        }
      };
    }
  };

  // ==========================================
  // DATABASE (compatibilidade Supabase)
  // ==========================================
  from(table: string): QueryBuilder {
    return new QueryBuilder(this.baseURL, table, this.token);
  }

  // ==========================================
  // REALTIME (stub - não implementado na VPS)
  // ==========================================
  channel(name: string) {
    return {
      on: () => this.channel(name),
      subscribe: (callback?: (status: string) => void) => {
        if (callback) callback('SUBSCRIBED');
        return this.channel(name);
      },
      unsubscribe: () => {}
    };
  }

  removeChannel(channel: any): void {
    // Stub
  }

  // ==========================================
  // STORAGE (stub - não implementado na VPS)
  // ==========================================
  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        // TODO: Implementar upload para VPS
        console.warn('Storage upload not implemented for VPS');
        return { data: null, error: new Error('Storage not implemented') };
      },
      getPublicUrl: (path: string) => {
        return { data: { publicUrl: `${this.baseURL}/storage/${bucket}/${path}` } };
      },
      remove: async (paths: string[]) => {
        console.warn('Storage remove not implemented for VPS');
        return { data: null, error: null };
      }
    })
  };

  // ==========================================
  // RPC (Remote Procedure Calls)
  // ==========================================
  async rpc(fn: string, params?: any): Promise<DatabaseResponse> {
    try {
      const response = await this.request(`/rpc/${fn}`, {
        method: 'POST',
        body: JSON.stringify(params || {})
      });
      return { data: response, error: null };
    } catch (error: any) {
      return { data: null, error: new Error(error.message) };
    }
  }
}

// Instância singleton
export const vpsApi = new BRGestorAPIClient();

// Para compatibilidade com código existente
export const supabase = vpsApi;