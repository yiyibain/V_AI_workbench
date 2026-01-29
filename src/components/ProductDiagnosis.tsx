import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ProductPerformance, AIAnalysis, RiskAlert } from '../types';
import { analyzeProductPerformance } from '../services/aiService';
import { useAnalysis } from '../contexts/AnalysisContext';
import { AlertTriangle, TrendingDown, TrendingUp, Loader2, ChevronDown, ChevronUp, RefreshCw, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import AIAnalysisDisplay from './AIAnalysisDisplay';

interface ProductDiagnosisProps {
  product: ProductPerformance;
}

export default function ProductDiagnosis({ product }: ProductDiagnosisProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['data-summary']));
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
    },
    {
      name: '分子式内份额',
      value: product.moleculeInternalShare,
      change: product.moleculeInternalShareChange,
    },
    {
      name: '竞品份额',
      value: product.competitorShare,
      change: product.competitorShareChange,
    },
    {
      name: '解限率',
      value: product.deLimitRate,
      change: product.deLimitRateChange,
    },
  ];

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
              title="制定策略"
            >
              <Target className="w-4 h-4" />
              <span>制定策略</span>
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
            />
            <MetricCard
              label="分子式内份额"
              value={`${product.moleculeInternalShare}%`}
              change={product.moleculeInternalShareChange}
            />
            <MetricCard
              label="竞品份额"
              value={`${product.competitorShare}%`}
              change={product.competitorShareChange}
            />
            <MetricCard
              label="解限率"
              value={`${product.deLimitRate}%`}
              change={product.deLimitRateChange}
            />
          </div>

          {/* 数据可视化 */}
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
                  <Bar dataKey="change" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

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

          {/* AI关键发现 - 等待AI分析完成 */}
          {loading && (
            <div className="flex items-center justify-center py-4 border border-gray-200 rounded-lg bg-gray-50">
              <Loader2 className="w-5 h-5 animate-spin text-primary-600 mr-2" />
              <span className="text-sm text-gray-600">AI分析中，即将生成关键发现...</span>
            </div>
          )}
          {analysis && analysis.keyFindings.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">AI关键发现</h4>
              <ul className="space-y-2">
                {analysis.keyFindings.map((finding, index) => (
                  <li key={index} className="flex items-start text-sm text-gray-700">
                    <span className="text-primary-600 mr-2">•</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      {/* 数据解读 - 等待AI分析完成 */}
      <Section
        title="数据解读"
        subtitle="链接相关信息源，获取产品表现的可能原因，并智能建议进一步锁定问题的解决方案"
        expanded={expandedSections.has('data-interpretation')}
        onToggle={() => toggleSection('data-interpretation')}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <span className="ml-3 text-gray-600">AI分析中...</span>
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            {/* AI分析结果 - 使用新的增强组件 */}
            <AIAnalysisDisplay analysis={analysis} />

            {/* 建议行动 */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">建议行动</h4>
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">问题拆解角度</h5>
                  <ul className="space-y-1">
                    {analysis.suggestedActions.problemBreakdown.map((action, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="text-primary-600 mr-2">→</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">可访谈对象</h5>
                  <ul className="space-y-1">
                    {analysis.suggestedActions.interviewTargets.map((target, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="text-primary-600 mr-2">→</span>
                        <span>{target}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 mb-2">数据分析方向</h5>
                  <ul className="space-y-1">
                    {analysis.suggestedActions.dataAnalysis.map((analysisItem, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="text-primary-600 mr-2">→</span>
                        <span>{analysisItem}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* 相关信息 */}
            {analysis.relatedInfo.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">相关信息</h4>
                <div className="space-y-3">
                  {analysis.relatedInfo.map((info, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded">
                          {info.source}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{info.content}</p>
                      <p className="text-xs text-gray-500 italic">{info.relevance}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>等待AI分析完成...</p>
          </div>
        )}
      </Section>
    </div>
  );
}

// 指标卡片组件
function MetricCard({ label, value, change }: { label: string; value: string; change: number }) {
  const isPositive = change > 0;
  const isNegative = change < 0;

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
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

