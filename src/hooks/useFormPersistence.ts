import { useEffect, useCallback, useRef } from 'react';
import { UseFormReturn, FieldValues, Path, PathValue } from 'react-hook-form';

interface UseFormPersistenceOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  key: string;
  excludeFields?: (keyof T)[];
  debounceMs?: number;
}

/**
 * Hook para persistir dados de formulário no localStorage
 * Permite que o usuário navegue para outras páginas e retorne sem perder os dados
 */
export function useFormPersistence<T extends FieldValues>({
  form,
  key,
  excludeFields = [],
  debounceMs = 500,
}: UseFormPersistenceOptions<T>) {
  const storageKey = `form_draft_${key}`;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Restaurar dados do localStorage quando o componente monta
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const currentValues = form.getValues();
        
        // Só restaurar se o formulário estiver "vazio" (valores default)
        const isFormEmpty = Object.entries(currentValues).every(([fieldKey, value]) => {
          if (excludeFields.includes(fieldKey as keyof T)) return true;
          if (value === '' || value === null || value === undefined) return true;
          if (Array.isArray(value) && value.length === 0) return true;
          if (typeof value === 'object' && Object.keys(value).length === 0) return true;
          return false;
        });

        if (isFormEmpty && Object.keys(parsed).length > 0) {
          // Restaurar cada campo individualmente para evitar problemas
          Object.entries(parsed).forEach(([fieldKey, value]) => {
            if (!excludeFields.includes(fieldKey as keyof T)) {
              form.setValue(fieldKey as Path<T>, value as PathValue<T, Path<T>>, {
                shouldDirty: false,
                shouldValidate: false,
              });
            }
          });
        }
      }
    } catch (error) {
      console.warn('Error restoring form data:', error);
    }
    
    isInitializedRef.current = true;
  }, [form, storageKey, excludeFields]);

  // Salvar dados no localStorage quando mudam (com debounce)
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (!isInitializedRef.current) return;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        try {
          const toSave = { ...data };
          
          // Remover campos excluídos
          excludeFields.forEach((field) => {
            delete toSave[field as string];
          });
          
          // Remover campos vazios para economizar espaço
          Object.keys(toSave).forEach((key) => {
            const value = toSave[key];
            if (value === '' || value === null || value === undefined) {
              delete toSave[key];
            }
            if (Array.isArray(value) && value.length === 0) {
              delete toSave[key];
            }
          });

          if (Object.keys(toSave).length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(toSave));
          }
        } catch (error) {
          console.warn('Error saving form data:', error);
        }
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [form, storageKey, excludeFields, debounceMs]);

  // Limpar dados do localStorage (chamar após submit bem-sucedido)
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Error clearing form draft:', error);
    }
  }, [storageKey]);

  // Verificar se existe rascunho salvo
  const hasDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved !== null && saved !== '{}';
    } catch {
      return false;
    }
  }, [storageKey]);

  // Descartar rascunho manualmente
  const discardDraft = useCallback(() => {
    clearDraft();
    form.reset();
  }, [clearDraft, form]);

  return {
    clearDraft,
    hasDraft,
    discardDraft,
  };
}
