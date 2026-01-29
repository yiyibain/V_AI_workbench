import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ProvincePerformance, AIAnalysis } from '../types';
import { analyzeProvincePerformance } from '../services/aiService';
import { useAnalysis } from '../contexts/AnalysisContext';
import { Loader2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, RefreshCw, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface ProvinceDiagnosisProps {
  province: ProvincePerformance;
}

export default function ProvinceDiagnosis({ province }: ProvinceDiagnosisProps) {
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
    markNeedsRefresh,
    clearNeedsRefresh,
  } = useAnalysis();

  // 生成缓存键
  const cacheKey = `province-${province.provinceId}-${province.period}`;

  useEffect(() => {
    loadAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [province.provinceId, province.period]);

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
      const result = await analyzeProvincePerformance(province);
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

  const getHealthColor = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'good':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'average':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthLabel = (level: string) => {
    switch (level) {
      case 'excellent':
        return '优秀';
      case 'good':
        return '良好';
      case 'average':
        return '一般';
      case 'poor':
        return '较差';
      default:
        return '未知';
    }
  };

  const radarData = [
    {
      subject: '市场份额',
      value: province.marketShare * 5, // 归一化到0-100
      fullMark: 100,
    },
    {
      subject: 'ROI',
      value: (province.roi / 2) * 100, // 假设2.0为满分
      fullMark: 100,
    },
    {
      subject: '非立络占比',
      value: province.nonLiluRatio * 2, // 归一化
      fullMark: 100,
    },
    {
      subject: '解限率',
      value: province.deLimitRate,
      fullMark: 100,
    },
    {
      subject: '渗透率',
      value: province.penetrationRate,
      fullMark: 100,
    },
  ];

  const barData = [
    {
      name: '市场份额',
      value: province.marketShare,
      target: 12.0,
    },
    {
      name: 'ROI',
      value: province.roi,
      target: 1.8,
    },
    {
      name: '非立络占比',
      value: province.nonLiluRatio,
      target: 45.0,
    },
    {
      name: '解限率',
      value: province.deLimitRate,
      target: 85.0,
    },
    {
      name: '渗透率',
      value: province.penetrationRate,
      target: 80.0,
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* 省份标题 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{province.provinceName}</h2>
            <p className="text-sm text-gray-500">{province.period}</p>
          </div>
          <div className="flex items-center space-x-3">
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
            <div className={`px-4 py-2 rounded-lg border ${getHealthColor(province.healthLevel)}`}>
              <div className="text-sm font-semibold">{getHealthLabel(province.healthLevel)}</div>
              <div className="text-2xl font-bold mt-1">{province.healthScore}</div>
              <div className="text-xs opacity-75">健康度评分</div>
            </div>
          </div>
        </div>
        {analysis && !loading && (
          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-2">
            <span>•</span>
            <span>分析结果已缓存，切换省份时自动加载</span>
          </div>
        )}
      </div>

      {/* 就数论数 - 数据概览（立即渲染，不等待AI） */}
      <Section
        title="就数论数"
        subtitle="基于核心维度及核心指标表现，AI智能定位表现优异、表现不理想的维度"
        expanded={expandedSections.has('data-summary')}
        onToggle={() => toggleSection('data-summary')}
      >
        <div className="space-y-6">
          {/* 核心指标卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MetricCard
              label="市场份额"
              value={`${province.marketShare}%`}
              target={12.0}
            />
            <MetricCard
              label="ROI"
              value={province.roi.toFixed(2)}
              target={1.8}
            />
            <MetricCard
              label="非立络占比"
              value={`${province.nonLiluRatio}%`}
              target={45.0}
            />
            <MetricCard
              label="解限率"
              value={`${province.deLimitRate}%`}
              target={85.0}
            />
            <MetricCard
              label="渗透率"
              value={`${province.penetrationRate}%`}
              target={80.0}
            />
          </div>

          {/* 数据可视化 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">雷达图分析</h4>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="当前值"
                    dataKey="value"
                    stroke="#0ea5e9"
                    fill="#0ea5e9"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-4">指标对比</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#0ea5e9" name="当前值" />
                  <Bar dataKey="target" fill="#10b981" name="目标值" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 风险预警 - 基于数据计算，不等待AI */}
          {(() => {
            const riskAlerts: any[] = [];
            if (province.healthScore < 60) {
              riskAlerts.push({
                riskLevel: 'high',
                riskType: '健康度评分偏低',
                description: `健康度评分${province.healthScore}分，低于平均水平`,
              });
            }
            if (province.deLimitRate < 70) {
              riskAlerts.push({
                riskLevel: 'medium',
                riskType: '解限率偏低',
                description: `解限率${province.deLimitRate}%，低于目标值`,
              });
            }

            return riskAlerts.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-gray-900">风险预警</h4>
                <div className="space-y-3">
                  {riskAlerts.map((alert, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        alert.riskLevel === 'high'
                          ? 'text-red-600 bg-red-50 border-red-200'
                          : 'text-orange-600 bg-orange-50 border-orange-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="font-semibold mr-2">{alert.riskType}</span>
                            <span className="text-xs px-2 py-1 rounded-full bg-white/50">
                              {alert.riskLevel === 'high' ? '高风险' : '中风险'}
                            </span>
                          </div>
                          <p className="text-sm">{alert.description}</p>
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
        subtitle="结合相关信息与数据，总结省份表现的潜在原因"
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
            {/* AI分析结果 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <h4 className="text-lg font-semibold text-blue-900 mb-3">AI智能分析</h4>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {analysis.interpretation}
              </div>
            </div>

            {/* 可能原因 */}
            {analysis.possibleReasons.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">可能原因</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analysis.possibleReasons.map((reason, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                    >
                      <span className="text-sm text-gray-700">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
function MetricCard({
  label,
  value,
  target,
}: {
  label: string;
  value: string;
  target: number;
}) {
  const numericValue = parseFloat(value);
  const isAboveTarget = numericValue >= target;
  const gap = ((numericValue - target) / target) * 100;

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mb-2">{value}</div>
      <div className="flex items-center text-sm">
        {isAboveTarget ? (
          <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
        )}
        <span className={isAboveTarget ? 'text-green-600' : 'text-red-600'}>
          {gap > 0 ? '+' : ''}{gap.toFixed(1)}%
        </span>
        <span className="text-gray-500 ml-1">vs 目标</span>
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

