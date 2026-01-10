import { createRoot } from "react-dom/client";
import { ThemeProvider } from "./contexts/ThemeContext";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { CACHE_BUST } from "./cache-bust";
console.log("Build version:", CACHE_BUST);

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </HelmetProvider>
);
