/**
 * Utilitários de formatação centralizados
 * Fonte única de verdade para formatação de valores no sistema
 */

import { normalizeLanguageTag } from './locale';

/**
 * Formata valor numérico para moeda brasileira (BRL)
 * @param value - Valor numérico
 * @param showSymbol - Se deve exibir o símbolo R$ (default: true)
 */
export const formatCurrency = (value: number, showSymbol = true): string => {
  const formatted = new Intl.NumberFormat(normalizeLanguageTag(), {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
  
  return showSymbol ? formatted : formatted.replace('R$', '').trim();
};

/**
 * Alias para formatCurrency (compatibilidade)
 */
export const formatPrice = formatCurrency;

/**
 * Formata valor para moeda internacional
 * @param value - Valor numérico
 * @param currency - Código da moeda (brl, usd, eur, gbp)
 */
export const formatCurrencyIntl = (value: number, currency: string = 'brl'): string => {
  const currencyMap: Record<string, string> = {
    brl: 'BRL',
    usd: 'USD',
    eur: 'EUR',
    gbp: 'GBP',
  };
  
  return new Intl.NumberFormat(normalizeLanguageTag(), {
    style: 'currency',
    currency: currencyMap[currency.toLowerCase()] || 'BRL',
  }).format(value);
};

/**
 * Formata data para exibição no formato brasileiro
 * @param date - Data em string ISO ou objeto Date
 * @param includeTime - Se deve incluir hora (default: false)
 */
export const formatDate = (date: string | Date, includeTime = false): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (includeTime) {
    return d.toLocaleString(normalizeLanguageTag(), {
      day: '2_digit',
      month: '2_digit',
      year: 'numeric',
      hour: '2_digit',
      minute: '2_digit',
    });
  }
  
  return d.toLocaleDateString(normalizeLanguageTag(), {
    day: '2_digit',
    month: '2_digit',
    year: 'numeric',
  });
};

/**
 * Formata data de forma relativa (ex: "há 2 dias")
 */
export const formatRelativeDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `Há ${diffDays} dias`;
  if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Há ${Math.floor(diffDays / 30)} meses`;
  return `Há ${Math.floor(diffDays / 365)} anos`;
};

/**
 * Formata número de telefone brasileiro
 */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
};

/**
 * Formata CPF
 */
export const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
};

/**
 * Formata CNPJ
 */
export const formatCNPJ = (cnpj: string): string => {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
};

/**
 * Formata CPF ou CNPJ automaticamente
 */
export const formatCPFCNPJ = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 11) return formatCPF(cleaned);
  return formatCNPJ(cleaned);
};

/**
 * Formata CEP
 */
export const formatCEP = (cep: string): string => {
  const cleaned = cep.replace(/\D/g, '');
  if (cleaned.length !== 8) return cep;
  return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
};

/**
 * Formata porcentagem
 */
export const formatPercent = (value: number, decimals = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Formata número com separador de milhar
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat(normalizeLanguageTag()).format(value);
};
