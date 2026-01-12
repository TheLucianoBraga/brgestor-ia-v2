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
import { supabase } from '@/integrations/supabase/client';

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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Log login activity after successful authentication
    if (!error && data.user) {
      // Get current tenant from profile to log the activity
      const { data: profileData } = await supabase
        .from('profiles')
        .select('current_tenant_id')
        .eq('user_id', data.user.id)
        .maybeSingle();
      
      if (profileData?.current_tenant_id) {
        await supabase.from('activity_logs').insert([{
          tenant_id: profileData.current_tenant_id,
          user_id: data.user.id,
          action: 'login',
          resource: 'auth',
          details: { email },
          ip_address: null,
        }]);
      }
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    // Log logout activity before signing out
    if (user && profile?.current_tenant_id) {
      await supabase.from('activity_logs').insert([{
        tenant_id: profile.current_tenant_id,
        user_id: user.id,
        action: 'logout',
        resource: 'auth',
        details: {},
        ip_address: null,
      }]);
    }
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    return { error };
  };

  const completeMasterSetup = async () => {
    const { data, error } = await supabase.rpc('admin_complete_master_setup');
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    const result = data as { success: boolean; error?: string; message?: string };
    
    if (result.success && user) {
      await fetchProfile(user.id);
    }
    
    return result;
  };

  const setCurrentTenant = async (tenantId: string) => {
    const { data, error } = await supabase.rpc('set_current_tenant', {
      _tenant_id: tenantId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as { success: boolean; error?: string; message?: string };

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
