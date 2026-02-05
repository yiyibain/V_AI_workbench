/**
 * Web MCP 客户端 - 通过 HTTP API 调用问题定位分析服务
 */
import axios from 'axios';
export class WebMCPClient {
    constructor(baseUrl = 'http://localhost:3001') {
        Object.defineProperty(this, "baseUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "axiosInstance", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.baseUrl = baseUrl;
        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            timeout: 300000, // 5分钟超时（AI分析可能需要较长时间）
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
    /**
     * 检查服务器健康状态
     */
    async healthCheck() {
        try {
            const response = await this.axiosInstance.get('/health');
            return response.data.status === 'ok';
        }
        catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }
    /**
     * 获取可用工具列表
     */
    async listTools() {
        try {
            const response = await this.axiosInstance.get('/tools');
            return response.data.tools;
        }
        catch (error) {
            console.error('Failed to list tools:', error);
            throw error;
        }
    }
    /**
     * 分析剪刀差（第一步）
     */
    async analyzeScissorsGaps(params) {
        try {
            const response = await this.axiosInstance.post('/tools/analyze_scissors_gaps', params);
            return response.data;
        }
        catch (error) {
            console.error('Failed to analyze scissors gaps:', error);
            if (axios.isAxiosError(error)) {
                throw new Error(error.response?.data?.error || error.message || '分析失败');
            }
            throw error;
        }
    }
    /**
     * 分析问题原因（第二步）
     */
    async analyzeProblemCauses(params) {
        try {
            const response = await this.axiosInstance.post('/tools/analyze_problem_causes', params);
            return response.data;
        }
        catch (error) {
            console.error('Failed to analyze problem causes:', error);
            if (axios.isAxiosError(error)) {
                throw new Error(error.response?.data?.error || error.message || '分析失败');
            }
            throw error;
        }
    }
    /**
     * 查询市场数据
     */
    async queryMarketData(params) {
        try {
            const response = await this.axiosInstance.post('/tools/query_market_data', params);
            return response.data.result;
        }
        catch (error) {
            console.error('Failed to query market data:', error);
            if (axios.isAxiosError(error)) {
                throw new Error(error.response?.data?.error || error.message || '查询失败');
            }
            throw error;
        }
    }
}
// 导出单例实例（可选）
export const defaultMCPClient = new WebMCPClient();
