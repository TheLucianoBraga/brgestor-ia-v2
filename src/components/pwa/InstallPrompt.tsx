import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkStandalone = () => {
      return window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
    };
    
    setIsStandalone(checkStandalone());
    
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Check if previously dismissed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    // Show again after 7 days
    if (dismissedTime && daysSinceDismissed < 7) {
      return;
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 3000); // Show after 3 seconds
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // For iOS, show custom prompt after delay
    if (isIOSDevice && !checkStandalone()) {
      setTimeout(() => setShowPrompt(true), 5000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // Don't show if already installed
  if (isStandalone) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 z-[100] md:left-auto md:right-4 md:bottom-4 md:w-96"
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl p-4 backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-foreground">Instalar BRGestor</h3>
                  <button
                    onClick={handleDismiss}
                    className="p-1 hover:bg-muted rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {isIOS 
                    ? "Toque em 'Compartilhar' e depois 'Adicionar à Tela de Início'"
                    : "Instale o app para acesso rápido e experiência offline"
                  }
                </p>

                {isIOS ? (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Share className="w-4 h-4" />
                    <span>Toque em Compartilhar → Adicionar à Tela</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleInstall} 
                      size="sm" 
                      className="flex-1"
                      disabled={!deferredPrompt}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Instalar
                    </Button>
                    <Button 
                      onClick={handleDismiss} 
                      size="sm" 
                      variant="outline"
                    >
                      Depois
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
