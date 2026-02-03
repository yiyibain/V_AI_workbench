import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ProductPerformance, AIAnalysis, RiskAlert } from '../types';
import { analyzeProductPerformance } from '../services/aiService';
import { useAnalysis } from '../contexts/AnalysisContext';
import { AlertTriangle, TrendingDown, TrendingUp, ChevronDown, ChevronUp, RefreshCw, Target, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import DataInterpretation from './DataInterpretation';

interface ProductDiagnosisProps {
  product: ProductPerformance;
}

export default function ProductDiagnosis({ product }: ProductDiagnosisProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['data-summary']));
  const [selectedIndicator, setSelectedIndicator] = useState<string | null>('moleculeShare');
  const {
    setCurrentAnalysis,
    getCachedAnalysis,
    setCachedAnalysis,
    clearCachedAnalysis,
    needsRefresh,
    refreshTrigger,
    clearNeedsRefresh,
  } = useAnalysis();

  // 生成缓存键
  const cacheKey = `product-${product.productId}-${product.period}`;

  useEffect(() => {
    loadAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.productId, product.period]);

  // 监听刷新标记，如果当前分析需要刷新，自动刷新
  useEffect(() => {
    if (needsRefresh.has(cacheKey) && analysis) {
      loadAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, cacheKey]);

  const loadAnalysis = async (forceRefresh = false) => {
    // 检查是否需要刷新
    const shouldRefresh = forceRefresh || needsRefresh.has(cacheKey);

    // 如果不需要刷新且有缓存，直接使用缓存
    if (!shouldRefresh) {
      const cached = getCachedAnalysis(cacheKey);
      if (cached) {
        setAnalysis(cached);
        setCurrentAnalysis(cached);
        return;
      }
    }

    // 需要重新分析
    setLoading(true);
    try {
      const result = await analyzeProductPerformance(product);
      setAnalysis(result);
      setCurrentAnalysis(result);
      // 保存到缓存
      setCachedAnalysis(cacheKey, result);
      // 清除刷新标记
      if (needsRefresh.has(cacheKey)) {
        clearNeedsRefresh(cacheKey);
      }
    } catch (error) {
      console.error('Failed to load analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    clearCachedAnalysis(cacheKey);
    loadAnalysis(true);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const chartData = [
    {
      name: '分子式份额',
      value: product.moleculeShare,
      change: product.moleculeShareChange,
      key: 'moleculeShare',
    },
    {
      name: '分子式内份额',
      value: product.moleculeInternalShare,
      change: product.moleculeInternalShareChange,
      key: 'moleculeInternalShare',
    },
    {
      name: '竞品份额',
      value: product.competitorShare,
      change: product.competitorShareChange,
      key: 'competitorShare',
    },
    {
      name: '解限率',
      value: product.deLimitRate,
      change: product.deLimitRateChange,
      key: 'deLimitRate',
    },
  ];

  // 处理指标点击
  const handleIndicatorClick = (indicatorKey: string) => {
    setSelectedIndicator(indicatorKey);
  };

  // 获取季度数据
  const getQuarterlyData = (indicatorKey: string) => {
    if (!product.quarterlyData || product.quarterlyData.length === 0) {
      return null;
    }

    const quarterlyData = product.quarterlyData.map((q, index) => {
      let value = 0;
      let change = 0;
      
      switch (indicatorKey) {
        case 'moleculeShare':
          value = q.moleculeShare;
          if (index > 0) {
            change = q.moleculeShare - product.quarterlyData![index - 1].moleculeShare;
          }
          break;
        case 'moleculeInternalShare':
          value = q.moleculeInternalShare;
          if (index > 0) {
            change = q.moleculeInternalShare - product.quarterlyData![index - 1].moleculeInternalShare;
          }
          break;
        case 'competitorShare':
          value = q.competitorShare;
          if (index > 0) {
            change = q.competitorShare - product.quarterlyData![index - 1].competitorShare;
          }
          break;
        case 'deLimitRate':
          value = q.deLimitRate;
          if (index > 0) {
            change = q.deLimitRate - product.quarterlyData![index - 1].deLimitRate;
          }
          break;
      }

      return {
        period: q.period,
        value,
        change,
      };
    });

    return quarterlyData;
  };

  const selectedIndicatorData = selectedIndicator ? chartData.find(d => d.key === selectedIndicator) : null;
  const quarterlyData = selectedIndicator ? getQuarterlyData(selectedIndicator) : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* 产品标题 */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.productName}</h2>
            <p className="text-sm text-gray-500">
              {product.moleculeFormula} · {product.period}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="刷新AI分析"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>刷新分析</span>
            </button>
            <Link
              to="/strategy-planning"
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
              title="策略辅助"
            >
              <Target className="w-4 h-4" />
              <span>策略辅助</span>
            </Link>
          </div>
        </div>
        {analysis && !loading && (
          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-2">
            <span>•</span>
            <span>分析结果已缓存，切换产品时自动加载</span>
          </div>
        )}
      </div>

      {/* 就数论数 - 数据概览（立即渲染，不等待AI） */}
      <Section
        title="就数论数"
        subtitle="提取内外部数据中产品表现，定位变化幅度较大的指标，提供风险预警"
        expanded={expandedSections.has('data-summary')}
        onToggle={() => toggleSection('data-summary')}
      >
        <div className="space-y-6">
          {/* 关键指标卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="分子式份额"
              value={`${product.moleculeShare}%`}
              change={product.moleculeShareChange}
              onClick={() => handleIndicatorClick('moleculeShare')}
            />
            <MetricCard
              label="分子式内份额"
              value={`${product.moleculeInternalShare}%`}
              change={product.moleculeInternalShareChange}
              onClick={() => handleIndicatorClick('moleculeInternalShare')}
            />
            <MetricCard
              label="竞品份额"
              value={`${product.competitorShare}%`}
              change={product.competitorShareChange}
              onClick={() => handleIndicatorClick('competitorShare')}
            />
            <MetricCard
              label="解限率"
              value={`${product.deLimitRate}%`}
              change={product.deLimitRateChange}
              onClick={() => handleIndicatorClick('deLimitRate')}
            />
          </div>

          {/* 数据可视化 */}
          {!selectedIndicator ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">份额对比</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-4">变化趋势</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="change" fill="#10b981">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.change > 0 ? '#ef4444' : '#10b981'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700">
                  {selectedIndicatorData?.name} - 近4个季度数据
                </h4>
                <button
                  onClick={() => setSelectedIndicator(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {quarterlyData && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="text-xs font-semibold text-gray-600 mb-3 text-center">季度数值</h5>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={quarterlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#0ea5e9" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-gray-600 mb-3 text-center">季度变化量</h5>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={quarterlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="change" fill="#10b981">
                          {quarterlyData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.change > 0 ? '#ef4444' : entry.change < 0 ? '#10b981' : '#94a3b8'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 风险预警 - 基于数据计算，不等待AI */}
          {(() => {
            const riskAlerts: RiskAlert[] = [];
            if (product.moleculeShareChange > 0 && product.moleculeInternalShareChange < -2) {
              riskAlerts.push({
                productId: product.productId,
                productName: product.productName,
                riskLevel: 'high',
                riskType: '分子式内份额下降',
                description: `分子式份额上升${product.moleculeShareChange}%，但分子式内份额下降${Math.abs(product.moleculeInternalShareChange)}%`,
                indicators: ['分子式内份额', '分子式份额'],
                changeMagnitude: Math.abs(product.moleculeInternalShareChange),
              });
            }
            if (product.deLimitRateChange < -3) {
              riskAlerts.push({
                productId: product.productId,
                productName: product.productName,
                riskLevel: 'high',
                riskType: '解限率下降',
                description: `解限率下降${Math.abs(product.deLimitRateChange)}%，可能影响市场准入`,
                indicators: ['解限率'],
                changeMagnitude: Math.abs(product.deLimitRateChange),
              });
            }
            if (product.competitorShareChange > 2) {
              riskAlerts.push({
                productId: product.productId,
                productName: product.productName,
                riskLevel: 'medium',
                riskType: '竞品份额上升',
                description: `竞品份额上升${product.competitorShareChange}%，竞争加剧`,
                indicators: ['竞品份额'],
                changeMagnitude: product.competitorShareChange,
              });
            }

            return riskAlerts.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                  风险预警
                </h4>
                <div className="space-y-3">
                  {riskAlerts.map((alert, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${getRiskColor(alert.riskLevel)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="font-semibold mr-2">{alert.riskType}</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-white/50">
                              {alert.riskLevel === 'high' ? '高风险' : alert.riskLevel === 'medium' ? '中风险' : '低风险'}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{alert.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {alert.indicators.map((indicator, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-1 rounded bg-white/50"
                              >
                                {indicator}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

        </div>
      </Section>

      {/* 数据解读 - 重新设计的板块 */}
      <Section
        title="数据解读"
        subtitle="基于具体数据下钻分析，识别异常值、深挖原因、提炼风险点并提供解决方案"
        expanded={expandedSections.has('data-interpretation')}
        onToggle={() => toggleSection('data-interpretation')}
      >
        <DataInterpretation product={product} analysis={analysis} loading={loading} />
      </Section>
    </div>
  );
}

// 指标卡片组件
function MetricCard({ 
  label, 
  value, 
  change, 
  onClick 
}: { 
  label: string; 
  value: string; 
  change: number;
  onClick?: () => void;
}) {
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div 
      className={`bg-gray-50 rounded-lg p-4 border border-gray-200 ${onClick ? 'cursor-pointer hover:bg-gray-100 hover:border-primary-300 transition-all' : ''}`}
      onClick={onClick}
      title={onClick ? '点击查看近4个季度数据' : undefined}
    >
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mb-2">{value}</div>
      <div className="flex items-center text-sm">
        {isPositive && <TrendingUp className="w-4 h-4 text-green-600 mr-1" />}
        {isNegative && <TrendingDown className="w-4 h-4 text-red-600 mr-1" />}
        <span className={isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'}>
          {change > 0 ? '+' : ''}{change.toFixed(1)}%
        </span>
        <span className="text-gray-500 ml-1">vs 上期</span>
      </div>
    </div>
  );
}

// 可折叠区域组件
function Section({
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6 border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left mb-4"
      >
        <div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {expanded && <div>{children}</div>}
    </div>
  );
}

