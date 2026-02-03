import { useState, useEffect } from 'react';
import { BasicIndicators, ProductPerformance, AIAnalysis } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import DataInterpretation from './DataInterpretation';
import { useAnalysis } from '../contexts/AnalysisContext';
import { analyzeProductPerformance } from '../services/aiService';

interface BasicIndicatorsDisplayProps {
  indicators: BasicIndicators;
  product: ProductPerformance;
}

export default function BasicIndicatorsDisplay({ indicators, product }: BasicIndicatorsDisplayProps) {
  const [selectedCategory, setSelectedCategory] = useState<'result' | 'process'>('result');
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const {
    getCachedAnalysis,
    setCachedAnalysis,
  } = useAnalysis();

  // 生成缓存键
  const cacheKey = `product-${product.productId}-${product.period}`;

  useEffect(() => {
    loadAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.productId, product.period]);

  const loadAnalysis = async () => {
    // 检查缓存
    const cached = getCachedAnalysis(cacheKey);
    if (cached) {
      setAnalysis(cached);
      return;
    }

    // 需要重新分析
    setLoading(true);
    try {
      const result = await analyzeProductPerformance(product);
      setAnalysis(result);
      // 保存到缓存
      setCachedAnalysis(cacheKey, result);
    } catch (error) {
      console.error('Failed to load analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  // 结果指标数据
  const resultIndicatorData = indicators.quarterlyData.map((q, index) => {
    const prevValue = index > 0 ? indicators.quarterlyData[index - 1].statinShare : q.statinShare;
    const change = q.statinShare - prevValue;
    return {
      period: q.period,
      value: q.statinShare,
      change,
      baseline: 10, // 基准值：通常在10%左右浮动
    };
  });

  // 过程指标数据
  const processIndicatorsData = indicators.quarterlyData.map((q, index) => {
    const prevCore = index > 0 ? indicators.quarterlyData[index - 1].coreHospitalPenetration : q.coreHospitalPenetration;
    const prevStable = index > 0 ? indicators.quarterlyData[index - 1].stableDistributionRate : q.stableDistributionRate;
    const prevWeighted = index > 0 ? indicators.quarterlyData[index - 1].weightedDeLimitRate : q.weightedDeLimitRate;
    const prevTarget = index > 0 ? indicators.quarterlyData[index - 1].targetHospitalPenetration : q.targetHospitalPenetration;
    
    return {
      period: q.period,
      核心影响型医院渗透率: q.coreHospitalPenetration,
      稳定分销率: q.stableDistributionRate,
      加权解限率: q.weightedDeLimitRate,
      目标影响型医院渗透率: q.targetHospitalPenetration,
      // 变化量
      coreChange: q.coreHospitalPenetration - prevCore,
      stableChange: q.stableDistributionRate - prevStable,
      weightedChange: q.weightedDeLimitRate - prevWeighted,
      targetChange: q.targetHospitalPenetration - prevTarget,
      // 基准值
      coreBaseline: 10,
      stableBaseline: 60,
      weightedBaseline: 20,
      targetBaseline: 10,
    };
  });

  // 计算平均值和趋势
  const calculateStats = (data: typeof resultIndicatorData) => {
    const values = data.map(d => d.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const latest = values[values.length - 1];
    const previous = values.length > 1 ? values[values.length - 2] : latest;
    const trend = latest > previous ? 'up' : latest < previous ? 'down' : 'stable';
    return { avg, latest, trend };
  };

  const resultStats = calculateStats(resultIndicatorData);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* 标题 */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">基础指标展示</h2>
        <p className="text-sm text-gray-500">
          {indicators.productName} - 过往4个季度核心结果和过程指标
        </p>
      </div>

      {/* 指标分类切换 */}
      <div className="mb-6">
        <div className="flex space-x-2 border-b border-gray-200">
          <button
            onClick={() => setSelectedCategory('result')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              selectedCategory === 'result'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            结果指标
          </button>
          <button
            onClick={() => setSelectedCategory('process')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              selectedCategory === 'process'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            过程指标
          </button>
        </div>
      </div>

      {/* 结果指标展示 */}
      {selectedCategory === 'result' && (
        <div className="space-y-6">
          {/* 结果指标概览卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="text-xs text-blue-600 mb-1">立普妥占他汀份额</div>
              <div className="text-2xl font-bold text-blue-900 mb-2">
                {resultStats.latest.toFixed(1)}%
              </div>
              <div className="flex items-center text-sm">
                {resultStats.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600 mr-1" />}
                {resultStats.trend === 'down' && <TrendingDown className="w-4 h-4 text-red-600 mr-1" />}
                {resultStats.trend === 'stable' && <Minus className="w-4 h-4 text-gray-600 mr-1" />}
                <span className={resultStats.trend === 'up' ? 'text-green-600' : resultStats.trend === 'down' ? 'text-red-600' : 'text-gray-600'}>
                  {resultStats.trend === 'up' ? '上升' : resultStats.trend === 'down' ? '下降' : '稳定'}
                </span>
                <span className="text-gray-500 ml-2">vs 上季度</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">4季度平均值</div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {resultStats.avg.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">基准范围: 10%左右</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">最新变化</div>
              <div className={`text-2xl font-bold mb-2 ${
                resultIndicatorData[resultIndicatorData.length - 1].change > 0 
                  ? 'text-green-600' 
                  : resultIndicatorData[resultIndicatorData.length - 1].change < 0 
                  ? 'text-red-600' 
                  : 'text-gray-900'
              }`}>
                {resultIndicatorData[resultIndicatorData.length - 1].change > 0 ? '+' : ''}
                {resultIndicatorData[resultIndicatorData.length - 1].change.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">vs 上季度</div>
            </div>
          </div>

          {/* 结果指标趋势图 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">立普妥占他汀份额趋势</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={resultIndicatorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, '份额']}
                  labelFormatter={(label) => `季度: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="立普妥占他汀份额"
                  dot={{ r: 5 }}
                  activeDot={{ r: 7 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="baseline" 
                  stroke="#94a3b8" 
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  name="基准值 (10%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 季度数据表格 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">季度数据明细</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 px-4 font-semibold text-gray-700">季度</th>
                    <th className="text-right py-2 px-4 font-semibold text-gray-700">份额 (%)</th>
                    <th className="text-right py-2 px-4 font-semibold text-gray-700">变化 (%)</th>
                    <th className="text-right py-2 px-4 font-semibold text-gray-700">与基准差值</th>
                  </tr>
                </thead>
                <tbody>
                  {resultIndicatorData.map((item, index) => {
                    const diffFromBaseline = item.value - item.baseline;
                    return (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-100">
                        <td className="py-2 px-4 text-gray-900">{item.period}</td>
                        <td className="py-2 px-4 text-right font-medium text-gray-900">
                          {item.value.toFixed(1)}%
                        </td>
                        <td className={`py-2 px-4 text-right ${
                          item.change > 0 ? 'text-green-600' : item.change < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
                        </td>
                        <td className={`py-2 px-4 text-right ${
                          diffFromBaseline > 0 ? 'text-green-600' : diffFromBaseline < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {diffFromBaseline > 0 ? '+' : ''}{diffFromBaseline.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 过程指标展示 */}
      {selectedCategory === 'process' && (
        <div className="space-y-6">
          {/* 过程指标概览卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { 
                name: '核心影响型医院渗透率', 
                key: 'coreHospitalPenetration' as const,
                baseline: 10,
                latest: processIndicatorsData[processIndicatorsData.length - 1].核心影响型医院渗透率,
                change: processIndicatorsData[processIndicatorsData.length - 1].coreChange,
              },
              { 
                name: '稳定分销率', 
                key: 'stableDistributionRate' as const,
                baseline: 60,
                latest: processIndicatorsData[processIndicatorsData.length - 1].稳定分销率,
                change: processIndicatorsData[processIndicatorsData.length - 1].stableChange,
              },
              { 
                name: '加权解限率', 
                key: 'weightedDeLimitRate' as const,
                baseline: 20,
                latest: processIndicatorsData[processIndicatorsData.length - 1].加权解限率,
                change: processIndicatorsData[processIndicatorsData.length - 1].weightedChange,
              },
              { 
                name: '目标影响型医院渗透率', 
                key: 'targetHospitalPenetration' as const,
                baseline: 10,
                latest: processIndicatorsData[processIndicatorsData.length - 1].目标影响型医院渗透率,
                change: processIndicatorsData[processIndicatorsData.length - 1].targetChange,
              },
            ].map((indicator) => (
              <div key={indicator.key} className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="text-xs text-purple-600 mb-1">{indicator.name}</div>
                <div className="text-2xl font-bold text-purple-900 mb-2">
                  {indicator.latest.toFixed(1)}%
                </div>
                <div className="flex items-center text-sm mb-1">
                  {indicator.change > 0 && <TrendingUp className="w-4 h-4 text-green-600 mr-1" />}
                  {indicator.change < 0 && <TrendingDown className="w-4 h-4 text-red-600 mr-1" />}
                  {indicator.change === 0 && <Minus className="w-4 h-4 text-gray-600 mr-1" />}
                  <span className={indicator.change > 0 ? 'text-green-600' : indicator.change < 0 ? 'text-red-600' : 'text-gray-600'}>
                    {indicator.change > 0 ? '+' : ''}{indicator.change.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-gray-500">基准: {indicator.baseline}%左右</div>
              </div>
            ))}
          </div>

          {/* 过程指标趋势图 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">过程指标趋势对比</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={processIndicatorsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                  labelFormatter={(label) => `季度: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="核心影响型医院渗透率" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="核心影响型医院渗透率"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="稳定分销率" 
                  stroke="#06b6d4" 
                  strokeWidth={2}
                  name="稳定分销率"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="加权解限率" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name="加权解限率"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="目标影响型医院渗透率" 
                  stroke="#ec4899" 
                  strokeWidth={2}
                  name="目标影响型医院渗透率"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 过程指标数据表格 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">季度数据明细</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-2 px-4 font-semibold text-gray-700">季度</th>
                    <th className="text-right py-2 px-4 font-semibold text-gray-700">核心影响型医院渗透率</th>
                    <th className="text-right py-2 px-4 font-semibold text-gray-700">稳定分销率</th>
                    <th className="text-right py-2 px-4 font-semibold text-gray-700">加权解限率</th>
                    <th className="text-right py-2 px-4 font-semibold text-gray-700">目标影响型医院渗透率</th>
                  </tr>
                </thead>
                <tbody>
                  {processIndicatorsData.map((item, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-100">
                      <td className="py-2 px-4 text-gray-900">{item.period}</td>
                      <td className="py-2 px-4 text-right font-medium text-gray-900">
                        {item.核心影响型医院渗透率.toFixed(1)}%
                      </td>
                      <td className="py-2 px-4 text-right font-medium text-gray-900">
                        {item.稳定分销率.toFixed(1)}%
                      </td>
                      <td className="py-2 px-4 text-right font-medium text-gray-900">
                        {item.加权解限率.toFixed(1)}%
                      </td>
                      <td className="py-2 px-4 text-right font-medium text-gray-900">
                        {item.目标影响型医院渗透率.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 数据解读部分 */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">数据解读</h2>
          <p className="text-sm text-gray-500">
            基于具体数据下钻分析，识别异常值、深挖原因、提炼风险点并提供解决方案
          </p>
        </div>
        <DataInterpretation product={product} analysis={analysis} loading={loading} />
      </div>
    </div>
  );
}

