import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from "@/contexts/AuthContext";
import { TenantProvider } from "@/contexts/TenantContext";
import { CustomerAuthProvider } from "@/contexts/CustomerAuthContext";
import { AuthGuard } from "@/components/guards/AuthGuard";
import { PortalGuard } from "@/components/guards/PortalGuard";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PageLoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { queryClient } from "@/lib/queryClient";

// Layout Components (not lazy - needed immediately)
import { AppShell } from "@/components/layout/AppShell";
import { PortalLayout } from "@/components/portal/PortalLayout";

// Auth Pages (not lazy - critical path)
import Login from "@/pages/auth/Login";
import ResetPassword from "@/pages/auth/ResetPassword";
import Signup from "@/pages/auth/Signup";

// Public Pages
const Index = lazy(() => import("@/pages/Index"));
const Referral = lazy(() => import("@/pages/public/Referral"));
const CadastroCliente = lazy(() => import("@/pages/public/CadastroCliente"));
const Install = lazy(() => import("@/pages/public/Install"));
const Invoice = lazy(() => import("@/pages/public/Invoice"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// App Pages - Lazy loaded
const Dashboard = lazy(() => import("@/pages/app/Dashboard"));
const Contas = lazy(() => import("@/pages/app/Contas"));
const Planos = lazy(() => import("@/pages/app/Planos"));
const Servicos = lazy(() => import("@/pages/app/Servicos"));
const ProdutosPage = lazy(() => import("@/pages/app/Produtos"));
const Assinaturas = lazy(() => import("@/pages/app/Assinaturas"));
const Cupons = lazy(() => import("@/pages/app/Cupons"));
const Usuarios = lazy(() => import("@/pages/app/Usuarios"));
const Config = lazy(() => import("@/pages/app/Config"));
const SelectTenant = lazy(() => import("@/pages/app/SelectTenant"));
const Clientes = lazy(() => import("@/pages/app/Clientes"));
const NovoCliente = lazy(() => import("@/pages/app/NovoCliente.tsx"));
const Cobrancas = lazy(() => import("@/pages/app/Cobrancas"));
const Templates = lazy(() => import("@/pages/app/Templates"));
const Notificacoes = lazy(() => import("@/pages/app/Notificacoes"));
const Relatorios = lazy(() => import("@/pages/app/Relatorios"));
const Conteudo = lazy(() => import("@/pages/app/Conteudo"));
const Logs = lazy(() => import("@/pages/app/Logs"));
const AtendimentoIA = lazy(() => import("@/pages/app/AtendimentoIA"));
const WhatsAppAutomation = lazy(() => import("@/pages/app/WhatsApp"));
const Links = lazy(() => import("@/pages/app/Links"));
const Trial = lazy(() => import("@/pages/app/Trial"));
const MeuPlano = lazy(() => import("@/pages/app/MeuPlano"));
const GestaoRevendas = lazy(() => import("@/pages/app/GestaoRevendas"));
const CobrancaAtivos = lazy(() => import("@/pages/app/CobrancaAtivos"));
const ChatPage = lazy(() => import("@/pages/app/ChatPage"));
const Despesas = lazy(() => import("@/pages/app/DespesasNew"));
const Notes = lazy(() => import("@/pages/app/Notes"));
const NotificacoesCenter = lazy(() => import("@/pages/app/NotificacoesCenter"));

// Portal Pages - Lazy loaded
const PortalDashboard = lazy(() => import("@/pages/portal/PortalDashboard"));
const PortalServicos = lazy(() => import("@/pages/portal/PortalServicos"));
const PortalMeusServicos = lazy(() => import("@/pages/portal/PortalMeusServicos"));
const PortalIndicacoes = lazy(() => import("@/pages/portal/PortalIndicacoes"));
const PortalPerfil = lazy(() => import("@/pages/portal/PortalPerfil"));
const PortalConteudo = lazy(() => import("@/pages/portal/PortalConteudo"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <PageLoadingSkeleton />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <TenantProvider>
            <CustomerAuthProvider>
              <Toaster />
              <Sonner position="top-right" />
              <InstallPrompt />
              <BrowserRouter>
                <ProgressBar />
                <AnimatePresence mode="wait">
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/" element={<Index />} />
                      <Route path="/auth/login" element={<Login />} />
                      <Route path="/auth/signup" element={<Signup />} />
                      <Route path="/auth/reset" element={<ResetPassword />} />
                      <Route path="/app/select-tenant" element={
                        <AuthGuard requireTenant={false}>
                          <Suspense fallback={<PageLoader />}>
                            <SelectTenant />
                          </Suspense>
                        </AuthGuard>
                      } />
                      <Route path="/r/:code" element={<Referral />} />
                      <Route path="/cadastro-cliente" element={<CadastroCliente />} />
                      <Route path="/cadastro-cliente/revenda" element={<CadastroCliente />} />
                      <Route path="/install" element={<Install />} />
                      <Route path="/fatura/:id" element={<Invoice />} />

                      {/* Portal Routes - Protected */}
                      <Route
                        path="/portal"
                        element={
                          <PortalGuard>
                            <PortalLayout />
                          </PortalGuard>
                        }
                      >
                        <Route index element={<Navigate to="/portal/dashboard" replace />} />
                        <Route path="dashboard" element={
                          <Suspense fallback={<PageLoader />}><PortalDashboard /></Suspense>
                        } />
                        <Route path="servicos" element={
                          <Suspense fallback={<PageLoader />}><PortalServicos /></Suspense>
                        } />
                        <Route path="meus-servicos" element={
                          <Suspense fallback={<PageLoader />}><PortalMeusServicos /></Suspense>
                        } />
                        <Route path="indicacoes" element={
                          <Suspense fallback={<PageLoader />}><PortalIndicacoes /></Suspense>
                        } />
                        <Route path="conteudo" element={
                          <Suspense fallback={<PageLoader />}><PortalConteudo /></Suspense>
                        } />
                        <Route path="perfil" element={
                          <Suspense fallback={<PageLoader />}><PortalPerfil /></Suspense>
                        } />
                      </Route>

                      {/* Redirect old /cliente routes to /portal */}
                      <Route path="/cliente/*" element={<Navigate to="/portal" replace />} />

                      {/* Protected Routes - Admin */}
                      <Route
                        path="/app"
                        element={
                          <AuthGuard>
                            <AppShell />
                          </AuthGuard>
                        }
                      >
                        <Route index element={<Navigate to="/app/dashboard" replace />} />
                        <Route path="dashboard" element={
                          <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
                        } />
                        <Route path="contas" element={
                          <Suspense fallback={<PageLoader />}><Contas /></Suspense>
                        } />
                        <Route path="clientes">
                          <Route index element={
                            <Suspense fallback={<PageLoader />}><Clientes /></Suspense>
                          } />
                          <Route path="novo" element={
                            <Suspense fallback={<PageLoader />}><NovoCliente /></Suspense>
                          } />
                        </Route>
                        <Route path="cobrancas" element={
                          <Suspense fallback={<PageLoader />}><Cobrancas /></Suspense>
                        } />
                        <Route path="planos" element={
                          <Suspense fallback={<PageLoader />}><Planos /></Suspense>
                        } />
                        <Route path="servicos" element={
                          <Suspense fallback={<PageLoader />}><Servicos /></Suspense>
                        } />
                        <Route path="produtos" element={
                          <Suspense fallback={<PageLoader />}><ProdutosPage /></Suspense>
                        } />
                        <Route path="assinaturas" element={
                          <Suspense fallback={<PageLoader />}><Assinaturas /></Suspense>
                        } />
                        <Route path="cupons" element={
                          <Suspense fallback={<PageLoader />}><Cupons /></Suspense>
                        } />
                        <Route path="usuarios" element={
                          <Suspense fallback={<PageLoader />}><Usuarios /></Suspense>
                        } />
                        <Route path="config" element={
                          <Suspense fallback={<PageLoader />}><Config /></Suspense>
                        } />
                        <Route path="templates" element={
                          <Suspense fallback={<PageLoader />}><Templates /></Suspense>
                        } />
                        <Route path="notificacoes" element={
                          <Suspense fallback={<PageLoader />}><Notificacoes /></Suspense>
                        } />
                        <Route path="relatorios" element={
                          <Suspense fallback={<PageLoader />}><Relatorios /></Suspense>
                        } />
                        <Route path="conteudo" element={
                          <Suspense fallback={<PageLoader />}><Conteudo /></Suspense>
                        } />
                        <Route path="logs" element={
                          <Suspense fallback={<PageLoader />}><Logs /></Suspense>
                        } />
                        <Route path="atendimento-ia" element={
                          <Suspense fallback={<PageLoader />}><AtendimentoIA /></Suspense>
                        } />
                        <Route path="whatsapp" element={
                          <Suspense fallback={<PageLoader />}><WhatsAppAutomation /></Suspense>
                        } />
                        <Route path="links" element={
                          <Suspense fallback={<PageLoader />}><Links /></Suspense>
                        } />
                        <Route path="trial" element={
                          <Suspense fallback={<PageLoader />}><Trial /></Suspense>
                        } />
                        <Route path="meu-plano" element={
                          <Suspense fallback={<PageLoader />}><MeuPlano /></Suspense>
                        } />
                        <Route path="gestao-revendas" element={
                          <Suspense fallback={<PageLoader />}><GestaoRevendas /></Suspense>
                        } />
                        <Route path="cobranca-ativos" element={
                          <Suspense fallback={<PageLoader />}><CobrancaAtivos /></Suspense>
                        } />
                        <Route path="despesas" element={
                          <Suspense fallback={<PageLoader />}><Despesas /></Suspense>
                        } />
                        <Route path="chat" element={
                          <Suspense fallback={<PageLoader />}><ChatPage /></Suspense>
                        } />
                        <Route path="notes" element={
                          <Suspense fallback={<PageLoader />}><Notes /></Suspense>
                        } />
                        <Route path="notificacoes-center" element={
                          <Suspense fallback={<PageLoader />}><NotificacoesCenter /></Suspense>
                        } />
                      </Route>

                      {/* Catch-all */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </AnimatePresence>
              </BrowserRouter>
            </CustomerAuthProvider>
          </TenantProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
