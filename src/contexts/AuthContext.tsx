import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
// Interfaces locais para compatibilidade (anteriormente do @supabase/supabase-js)
interface User {
  id: string;
  email?: string;
  name?: string;
}

interface Session {
  user: User;
  access_token?: string;
}
import { supabase } from '@/lib/supabase-postgres';

interface Profile {
  user_id: string;
  full_name: string | null;
  current_tenant_id: string | null;
  created_at?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsTenantSelection: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  completeMasterSetup: () => Promise<{ success: boolean; error?: string }>;
  setCurrentTenant: (tenantId: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, current_tenant_id, created_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile({
        user_id: data.user_id,
        full_name: data.full_name,
        current_tenant_id: data.current_tenant_id,
        created_at: data.created_at,
      });
    }
    return data;
  }, []);

  // Refresh profile (exposed to components)
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      try {
        // Mock auth - durante migração sempre consideramos autenticado se tem token
        const mockUser = {
          id: 'mock-user-id',
          email: localStorage.getItem('userEmail') || 'user@exemplo.com',
          name: localStorage.getItem('userName') || 'Usuário Mockado'
        };
        
        const mockSession = {
          user: mockUser,
          access_token: token,
          refresh_token: token
        };

        setUser(mockUser);
        setSession(mockSession);
        await fetchProfile(mockUser.id);
      } catch (error) {
        console.error('Erro ao validar token:', error);
        localStorage.removeItem('token');
        setUser(null);
        setSession(null);
        setProfile(null);
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      // Salvar no localStorage para persistência
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userName', data.user.user_metadata?.full_name || '');
      
      // Simular estrutura do Supabase
      const session: Session = {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name,
        },
        access_token: data.access_token,
      };

      setSession(session);
      setUser(session.user);
      
      // Fetch profile after login
      if (session.user) {
        await fetchProfile(session.user.id);
      }

      return { error: null };
    } catch (error) {
      console.error('SignIn error:', error);
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const response = await fetch('/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, fullName }),
      });

      if (!response.ok) {
        throw new Error('Signup failed');
      }

      return { error: null };
    } catch (error) {
      console.error('SignUp error:', error);
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    // Limpar estado local e localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const response = await fetch('/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Reset password failed');
      }

      return { error: null };
    } catch (error) {
      console.error('ResetPassword error:', error);
      return { error: error as Error };
    }
  };

  const completeMasterSetup = async () => {
    // Mock response - sempre sucesso
    const result = { success: true, message: 'Master setup complete' };
    
    if (result.success && user) {
      await fetchProfile(user.id);
    }
    
    return result;
  };

  const setCurrentTenant = async (tenantId: string) => {
    // Mock response - sempre sucesso
    const result = { success: true, message: 'Tenant set successfully' };

    if (result.success && user) {
      await fetchProfile(user.id);
    }

    return result;
  };

  // Check if user needs to select a tenant
  const needsTenantSelection = !!session && !!profile && !profile.current_tenant_id;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAuthenticated: !!session,
        needsTenantSelection,
        signIn,
        signUp,
        signOut,
        resetPassword,
        completeMasterSetup,
        setCurrentTenant,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

