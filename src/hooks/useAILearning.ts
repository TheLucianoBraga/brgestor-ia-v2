import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';

type PatternType = 
  | 'category_mapping' 
  | 'payment_timing' 
  | 'preferred_channel' 
  | 'preferred_hours' 
  | 'supplier_mapping' 
  | 'anomaly_threshold';

interface AIPattern {
  id: string;
  tenant_id: string;
  pattern_type: PatternType;
  pattern_key: string;
  pattern_value: any;
  confidence: number;
  occurrences: number;
  last_used_at: string;
}

export const useAILearning = () => {
  const { currentTenant } = useTenant();
  const [isLearning, setIsLearning] = useState(false);

  /**
   * Aprende um padrão com base no comportamento do usuário
   */
  const learnPattern = useCallback(async (
    patternType: PatternType,
    patternKey: string,
    patternValue: any,
    confidence: number = 0.5
  ): Promise<boolean> => {
    if (!currentTenant?.id) return false;

    try {
      setIsLearning(true);

      // Verifica se o padrão já existe
      const { data: existing } = await supabase
        .from('expense_ai_learning')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('pattern_type', patternType)
        .eq('pattern_key', patternKey)
        .maybeSingle();

      if (existing) {
        // Atualiza padrão existente - aumenta confiança e contagem
        const newConfidence = Math.min(0.99, existing.confidence + 0.05);
        const newOccurrences = (existing.occurrences || 1) + 1;

        await supabase
          .from('expense_ai_learning')
          .update({
            pattern_value: patternValue,
            confidence: newConfidence,
            occurrences: newOccurrences,
            last_used_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Cria novo padrão
        await supabase
          .from('expense_ai_learning')
          .insert({
            tenant_id: currentTenant.id,
            pattern_type: patternType,
            pattern_key: patternKey,
            pattern_value: patternValue,
            confidence: confidence,
            occurrences: 1,
            last_used_at: new Date().toISOString()
          });
      }

      return true;
    } catch (error) {
      console.error('Error learning pattern:', error);
      return false;
    } finally {
      setIsLearning(false);
    }
  }, [currentTenant?.id]);

  /**
   * Busca um padrão aprendido
   */
  const getPattern = useCallback(async (
    patternType: PatternType,
    patternKey: string
  ): Promise<AIPattern | null> => {
    if (!currentTenant?.id) return null;

    try {
      const { data, error } = await supabase
        .from('expense_ai_learning')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('pattern_type', patternType)
        .eq('pattern_key', patternKey)
        .maybeSingle();

      if (error) throw error;
      return data as AIPattern | null;
    } catch (error) {
      console.error('Error getting pattern:', error);
      return null;
    }
  }, [currentTenant?.id]);

  /**
   * Busca padrões por tipo com alta confiança
   */
  const getPatternsByType = useCallback(async (
    patternType: PatternType,
    minConfidence: number = 0.6
  ): Promise<AIPattern[]> => {
    if (!currentTenant?.id) return [];

    try {
      const { data, error } = await supabase
        .from('expense_ai_learning')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('pattern_type', patternType)
        .gte('confidence', minConfidence)
        .order('confidence', { ascending: false });

      if (error) throw error;
      return (data || []) as AIPattern[];
    } catch (error) {
      console.error('Error getting patterns by type:', error);
      return [];
    }
  }, [currentTenant?.id]);

  /**
   * Sugere categoria baseada em descrição (aprendizado)
   */
  const suggestCategory = useCallback(async (description: string): Promise<string | null> => {
    if (!currentTenant?.id || !description) return null;

    try {
      // Busca padrões de categorização com alta confiança
      const patterns = await getPatternsByType('category_mapping', 0.7);

      // Procura por palavras-chave na descrição
      const descLower = description.toLowerCase();
      
      for (const pattern of patterns) {
        const keyword = pattern.pattern_key.toLowerCase();
        if (descLower.includes(keyword)) {
          // Atualiza uso do padrão
          await supabase
            .from('expense_ai_learning')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', pattern.id);

          return pattern.pattern_value.category_id;
        }
      }

      return null;
    } catch (error) {
      console.error('Error suggesting category:', error);
      return null;
    }
  }, [currentTenant?.id, getPatternsByType]);

  /**
   * Aprende mapeamento de fornecedor → categoria
   */
  const learnSupplierCategory = useCallback(async (
    supplierName: string,
    categoryId: string
  ): Promise<boolean> => {
    return learnPattern(
      'supplier_mapping',
      supplierName.toLowerCase(),
      { category_id: categoryId },
      0.6
    );
  }, [learnPattern]);

  /**
   * Aprende horário preferido de pagamento
   */
  const learnPaymentTiming = useCallback(async (
    dayOfWeek: number,
    hourOfDay: number
  ): Promise<boolean> => {
    return learnPattern(
      'payment_timing',
      `day_${dayOfWeek}`,
      { hour: hourOfDay, count: 1 },
      0.5
    );
  }, [learnPattern]);

  /**
   * Aprende canal preferido (WhatsApp, Email, etc)
   */
  const learnPreferredChannel = useCallback(async (
    channel: string
  ): Promise<boolean> => {
    return learnPattern(
      'preferred_channel',
      'default',
      { channel },
      0.5
    );
  }, [learnPattern]);

  /**
   * Detecta anomalias com base em padrões aprendidos
   */
  const detectAnomaly = useCallback(async (
    amount: number,
    categoryId: string
  ): Promise<{ isAnomaly: boolean; expectedRange?: { min: number; max: number } }> => {
    if (!currentTenant?.id) return { isAnomaly: false };

    try {
      // Busca threshold de anomalia para categoria
      const pattern = await getPattern('anomaly_threshold', categoryId);

      if (!pattern || !pattern.pattern_value) {
        return { isAnomaly: false };
      }

      const { average, stdDev } = pattern.pattern_value;
      const threshold = 2; // 2 desvios padrão

      const lowerBound = average - (stdDev * threshold);
      const upperBound = average + (stdDev * threshold);

      const isAnomaly = amount < lowerBound || amount > upperBound;

      return {
        isAnomaly,
        expectedRange: { min: lowerBound, max: upperBound }
      };
    } catch (error) {
      console.error('Error detecting anomaly:', error);
      return { isAnomaly: false };
    }
  }, [currentTenant?.id, getPattern]);

  /**
   * Atualiza threshold de anomalia para uma categoria
   */
  const updateAnomalyThreshold = useCallback(async (
    categoryId: string,
    amount: number
  ): Promise<void> => {
    if (!currentTenant?.id) return;

    try {
      const pattern = await getPattern('anomaly_threshold', categoryId);

      if (!pattern) {
        // Primeira entrada - inicializa
        await learnPattern('anomaly_threshold', categoryId, {
          average: amount,
          stdDev: amount * 0.2, // 20% inicial
          count: 1
        }, 0.5);
      } else {
        // Atualiza média móvel e desvio padrão
        const { average, stdDev, count } = pattern.pattern_value;
        const newCount = count + 1;
        const newAverage = ((average * count) + amount) / newCount;
        const newStdDev = Math.sqrt(
          ((stdDev * stdDev * count) + Math.pow(amount - newAverage, 2)) / newCount
        );

        await learnPattern('anomaly_threshold', categoryId, {
          average: newAverage,
          stdDev: newStdDev,
          count: newCount
        }, Math.min(0.95, pattern.confidence + 0.01));
      }
    } catch (error) {
      console.error('Error updating anomaly threshold:', error);
    }
  }, [currentTenant?.id, getPattern, learnPattern]);

  return {
    isLearning,
    learnPattern,
    getPattern,
    getPatternsByType,
    suggestCategory,
    learnSupplierCategory,
    learnPaymentTiming,
    learnPreferredChannel,
    detectAnomaly,
    updateAnomalyThreshold
  };
};
