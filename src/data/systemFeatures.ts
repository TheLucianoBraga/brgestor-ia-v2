import { 
  LayoutDashboard, CreditCard, Package, RefreshCcw, Ticket, Users, Settings, 
  Building2, UserCheck, Receipt, FileText, MessageSquare, Bell, Activity, 
  Share2, BarChart3, Newspaper, Bot, Store, DollarSign, ShoppingBag, Wallet, 
  StickyNote, TrendingUp, Lock, Database, Brain, Clock, Filter, Tag, Pin, 
  Download, Edit3, Copy, Upload, QrCode, Zap, Calendar, PieChart, FileSpreadsheet,
  Banknote, UserPlus, Mail, Sparkles, Globe, Link2, Shield, Send, Eye, CheckCircle2,
  type LucideIcon
} from 'lucide-react';

export interface Feature {
  name: string;
  description: string;
  status: 'active' | 'beta' | 'soon' | 'premium';
  icon?: LucideIcon;
}

export interface SubCategory {
  name: string;
  description: string;
  features: Feature[];
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  href?: string;
  subCategories: SubCategory[];
}

export const SYSTEM_FEATURES: Category[] = [
  {
    id: 'dashboard',
    name: 'Dashboard & Relatórios',
    description: 'Visão geral e análises do seu negócio',
    icon: LayoutDashboard,
    color: 'text-blue_500',
    href: '/app/dashboard',
    subCategories: [
      {
        name: 'Dashboard Principal',
        description: 'Métricas e KPIs em tempo real',
        features: [
          { name: 'Cards de métricas', description: 'Receita, clientes, cobranças', status: 'active', icon: TrendingUp },
          { name: 'Gráficos interativos', description: 'Evolução temporal dos dados', status: 'active', icon: PieChart },
          { name: 'Insights com IA', description: 'Análises automáticas', status: 'active', icon: Brain },
          { name: 'Alertas inteligentes', description: 'Notificações de anomalias', status: 'beta', icon: Bell },
        ],
      },
      {
        name: 'Relatórios',
        description: 'Análises detalhadas',
        features: [
          { name: 'Relatório financeiro', description: 'Receitas e despesas', status: 'active', icon: FileSpreadsheet },
          { name: 'Relatório de clientes', description: 'Crescimento e retenção', status: 'active', icon: Users },
          { name: 'Comparativo mensal', description: 'Comparação entre períodos', status: 'active', icon: BarChart3 },
          { name: 'Exportação PDF/Excel', description: 'Download de relatórios', status: 'active', icon: Download },
        ],
      },
    ],
  },
  {
    id: 'clientes',
    name: 'Gestão de Clientes',
    description: 'Cadastro e gerenciamento de clientes',
    icon: UserCheck,
    color: 'text-green_500',
    href: '/app/clientes',
    subCategories: [
      {
        name: 'Cadastro',
        description: 'Gerenciamento de dados',
        features: [
          { name: 'Cadastro completo', description: 'Dados pessoais e documentos', status: 'active', icon: UserPlus },
          { name: 'Importação em massa', description: 'Upload via planilha', status: 'active', icon: Upload },
          { name: 'Campos customizados', description: 'Endereço, veículo, etc', status: 'active', icon: Edit3 },
          { name: 'Histórico de atividades', description: 'Log de interações', status: 'active', icon: Activity },
        ],
      },
      {
        name: 'Comunicação',
        description: 'Contato com clientes',
        features: [
          { name: 'Envio de WhatsApp', description: 'Mensagens diretas', status: 'active', icon: MessageSquare },
          { name: 'Envio de e_mail', description: 'Notificações por email', status: 'active', icon: Mail },
          { name: 'Histórico de mensagens', description: 'Registro de comunicações', status: 'active', icon: FileText },
        ],
      },
      {
        name: 'Portal do Cliente',
        description: 'Acesso self_service',
        features: [
          { name: 'Login do cliente', description: 'Acesso ao portal', status: 'active', icon: Lock },
          { name: 'Visualização de serviços', description: 'Serviços contratados', status: 'active', icon: Package },
          { name: 'Pagamentos online', description: 'Pagar faturas', status: 'active', icon: CreditCard },
          { name: 'Programa de indicações', description: 'Indicar e ganhar', status: 'active', icon: Share2 },
        ],
      },
    ],
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    description: 'Cobranças, pagamentos e despesas',
    icon: Wallet,
    color: 'text-emerald_500',
    href: '/app/cobrancas',
    subCategories: [
      {
        name: 'Cobranças',
        description: 'Geração e gestão de cobranças',
        features: [
          { name: 'Criação de cobranças', description: 'Manual ou automática', status: 'active', icon: Receipt },
          { name: 'PIX integrado', description: 'QR Code e copia_cola', status: 'active', icon: QrCode },
          { name: 'Cartão de crédito', description: 'Pagamento online', status: 'active', icon: CreditCard },
          { name: 'Boleto bancário', description: 'Geração automática', status: 'active', icon: Banknote },
          { name: 'Cobrança recorrente', description: 'Assinaturas automáticas', status: 'active', icon: RefreshCcw },
        ],
      },
      {
        name: 'Gateways de Pagamento',
        description: 'Integrações disponíveis',
        features: [
          { name: 'Asaas', description: 'PIX, boleto e cartão', status: 'active', icon: Zap },
          { name: 'Mercado Pago', description: 'PIX e cartão', status: 'active', icon: Zap },
          { name: 'Stripe', description: 'Cartão e PIX internacional', status: 'active', icon: Zap },
          { name: 'PagSeguro', description: 'Múltiplas formas', status: 'active', icon: Zap },
        ],
      },
      {
        name: 'Despesas',
        description: 'Controle de gastos',
        features: [
          { name: 'Lançamento de despesas', description: 'Registro manual', status: 'active', icon: Wallet },
          { name: 'Categorias', description: 'Organização por tipo', status: 'active', icon: Tag },
          { name: 'Centros de custo', description: 'Alocação por área', status: 'active', icon: Building2 },
          { name: 'Scan com IA', description: 'Leitura de notas fiscais', status: 'beta', icon: Brain },
          { name: 'Anexos', description: 'Upload de comprovantes', status: 'active', icon: Upload },
        ],
      },
    ],
  },
  {
    id: 'produtos',
    name: 'Produtos & Serviços',
    description: 'Catálogo de ofertas',
    icon: ShoppingBag,
    color: 'text-purple_500',
    href: '/app/produtos',
    subCategories: [
      {
        name: 'Planos',
        description: 'Assinaturas recorrentes',
        features: [
          { name: 'Criação de planos', description: 'Mensal, anual, etc', status: 'active', icon: CreditCard },
          { name: 'Preço variável', description: 'Por quantidade/uso', status: 'active', icon: TrendingUp },
          { name: 'Taxa de adesão', description: 'Valor de entrada', status: 'active', icon: DollarSign },
          { name: 'Trial gratuito', description: 'Período de teste', status: 'active', icon: Clock },
        ],
      },
      {
        name: 'Produtos Avulsos',
        description: 'Vendas únicas',
        features: [
          { name: 'Catálogo de produtos', description: 'Listagem organizada', status: 'active', icon: Package },
          { name: 'Variações', description: 'Tamanhos, cores, etc', status: 'active', icon: Copy },
          { name: 'Estoque', description: 'Controle de quantidade', status: 'soon', icon: Database },
        ],
      },
      {
        name: 'Descontos',
        description: 'Promoções e cupons',
        features: [
          { name: 'Cupons de desconto', description: 'Códigos promocionais', status: 'active', icon: Ticket },
          { name: 'Desconto por produto', description: 'Regras específicas', status: 'active', icon: Tag },
          { name: 'Validade', description: 'Período de uso', status: 'active', icon: Calendar },
        ],
      },
    ],
  },
  {
    id: 'comunicacao',
    name: 'Comunicação',
    description: 'WhatsApp, templates e conteúdo',
    icon: MessageSquare,
    color: 'text-green_600',
    href: '/app/whatsapp',
    subCategories: [
      {
        name: 'WhatsApp',
        description: 'Integração WAHA',
        features: [
          { name: 'Conexão WhatsApp', description: 'QR Code para vincular', status: 'active', icon: QrCode },
          { name: 'Envio de mensagens', description: 'Individual ou em massa', status: 'active', icon: Send },
          { name: 'Agendamento', description: 'Mensagens programadas', status: 'active', icon: Clock },
          { name: 'Autoresponder', description: 'Respostas automáticas', status: 'active', icon: Bot },
        ],
      },
      {
        name: 'Templates',
        description: 'Modelos de mensagens',
        features: [
          { name: 'Criação de templates', description: 'Editor visual', status: 'active', icon: FileText },
          { name: 'Variáveis dinâmicas', description: 'Nome, valor, data', status: 'active', icon: Zap },
          { name: 'Geração com IA', description: 'Criar texto automaticamente', status: 'active', icon: Sparkles },
          { name: 'Categorias', description: 'Cobrança, boas-vindas, etc', status: 'active', icon: Tag },
        ],
      },
      {
        name: 'Conteúdo',
        description: 'Publicações e materiais',
        features: [
          { name: 'Criação de posts', description: 'Artigos e comunicados', status: 'active', icon: Newspaper },
          { name: 'Variações com IA', description: 'Versões alternativas', status: 'active', icon: Brain },
          { name: 'Agendamento', description: 'Publicação futura', status: 'active', icon: Calendar },
          { name: 'Galeria de mídia', description: 'Imagens e vídeos', status: 'active', icon: Upload },
        ],
      },
    ],
  },
  {
    id: 'automacao',
    name: 'Automação & IA',
    description: 'Chatbot e atendimento inteligente',
    icon: Bot,
    color: 'text-amber_500',
    href: '/app/atendimento_ia',
    subCategories: [
      {
        name: 'Chatbot IA',
        description: 'Atendimento automatizado',
        features: [
          { name: 'Atendimento 24/7', description: 'Respostas automáticas', status: 'active', icon: Clock },
          { name: 'Base de conhecimento', description: 'FAQs e documentos', status: 'active', icon: Database },
          { name: 'Ações automáticas', description: 'Gerar PIX, listar serviços', status: 'active', icon: Zap },
          { name: 'Transferência humana', description: 'Escalar atendimento', status: 'active', icon: Users },
          { name: 'Memória de conversa', description: 'Contexto persistente', status: 'active', icon: Brain },
        ],
      },
      {
        name: 'Notificações Automáticas',
        description: 'Alertas e lembretes',
        features: [
          { name: 'Lembrete de vencimento', description: 'Antes e após vencer', status: 'active', icon: Bell },
          { name: 'Confirmação de pagamento', description: 'Ao receber', status: 'active', icon: CheckCircle2 },
          { name: 'Renovação de serviço', description: 'Aviso de expiração', status: 'active', icon: RefreshCcw },
          { name: 'Personalização', description: 'Dias e horários', status: 'active', icon: Settings },
        ],
      },
      {
        name: 'IA Assistente',
        description: 'Recursos de inteligência artificial',
        features: [
          { name: 'Melhorar texto', description: 'Reescrever conteúdo', status: 'active', icon: Sparkles },
          { name: 'Resumir', description: 'Condensar informações', status: 'active', icon: FileText },
          { name: 'Traduzir', description: 'Múltiplos idiomas', status: 'active', icon: Globe },
          { name: 'Mudar tom', description: 'Formal, casual, vendedor', status: 'active', icon: Edit3 },
        ],
      },
    ],
  },
  {
    id: 'gestao',
    name: 'Gestão Multi_tenant',
    description: 'Organizações e revendas',
    icon: Building2,
    color: 'text-indigo_500',
    href: '/app/contas',
    subCategories: [
      {
        name: 'Organizações',
        description: 'Gerenciamento de tenants',
        features: [
          { name: 'Criar organizações', description: 'Novos tenants', status: 'active', icon: Building2 },
          { name: 'Tipos de conta', description: 'Admin, Revenda, Cliente', status: 'active', icon: Users },
          { name: 'Hierarquia', description: 'Pai e filhos', status: 'active', icon: Share2 },
          { name: 'Impersonação', description: 'Acessar como tenant', status: 'active', icon: Eye },
        ],
      },
      {
        name: 'Revendas',
        description: 'Gestão de revendedores',
        features: [
          { name: 'Cadastro de revendas', description: 'Novos parceiros', status: 'active', icon: Store },
          { name: 'Planos por revenda', description: 'Valor por ativo', status: 'active', icon: DollarSign },
          { name: 'Cobrança automática', description: 'Fatura mensal', status: 'active', icon: Receipt },
          { name: 'Dashboard revenda', description: 'Métricas do parceiro', status: 'active', icon: BarChart3 },
        ],
      },
      {
        name: 'Planos do Sistema',
        description: 'Planos para Admin/Revenda',
        features: [
          { name: 'Planos Admin', description: 'Com valor por revenda ativa', status: 'active', icon: CreditCard },
          { name: 'Planos Revenda', description: 'Mensalidade fixa', status: 'active', icon: CreditCard },
          { name: 'Limites', description: 'Usuários, clientes, etc', status: 'active', icon: Shield },
          { name: 'Features por plano', description: 'Recursos liberados', status: 'active', icon: CheckCircle2 },
        ],
      },
    ],
  },
  {
    id: 'sistema',
    name: 'Sistema & Configurações',
    description: 'Usuários, logs e preferências',
    icon: Settings,
    color: 'text-gray_500',
    href: '/app/config',
    subCategories: [
      {
        name: 'Usuários',
        description: 'Gerenciamento de acesso',
        features: [
          { name: 'Convite de usuários', description: 'Por e_mail', status: 'active', icon: UserPlus },
          { name: 'Papéis', description: 'Admin, operador, etc', status: 'active', icon: Shield },
          { name: 'Permissões', description: 'Controle granular', status: 'active', icon: Lock },
          { name: 'Histórico de login', description: 'Acessos recentes', status: 'active', icon: Activity },
        ],
      },
      {
        name: 'Configurações',
        description: 'Preferências do sistema',
        features: [
          { name: 'Dados da empresa', description: 'Nome, logo, cores', status: 'active', icon: Building2 },
          { name: 'Integrações', description: 'APIs e webhooks', status: 'active', icon: Link2 },
          { name: 'Notificações', description: 'Regras de envio', status: 'active', icon: Bell },
          { name: 'Cobrança automática', description: 'Dias e templates', status: 'active', icon: Clock },
        ],
      },
      {
        name: 'Auditoria',
        description: 'Logs e histórico',
        features: [
          { name: 'Log de atividades', description: 'Ações do sistema', status: 'active', icon: Activity },
          { name: 'Filtros avançados', description: 'Por data, usuário, ação', status: 'active', icon: Filter },
          { name: 'Exportação', description: 'Download de logs', status: 'active', icon: Download },
        ],
      },
    ],
  },
  {
    id: 'produtividade',
    name: 'Produtividade',
    description: 'Ferramentas para o dia a dia',
    icon: StickyNote,
    color: 'text-pink_500',
    href: '/app/notes',
    subCategories: [
      {
        name: 'Anotações',
        description: 'Smart Notes',
        features: [
          { name: 'Criar anotações', description: 'Notas rápidas', status: 'active', icon: StickyNote },
          { name: 'Categorias', description: 'Ideia, tarefa, reunião, bug', status: 'active', icon: Tag },
          { name: 'Tags', description: 'Organização flexível', status: 'active', icon: Tag },
          { name: 'Fixar notas', description: 'Priorizar importantes', status: 'active', icon: Pin },
          { name: 'IA Assistente', description: 'Melhorar e resumir', status: 'active', icon: Sparkles },
        ],
      },
      {
        name: 'Integração WhatsApp',
        description: 'Comandos via mensagem',
        features: [
          { name: 'Criar nota via WhatsApp', description: '/nota ou /anotação', status: 'soon', icon: MessageSquare },
          { name: 'Lembretes', description: '/lembrete com data', status: 'soon', icon: Bell },
          { name: 'Listar notas', description: '/notas', status: 'soon', icon: FileText },
        ],
      },
    ],
  },
];
