import React, { useState, useEffect } from 'react';
import { usePortalCustomerId } from '@/hooks/usePortalCustomerId';
import { useCustomer } from '@/hooks/useCustomer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Phone, 
  CreditCard, 
  MapPin, 
  ShieldCheck, 
  Save, 
  Loader2,
  Bell,
  Smartphone,
  CheckCircle2,
  Lock,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function PortalPerfil() {
  const { customerId, isLoading: authLoading, authType } = usePortalCustomerId();
  const {
    customer,
    address,
    isLoading: customerLoading,
    updateCustomer,
    updateAddress,
    changePassword,
    searchCep,
  } = useCustomer(customerId);

  const [profileForm, setProfileForm] = useState<any>({
    full_name: '',
    whatsapp: '',
    secondary_phone: '',
    pix_key: '',
    allow_whatsapp: true,
    allow_email: true,
    allow_portal_notifications: true,
  });
  const [addressForm, setAddressForm] = useState<any>({
    cep: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
  });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  const isLoading = authLoading || customerLoading;

  useEffect(() => {
    if (customer) {
      setProfileForm({
        full_name: customer.full_name || '',
        whatsapp: customer.whatsapp || '',
        secondary_phone: customer.secondary_phone || '',
        pix_key: customer.pix_key || '',
        cpf_cnpj: customer.cpf_cnpj || '',
        rg_ie: customer.rg_ie || '',
        birth_date: customer.birth_date || '',
        gender: customer.gender || '',
        allow_whatsapp: customer.allow_whatsapp ?? true,
        allow_email: customer.allow_email ?? true,
        allow_portal_notifications: customer.allow_portal_notifications ?? true,
      });
    }
    if (address) {
      setAddressForm({
        cep: address.cep || '',
        street: address.street || '',
        number: address.number || '',
        complement: address.complement || '',
        district: address.district || '',
        city: address.city || '',
        state: address.state || '',
      });
    }
  }, [customer, address]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authType === 'preview') {
      toast.error('Alterações não permitidas no modo preview');
      return;
    }
    await updateCustomer.mutateAsync(profileForm);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authType === 'preview') {
      toast.error('Alterações não permitidas no modo preview');
      return;
    }
    await updateAddress.mutateAsync(addressForm);
  };

  const handleCepSearch = async () => {
    if (!addressForm.cep || addressForm.cep.length < 8) return;
    setIsSearchingCep(true);
    const result = await searchCep(addressForm.cep);
    if (result) {
      setAddressForm((prev: any) => ({ ...prev, ...result }));
    }
    setIsSearchingCep(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    await changePassword.mutateAsync({
      currentPassword: passwordForm.current,
      newPassword: passwordForm.new
    });
    setPasswordForm({ current: '', new: '', confirm: '' });
  };

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-96 rounded-[2rem]" />
          </div>
          <Skeleton className="h-64 rounded-[2rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Meu <span className="text-primary">Perfil</span></h1>
          <p className="text-muted-foreground mt-1">Gerencie suas informações e preferências de forma unificada.</p>
        </div>
        <div className="flex items-center gap-3 bg-secondary/50 p-3 rounded-2xl">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Segurança</span>
            <span className="text-xs font-bold text-emerald-500">Conexão Criptografada</span>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="dados" className="w-full space-y-8">
        <TabsList className="bg-secondary/50 p-1 rounded-2xl h-14 w-full sm:w-auto flex overflow-x-auto no-scrollbar">
          <TabsTrigger value="dados" className="flex-1 sm:flex-none rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold gap-2">
            <User className="w-4 h-4" />
            Dados Pessoais
          </TabsTrigger>
          <TabsTrigger value="endereco" className="flex-1 sm:flex-none rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold gap-2">
            <MapPin className="w-4 h-4" />
            Endereço
          </TabsTrigger>
          <TabsTrigger value="seguranca" className="flex-1 sm:flex-none rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold gap-2">
            <Lock className="w-4 h-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {/* Aba Dados Pessoais */}
            <TabsContent value="dados" className="mt-0 space-y-8">
              <Card className="border-none shadow-xl shadow-black/5 rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-muted/30 px-8 py-6 border-b">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black">Informações Básicas</CardTitle>
                      <CardDescription>Seus dados de contato e identificação</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</Label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input 
                            value={profileForm.full_name || ''}
                            onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                            className="pl-10 rounded-xl border-muted bg-secondary/30 focus:bg-background transition-all h-12 font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            value={customer?.email || ''}
                            disabled
                            className="pl-10 rounded-xl border-muted bg-muted/50 h-12 font-medium cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp</Label>
                        <div className="relative group">
                          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input 
                            value={profileForm.whatsapp || ''}
                            onChange={(e) => setProfileForm({...profileForm, whatsapp: e.target.value})}
                            className="pl-10 rounded-xl border-muted bg-secondary/30 focus:bg-background transition-all h-12 font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Chave PIX</Label>
                        <div className="relative group">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input 
                            value={profileForm.pix_key || ''}
                            onChange={(e) => setProfileForm({...profileForm, pix_key: e.target.value})}
                            className="pl-10 rounded-xl border-muted bg-secondary/30 focus:bg-background transition-all h-12 font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CPF / CNPJ</Label>
                        <div className="relative group">
                          <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input 
                            value={profileForm.cpf_cnpj || ''}
                            onChange={(e) => setProfileForm({...profileForm, cpf_cnpj: e.target.value})}
                            className="pl-10 rounded-xl border-muted bg-secondary/30 focus:bg-background transition-all h-12 font-medium"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">RG / IE</Label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input 
                            value={profileForm.rg_ie || ''}
                            onChange={(e) => setProfileForm({...profileForm, rg_ie: e.target.value})}
                            className="pl-10 rounded-xl border-muted bg-secondary/30 focus:bg-background transition-all h-12 font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-4 block">Preferências de Notificação</Label>
                      <div className="grid gap-4 sm:grid-cols-3">
                        {[
                          { id: 'allow_whatsapp', label: 'WhatsApp', icon: Smartphone },
                          { id: 'allow_email', label: 'E-mail', icon: Mail },
                          { id: 'allow_portal_notifications', label: 'Portal', icon: Bell },
                        ].map((pref) => (
                          <div 
                            key={pref.id}
                            onClick={() => setProfileForm({...profileForm, [pref.id]: !profileForm[pref.id]})}
                            className={cn(
                              "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer",
                              profileForm[pref.id] ? "border-primary bg-primary/5" : "border-muted bg-transparent"
                            )}
                          >
                            <pref.icon className={cn("h-5 w-5", profileForm[pref.id] ? "text-primary" : "text-muted-foreground")} />
                            <span className={cn("text-xs font-bold", profileForm[pref.id] ? "text-foreground" : "text-muted-foreground")}>{pref.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button 
                        type="submit" 
                        disabled={updateCustomer.isPending || authType === 'preview'}
                        className="rounded-2xl bg-primary shadow-lg shadow-primary/20 px-8 h-12 font-bold"
                      >
                        {updateCustomer.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Salvar Alterações
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Endereço */}
            <TabsContent value="endereco" className="mt-0 space-y-8">
              <Card className="border-none shadow-xl shadow-black/5 rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-muted/30 px-8 py-6 border-b">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <MapPin className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black">Endereço de Cobrança</CardTitle>
                      <CardDescription>Mantenha seu endereço atualizado para faturamento</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <form onSubmit={handleSaveAddress} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">CEP</Label>
                        <div className="flex gap-2">
                          <Input 
                            value={addressForm.cep || ''}
                            onChange={(e) => setAddressForm({...addressForm, cep: e.target.value})}
                            className="rounded-xl border-muted bg-secondary/30 h-12 font-medium"
                          />
                          <Button type="button" variant="secondary" onClick={handleCepSearch} disabled={isSearchingCep} className="h-12 rounded-xl px-4">
                            {isSearchingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="sm:col-span-2 space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Rua / Logradouro</Label>
                        <Input 
                          value={addressForm.street || ''}
                          onChange={(e) => setAddressForm({...addressForm, street: e.target.value})}
                          className="rounded-xl border-muted bg-secondary/30 h-12 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Número</Label>
                        <Input 
                          value={addressForm.number || ''}
                          onChange={(e) => setAddressForm({...addressForm, number: e.target.value})}
                          className="rounded-xl border-muted bg-secondary/30 h-12 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Bairro</Label>
                        <Input 
                          value={addressForm.district || ''}
                          onChange={(e) => setAddressForm({...addressForm, district: e.target.value})}
                          className="rounded-xl border-muted bg-secondary/30 h-12 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cidade</Label>
                        <Input 
                          value={addressForm.city || ''}
                          onChange={(e) => setAddressForm({...addressForm, city: e.target.value})}
                          className="rounded-xl border-muted bg-secondary/30 h-12 font-medium"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button 
                        type="submit" 
                        disabled={updateAddress.isPending || authType === 'preview'}
                        className="rounded-2xl bg-primary shadow-lg shadow-primary/20 px-8 h-12 font-bold"
                      >
                        {updateAddress.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Salvar Endereço
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba Segurança */}
            <TabsContent value="seguranca" className="mt-0 space-y-8">
              <Card className="border-none shadow-xl shadow-black/5 rounded-[2rem] overflow-hidden">
                <CardHeader className="bg-muted/30 px-8 py-6 border-b">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                      <Lock className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-black">Alterar Senha</CardTitle>
                      <CardDescription>Mantenha sua conta segura com uma senha forte</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                  <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Senha Atual</Label>
                      <div className="relative">
                        <Input 
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordForm.current}
                          onChange={(e) => setPasswordForm({...passwordForm, current: e.target.value})}
                          className="rounded-xl border-muted bg-secondary/30 h-12 font-medium pr-10"
                        />
                        <button type="button" onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nova Senha</Label>
                      <div className="relative">
                        <Input 
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordForm.new}
                          onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                          className="rounded-xl border-muted bg-secondary/30 h-12 font-medium pr-10"
                        />
                        <button type="button" onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirmar Nova Senha</Label>
                      <div className="relative">
                        <Input 
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordForm.confirm}
                          onChange={(e) => setPasswordForm({...passwordForm, confirm: e.target.value})}
                          className="rounded-xl border-muted bg-secondary/30 h-12 font-medium pr-10"
                        />
                        <button type="button" onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={changePassword.isPending || authType === 'preview'}
                      className="w-full rounded-2xl bg-primary shadow-lg shadow-primary/20 h-12 font-bold mt-4"
                    >
                      {changePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                      Atualizar Senha
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <Card className="border-none bg-primary text-primary-foreground shadow-xl shadow-primary/20 rounded-[2rem] overflow-hidden">
              <CardContent className="p-8 text-center">
                <div className="h-24 w-24 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6 border-4 border-white/10 shadow-inner">
                  <User className="h-12 w-12" />
                </div>
                <h3 className="text-2xl font-black leading-tight mb-2">{customer?.full_name?.split(' ')[0]}</h3>
                <p className="text-primary-foreground/70 text-sm mb-6">
                  Cliente desde {customer?.created_at ? new Date(customer.created_at).getFullYear() : '2024'}
                </p>
                <div className="bg-white/10 rounded-2xl p-4 text-left space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold opacity-70 uppercase tracking-widest">Status</span>
                    <Badge className="bg-emerald-500 text-white border-none text-[10px] font-black">ATIVO</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold opacity-70 uppercase tracking-widest">ID Unificado</span>
                    <span className="font-mono">{customer?.id?.substring(0, 8)}...</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl shadow-black/5 rounded-[2rem] overflow-hidden p-8 bg-muted/20">
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="font-bold text-sm">Dados Unificados</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Suas alterações aqui são refletidas instantaneamente em todo o ecossistema do Gestor. Garantimos a integridade e segurança dos seus dados.
              </p>
            </Card>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
