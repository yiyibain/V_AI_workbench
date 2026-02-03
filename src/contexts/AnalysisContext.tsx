import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AIAnalysis } from '../types';

interface AnalysisContextType {
  currentAnalysis: AIAnalysis | null;
  setCurrentAnalysis: (analysis: AIAnalysis | null) => void;
  // 缓存管理
  analysisCache: Map<string, AIAnalysis>;
  getCachedAnalysis: (key: string) => AIAnalysis | null;
  setCachedAnalysis: (key: string, analysis: AIAnalysis) => void;
  clearCachedAnalysis: (key: string) => void;
  // 刷新标记
  needsRefresh: Set<string>;
  refreshTrigger: number; // 用于触发重新渲染
  markNeedsRefresh: (key: string) => void;
  clearNeedsRefresh: (key: string) => void;
  // Chatbot控制
  openChatbotWithText: (text: string) => void;
  chatbotInitialText: string | null;
  chatbotOpenTrigger: number;
  clearChatbotInitialText: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(undefined);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [currentAnalysis, setCurrentAnalysis] = useState<AIAnalysis | null>(null);
  const [analysisCache, setAnalysisCache] = useState<Map<string, AIAnalysis>>(new Map());
  const [needsRefresh, setNeedsRefresh] = useState<Set<string>>(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [chatbotInitialText, setChatbotInitialText] = useState<string | null>(null);
  const [chatbotOpenTrigger, setChatbotOpenTrigger] = useState(0);

  const getCachedAnalysis = useCallback((key: string): AIAnalysis | null => {
    return analysisCache.get(key) || null;
  }, [analysisCache]);

  const setCachedAnalysis = useCallback((key: string, analysis: AIAnalysis) => {
    setAnalysisCache((prev) => {
      const newCache = new Map(prev);
      newCache.set(key, analysis);
      return newCache;
    });
  }, []);

  const clearCachedAnalysis = useCallback((key: string) => {
    setAnalysisCache((prev) => {
      const newCache = new Map(prev);
      newCache.delete(key);
      return newCache;
    });
  }, []);

  const markNeedsRefresh = useCallback((key: string) => {
    setNeedsRefresh((prev) => {
      const newSet = new Set(prev);
      newSet.add(key);
      setRefreshTrigger((t) => t + 1); // 触发重新渲染
      return newSet;
    });
  }, []);

  const clearNeedsRefresh = useCallback((key: string) => {
    setNeedsRefresh((prev) => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  }, []);

  const openChatbotWithText = useCallback((text: string) => {
    setChatbotInitialText(text);
    setChatbotOpenTrigger((prev) => prev + 1);
  }, []);

  return (
    <AnalysisContext.Provider
      value={{
        currentAnalysis,
        setCurrentAnalysis,
        analysisCache,
        getCachedAnalysis,
        setCachedAnalysis,
        clearCachedAnalysis,
        needsRefresh,
        refreshTrigger,
        markNeedsRefresh,
        clearNeedsRefresh,
        openChatbotWithText,
        chatbotInitialText,
        chatbotOpenTrigger,
        clearChatbotInitialText: () => setChatbotInitialText(null),
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
}

