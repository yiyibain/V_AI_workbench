import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import {
  Indicator,
  IndicatorEffectAnalysis,
  IndicatorRecommendation,
  IndicatorBaseline,
  IndicatorTargetPlan,
} from '../types/indicator';

interface IndicatorContextType {
  // 潜在指标列表缓存（基于策略）
  potentialIndicatorsCache: Map<string, Indicator[]>;
  getCachedPotentialIndicators: (strategyId: string) => Indicator[] | null;
  setCachedPotentialIndicators: (strategyId: string, indicators: Indicator[]) => void;
  clearCachedPotentialIndicators: (strategyId: string) => void;

  // 指标效果分析缓存
  effectAnalysisCache: Map<string, IndicatorEffectAnalysis>;
  getCachedEffectAnalysis: (indicatorId: string) => IndicatorEffectAnalysis | null;
  setCachedEffectAnalysis: (indicatorId: string, analysis: IndicatorEffectAnalysis) => void;
  clearCachedEffectAnalysis: (indicatorId: string) => void;

  // 考核指标建议缓存（基于策略）
  recommendationCache: Map<string, IndicatorRecommendation[]>;
  getCachedRecommendations: (strategyId: string) => IndicatorRecommendation[] | null;
  setCachedRecommendations: (strategyId: string, recommendations: IndicatorRecommendation[]) => void;
  clearCachedRecommendations: (strategyId: string) => void;

  // 指标基线缓存
  baselineCache: Map<string, IndicatorBaseline>;
  getCachedBaseline: (indicatorId: string) => IndicatorBaseline | null;
  setCachedBaseline: (indicatorId: string, baseline: IndicatorBaseline) => void;
  clearCachedBaseline: (indicatorId: string) => void;

  // 指标目标规划缓存（基于指标ID和销售增速）
  targetPlanCache: Map<string, IndicatorTargetPlan>;
  getCachedTargetPlan: (indicatorId: string, salesGrowth?: number) => IndicatorTargetPlan | null;
  setCachedTargetPlan: (indicatorId: string, salesGrowth: number | undefined, plan: IndicatorTargetPlan) => void;
  clearCachedTargetPlan: (indicatorId: string, salesGrowth?: number) => void;
}

const IndicatorContext = createContext<IndicatorContextType | undefined>(undefined);

