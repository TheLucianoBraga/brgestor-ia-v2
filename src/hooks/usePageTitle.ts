import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, { title: string; description: string }> = {
  '/': { title: 'BRGestor - Gestão, Cobrança e IA', description: 'Plataforma completa de gestão de clientes' },
  '/auth/login': { title: 'Login | BRGestor', description: 'Acesse sua conta BRGestor' },
  '/auth/signup': { title: 'Criar Conta | BRGestor', description: 'Crie sua conta grátis no BRGestor' },
  '/auth/reset': { title: 'Recuperar Senha | BRGestor', description: 'Recupere sua senha do BRGestor' },
  '/app/dashboard': { title: 'Dashboard | BRGestor', description: 'Painel de controle do BRGestor' },
  '/app/clientes': { title: 'Clientes | BRGestor', description: 'Gerencie seus clientes' },
  '/app/cobrancas': { title: 'Cobranças | BRGestor', description: 'Gerencie suas cobranças' },
  '/app/planos': { title: 'Planos | BRGestor', description: 'Gerencie seus planos' },
  '/app/servicos': { title: 'Serviços | BRGestor', description: 'Gerencie seus serviços' },
  '/app/assinaturas': { title: 'Assinaturas | BRGestor', description: 'Gerencie assinaturas' },
  '/app/cupons': { title: 'Cupons | BRGestor', description: 'Gerencie cupons de desconto' },
  '/app/usuarios': { title: 'Usuários | BRGestor', description: 'Gerencie usuários' },
  '/app/config': { title: 'Configurações | BRGestor', description: 'Configurações do sistema' },
  '/app/templates': { title: 'Templates | BRGestor', description: 'Templates de mensagens' },
  '/app/notificacoes': { title: 'Notificações | BRGestor', description: 'Central de notificações' },
  '/app/relatorios': { title: 'Relatórios | BRGestor', description: 'Relatórios e métricas' },
  '/app/conteudo': { title: 'Conteúdo | BRGestor', description: 'Gestão de conteúdo' },
  '/app/contas': { title: 'Contas | BRGestor', description: 'Gestão de contas' },
  '/app/logs': { title: 'Logs | BRGestor', description: 'Logs de atividade' },
  '/app/chatbot': { title: 'Chatbot | BRGestor', description: 'Configuração do chatbot' },
  '/app/auto-responder': { title: 'Auto-Responder IA | BRGestor', description: 'Configuração do auto-responder com IA no WhatsApp' },
  '/app/despesas': { title: 'Despesas | BRGestor', description: 'Gestão de despesas' },
  '/portal/dashboard': { title: 'Portal | BRGestor', description: 'Portal do cliente' },
  '/portal/servicos': { title: 'Serviços | Portal BRGestor', description: 'Serviços disponíveis' },
  '/portal/meus-servicos': { title: 'Meus Serviços | Portal BRGestor', description: 'Seus serviços ativos' },
  '/portal/indicacoes': { title: 'Indicações | Portal BRGestor', description: 'Programa de indicações' },
  '/portal/conteudo': { title: 'Conteúdo | Portal BRGestor', description: 'Conteúdo exclusivo' },
  '/portal/perfil': { title: 'Perfil | Portal BRGestor', description: 'Seu perfil' },
};

export const usePageTitle = () => {
  const location = useLocation();

  useEffect(() => {
    const pageInfo = pageTitles[location.pathname] || { 
      title: 'BRGestor', 
      description: 'Plataforma de gestão de clientes' 
    };

    // Update document title
    document.title = pageInfo.title;

    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', pageInfo.description);

    // Update OG title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', pageInfo.title);
    }

    // Update OG description
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', pageInfo.description);
    }
  }, [location.pathname]);
};
