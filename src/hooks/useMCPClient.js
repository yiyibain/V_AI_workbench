/**
 * React Hook for MCP Client
 * 提供便捷的 React 集成接口
 */
import { useState, useCallback } from 'react';
import { WebMCPClient } from '../services/mcpClient';
export function useMCPClient(options = {}) {
    const [client] = useState(() => new WebMCPClient(options.baseUrl));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);
    /**
     * 完整的问题定位分析流程（两步）
     */
    const analyzeProblem = useCallback(async (params) => {
        setLoading(true);
        setError(null);
        try {
            // 第一步：分析剪刀差
            const gapsResult = await client.analyzeScissorsGaps({
                marketData: params.marketData,
                mekkoData: params.mekkoData,
                selectedBrand: params.selectedBrand,
                selectedXAxisKey: params.selectedXAxisKey,
                selectedYAxisKey: params.selectedYAxisKey,
                availableDimensions: params.availableDimensions,
                maxItems: params.maxItems || 5,
            });
            // 第二步：分析原因
            const causesResult = await client.analyzeProblemCauses({
                scissorsGaps: gapsResult.scissorsGaps,
                selectedBrand: params.selectedBrand,
                marketData: params.marketData,
                availableDimensions: params.availableDimensions,
                maxProblems: params.maxProblems || 10,
            });
            const analysisResult = {
                gaps: gapsResult.scissorsGaps,
                causes: causesResult.causes,
            };
            setResult(analysisResult);
            return analysisResult;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : '分析失败';
            setError(errorMessage);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, [client]);
    /**
     * 仅分析剪刀差（第一步）
     */
    const analyzeGaps = useCallback(async (params) => {
        setLoading(true);
        setError(null);
        try {
            const result = await client.analyzeScissorsGaps(params);
            return result.scissorsGaps;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : '分析失败';
            setError(errorMessage);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, [client]);
    /**
     * 仅分析问题原因（第二步）
     */
    const analyzeCauses = useCallback(async (params) => {
        setLoading(true);
        setError(null);
        try {
            const result = await client.analyzeProblemCauses(params);
            return result.causes;
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : '分析失败';
            setError(errorMessage);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, [client]);
    /**
     * 查询市场数据
     */
    const queryData = useCallback(async (params) => {
        setLoading(true);
        setError(null);
        try {
            return await client.queryMarketData(params);
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : '查询失败';
            setError(errorMessage);
            throw err;
        }
        finally {
            setLoading(false);
        }
    }, [client]);
    /**
     * 检查服务器连接
     */
    const checkHealth = useCallback(async () => {
        try {
            return await client.healthCheck();
        }
        catch (err) {
            return false;
        }
    }, [client]);
    /**
     * 重置状态
     */
    const reset = useCallback(() => {
        setError(null);
        setResult(null);
    }, []);
    return {
        client,
        loading,
        error,
        result,
        analyzeProblem,
        analyzeGaps,
        analyzeCauses,
        queryData,
        checkHealth,
        reset,
    };
}