export function IndicatorProvider({ children }: { children: ReactNode }) {
  // 潜在指标列表缓存
  const [potentialIndicatorsCache, setPotentialIndicatorsCache] = useState<
    Map<string, Indicator[]>
  >(new Map());

  // 指标效果分析缓存
  const [effectAnalysisCache, setEffectAnalysisCache] = useState<
    Map<string, IndicatorEffectAnalysis>
  >(new Map());

  // 考核指标建议缓存
  const [recommendationCache, setRecommendationCache] = useState<
    Map<string, IndicatorRecommendation[]>
  >(new Map());

  // 指标基线缓存
  const [baselineCache, setBaselineCache] = useState<Map<string, IndicatorBaseline>>(new Map());

  // 指标目标规划缓存
  const [targetPlanCache, setTargetPlanCache] = useState<Map<string, IndicatorTargetPlan>>(
    new Map()
  );

  // 潜在指标列表缓存方法
  const getCachedPotentialIndicators = useCallback(
    (strategyId: string): Indicator[] | null => {
      return potentialIndicatorsCache.get(strategyId) || null;
    },
    [potentialIndicatorsCache]
  );

  const setCachedPotentialIndicators = useCallback(
    (strategyId: string, indicators: Indicator[]) => {
      setPotentialIndicatorsCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(strategyId, indicators);
        return newCache;
      });
    },
    []
  );

  const clearCachedPotentialIndicators = useCallback((strategyId: string) => {
    setPotentialIndicatorsCache((prev) => {
      const newCache = new Map(prev);
      newCache.delete(strategyId);
      return newCache;
    });
  }, []);

  // 指标效果分析缓存方法
  const getCachedEffectAnalysis = useCallback(
    (indicatorId: string): IndicatorEffectAnalysis | null => {
      return effectAnalysisCache.get(indicatorId) || null;
    },
    [effectAnalysisCache]
  );

  const setCachedEffectAnalysis = useCallback(
    (indicatorId: string, analysis: IndicatorEffectAnalysis) => {
      setEffectAnalysisCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(indicatorId, analysis);
        return newCache;
      });
    },
    []
  );

  const clearCachedEffectAnalysis = useCallback((indicatorId: string) => {
    setEffectAnalysisCache((prev) => {
      const newCache = new Map(prev);
      newCache.delete(indicatorId);
      return newCache;
    });
  }, []);

  // 考核指标建议缓存方法
  const getCachedRecommendations = useCallback(
    (strategyId: string): IndicatorRecommendation[] | null => {
      return recommendationCache.get(strategyId) || null;
    },
    [recommendationCache]
  );

  const setCachedRecommendations = useCallback(
    (strategyId: string, recommendations: IndicatorRecommendation[]) => {
      setRecommendationCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(strategyId, recommendations);
        return newCache;
      });
    },
    []
  );

  const clearCachedRecommendations = useCallback((strategyId: string) => {
    setRecommendationCache((prev) => {
      const newCache = new Map(prev);
      newCache.delete(strategyId);
      return newCache;
    });
  }, []);

  // 指标基线缓存方法
  const getCachedBaseline = useCallback(
    (indicatorId: string): IndicatorBaseline | null => {
      return baselineCache.get(indicatorId) || null;
    },
    [baselineCache]
  );

  const setCachedBaseline = useCallback(
    (indicatorId: string, baseline: IndicatorBaseline) => {
      setBaselineCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(indicatorId, baseline);
        return newCache;
      });
    },
    []
  );

  const clearCachedBaseline = useCallback((indicatorId: string) => {
    setBaselineCache((prev) => {
      const newCache = new Map(prev);
      newCache.delete(indicatorId);
      return newCache;
    });
  }, []);

  // 指标目标规划缓存方法
  const getCachedTargetPlan = useCallback(
    (indicatorId: string, salesGrowth?: number): IndicatorTargetPlan | null => {
      const cacheKey = salesGrowth !== undefined 
        ? `${indicatorId}-growth-${salesGrowth}` 
        : `${indicatorId}-no-growth`;
      return targetPlanCache.get(cacheKey) || null;
    },
    [targetPlanCache]
  );

  const setCachedTargetPlan = useCallback(
    (indicatorId: string, salesGrowth: number | undefined, plan: IndicatorTargetPlan) => {
      const cacheKey = salesGrowth !== undefined 
        ? `${indicatorId}-growth-${salesGrowth}` 
        : `${indicatorId}-no-growth`;
      setTargetPlanCache((prev) => {
        const newCache = new Map(prev);
        newCache.set(cacheKey, plan);
        return newCache;
      });
    },
    []
  );

  const clearCachedTargetPlan = useCallback((indicatorId: string, salesGrowth?: number) => {
    const cacheKey = salesGrowth !== undefined 
      ? `${indicatorId}-growth-${salesGrowth}` 
      : `${indicatorId}-no-growth`;
    setTargetPlanCache((prev) => {
      const newCache = new Map(prev);
      newCache.delete(cacheKey);
      return newCache;
    });
  }, []);

  return (
    <IndicatorContext.Provider
      value={{
        potentialIndicatorsCache,
        getCachedPotentialIndicators,
        setCachedPotentialIndicators,
        clearCachedPotentialIndicators,
        effectAnalysisCache,
        getCachedEffectAnalysis,
        setCachedEffectAnalysis,
        clearCachedEffectAnalysis,
        recommendationCache,
        getCachedRecommendations,
        setCachedRecommendations,
        clearCachedRecommendations,
        baselineCache,
        getCachedBaseline,
        setCachedBaseline,
        clearCachedBaseline,
        targetPlanCache,
        getCachedTargetPlan,
        setCachedTargetPlan,
        clearCachedTargetPlan,
      }}
    >
      {children}
    </IndicatorContext.Provider>
  );
}

export function useIndicator() {
  const context = useContext(IndicatorContext);
  if (context === undefined) {
    throw new Error('useIndicator must be used within an IndicatorProvider');
  }
  return context;
}

