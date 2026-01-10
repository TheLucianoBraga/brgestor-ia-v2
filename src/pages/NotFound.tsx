import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptySearchIllustration } from "@/components/illustrations/EmptyIllustrations";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    document.title = "Página não encontrada | BRGestor";
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md animate-fade-in">
        <EmptySearchIllustration className="w-40 h-40 mx-auto mb-6" />
        
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Página não encontrada
        </h2>
        <p className="text-muted-foreground mb-8">
          A página que você está procurando não existe ou foi movida.
        </p>
        
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button asChild>
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Ir para Início
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
