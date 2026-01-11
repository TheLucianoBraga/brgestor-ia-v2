import React, { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * Página de redirecionamento para links antigos no formato /r/{code}
 * Redireciona para o novo formato /cadastro-cliente?ref={code} ou /cadastro-cliente/revenda?ref={code}
 */
const Referral: React.FC = () => {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!code) {
      navigate('/auth/login');
      return;
    }
    
    // Tipo vem do query param ?t=revenda ou default cliente
    const typeParam = searchParams.get('t');
    
    if (typeParam === 'revenda') {
      // Redireciona para cadastro de revenda
      navigate(`/cadastro-cliente/revenda?ref=${code}`, { replace: true });
    } else {
      // Redireciona para cadastro de cliente
      navigate(`/cadastro-cliente?ref=${code}`, { replace: true });
    }
  }, [code, searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
};

export default Referral;