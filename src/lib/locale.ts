/**
 * Normalização de Language Tags
 * 
 * Problema: pt_BR não é válido segundo BCP 47 (especificação de language tags)
 * Correto: pt-BR (com hífen, não underscore)
 * 
 * Esta função garante que nunca tenhamos crashes por language tags inválidos.
 */

export function normalizeLanguageTag(lang?: string | null): string {
  if (!lang) return 'pt-BR';
  
  // Converte underscore para hífen
  const normalized = lang.replace('_', '-');
  
  // Lista de language tags válidos que conhecemos
  const validTags = ['pt-BR', 'en-US', 'es-ES'];
  
  if (validTags.includes(normalized)) {
    return normalized;
  }
  
  // Fallback para português brasileiro
  return 'pt-BR';
}

/**
 * Função para usar em Intl.NumberFormat e similares
 */
export function getLocaleForFormatting(): string {
  return normalizeLanguageTag();
}

/**
 * Função para usar em date-fns (que usa import diferente)
 */
export function getDateFnsLocale() {
  // date-fns usa imports específicos, não strings
  // Mantém o import { ptBR } from 'date-fns/locale' nos componentes
  return 'pt-BR';
}

/**
 * Função para detectar idioma do browser de forma segura
 */
export function getSafeNavigatorLanguage(): string {
  if (typeof navigator === 'undefined') return 'pt-BR';
  
  const browserLang = navigator.language || navigator.languages?.[0];
  return normalizeLanguageTag(browserLang);
}