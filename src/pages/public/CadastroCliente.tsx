import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { User, Phone, Mail, ArrowRight, Lock, Calendar, FileText, Building2, Check, X, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase-postgres';
import logoBraga from '@/assets/logo-braga.png';

interface RefCodeData {
  ref_code: number;
  kind: string;
  owner_tenant_id: string;
  payload: Record<string, unknown>;
}

const CadastroCliente: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refData, setRefData] = useState<RefCodeData | null>(null);
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);
  const [whatsappWarning, setWhatsappWarning] = useState<string | null>(null);
  
  // Detectar se é cadastro de revenda baseado no path
  const isRevenda = location.pathname.includes('/revenda');
  
  // Se estiver no path de revenda, o tipo é signup_revenda. 
  // Caso contrário, SEMPRE forçar signup_cliente para evitar que revendas entrem na área de clientes.
  const signupKind = isRevenda ? 'signup_revenda' : 'signup_cliente';
  
  const [formData, setFormData] = useState({
    account_name: '',
    full_name: '',
    email: '',
    whatsapp: '',
    cpf_cnpj: '',
    birth_date: '',
    pix_key: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const loadRefData = async () => {
      // Buscar pelo query param ?ref=
      const refParam = searchParams.get('ref');
      if (refParam) {
        const numericCode = parseInt(refParam, 10);
        if (!isNaN(numericCode)) {
          try {
            const { data, error } = await supabase.rpc('validate_ref_code', {
              _code: numericCode
            });
            
            const result = data as unknown as { valid: boolean; code: number; kind: string; owner_tenant_id: string; payload?: Record<string, unknown> };
            
            if (!error && result?.valid) {
              const refCodeData: RefCodeData = {
                ref_code: result.code,
                kind: signupKind,
                owner_tenant_id: result.owner_tenant_id,
                payload: result.payload || {}
              };
              
              setRefData(refCodeData);
              
              // Buscar logo do tenant (opcional, não bloqueia cadastro)
              try {
                const { data: settingsData } = await supabase
                  .from('tenant_settings')
                  .select('value')
                  .eq('tenant_id', result.owner_tenant_id)
                  .eq('key', 'logo_url')
                  .maybeSingle();
                
                if (settingsData?.value) {
                  setTenantLogo(settingsData.value);
                }
              } catch (logoError) {
                console.log('Logo não encontrada, usando padrão');
              }
              
              setInitialLoading(false);
              return;
            }
          } catch (e) {
            console.error('Error validating ref code from URL:', e);
          }
        }
      }
      
      // Para cadastro de revenda direto (da landing page), buscar tenant master via RPC
      if (isRevenda) {
        try {
          // Buscar ref codes do master via função pública
          const { data: refCodes, error } = await supabase.rpc('get_master_signup_ref_code');
          
          if (!error && refCodes && refCodes.length > 0) {
            const revendaCode = refCodes.find((r: { kind: string }) => r.kind === 'signup_revenda');
            
            if (revendaCode) {
              // Validar o ref code encontrado
              const { data: validationResult } = await supabase.rpc('validate_ref_code', {
                _code: revendaCode.ref_code
              });
              
              const result = validationResult as unknown as { valid: boolean; code: number; kind: string; owner_tenant_id: string; payload?: Record<string, unknown> };
              
              if (result?.valid) {
                const refCodeData: RefCodeData = {
                  ref_code: result.code,
                  kind: signupKind,
                  owner_tenant_id: result.owner_tenant_id,
                  payload: result.payload || {}
                };
                
                setRefData(refCodeData);
                setInitialLoading(false);
                return;
              }
            }
          }
        } catch (e) {
          console.error('Error finding master tenant:', e);
        }
      }
      
      // Sem ref_code válido e não é revenda direta, redirecionar para login
      toast.error('Link de indicação inválido ou expirado');
      navigate('/auth/login');
    };
    
    loadRefData();
  }, [navigate, searchParams, signupKind, isRevenda]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  // Validação de senha forte
  const validatePassword = (password: string) => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
  };

  const passwordValidation = validatePassword(formData.password);
  const isPasswordStrong = Object.values(passwordValidation).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!refData) {
      toast.error('Dados de indicação não encontrados');
      return;
    }

    // Validações para revenda
    if (isRevenda) {
      if (!formData.account_name.trim()) {
        toast.error('Nome da Organização é obrigatório');
        return;
      }
    } else {
      // Validações para cliente
      if (!formData.pix_key.trim()) {
        toast.error('Chave PIX é obrigatória para receber comissões');
        return;
      }
    }

    // Validação de senha forte para todos
    if (!isPasswordStrong) {
      toast.error('A senha precisa atender todos os requisitos de segurança');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    setLoading(true);

    try {
      if (isRevenda) {
        // REVENDA: Mock signup - durante migração
        const authData = {
          user: { id: 'mock-user-' + Date.now(), email: formData.email.toLowerCase().trim() }
        };
        const authError = null;

        if (authError) {
          console.error('Auth error:', authError);
          if (authError.message.includes('already registered')) {
            throw new Error('Este e-mail já está cadastrado. Tente fazer login.');
          }
          throw authError;
        }

        const userId = authData.user?.id;
        if (!userId) {
          throw new Error('Erro ao criar usuário. Tente novamente.');
        }

        // Configurar registros adicionais via função SQL
        const { data, error } = await supabase.rpc('setup_customer_after_signup', {
          p_user_id: userId,
          p_tenant_id: refData.owner_tenant_id,
          p_full_name: formData.full_name,
          p_email: formData.email,
          p_whatsapp: formData.whatsapp.replace(/\D/g, ''),
          p_cpf_cnpj: formData.cpf_cnpj.replace(/\D/g, '') || null,
          p_birth_date: formData.birth_date || null,
          p_pix_key: null,
          p_notes: `Cadastro revenda via link: ${refData.ref_code}`,
          p_account_name: formData.account_name,
          p_is_revenda: true
        });

        if (error) throw error;

        const result = data as unknown as { success: boolean; error?: string; status?: string; message?: string };
        if (!result.success) throw new Error(result.error || 'Erro ao configurar conta');

        toast.success(result.message || 'Conta criada com sucesso!');
        // Mock signOut - não precisa fazer nada durante migração
        // await supabase.auth.signOut();
        
        navigate('/auth/login', { 
          state: { 
            email: formData.email, 
            message: result.status === 'pending' 
              ? 'Cadastro realizado! Aguarde aprovação para acessar.' 
              : 'Conta criada! Faça login para acessar.' 
          } 
        });
      } else {
        // CLIENTE: Criar via customer_auth (acesso apenas ao portal /portal)
        // NÃO usa Supabase Auth - evita acesso ao gestor
        const { data, error } = await supabase.rpc('register_portal_customer' as any, {
          p_tenant_id: refData.owner_tenant_id,
          p_full_name: formData.full_name,
          p_email: formData.email.toLowerCase().trim(),
          p_whatsapp: formData.whatsapp.replace(/\D/g, ''),
          p_password: formData.password,
          p_cpf_cnpj: formData.cpf_cnpj.replace(/\D/g, '') || null,
          p_birth_date: formData.birth_date || null,
          p_pix_key: formData.pix_key || null,
          p_ref_code: refData.ref_code
        });

        if (error) {
          console.error('Register error:', error);
          if (error.message.includes('já cadastrado') || error.message.includes('duplicate')) {
            throw new Error('Este e-mail ou WhatsApp já está cadastrado.');
          }
          throw error;
        }

        const result = data as unknown as { success: boolean; error?: string; status?: string; message?: string };
        if (!result.success) throw new Error(result.error || 'Erro ao criar conta');

        toast.success(result.message || 'Conta criada com sucesso!');
        
        // Redirecionar para login do PORTAL (não do gestor)
        navigate('/portal/servicos', { 
          state: { 
            email: formData.email, 
            message: result.status === 'pending' 
              ? 'Cadastro realizado! Aguarde aprovação para acessar.' 
              : 'Conta criada! Faça login para acessar o portal.' 
          } 
        });
      }

    } catch (err: any) {
      console.error('Error creating customer:', err);
      
      // Tratar erros de forma amigável
      let errorMessage = 'Erro ao criar conta. Tente novamente.';
      
      if (err.message) {
        const msg = err.message.toLowerCase();
        
        if (msg.includes('email já cadastrado') || msg.includes('already registered') || msg.includes('duplicate key') && msg.includes('email')) {
          errorMessage = 'Este e-mail já está cadastrado. Tente fazer login.';
        } else if (msg.includes('duplicate key') && msg.includes('whatsapp')) {
          errorMessage = 'Este WhatsApp já está cadastrado.';
        } else if (msg.includes('tenant não encontrado')) {
          errorMessage = 'Link de indicação inválido ou expirado.';
        } else if (msg.includes('violates check constraint')) {
          errorMessage = 'Erro de configuração do sistema. Entre em contato com o suporte.';
        } else if (msg.includes('network') || msg.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else {
          errorMessage = err.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img 
            src={tenantLogo || logoBraga} 
            alt="Logo" 
            className="h-20 w-auto object-contain"
          />
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isRevenda ? '🎉 Teste Grátis - Revenda!' : 'Criar sua conta'}
            </CardTitle>
            <CardDescription>
              {isRevenda 
                ? 'Preencha seus dados para começar seu teste de 7 dias como revendedor' 
                : 'Preencha seus dados para se cadastrar'}
            </CardDescription>
            {isRevenda && (
              <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Acesso completo por 7 dias
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome da Conta - apenas para revenda */}
              {isRevenda && (
                <div className="space-y-2">
                  <Label htmlFor="account_name">Nome da Organização *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="account_name"
                      name="account_name"
                      placeholder="Nome da sua revenda"
                      className="pl-10"
                      value={formData.account_name}
                      onChange={handleChange}
                      required={isRevenda}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="full_name">Nome completo *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full_name"
                    name="full_name"
                    placeholder="Seu nome completo"
                    className="pl-10"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="whatsapp"
                    name="whatsapp"
                    placeholder="(00) 00000-0000"
                    className="pl-10"
                    value={formData.whatsapp}
                    onChange={async (e) => {
                      const formatted = formatPhone(e.target.value);
                      setFormData(prev => ({ ...prev, whatsapp: formatted }));
                      
                      // Verificar se WhatsApp já existe (apenas aviso)
                      const digits = formatted.replace(/\D/g, '');
                      if (digits.length >= 10) {
                        const { data } = await supabase
                          .from('customers')
                          .select('full_name')
                          .eq('whatsapp', digits)
                          .maybeSingle();
                        
                        if (data) {
                          setWhatsappWarning(`Já existe um cliente com esse número: ${data.full_name}`);
                        } else {
                          setWhatsappWarning(null);
                        }
                      } else {
                        setWhatsappWarning(null);
                      }
                    }}
                    required
                  />
                </div>
                {whatsappWarning && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ {whatsappWarning}
                  </p>
                )}
              </div>

              {/* CPF/CNPJ e Data de nascimento - opcionais */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="cpf_cnpj"
                      name="cpf_cnpj"
                      placeholder="000.000.000-00"
                      className="pl-10"
                      value={formData.cpf_cnpj}
                      onChange={(e) => {
                        const formatted = formatCPF(e.target.value);
                        setFormData(prev => ({ ...prev, cpf_cnpj: formatted }));
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">Data de nascimento</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="birth_date"
                      name="birth_date"
                      type="date"
                      className="pl-10"
                      value={formData.birth_date}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Chave PIX - obrigatória para cliente */}
              {!isRevenda && (
                <div className="space-y-2">
                  <Label htmlFor="pix_key">Chave PIX para comissões *</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="pix_key"
                      name="pix_key"
                      placeholder="CPF, e-mail, telefone ou chave aleatória"
                      className="pl-10"
                      value={formData.pix_key}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Utilizada para receber suas comissões de indicação
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    className="pl-10"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                {/* Indicadores de força da senha - para todos */}
                {formData.password && (
                  <div className="mt-2 space-y-1 text-xs">
                    <div className={`flex items-center gap-2 ${passwordValidation.minLength ? 'text-green_600' : 'text-muted_foreground'}`}>
                      {passwordValidation.minLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      Mínimo 8 caracteres
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidation.hasUppercase ? 'text-green_600' : 'text-muted_foreground'}`}>
                      {passwordValidation.hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      Letra maiúscula
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidation.hasLowercase ? 'text-green_600' : 'text-muted_foreground'}`}>
                      {passwordValidation.hasLowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      Letra minúscula
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidation.hasNumber ? 'text-green_600' : 'text-muted_foreground'}`}>
                      {passwordValidation.hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      Número
                    </div>
                    <div className={`flex items-center gap-2 ${passwordValidation.hasSpecial ? 'text-green_600' : 'text-muted_foreground'}`}>
                      {passwordValidation.hasSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      Caractere especial (!@#$%...)
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirme sua senha"
                    className="pl-10"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full btn-gradient-primary"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Criar conta
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Já tem uma conta?{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/auth/login')}>
                Fazer login
              </Button>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Ao criar sua conta, você concorda com nossos Termos de Serviço e Política de Privacidade.
        </p>
      </div>
    </div>
  );
};

export default CadastroCliente;
