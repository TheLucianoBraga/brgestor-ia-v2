import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Download, 
  Smartphone, 
  Check, 
  Share, 
  MoreVertical,
  Zap,
  Wifi,
  Bell,
  Shield
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const benefits = [
    { icon: Zap, title: "Acesso Rápido", description: "Abra direto da tela inicial" },
    { icon: Wifi, title: "Funciona Offline", description: "Acesse mesmo sem internet" },
    { icon: Bell, title: "Notificações", description: "Receba alertas importantes" },
    { icon: Shield, title: "Seguro", description: "Seus dados protegidos" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 border-b">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">BRGestor</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">
            Instale o BRGestor
          </h1>
          <p className="text-muted-foreground">
            Tenha acesso rápido ao app direto da sua tela inicial
          </p>
        </motion.div>

        {isInstalled ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center mb-8"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">App Instalado!</h2>
            <p className="text-muted-foreground mb-6">
              O BRGestor já está na sua tela inicial.
            </p>
            <Button asChild>
              <Link to="/app/dashboard">Abrir App</Link>
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Benefits */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 gap-4 mb-8"
            >
              {benefits.map((benefit, index) => (
                <Card key={index} className="border-muted">
                  <CardContent className="p-4 text-center">
                    <benefit.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                    <div className="font-medium text-sm">{benefit.title}</div>
                    <div className="text-xs text-muted-foreground">{benefit.description}</div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            {/* Installation Instructions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full" size="lg">
                  <Download className="w-5 h-5 mr-2" />
                  Instalar Agora
                </Button>
              ) : isIOS ? (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Como instalar no iPhone/iPad:</h3>
                    <ol className="space-y-4">
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">1</span>
                        </div>
                        <div>
                          <p className="font-medium">Toque em Compartilhar</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Share className="w-4 h-4" /> na barra do Safari
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">2</span>
                        </div>
                        <div>
                          <p className="font-medium">Role para baixo</p>
                          <p className="text-sm text-muted-foreground">e encontre "Adicionar à Tela de Início"</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">3</span>
                        </div>
                        <div>
                          <p className="font-medium">Toque em "Adicionar"</p>
                          <p className="text-sm text-muted-foreground">O app aparecerá na sua tela inicial</p>
                        </div>
                      </li>
                    </ol>
                  </CardContent>
                </Card>
              ) : isAndroid ? (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Como instalar no Android:</h3>
                    <ol className="space-y-4">
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">1</span>
                        </div>
                        <div>
                          <p className="font-medium">Toque no menu</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MoreVertical className="w-4 h-4" /> no canto superior direito
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">2</span>
                        </div>
                        <div>
                          <p className="font-medium">Selecione "Instalar app"</p>
                          <p className="text-sm text-muted-foreground">ou "Adicionar à tela inicial"</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">3</span>
                        </div>
                        <div>
                          <p className="font-medium">Confirme a instalação</p>
                          <p className="text-sm text-muted-foreground">O app aparecerá na sua tela inicial</p>
                        </div>
                      </li>
                    </ol>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                      Acesse este site pelo navegador do seu celular para instalar o app.
                    </p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </>
        )}

        {/* Back to site */}
        <div className="text-center mt-8">
          <Button variant="ghost" asChild>
            <Link to="/">Voltar para o site</Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Install;
