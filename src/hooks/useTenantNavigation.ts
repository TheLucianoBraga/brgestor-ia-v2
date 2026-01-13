import { useMemo } from 'react';
import {
  LayoutDashboard,
  CreditCard,
  Package,
  RefreshCcw,
  Ticket,
  Users,
  Settings,
  Building2,
  UserCheck,
  Receipt,
  FileText,
  MessageSquare,
  Bell,
  Activity,
  Share2,
  BarChart3,
  Newspaper,
  Bot,
  Link,
  Crown,
  Store,
  DollarSign,
  Wrench,
  ShoppingBag,
  Wallet,
  StickyNote,
  Sparkles,
} from 'lucide-react';
import { useTenant, Tenant } from '@/contexts/TenantContext';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface NavigationStructure {
  mainNav: NavGroup[];
  adminNav: NavGroup[];
}

// Navigation by tenant type - Reorganized structure
const getNavigationByType = (type: Tenant['type'] | null): NavigationStructure => {
  switch (type) {
    case 'master':
      return {
        mainNav: [
          {
            label: 'Início',
            items: [
              { title: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
              { title: 'Relatórios', href: '/app/relatorios', icon: BarChart3 },
              { title: 'Meu Plano', href: '/app/meu_plano', icon: Crown },
            ],
          },
          {
            label: 'Loja',
            items: [
              { title: 'Clientes', href: '/app/clientes', icon: UserCheck },
              { title: 'Planos & Produtos', href: '/app/produtos', icon: ShoppingBag },
              { title: 'Serviços', href: '/app/servicos', icon: Package },
              { title: 'Indicações', href: '/app/links', icon: Share2 },
            ],
          },
          {
            label: 'Financeiro',
            items: [
              { title: 'Cobranças', href: '/app/cobrancas', icon: Receipt },
              { title: 'Despesas', href: '/app/despesas', icon: Wallet },
              { title: 'Assinaturas', href: '/app/assinaturas', icon: RefreshCcw },
            ],
          },
          {
            label: 'Comunicação',
            items: [
              { title: 'WhatsApp', href: '/app/whatsapp', icon: MessageSquare },
              { title: 'Templates', href: '/app/templates', icon: FileText },
              { title: 'Conteúdo', href: '/app/conteudo', icon: Newspaper },
            ],
          },
          {
            label: 'Produtividade',
            items: [
              { title: 'Anotações', href: '/app/notes', icon: StickyNote },

            ],
          },
        ],
        adminNav: [
          {
            label: 'Gestão',
            items: [
              { title: 'Organizações', href: '/app/contas', icon: Building2 },
              { title: 'Revendas', href: '/app/gestao_revendas', icon: Store },
              { title: 'Cobrança de Ativos', href: '/app/cobranca_ativos', icon: DollarSign },
              { title: 'Planos', href: '/app/planos', icon: CreditCard },
              { title: 'Cupons', href: '/app/cupons', icon: Ticket },
            ],
          },
          {
            label: 'Automação',
            items: [
              { title: 'Atendimento IA', href: '/app/atendimento_ia', icon: Bot },
              { title: 'Notificações', href: '/app/notificacoes_center', icon: Bell },
            ],
          },
          {
            label: 'Sistema',
            items: [
              { title: 'Usuários', href: '/app/usuarios', icon: Users },
              { title: 'Logs', href: '/app/logs', icon: Activity },
              { title: 'Configurações', href: '/app/config', icon: Settings },
            ],
          },
        ],
      };

    case 'adm':
      return {
        mainNav: [
          {
            label: 'Início',
            items: [
              { title: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
              { title: 'Relatórios', href: '/app/relatorios', icon: BarChart3 },
              { title: 'Meu Plano', href: '/app/meu_plano', icon: Crown },
            ],
          },
          {
            label: 'Loja',
            items: [
              { title: 'Clientes', href: '/app/clientes', icon: UserCheck },
              { title: 'Planos & Produtos', href: '/app/produtos', icon: ShoppingBag },
              { title: 'Serviços', href: '/app/servicos', icon: Package },
              { title: 'Indicações', href: '/app/links', icon: Share2 },
            ],
          },
          {
            label: 'Financeiro',
            items: [
              { title: 'Cobranças', href: '/app/cobrancas', icon: Receipt },
              { title: 'Despesas', href: '/app/despesas', icon: Wallet },
              { title: 'Assinaturas', href: '/app/assinaturas', icon: RefreshCcw },
            ],
          },
          {
            label: 'Comunicação',
            items: [
              { title: 'WhatsApp', href: '/app/whatsapp', icon: MessageSquare },
              { title: 'Templates', href: '/app/templates', icon: FileText },
              { title: 'Conteúdo', href: '/app/conteudo', icon: Newspaper },
            ],
          },
          {
            label: 'Produtividade',
            items: [
              { title: 'Anotações', href: '/app/notes', icon: StickyNote },

            ],
          },
        ],
        adminNav: [
          {
            label: 'Gestão',
            items: [
              { title: 'Revendas', href: '/app/gestao_revendas', icon: Store },
              { title: 'Planos', href: '/app/planos', icon: CreditCard },
              { title: 'Cupons', href: '/app/cupons', icon: Ticket },
            ],
          },
          {
            label: 'Automação',
            items: [
              { title: 'Atendimento IA', href: '/app/atendimento_ia', icon: Bot },
              { title: 'Notificações', href: '/app/notificacoes_center', icon: Bell },
            ],
          },
          {
            label: 'Sistema',
            items: [
              { title: 'Usuários', href: '/app/usuarios', icon: Users },
              { title: 'Logs', href: '/app/logs', icon: Activity },
              { title: 'Configurações', href: '/app/config', icon: Settings },
            ],
          },
        ],
      };

    case 'revenda':
      return {
        mainNav: [
          {
            label: 'Início',
            items: [
              { title: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
              { title: 'Relatórios', href: '/app/relatorios', icon: BarChart3 },
              { title: 'Meu Plano', href: '/app/meu_plano', icon: Crown },
            ],
          },
          {
            label: 'Loja',
            items: [
              { title: 'Clientes', href: '/app/clientes', icon: UserCheck },
              { title: 'Planos & Produtos', href: '/app/produtos', icon: ShoppingBag },
              { title: 'Serviços', href: '/app/servicos', icon: Package },
              { title: 'Indicações', href: '/app/links', icon: Share2 },
            ],
          },
          {
            label: 'Financeiro',
            items: [
              { title: 'Cobranças', href: '/app/cobrancas', icon: Receipt },
              { title: 'Despesas', href: '/app/despesas', icon: Wallet },
              { title: 'Assinaturas', href: '/app/assinaturas', icon: RefreshCcw },
            ],
          },
          {
            label: 'Comunicação',
            items: [
              { title: 'WhatsApp', href: '/app/whatsapp', icon: MessageSquare },
              { title: 'Templates', href: '/app/templates', icon: FileText },
              { title: 'Conteúdo', href: '/app/conteudo', icon: Newspaper },
            ],
          },
          {
            label: 'Produtividade',
            items: [
              { title: 'Anotações', href: '/app/notes', icon: StickyNote },

            ],
          },
        ],
        adminNav: [
          {
            label: 'Sistema',
            items: [
              { title: 'Cupons', href: '/app/cupons', icon: Ticket },
              { title: 'Usuários', href: '/app/usuarios', icon: Users },
              { title: 'Configurações', href: '/app/config', icon: Settings },
            ],
          },
        ],
      };

    case 'cliente':
      // Cliente uses portal routes, no admin nav
      return {
        mainNav: [
          {
            label: 'Principal',
            items: [
              { title: 'Dashboard', href: '/cliente/dashboard', icon: LayoutDashboard },
            ],
          },
          {
            label: 'Serviços',
            items: [
              { title: 'Catálogo', href: '/cliente/servicos', icon: Package },
              { title: 'Meus Serviços', href: '/cliente/meus_servicos', icon: RefreshCcw },
            ],
          },
          {
            label: 'Financeiro',
            items: [
              { title: 'Pagamentos', href: '/cliente/pagamentos', icon: CreditCard },
              { title: 'Renovações', href: '/cliente/renovacoes', icon: RefreshCcw },
            ],
          },
          {
            label: 'Conta',
            items: [
              { title: 'Indicações', href: '/cliente/indicacoes', icon: Share2 },
              { title: 'Comunicados', href: '/cliente/comunicados', icon: Bell },
              { title: 'Suporte', href: '/cliente/suporte', icon: MessageSquare },
              { title: 'Perfil', href: '/cliente/perfil', icon: Users },
            ],
          },
        ],
        adminNav: [], // Cliente doesn't have admin nav
      };

    default:
      return {
        mainNav: [
          {
            label: 'Principal',
            items: [
              { title: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
            ],
          },
        ],
        adminNav: [
          {
            label: 'Sistema',
            items: [
              { title: 'Configurações', href: '/app/config', icon: Settings },
            ],
          },
        ],
      };
  }
};

// Get mobile nav items based on tenant type
export const getMobileNavByType = (type: Tenant['type'] | null): NavItem[] => {
  switch (type) {
    case 'master':
      return [
        { title: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
        { title: 'Clientes', href: '/app/clientes', icon: UserCheck },
        { title: 'Cobranças', href: '/app/cobrancas', icon: Receipt },
        { title: 'Despesas', href: '/app/despesas', icon: Wallet },
      ];
    case 'adm':
      return [
        { title: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
        { title: 'Clientes', href: '/app/clientes', icon: UserCheck },
        { title: 'Cobranças', href: '/app/cobrancas', icon: Receipt },
        { title: 'Despesas', href: '/app/despesas', icon: Wallet },
      ];
    case 'revenda':
      return [
        { title: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
        { title: 'Clientes', href: '/app/clientes', icon: UserCheck },
        { title: 'Cobranças', href: '/app/cobrancas', icon: Receipt },
        { title: 'Despesas', href: '/app/despesas', icon: Wallet },
      ];
    case 'cliente':
      return [
        { title: 'Dashboard', href: '/cliente/dashboard', icon: LayoutDashboard },
        { title: 'Serviços', href: '/cliente/servicos', icon: Package },
        { title: 'Pagamentos', href: '/cliente/pagamentos', icon: CreditCard },
        { title: 'Suporte', href: '/cliente/suporte', icon: MessageSquare },
      ];
    default:
      return [
        { title: 'Dashboard', href: '/app/dashboard', icon: LayoutDashboard },
        { title: 'Despesas', href: '/app/despesas', icon: Wallet },
      ];
  }
};

export const useTenantNavigation = () => {
  const { currentTenant } = useTenant();

  const { mainNav, adminNav } = useMemo(() => {
    return getNavigationByType(currentTenant?.type || null);
  }, [currentTenant?.type]);

  const mobileNavItems = useMemo(() => {
    return getMobileNavByType(currentTenant?.type || null);
  }, [currentTenant?.type]);

  // Legacy support - flatten for components that expect single array
  const navigation = useMemo(() => {
    return [...mainNav, ...adminNav];
  }, [mainNav, adminNav]);

  return { 
    navigation, 
    mainNav, 
    adminNav,
    mobileNavItems, 
    tenantType: currentTenant?.type || null,
    hasAdminNav: adminNav.length > 0,
  };
};
