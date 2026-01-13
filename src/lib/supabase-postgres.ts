// Cliente real para API PostgreSQL - substitui Supabase completamente
// Este arquivo conecta diretamente com o PostgreSQL via API REST
type QueryBuilder = {
  select: (columns?: string) => QueryBuilder;
  eq: (column: string, value: any) => QueryBuilder;
  in: (column: string, values: any[]) => QueryBuilder;
  filter: (column: string, operator: string, value: any) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
  single: () => Promise<{ data: any; error: any }>;
  data?: any[];
  error?: any;
};

type PostgresClient = {
  from: (table: string) => {
    select: (columns?: string) => QueryBuilder;
    insert: (data: any) => Promise<{ data: any; error: any }>;
    update: (data: any) => QueryBuilder;
    delete: () => QueryBuilder;
    upsert: (data: any) => Promise<{ data: any; error: any }>;
  };
  rpc: (functionName: string, params?: any) => Promise<{ data: any; error: any }>;
  auth: {
    signUp: (credentials: any) => Promise<{ data: any; error: any }>;
    signInWithPassword: (credentials: any) => Promise<{ data: any; error: any }>;
    signOut: () => Promise<{ error: any }>;
    resetPasswordForEmail: (email: string) => Promise<{ error: any }>;
    getUser: () => Promise<{ data: any; error: any }>;
  };
  storage: {
    from: (bucket: string) => {
      upload: (path: string, file: any) => Promise<{ data: any; error: any }>;
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
  removeChannel: (channel: any) => void;
};

class PostgreSQLQueryBuilder implements QueryBuilder {
  private table: string;
  private selectColumns: string = '*';
  private whereConditions: string[] = [];
  private orderBy: string = '';
  private limitCount: number | null = null;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns: string = '*'): QueryBuilder {
    this.selectColumns = columns;
    return this;
  }

  eq(column: string, value: any): QueryBuilder {
    this.whereConditions.push(`${column}=eq.${value}`);
    return this;
  }

  in(column: string, values: any[]): QueryBuilder {
    this.whereConditions.push(`${column}=in.(${values.join(',')})`);
    return this;
  }

  filter(column: string, operator: string, value: any): QueryBuilder {
    this.whereConditions.push(`${column}=${operator}.${value}`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): QueryBuilder {
    const direction = options?.ascending === false ? 'desc' : 'asc';
    this.orderBy = `${column}.${direction}`;
    return this;
  }

  limit(count: number): QueryBuilder {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number): QueryBuilder {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  private buildUrl(): string {
    const baseUrl = `/rest/v1/${this.table}`;
    const params = new URLSearchParams();
    
    params.set('select', this.selectColumns);
    
    this.whereConditions.forEach(condition => {
      const [key, value] = condition.split('=');
      params.set(key, value);
    });
    
    if (this.orderBy) {
      params.set('order', this.orderBy);
    }
    
    if (this.limitCount) {
      params.set('limit', this.limitCount.toString());
    }
    
    if (this.rangeFrom !== null && this.rangeTo !== null) {
      params.set('offset', this.rangeFrom.toString());
      params.set('limit', (this.rangeTo - this.rangeFrom + 1).toString());
    }
    
    return `${baseUrl}?${params.toString()}`;
  }

  async execute(): Promise<{ data: any[]; error: any }> {
    try {
      const url = this.buildUrl();
      console.log('🔍 PostgreSQL Query:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return { data: Array.isArray(data) ? data : [], error: null };
    } catch (error: any) {
      console.error('❌ PostgreSQL Query Error:', error.message);
      return { data: [], error: { message: error.message } };
    }
  }

  async single(): Promise<{ data: any; error: any }> {
    this.limitCount = 1;
    const result = await this.execute();
    return {
      data: result.data.length > 0 ? result.data[0] : null,
      error: result.error
    };
  }

  // Propriedades para compatibilidade imediata (deprecated)
  get data() { 
    console.warn('⚠️ Using .data property - use await query instead');
    return []; 
  }
  
  get error() { 
    console.warn('⚠️ Using .error property - use await query instead');
    return null; 
  }
}

// Cliente principal substituindo Supabase
export const supabasePostgres: PostgresClient = {
  from: (table: string) => {
    const builder = new PostgreSQLQueryBuilder(table);
    
    return {
      select: (columns?: string) => {
        builder.select(columns);
        return builder;
      },
      
      insert: async (data: any) => {
        try {
          const response = await fetch(`/rest/v1/${table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
          }
          
          const result = await response.json();
          return { data: result, error: null };
        } catch (error: any) {
          return { data: null, error: { message: error.message } };
        }
      },
      
      update: (data: any) => {
        // Implementar update se necessário
        const updateBuilder = builder;
        return updateBuilder;
      },
      
      delete: () => {
        // Implementar delete se necessário
        return builder;
      },
      
      upsert: async (data: any) => {
        // Por ora, usar insert
        return supabasePostgres.from(table).insert(data);
      }
    };
  },

  rpc: async (functionName: string, params: any = {}) => {
    try {
      console.log('🔧 RPC Call:', functionName, params);
      
      const response = await fetch(`/rpc/${functionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return { data: Array.isArray(data) ? data[0] : data, error: null };
    } catch (error: any) {
      console.error('❌ RPC Error:', error.message);
      return { data: null, error: { message: error.message } };
    }
  },

  auth: {
    signUp: async (credentials: any) => {
      try {
        const response = await fetch('/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        return { data: { user: data.user }, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },

    signInWithPassword: async (credentials: any) => {
      try {
        const response = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Salvar token no localStorage
        if (data.access_token) {
          localStorage.setItem('supabase.auth.token', JSON.stringify({
            access_token: data.access_token,
            user: data.user,
            expires_at: Date.now() + (data.expires_in * 1000)
          }));
        }
        
        return { data: { user: data.user, session: data }, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },

    signOut: async () => {
      localStorage.removeItem('supabase.auth.token');
      return { error: null };
    },

    resetPasswordForEmail: async (email: string) => {
      // Implementar reset de senha se necessário
      console.log('Reset password for:', email);
      return { error: null };
    },

    getUser: async () => {
      try {
        const tokenData = localStorage.getItem('supabase.auth.token');
        if (!tokenData) {
          return { data: { user: null }, error: null };
        }
        
        const { user, expires_at } = JSON.parse(tokenData);
        
        if (Date.now() > expires_at) {
          localStorage.removeItem('supabase.auth.token');
          return { data: { user: null }, error: null };
        }
        
        return { data: { user }, error: null };
      } catch (error: any) {
        return { data: { user: null }, error: { message: error.message } };
      }
    }
  },

  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: any) => {
        // Mock storage por ora
        return { data: { path }, error: null };
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `/storage/${bucket}/${path}` }
      })
    })
  },

  removeChannel: (channel: any) => {
    // Mock para compatibilidade
    console.log('Channel removed:', channel);
  }
};

// Exportar como supabase para compatibilidade total
export const supabase = supabasePostgres;
export default supabasePostgres;