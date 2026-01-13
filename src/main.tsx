import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./contexts/ThemeContext";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { CACHE_BUST } from "./cache-bust";

// 🛡️ PROTEÇÃO CRÍTICA: Carrega antes de tudo para evitar language tag inválidos
import "./lib/locale-guard";

console.log("Build version:", CACHE_BUST);

// Register service worker com auto-update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Verificar atualizações a cada 5 minutos
      setInterval(() => {
        registration.update();
      }, 5 * 60 * 1000);
      
      // Quando nova versão disponível, recarregar automaticamente
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nova versão instalada, recarregar página
              console.log('🔄 Nova versão disponível, recarregando...');
              window.location.reload();
            }
          });
        }
      });
      
      // Detectar quando o controller muda (nova versão ativada)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Service worker atualizado, recarregando...');
        window.location.reload();
      });
      
    } catch (error) {
      console.log('SW registration failed:', error);
    }
  });
}

// Detectar erros de chunk/módulo (tela branca)
window.addEventListener('error', (event) => {
  if (
    event.message?.includes('Loading chunk') ||
    event.message?.includes('Loading module') ||
    event.message?.includes('Failed to fetch dynamically imported module')
  ) {
    console.log('🔄 Erro de chunk detectado, limpando cache e recarregando...');
    // Limpar caches e recarregar
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    window.location.reload();
  }
});

// Detectar promise rejections não tratadas (pode causar tela branca)
window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason?.message?.includes('Loading chunk') ||
    event.reason?.message?.includes('Failed to fetch')
  ) {
    console.log('🔄 Erro de carregamento, recarregando...');
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </HelmetProvider>
);
