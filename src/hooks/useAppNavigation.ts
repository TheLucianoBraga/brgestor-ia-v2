import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Hook para navegação SPA consistente
 * Evita o uso de window.location.href que causa recarregamento da página
 */
export const useAppNavigation = () => {
  const navigate = useNavigate();

  const navigateTo = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const navigateWithDelay = useCallback((path: string, delayMs = 500) => {
    setTimeout(() => navigate(path), delayMs);
  }, [navigate]);

  return { navigateTo, navigateWithDelay };
};

/**
 * Navegação global para uso fora de componentes React
 * IMPORTANTE: Este é um fallback - prefira sempre usar useAppNavigation
 */
let globalNavigate: ((path: string) => void) | null = null;

export const setGlobalNavigate = (navigate: (path: string) => void) => {
  globalNavigate = navigate;
};

export const getGlobalNavigate = () => globalNavigate;

/**
 * Navega usando React Router quando disponível, com fallback para location
 */
export const safeNavigate = (path: string) => {
  if (globalNavigate) {
    globalNavigate(path);
  } else {
    // Fallback - só recarrega se absolutamente necessário
    window.location.href = path;
  }
};
