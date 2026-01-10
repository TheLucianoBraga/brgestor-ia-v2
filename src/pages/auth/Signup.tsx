import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle, LinkIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RefCodeData {
  ref_code: number;
  kind: string;
  owner_tenant_id: string;
  payload: Record<string, unknown>;
}

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [refCodeData, setRefCodeData] = useState<RefCodeData | null>(null);
  const [hasRefCode, setHasRefCode] = useState<boolean | null>(null);

  useEffect(() => {
    // Check for ref_code in localStorage
    const stored = localStorage.getItem('ref_code_data');
    if (stored) {
      try {
        setRefCodeData(JSON.parse(stored));
        setHasRefCode(true);
      } catch {
        localStorage.removeItem('ref_code_data');
        setHasRefCode(false);
      }
    } else {
      setHasRefCode(false);
    }
  }, []);

  useEffect(() => {
    // If user is already authenticated, process ref_code and redirect
    if (user && success) {
      processSignup();
    }
  }, [user, success]);

  const processSignup = async () => {
    if (!refCodeData) {
      navigate('/app/select-tenant');
      return;
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('process_ref_code_signup', {
        _code: refCodeData.ref_code
      });

      if (rpcError) throw rpcError;

      const result = data as unknown as { success: boolean; error?: string; tenant_id?: string };
      if (!result.success) {
        setError(result.error || 'Erro ao processar cadastro');
        return;
      }

      // Clear ref_code data
      localStorage.removeItem('ref_code_data');
      
      // For invite_user, navigate to dashboard (user was added to existing tenant)
      // For other kinds, also navigate to dashboard (new tenant was created)
      navigate('/app/dashboard');
    } catch (err) {
      console.error('Error processing signup:', err);
      setError('Erro ao processar cadastro. Tente novamente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não conferem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/app/dashboard`,
          data: {
            full_name: fullName
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Este email já está cadastrado. Faça login ou recupere sua senha.');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('Erro ao criar conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getKindLabel = (kind: string) => {
    switch (kind) {
      case 'signup_cliente': return 'Conta Cliente';
      case 'trial_cliente': return 'Trial Cliente';
      case 'signup_revenda': return 'Conta Revenda';
      case 'invite_user': return 'Convite de Usuário';
      default: return kind;
    }
  };

  if (success && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl">Conta criada!</CardTitle>
              <CardDescription className="text-base">
                Verifique seu email para confirmar o cadastro e acessar a plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/auth/login">
                <Button className="w-full" variant="outline">
                  Ir para Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If no ref_code, show message that signup requires a link
  if (hasRefCode === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-7 h-7 text-primary-foreground" />
            </div>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <LinkIcon className="w-8 h-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">Link de Cadastro Necessário</CardTitle>
              <CardDescription className="text-base">
                Para criar uma conta, você precisa de um link de convite ou cadastro enviado por um administrador.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Se você recebeu um link de cadastro, acesse-o diretamente. Se já possui uma conta, faça login.
                </AlertDescription>
              </Alert>
              
              <div className="flex flex-col gap-2">
                <Link to="/auth/login">
                  <Button className="w-full" variant="default">
                    Ir para Login
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/">
                  <Button className="w-full" variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Início
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Plataforma de Gestão, Cobrança e IA
          </p>
        </div>
      </div>
    );
  }

  // Loading while checking ref_code
  if (hasRefCode === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>

        <Card className="border-0 shadow-xl animate-slide-up">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Criar conta</CardTitle>
            <CardDescription className="text-base">
              {refCodeData ? (
                <>
                  Cadastro para <strong className="text-foreground">{getKindLabel(refCodeData.kind)}</strong>
                </>
              ) : (
                'Preencha os dados para criar sua conta'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full btn-gradient-primary"
                size="lg"
                disabled={loading}
              >
                {loading ? 'Criando conta...' : 'Criar conta'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{' '}
                <Link to="/auth/login" className="text-primary hover:underline font-medium">
                  Entrar
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Plataforma de Gestão, Cobrança e IA
        </p>
      </div>
    </div>
  );
};

export default Signup;
