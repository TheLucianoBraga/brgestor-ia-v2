import * as React from "react";
import { useState, useEffect, useMemo, useCallback, useRef, useContext } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
}

/**
 * Format number to Brazilian currency string
 */
export function formatCurrencyValue(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse Brazilian currency string to number
 */
export function parseCurrencyValue(value: string): number {
  // Remove everything except digits
  const digits = value.replace(/\D/g, '');
  // Convert to cents then to reais
  return parseInt(digits || '0', 10) / 100;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, prefix = "R$", ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(() => 
      formatCurrencyValue(value || 0)
    );

    // Sync external value changes
    useEffect(() => {
      setDisplayValue(formatCurrencyValue(value || 0));
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      const numericValue = parseCurrencyValue(inputValue);
      
      setDisplayValue(formatCurrencyValue(numericValue));
      onChange(numericValue);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Select all on focus for easier editing
      e.target.select();
      props.onFocus?.(e);
    };

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          {prefix}
        </span>
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          className={cn("pl-10", className)}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };
