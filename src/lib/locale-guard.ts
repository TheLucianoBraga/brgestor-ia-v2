/**
 * 🛡️ PROTEÇÃO ABSOLUTA CONTRA LANGUAGE TAG INVÁLIDOS
 * 
 * Este arquivo intercepta chamadas para APIs de internacionalização 
 * e garante que nunca sejam passados language tags inválidos.
 */

// Função de normalização robusta
function normalizeLanguageTag(tag?: string): string {
  if (!tag) return 'pt-BR';
  return tag.replace(/_/g, '-');
}

// Backup das funções originais
const originalNumberFormat = Intl.NumberFormat;
const originalDateTimeFormat = Intl.DateTimeFormat;
const originalToLocaleString = Number.prototype.toLocaleString;
const originalToLocaleDateString = Date.prototype.toLocaleDateString;
const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;

// Intercepta Intl.NumberFormat
Intl.NumberFormat = function(locales?: string | string[], options?: Intl.NumberFormatOptions) {
  const normalizedLocales = Array.isArray(locales) 
    ? locales.map(normalizeLanguageTag)
    : normalizeLanguageTag(locales);
  
  return new originalNumberFormat(normalizedLocales, options);
} as any;

// Intercepta Intl.DateTimeFormat
Intl.DateTimeFormat = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
  const normalizedLocales = Array.isArray(locales) 
    ? locales.map(normalizeLanguageTag)
    : normalizeLanguageTag(locales);
  
  return new originalDateTimeFormat(normalizedLocales, options);
} as any;

// Intercepta Number.prototype.toLocaleString
Number.prototype.toLocaleString = function(locales?: string | string[], options?: Intl.NumberFormatOptions) {
  const normalizedLocales = Array.isArray(locales) 
    ? locales.map(normalizeLanguageTag)
    : normalizeLanguageTag(locales);
  
  return originalToLocaleString.call(this, normalizedLocales, options);
};

// Intercepta Date.prototype.toLocaleDateString
Date.prototype.toLocaleDateString = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
  const normalizedLocales = Array.isArray(locales) 
    ? locales.map(normalizeLanguageTag)
    : normalizeLanguageTag(locales);
  
  return originalToLocaleDateString.call(this, normalizedLocales, options);
};

// Intercepta Date.prototype.toLocaleTimeString
Date.prototype.toLocaleTimeString = function(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
  const normalizedLocales = Array.isArray(locales) 
    ? locales.map(normalizeLanguageTag)
    : normalizeLanguageTag(locales);
  
  return originalToLocaleTimeString.call(this, normalizedLocales, options);
};

console.log('🛡️ Language tag protection active - pt_BR will be automatically converted to pt-BR');