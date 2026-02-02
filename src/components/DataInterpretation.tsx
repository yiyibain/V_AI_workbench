import { useState, useEffect, useMemo, useRef } from 'react';
import { ProductPerformance } from '../types';
import {
  AnomalyFinding,
  RootCauseAnalysis,
  RiskPoint,
  MacroRecommendation,
  ProvinceDetailPerformance,
} from '../types/analysis';
import { generateProvinceDetailData } from '../data/hospitalMockData';
import { mockProvincePerformance } from '../data/mockData';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  MapPin,
  Building2,
  MessageCircle,
  ExternalLink,
  Database,
} from 'lucide-react';
import { clsx } from 'clsx';
import { AIAnalysis } from '../types';

interface DataInterpretationProps {
  product: ProductPerformance;
  analysis: AIAnalysis | null;
  loading: boolean;
}

export default function DataInterpretation({
  product,
  analysis,
  loading,
}: DataInterpretationProps) {
  const [expandedAnomalies, setExpandedAnomalies] = useState<Set<string>>(new Set());
  const [expandedRisks, setExpandedRisks] = useState<Set<string>>(new Set());
  const [selectedText, setSelectedText] = useState<string>('');
  const selectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 使用useMemo缓存数据，避免每次渲染都重新生成
  const provinceDetails = useMemo(
    () => mockProvincePerformance.map((p) => generateProvinceDetailData(p)),
    []
  );

  // 生成异常值发现
  const anomalies = useMemo(
    () => generateAnomalies(product, provinceDetails),
    [product, provinceDetails]
  );

  // 生成原因深挖
  const rootCauses = useMemo(
    () => generateRootCauses(anomalies, provinceDetails),
    [anomalies, provinceDetails]
  );

  // 生成风险点
  const riskPoints = useMemo(
    () => generateRiskPoints(product, anomalies, rootCauses),
    [product, anomalies, rootCauses]
  );

  // 生成宏观建议
  const macroRecommendations = useMemo(
    () => generateMacroRecommendations(riskPoints),
    [riskPoints]
  );

  const toggleAnomaly = (id: string) => {
    const newExpanded = new Set(expandedAnomalies);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedAnomalies(newExpanded);
  };

  const toggleRisk = (id: string) => {
    const newExpanded = new Set(expandedRisks);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRisks(newExpanded);
  };

  // 处理文本选择（防抖处理，避免频繁更新）
  const handleTextSelection = () => {
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }
    
    selectionTimeoutRef.current = setTimeout(() => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        const selected = selection.toString().trim();
        // 只有当选择的文本真正改变时才更新
        if (selected !== selectedText) {
          setSelectedText(selected);
        }
      } else {
        if (selectedText !== '') {
          setSelectedText('');
        }
      }
    }, 100); // 100ms防抖
  };

  useEffect(() => {
    document.addEventListener('selectionchange', handleTextSelection);
    return () => {
      document.removeEventListener('selectionchange', handleTextSelection);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [selectedText]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">AI分析中，正在生成数据解读...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>等待AI分析完成...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. 异常值发现 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
          <h3 className="text-xl font-bold text-gray-900">异常值发现</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          基于具体数据下钻，识别省份、医院级别的异常表现
        </p>

        <div className="space-y-3">
          {anomalies.map((anomaly) => {
            const isExpanded = expandedAnomalies.has(anomaly.id);
            const relatedCause = rootCauses.find((c) => c.anomalyId === anomaly.id);

            return (
              <div
                key={anomaly.id}
                className={clsx(
                  'border rounded-lg overflow-hidden transition-all',
                  anomaly.severity === 'high'
                    ? 'border-red-300 bg-red-50'
                    : anomaly.severity === 'medium'
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-yellow-300 bg-yellow-50'
                )}
              >
                <button
                  onClick={() => toggleAnomaly(anomaly.id)}
                  className="w-full p-4 text-left flex items-start justify-between hover:bg-white/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-gray-900">{anomaly.title}</span>
                      <span
                        className={clsx(
                          'text-xs px-2 py-1 rounded-full',
                          anomaly.severity === 'high'
                            ? 'bg-red-200 text-red-800'
                            : anomaly.severity === 'medium'
                            ? 'bg-orange-200 text-orange-800'
                            : 'bg-yellow-200 text-yellow-800'
                        )}
                      >
                        {anomaly.severity === 'high' ? '高风险' : anomaly.severity === 'medium' ? '中风险' : '低风险'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{anomaly.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      {anomaly.location.province && (
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{anomaly.location.province}</span>
                        </span>
                      )}
                      {anomaly.location.hospital && (
                        <span className="flex items-center space-x-1">
                          <Building2 className="w-3 h-3" />
                          <span>{anomaly.location.hospital}</span>
                        </span>
                      )}
                      <span className="font-medium text-gray-900">
                        {anomaly.dataPoint.label}: {anomaly.dataPoint.value}
                        {anomaly.dataPoint.unit}
                        {anomaly.dataPoint.change !== undefined && (
                          <span
                            className={clsx(
                              'ml-1',
                              anomaly.dataPoint.change! > 0 ? 'text-red-600' : 'text-green-600'
                            )}
                          >
                            ({anomaly.dataPoint.change! > 0 ? '+' : ''}
                            {anomaly.dataPoint.change!.toFixed(1)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t bg-white p-4 space-y-3">
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">相关数据</h5>
                      <div className="space-y-2">
                        {anomaly.relatedData.map((data, index) => (
                          <div
                            key={index}
                            className="flex items-start space-x-2 text-sm bg-gray-50 p-2 rounded"
                          >
                            <span className="text-primary-600 font-medium">{data.type}:</span>
                            <span className="text-gray-700">{data.source}</span>
                            <span className="text-gray-600">- {data.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {relatedCause && (
                      <div className="border-t pt-3">
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">可能原因</h5>
                        <p className="text-sm text-gray-700 mb-2">{relatedCause.cause}</p>
                        <div className="space-y-2">
                          {relatedCause.evidence.map((evidence, index) => (
                            <div
                              key={index}
                              className="flex items-start space-x-2 text-xs bg-blue-50 p-2 rounded border border-blue-200"
                            >
                              {evidence.type === 'data' ? (
                                <Database className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                              ) : (
                                <ExternalLink className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1">
                                <span className="font-medium text-blue-900">{evidence.source}:</span>
                                <span className="text-blue-700 ml-1">{evidence.description}</span>
                                {evidence.dataPoint && (
                                  <span className="text-blue-600 ml-1">({evidence.dataPoint})</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedText && (
                      <div className="border-t pt-3">
                        <button
                          onClick={() => {
                            // 触发AI对话
                            const event = new CustomEvent('openChat', {
                              detail: { text: selectedText, context: anomaly },
                            });
                            window.dispatchEvent(event);
                          }}
                          className="flex items-center space-x-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>针对此异常值深入分析</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. 原因深挖 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingDown className="w-6 h-6 text-blue-500" />
          <h3 className="text-xl font-bold text-gray-900">原因深挖</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          基于异常值，深入分析根本原因，并援引具体数据支撑
        </p>

        <div className="space-y-4">
          {rootCauses.length > 0 ? (
            rootCauses.map((cause) => {
              const anomaly = anomalies.find((a) => a.id === cause.anomalyId);
              return (
                <div
                  key={cause.id}
                  className="border border-blue-200 rounded-lg p-4 bg-blue-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{cause.cause}</h4>
                      {anomaly && (
                        <p className="text-sm text-gray-600 mb-2">
                          关联异常: {anomaly.title}
                        </p>
                      )}
                    </div>
                    <span
                      className={clsx(
                        'text-xs px-2 py-1 rounded-full',
                        cause.confidence === 'high'
                          ? 'bg-green-200 text-green-800'
                          : cause.confidence === 'medium'
                          ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-gray-200 text-gray-800'
                      )}
                    >
                      {cause.confidence === 'high' ? '高置信度' : cause.confidence === 'medium' ? '中置信度' : '低置信度'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {cause.evidence.map((evidence, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-2 text-sm bg-white p-2 rounded border border-blue-100"
                      >
                        {evidence.type === 'data' ? (
                          <Database className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <ExternalLink className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">{evidence.source}:</span>
                          <span className="text-gray-700 ml-1">{evidence.description}</span>
                          {evidence.dataPoint && (
                            <span className="text-blue-600 ml-1 font-medium">
                              ({evidence.dataPoint})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              暂无原因深挖数据
            </div>
          )}
        </div>
      </div>

      {/* 3. 风险点提炼 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h3 className="text-xl font-bold text-gray-900">风险点提炼</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          综合异常值和原因分析，提炼关键风险点及解决方案
        </p>

        <div className="space-y-4">
          {riskPoints.map((risk) => {
            const isExpanded = expandedRisks.has(risk.id);
            return (
              <div
                key={risk.id}
                className={clsx(
                  'border rounded-lg overflow-hidden',
                  risk.severity === 'high'
                    ? 'border-red-300 bg-red-50'
                    : risk.severity === 'medium'
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-yellow-300 bg-yellow-50'
                )}
              >
                <button
                  onClick={() => toggleRisk(risk.id)}
                  className="w-full p-4 text-left flex items-start justify-between hover:bg-white/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-gray-900">{risk.title}</span>
                      <span
                        className={clsx(
                          'text-xs px-2 py-1 rounded-full',
                          risk.severity === 'high'
                            ? 'bg-red-200 text-red-800'
                            : risk.severity === 'medium'
                            ? 'bg-orange-200 text-orange-800'
                            : 'bg-yellow-200 text-yellow-800'
                        )}
                      >
                        {risk.severity === 'high' ? '高风险' : risk.severity === 'medium' ? '中风险' : '低风险'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{risk.description}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 ml-4 flex-shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t bg-white p-4 space-y-4">
                    {/* 可能原因 */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">可能原因</h5>
                      <div className="space-y-2">
                        {risk.possibleCauses.map((cause, index) => (
                          <div
                            key={index}
                            className="bg-gray-50 p-3 rounded border border-gray-200"
                          >
                            <p className="text-sm text-gray-800 mb-2">{cause.cause}</p>
                            <div className="space-y-1">
                              {cause.evidence.map((evidence, evIndex) => (
                                <div
                                  key={evIndex}
                                  className="text-xs text-gray-600 flex items-center space-x-1"
                                >
                                  <span className="text-primary-600">•</span>
                                  <span>{evidence}</span>
                                </div>
                              ))}
                            </div>
                            <span
                              className={clsx(
                                'text-xs px-2 py-1 rounded-full mt-2 inline-block',
                                cause.confidence === 'high'
                                  ? 'bg-green-100 text-green-700'
                                  : cause.confidence === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-gray-100 text-gray-700'
                              )}
                            >
                              置信度: {cause.confidence === 'high' ? '高' : cause.confidence === 'medium' ? '中' : '低'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 解决方案 */}
                    <div>
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">解决方案</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <h6 className="text-xs font-semibold text-green-800 mb-2">短期方案</h6>
                          <ul className="space-y-1">
                            {risk.solutions.shortTerm.map((solution, index) => (
                              <li key={index} className="text-xs text-green-700 flex items-start">
                                <span className="text-green-600 mr-1">→</span>
                                <span>{solution}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <h6 className="text-xs font-semibold text-blue-800 mb-2">长期方案</h6>
                          <ul className="space-y-1">
                            {risk.solutions.longTerm.map((solution, index) => (
                              <li key={index} className="text-xs text-blue-700 flex items-start">
                                <span className="text-blue-600 mr-1">→</span>
                                <span>{solution}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 宏观建议 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-6 h-6 text-green-500" />
          <h3 className="text-xl font-bold text-gray-900">宏观建议</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          基于整体分析，提供战略层面的改进建议
        </p>

        <div className="space-y-3">
          {macroRecommendations.map((rec) => (
            <div
              key={rec.id}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                <span
                  className={clsx(
                    'text-xs px-2 py-1 rounded-full',
                    rec.priority === 'high'
                      ? 'bg-red-200 text-red-800'
                      : rec.priority === 'medium'
                      ? 'bg-yellow-200 text-yellow-800'
                      : 'bg-gray-200 text-gray-800'
                  )}
                >
                  {rec.priority === 'high' ? '高优先级' : rec.priority === 'medium' ? '中优先级' : '低优先级'}
                </span>
              </div>
              <p className="text-sm text-gray-700">{rec.description}</p>
              <div className="mt-2 text-xs text-gray-500">
                类别: {rec.category === 'strategy' ? '策略' : rec.category === 'operation' ? '运营' : rec.category === 'resource' ? '资源' : '组织'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI分析摘要（简化版） */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <MessageCircle className="w-6 h-6 text-primary-500" />
          <h3 className="text-xl font-bold text-gray-900">AI分析摘要</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          基于以上分析的综合摘要，支持文本高亮追问
        </p>
        
        <SummaryContent
          product={product}
          anomalies={anomalies}
          rootCauses={rootCauses}
          riskPoints={riskPoints}
        />

        {selectedText && (
          <div className="mt-4 p-3 bg-white border border-primary-300 rounded-lg shadow-sm">
            <div className="text-xs text-gray-600 mb-1">已选中文本：</div>
            <div className="text-sm text-gray-800 font-medium mb-2 line-clamp-2">
              "{selectedText}"
            </div>
            <button
              onClick={() => {
                const event = new CustomEvent('openChat', {
                  detail: { text: selectedText, context: 'analysis' },
                });
                window.dispatchEvent(event);
                setSelectedText(''); // 点击后清空选择
              }}
              className="flex items-center space-x-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>针对此内容深入追问</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 生成异常值发现（数据维度的直接发现）
function generateAnomalies(
  product: ProductPerformance,
  provinceDetails: ProvinceDetailPerformance[]
): AnomalyFinding[] {
  const anomalies: AnomalyFinding[] = [];
  let anomalyId = 1;

  // 1. 品牌整体解限率下降明显
  if (product.deLimitRateChange < -3) {
    const avgDeLimitRate = provinceDetails.reduce((sum, p) => sum + p.deLimitRate, 0) / provinceDetails.length;
    anomalies.push({
      id: `anomaly-${anomalyId++}`,
      type: 'indicator',
      severity: Math.abs(product.deLimitRateChange) > 5 ? 'high' : 'medium',
      title: '品牌整体解限率下降明显',
      description: `${product.productName}整体解限率从${(product.deLimitRate - product.deLimitRateChange).toFixed(1)}%下降至${product.deLimitRate.toFixed(1)}%，下降${Math.abs(product.deLimitRateChange).toFixed(1)}%，可能影响市场准入`,
      dataPoint: {
        label: '整体解限率',
        value: product.deLimitRate.toFixed(1),
        change: product.deLimitRateChange,
        unit: '%',
      },
      location: {},
      relatedData: [
        {
          type: '内部数据',
          source: '品牌解限率',
          value: `${product.deLimitRate}%`,
        },
        {
          type: '内部数据',
          source: '平均省份解限率',
          value: `${avgDeLimitRate.toFixed(1)}%`,
        },
      ],
    });
  }

  // 2. 分子式内份额下降
  if (product.moleculeInternalShareChange < -2) {
    anomalies.push({
      id: `anomaly-${anomalyId++}`,
      type: 'indicator',
      severity: Math.abs(product.moleculeInternalShareChange) > 3 ? 'high' : 'medium',
      title: '分子式内份额显著下降',
      description: `分子式份额上升${product.moleculeShareChange}%，但分子式内份额下降${Math.abs(product.moleculeInternalShareChange)}%，表明产品竞争力下降`,
      dataPoint: {
        label: '分子式内份额',
        value: product.moleculeInternalShare.toFixed(1),
        change: product.moleculeInternalShareChange,
        unit: '%',
      },
      location: {},
      relatedData: [
        {
          type: '外部数据',
          source: '分子式份额',
          value: `${product.moleculeShare}%`,
        },
        {
          type: '外部数据',
          source: '分子式内份额',
          value: `${product.moleculeInternalShare}%`,
        },
      ],
    });
  }

  // 3. 竞品份额上升明显
  if (product.competitorShareChange > 2) {
    anomalies.push({
      id: `anomaly-${anomalyId++}`,
      type: 'indicator',
      severity: product.competitorShareChange > 3 ? 'high' : 'medium',
      title: '竞品份额上升明显',
      description: `竞品份额从${(product.competitorShare - product.competitorShareChange).toFixed(1)}%上升至${product.competitorShare}%，上升${product.competitorShareChange.toFixed(1)}%，竞争加剧`,
      dataPoint: {
        label: '竞品份额',
        value: product.competitorShare.toFixed(1),
        change: product.competitorShareChange,
        unit: '%',
      },
      location: {},
      relatedData: [
        {
          type: '外部数据',
          source: '竞品份额',
          value: `${product.competitorShare}%`,
        },
        {
          type: '外部数据',
          source: '分子式内份额',
          value: `${product.moleculeInternalShare}%`,
        },
      ],
    });
  }

  return anomalies;
}

// 生成原因深挖（下钻到省份级别）
function generateRootCauses(
  anomalies: AnomalyFinding[],
  provinceDetails: ProvinceDetailPerformance[]
): RootCauseAnalysis[] {
  const causes: RootCauseAnalysis[] = [];
  let causeId = 1;

  anomalies.forEach((anomaly) => {
    if (anomaly.type === 'indicator' && anomaly.title.includes('解限率')) {
      // 下钻到省份：找出解限率下降尤其多的省份
      const deLimitDeclineProvinces = provinceDetails
        .filter((p) => p.deLimitRate < 70 && (p.deLimitRateChange || 0) < -2)
        .sort((a, b) => a.deLimitRate - b.deLimitRate)
        .slice(0, 3);

      if (deLimitDeclineProvinces.length > 0) {
        const worstProvince = deLimitDeclineProvinces[0];
        causes.push({
          id: `cause-${causeId++}`,
          anomalyId: anomaly.id,
          cause: `${worstProvince.provinceName}解限率下降尤其多，从${(worstProvince.deLimitRate - (worstProvince.deLimitRateChange || 0)).toFixed(1)}%下降至${worstProvince.deLimitRate.toFixed(1)}%，可能由于集采政策影响、医院目录调整或竞品替代策略`,
          evidence: [
            {
              type: 'data',
              source: '省份解限率数据',
              description: `${worstProvince.provinceName}解限率${worstProvince.deLimitRate.toFixed(1)}%，下降${Math.abs(worstProvince.deLimitRateChange || 0).toFixed(1)}%`,
              dataPoint: `低于平均水平`,
            },
            {
              type: 'data',
              source: '健康度评分',
              description: `${worstProvince.provinceName}健康度评分${worstProvince.healthScore}分，低于平均水平`,
            },
            {
              type: 'external',
              source: '政策信息',
              description: '第七批国家集采可能影响该省份医院准入',
            },
          ],
          confidence: 'high',
        });

        // 如果有多个省份，也列出其他省份
        if (deLimitDeclineProvinces.length > 1) {
          const otherProvinces = deLimitDeclineProvinces.slice(1).map((p) => p.provinceName).join('、');
          causes.push({
            id: `cause-${causeId++}`,
            anomalyId: anomaly.id,
            cause: `此外，${otherProvinces}等省份也出现解限率下降，需要重点关注`,
            evidence: [
              {
                type: 'data',
                source: '省份解限率数据',
                description: `多个省份解限率低于70%`,
              },
            ],
            confidence: 'medium',
          });
        }
      }
    } else if (anomaly.type === 'indicator' && anomaly.title.includes('分子式内份额')) {
      // 下钻到省份：找出分子式内份额下降明显的省份
      const lowShareProvinces = provinceDetails
        .filter((p) => p.marketShare < 10)
        .sort((a, b) => a.marketShare - b.marketShare)
        .slice(0, 3);

      if (lowShareProvinces.length > 0) {
        causes.push({
          id: `cause-${causeId++}`,
          anomalyId: anomaly.id,
          cause: `分子式内份额下降主要集中在${lowShareProvinces.map((p) => p.provinceName).join('、')}等省份，这些省份市场份额较低，可能由于价格策略、渠道覆盖或品牌影响力问题`,
          evidence: [
            {
              type: 'data',
              source: '省份市场份额',
              description: `${lowShareProvinces.map((p) => `${p.provinceName}${p.marketShare.toFixed(1)}%`).join('、')}`,
            },
            {
              type: 'external',
              source: '市场分析',
              description: '竞品可能在这些省份采取了更激进的定价或推广策略',
            },
          ],
          confidence: 'high',
        });
      }
    } else if (anomaly.type === 'indicator' && anomaly.title.includes('竞品份额')) {
      causes.push({
        id: `cause-${causeId++}`,
        anomalyId: anomaly.id,
        cause: '竞品份额上升可能由于竞品采取了更激进的定价策略、加强了学术推广或提升了渠道覆盖',
        evidence: [
          {
            type: 'data',
            source: '市场份额数据',
            description: `竞品份额上升${anomaly.dataPoint.change?.toFixed(1) || 0}%`,
          },
          {
            type: 'external',
            source: '竞品动态',
            description: '竞品可能加大了市场投入和推广力度',
          },
        ],
        confidence: 'medium',
      });
    }
  });

  // 识别高潜医院整体表现不佳的省份
  provinceDetails.forEach((province) => {
    const highPotentialHospitals = province.hospitals.filter((h) => h.type === 'highPotential');
    if (highPotentialHospitals.length > 0) {
      const avgPenetration = highPotentialHospitals.reduce((sum, h) => sum + h.penetrationRate, 0) / highPotentialHospitals.length;
      const decliningCount = highPotentialHospitals.filter((h) => h.penetrationRateChange < 0).length;
      
      if (avgPenetration < 40 || decliningCount > highPotentialHospitals.length * 0.5) {
        const exampleHospitals = highPotentialHospitals
          .filter((h) => h.penetrationRate < 40)
          .slice(0, 2)
          .map((h) => h.hospitalName);

        causes.push({
          id: `cause-${causeId++}`,
          anomalyId: anomalies.find((a) => a.title.includes('解限率') || a.title.includes('份额'))?.id || '',
          cause: `${province.provinceName}高潜医院整体表现不佳，平均渗透率仅${avgPenetration.toFixed(1)}%，${decliningCount}家医院出现下降。例如：${exampleHospitals.length > 0 ? exampleHospitals.join('、') : '多家医院'}渗透率低于40%，未发挥增长潜力`,
          evidence: [
            {
              type: 'data',
              source: '高潜医院平均渗透率',
              description: `${province.provinceName}高潜医院平均渗透率${avgPenetration.toFixed(1)}%`,
            },
            {
              type: 'data',
              source: '医院示例',
              description: exampleHospitals.length > 0 ? `${exampleHospitals.join('、')}等医院渗透率低于40%` : '多家高潜医院表现不佳',
            },
            {
              type: 'internal',
              source: '资源分配',
              description: '该省份高潜医院可能未获得足够的市场投入和人员支持',
            },
          ],
          confidence: 'medium',
        });
      }
    }
  });

  return causes;
}

// 生成风险点
function generateRiskPoints(
  product: ProductPerformance,
  anomalies: AnomalyFinding[],
  _rootCauses: RootCauseAnalysis[]
): RiskPoint[] {
  const risks: RiskPoint[] = [];
  let riskId = 1;

  // 解限率风险
  const deLimitAnomalies = anomalies.filter((a) => a.title.includes('解限率'));
  if (deLimitAnomalies.length > 0) {
    risks.push({
      id: `risk-${riskId++}`,
      title: '市场准入风险：多省份解限率下降',
      severity: 'high',
      description: `${deLimitAnomalies.length}个省份出现解限率显著下降，可能影响产品市场准入和销量`,
      relatedAnomalies: deLimitAnomalies.map((a) => a.id),
      possibleCauses: [
        {
          cause: '集采政策影响导致医院目录调整',
          evidence: ['第七批国家集采政策', '医院药品目录调整通知'],
          confidence: 'high',
        },
        {
          cause: '竞品替代策略加强',
          evidence: ['竞品市场份额上升', '竞品价格优势'],
          confidence: 'medium',
        },
      ],
      solutions: {
        shortTerm: [
          '立即与解限率下降省份的医院沟通，了解具体障碍',
          '加强解限团队投入，优先解决高价值医院准入问题',
          '评估价格策略，提升产品竞争力',
        ],
        longTerm: [
          '建立更完善的医院准入监控体系',
          '加强与重点医院的长期合作关系',
          '优化产品组合，提升整体竞争力',
        ],
      },
    });
  }

  // 核心医院渗透率风险
  const coreHospitalAnomalies = anomalies.filter((a) => a.title.includes('核心医院'));
  if (coreHospitalAnomalies.length > 0) {
    risks.push({
      id: `risk-${riskId++}`,
      title: '核心医院渗透率下降风险',
      severity: 'high',
      description: `${coreHospitalAnomalies.length}家核心医院出现渗透率显著下降，可能影响整体市场份额`,
      relatedAnomalies: coreHospitalAnomalies.map((a) => a.id),
      possibleCauses: [
        {
          cause: '医生处方习惯变化',
          evidence: ['核心医院渗透率数据', '医生调研反馈'],
          confidence: 'medium',
        },
        {
          cause: '竞品学术推广加强',
          evidence: ['竞品市场活动数据', '医院学术活动记录'],
          confidence: 'medium',
        },
      ],
      solutions: {
        shortTerm: [
          '加强核心医院的学术推广活动',
          '与关键医生建立更紧密的关系',
          '提供更有针对性的产品教育',
        ],
        longTerm: [
          '建立核心医院KOL关系网络',
          '持续跟踪医生处方行为变化',
          '优化产品在核心医院的定位',
        ],
      },
    });
  }

  // 高潜医院未做好风险
  const highPotentialAnomalies = anomalies.filter((a) => a.title.includes('高潜医院'));
  if (highPotentialAnomalies.length > 0) {
    risks.push({
      id: `risk-${riskId++}`,
      title: '高潜医院增长潜力未发挥',
      severity: 'medium',
      description: `${highPotentialAnomalies.length}家高潜医院表现不佳，未发挥增长潜力`,
      relatedAnomalies: highPotentialAnomalies.map((a) => a.id),
      possibleCauses: [
        {
          cause: '资源投入不足',
          evidence: ['市场投入数据', '人员配置情况'],
          confidence: 'high',
        },
        {
          cause: '医生教育覆盖不够',
          evidence: ['学术活动数据', '医生认知调研'],
          confidence: 'medium',
        },
      ],
      solutions: {
        shortTerm: [
          '增加高潜医院的市场投入',
          '加强医生教育和学术推广',
          '优化销售团队配置',
        ],
        longTerm: [
          '建立高潜医院识别和培育机制',
          '制定针对性的市场开发策略',
          '建立长期合作关系',
        ],
      },
    });
  }

  // 分子式内份额风险
  if (product.moleculeInternalShareChange < -2) {
    risks.push({
      id: `risk-${riskId++}`,
      title: '产品竞争力下降风险',
      severity: 'high',
      description: '分子式内份额下降表明产品在同类产品中竞争力下降',
      relatedAnomalies: anomalies.filter((a) => a.title.includes('分子式内份额')).map((a) => a.id),
      possibleCauses: [
        {
          cause: '价格竞争力下降',
          evidence: ['价格对比数据', '市场份额变化'],
          confidence: 'high',
        },
        {
          cause: '渠道覆盖不足',
          evidence: ['渠道覆盖数据', '分销网络分析'],
          confidence: 'medium',
        },
      ],
      solutions: {
        shortTerm: [
          '评估并优化价格策略',
          '加强重点渠道的覆盖',
          '提升产品差异化优势',
        ],
        longTerm: [
          '建立更完善的渠道管理体系',
          '优化产品组合和定位',
          '加强品牌建设',
        ],
      },
    });
  }

  return risks;
}

// 生成宏观建议
function generateMacroRecommendations(riskPoints: RiskPoint[]): MacroRecommendation[] {
  const recommendations: MacroRecommendation[] = [];
  let recId = 1;

  const hasDeLimitRisk = riskPoints.some((r) => r.title.includes('解限率'));
  const hasPenetrationRisk = riskPoints.some((r) => r.title.includes('渗透率'));
  const hasCompetitivenessRisk = riskPoints.some((r) => r.title.includes('竞争力'));

  if (hasDeLimitRisk) {
    recommendations.push({
      id: `rec-${recId++}`,
      category: 'strategy',
      title: '建立系统化的医院准入管理体系',
      description: '针对解限率下降问题，建议建立更完善的医院准入监控、预警和应对机制，确保市场准入稳定',
      priority: 'high',
      relatedRiskPoints: riskPoints.filter((r) => r.title.includes('解限率')).map((r) => r.id),
    });
  }

  if (hasPenetrationRisk) {
    recommendations.push({
      id: `rec-${recId++}`,
      category: 'operation',
      title: '优化核心医院和高潜医院的资源配置',
      description: '基于核心医院渗透率下降和高潜医院未做好的问题，建议重新评估和优化资源配置，确保重点医院获得足够支持',
      priority: 'high',
      relatedRiskPoints: riskPoints
        .filter((r) => r.title.includes('渗透率') || r.title.includes('高潜'))
        .map((r) => r.id),
    });
  }

  if (hasCompetitivenessRisk) {
    recommendations.push({
      id: `rec-${recId++}`,
      category: 'strategy',
      title: '提升产品整体竞争力',
      description: '针对产品竞争力下降，建议从价格策略、渠道覆盖、品牌建设等多个维度全面提升产品竞争力',
      priority: 'high',
      relatedRiskPoints: riskPoints.filter((r) => r.title.includes('竞争力')).map((r) => r.id),
    });
  }

  recommendations.push({
    id: `rec-${recId++}`,
    category: 'organization',
    title: '加强数据驱动的决策机制',
    description: '建议建立更完善的数据监控和分析体系，及时发现异常值，快速响应市场变化',
    priority: 'medium',
    relatedRiskPoints: riskPoints.map((r) => r.id),
  });

  return recommendations;
}

// 摘要内容组件（使用useMemo确保内容稳定）
function SummaryContent({
  product,
  anomalies,
  rootCauses,
  riskPoints,
}: {
  product: ProductPerformance;
  anomalies: AnomalyFinding[];
  rootCauses: RootCauseAnalysis[];
  riskPoints: RiskPoint[];
}) {
  const summary = useMemo(() => {
    const overallPerformance = product.moleculeInternalShareChange < -2 
      ? `${product.productName}分子式内份额下降${Math.abs(product.moleculeInternalShareChange).toFixed(1)}%，产品竞争力下降。`
      : `${product.productName}整体表现${product.moleculeShareChange > 0 ? '稳定' : '需要关注'}。`;

    const mainRisks = anomalies.length > 0 
      ? anomalies.slice(0, 2).map((a) => a.title).join('；')
      : '暂无重大风险';

    const keyFinding = rootCauses.length > 0
      ? rootCauses[0].cause
      : '需要进一步分析';

    const suggestions = riskPoints.length > 0
      ? riskPoints[0].solutions.shortTerm.slice(0, 2).join('；')
      : '持续监控数据变化';

    return { overallPerformance, mainRisks, keyFinding, suggestions };
  }, [product, anomalies, rootCauses, riskPoints]);

  return (
    <div className="prose prose-sm max-w-none text-gray-700 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="text-sm leading-relaxed">
        <p className="mb-3">
          <strong>整体表现：</strong>
          {summary.overallPerformance}
        </p>
        <p className="mb-3">
          <strong>主要风险：</strong>
          {summary.mainRisks}
        </p>
        <p className="mb-3">
          <strong>关键发现：</strong>
          {summary.keyFinding}
        </p>
        <p>
          <strong>建议方向：</strong>
          {summary.suggestions}
        </p>
      </div>
    </div>
  );
}

