import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft, Sparkles, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import { WhatsAppFloatingButton } from '@/components/public/WhatsAppFloatingButton';

type LoginMode = 'portal' | 'cliente' | 'app';

/**
 * Resolve login mode based on:
 * 1. location.state.from (origin route from guard redirect)
 * 2. Defaults to 'app'
 */
function resolveLoginMode(locationState: any): LoginMode {
  const fromPath = locationState?.from?.pathname as string | undefined;
  
  if (fromPath?.startsWith('/portal')) return 'portal';
  if (fromPath?.startsWith('/cliente')) return 'cliente';
  if (fromPath?.startsWith('/app')) return 'app';
  
  return 'app';
}

/**
 * Get redirect path based on mode and origin
 */
function getRedirectPath(mode: LoginMode, fromPath?: string): string {
  const defaultPaths: Record<LoginMode, string> = {
    portal: '/portal/dashboard',
    cliente: '/cliente/dashboard',
    app: '/app/dashboard',
  };
  
  // If we have a valid origin path that matches the mode, use it
  if (fromPath) {
    if (mode === 'portal' && fromPath.startsWith('/portal')) return fromPath;
    if (mode === 'cliente' && fromPath.startsWith('/cliente')) return fromPath;
    if (mode === 'app' && fromPath.startsWith('/app')) return fromPath;
  }
  
  return defaultPaths[mode];
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, isLoading: authLoading, isAuthenticated, profile } = useAuth();
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  const { login: customerLogin, isAuthenticated: customerAuthenticated } = useCustomerAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve login mode from origin route
  const loginMode = useMemo(() => resolveLoginMode(location.state), [location.state]);
  const fromPath = (location.state as any)?.from?.pathname as string | undefined;

  // Redirect authenticated Supabase users based on tenant type and mode
  useEffect(() => {
    if (isAuthenticated && !authLoading && !tenantLoading && profile) {
      // Wait for tenant to load if user has one
      if (profile.current_tenant_id && !currentTenant) return;
      
      const tenantType = currentTenant?.type;
      
      // Cliente tenant users should go to /cliente area
      if (tenantType === 'cliente') {
        const targetPath = loginMode === 'cliente' 
          ? getRedirectPath('cliente', fromPath)
          : '/cliente/dashboard';
        navigate(targetPath, { replace: true });
        return;
      }
      
      // Admin/Revenda/Master users
      if (profile.current_tenant_id) {
        // If they came from portal/cliente area, redirect to app instead
        if (loginMode === 'portal' || loginMode === 'cliente') {
          toast.info('Redirecionando para área administrativa');
          navigate('/app/dashboard', { replace: true });
        } else {
          navigate(getRedirectPath('app', fromPath), { replace: true });
        }
      } else {
        navigate('/app/select_tenant', { replace: true });
      }
    }
  }, [isAuthenticated, authLoading, tenantLoading, profile, currentTenant, loginMode, fromPath, navigate]);

  // Redirect authenticated CustomerAuth users
  useEffect(() => {
    if (customerAuthenticated) {
      // CustomerAuth always goes to portal
      const targetPath = loginMode === 'portal' 
        ? getRedirectPath('portal', fromPath)
        : '/portal/dashboard';
      navigate(targetPath, { replace: true });
    }
  }, [customerAuthenticated, loginMode, fromPath, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsSigningIn(true);
    
    try {
      // For portal/cliente mode, try CustomerAuth first
      if (loginMode === 'portal' || loginMode === 'cliente') {
        const customerResult = await customerLogin(email, password);
        
        if (customerResult.success) {
          toast.success('Bem-vindo ao Portal!');
          // Navigation happens via useEffect
          return;
        }
      }
      
      // Try Supabase Auth
      const { error: authError } = await signIn(email, password);
      
      if (authError) {
        if (authError.message.includes('Invalid login credentials')) {
          setError('E-mail ou senha incorretos');
        } else {
          setError(authError.message);
        }
      } else {
        toast.success('Bem-vindo!');
        // Navigation happens via useEffect
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Dynamic description based on mode
  const modeDescription = useMemo(() => {
    switch (loginMode) {
      case 'portal':
        return 'Acesse sua conta de cliente';
      case 'cliente':
        return 'Acesse sua área de cliente';
      default:
        return 'Acesse sua conta de gestor';
    }
  }, [loginMode]);

  const features = [
    { icon: Shield, text: 'Segurança avançada' },
    { icon: Zap, text: 'Automação inteligente' },
    { icon: Sparkles, text: 'IA integrada' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 items-center justify-center p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full" />
        </div>
        
        {/* Floating elements */}
        <div className="absolute top-32 right-24 w-20 h-20 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 flex items-center justify-center animate-pulse">
          <Shield className="w-10 h-10 text-white/80" />
        </div>
        <div className="absolute bottom-40 left-16 w-16 h-16 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <Zap className="w-8 h-8 text-white/80" />
        </div>
        
        <div className="max-w-md text-center relative z-10">
          <div className="relative inline-block mb-8">
            <div className="absolute -inset-4 bg-white/20 rounded-3xl blur-xl" />
            <img src={logo} alt="BRGestor" className="h-64 w-auto mx-auto relative drop-shadow-2xl" />
          </div>
          <p className="text-xl text-white/90 mb-2 font-medium">Plataforma de Gestão, Cobrança e IA</p>
          <p className="text-white/70 mb-8 leading-relaxed">
            Simplifique sua gestão de assinaturas, cobranças e relacionamento com clientes com tecnologia de ponta.
          </p>
          
          {/* Feature badges */}
          <div className="flex flex-wrap justify-center gap-3">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20"
              >
                <feature.icon className="w-4 h-4 text-white/90" />
                <span className="text-sm text-white/90 font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-muted/30 relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} 
        />
        
        {/* Back to Landing Button */}
        <Link 
          to="/" 
          className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Voltar</span>
        </Link>
        
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="relative">
              <div className="absolute -inset-4 bg-primary/20 rounded-3xl blur-xl" />
              <img src={logo} alt="BRGestor" className="h-24 w-auto relative" />
            </div>
            <h2 className="text-xl font-bold text-foreground mt-4">BRGestor</h2>
          </div>

          <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-6 pt-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-4 mx-auto">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Bem-vindo de volta</CardTitle>
              <CardDescription className="text-muted-foreground">
                {modeDescription}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pb-8">
              <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                    <AlertDescription className="text-destructive font-medium">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-foreground font-medium">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 h-12 bg-background border-input focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="text-foreground font-medium">Senha</Label>
                    <Link
                      to="/auth/reset"
                      className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11 h-12 bg-background border-input focus:border-primary transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 btn-gradient-primary text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                  disabled={isSigningIn || authLoading}
                >
                  {isSigningIn ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Entrando...
                    </span>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-border/50 text-center">
                <p className="text-sm text-muted-foreground">
                  O sistema identifica automaticamente seu tipo de acesso
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Trust badges */}
          <div className="mt-6 flex items-center justify-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="text-xs">Dados protegidos</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span className="text-xs">Conexão segura</span>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Floating Button */}
      <WhatsAppFloatingButton />
    </div>
  );
};

export default Login;
