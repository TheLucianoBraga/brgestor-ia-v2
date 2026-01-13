import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { normalizeLanguageTag } from './locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat(normalizeLanguageTag(), {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};
