import { useState, useEffect, useMemo, useRef } from 'react';
import { ProductPerformance } from '../types';
import {
  AnomalyFinding,
  MacroRecommendation,
  ProvinceDetailPerformance,
} from '../types/analysis';
import { generateProvinceDetailData } from '../data/hospitalMockData';
import { mockProvincePerformance } from '../data/mockData';
import {
  AlertTriangle,
  MapPin,
  MessageCircle,
  ExternalLink,
  Database,
} from 'lucide-react';
import { clsx } from 'clsx';
import { AIAnalysis } from '../types';
import InlineAIChat from './InlineAIChat';

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
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showChatButton, setShowChatButton] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatPosition, setChatPosition] = useState<{ top: number; left: number } | null>(null);
  const selectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const anomalySectionRef = useRef<HTMLDivElement>(null);
  const summarySectionRef = useRef<HTMLDivElement>(null);

  // 使用useMemo缓存数据，避免每次渲染都重新生成
  const provinceDetails = useMemo(
    () => mockProvincePerformance.map((p) => generateProvinceDetailData(p)),
    []
  );

  // 生成异常数据解读（合并了原因深挖和风险点提炼）
  const anomalies = useMemo(
    () => generateAnomaliesWithCausesAndRisks(product, provinceDetails),
    [product, provinceDetails]
  );

  // 分离全国共性和部分省份预警
  const nationalAnomalies = useMemo(
    () => anomalies.filter((a) => a.category === 'national'),
    [anomalies]
  );

  const provinceAnomalies = useMemo(
    () => anomalies.filter((a) => a.category === 'province'),
    [anomalies]
  );

  // 生成宏观建议
  const macroRecommendations = useMemo(
    () => generateMacroRecommendations(anomalies),
    [anomalies]
  );

  // 处理文本选择（防抖处理，避免频繁更新）
  const handleTextSelection = () => {
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }
    
    selectionTimeoutRef.current = setTimeout(() => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && selection.toString().trim().length > 0) {
        const selected = selection.toString().trim();
        const range = selection.getRangeAt(0);
        
        // 确定选中文本所在的板块 - 使用最简单直接的方法
        let section: string | null = null;
        
        // 获取选中区域的共同祖先容器
        const commonAncestor = range.commonAncestorContainer;
        
        // 检查共同祖先是否在某个板块内
        const checkInSection = (sectionRef: React.RefObject<HTMLDivElement>): boolean => {
          if (!sectionRef.current) return false;
          // 检查共同祖先是否是section的子元素
          return sectionRef.current.contains(commonAncestor as Node);
        };
        
        // 优先检查异常数据解读板块
        if (checkInSection(anomalySectionRef)) {
          section = 'anomaly';
        } else if (checkInSection(summarySectionRef)) {
          section = 'summary';
        }
        
        if (section) {
          setSelectedText(selected);
          setSelectedSection(section);
          setShowChatButton(true);
        } else {
          setSelectedText('');
          setSelectedSection(null);
          setShowChatButton(false);
        }
      } else {
        if (selectedText !== '') {
          setSelectedText('');
          setSelectedSection(null);
          setShowChatButton(false);
          setShowChat(false);
        }
      }
    }, 100); // 减少防抖时间到100ms，提高响应速度
  };

  // 处理点击追问按钮
  const handleAskQuestion = () => {
    if (!selectedSection || !selectedText) return;
    
    const sectionRef = selectedSection === 'anomaly' ? anomalySectionRef : summarySectionRef;
    if (sectionRef.current) {
      const rect = sectionRef.current.getBoundingClientRect();
      
      // 在板块内右上方显示对话窗口（相对于视口）
      setChatPosition({
        top: rect.top + 60, // 距离板块顶部60px
        left: Math.min(rect.right - 400, rect.left + 20), // 尽量靠右，但至少距离左边缘20px
      });
      setShowChat(true);
    }
  };

  // 处理鼠标抬起事件（用于文本选择）
  const handleMouseUp = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // 如果点击在对话框内，不处理文本选择
    const chatPanel = target.closest('[data-ai-chat-panel="true"]');
    if (chatPanel) {
      return;
    }
    handleTextSelection();
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mouseup', handleMouseUp);
      
      // 点击外部区域时清除选择（延迟执行，避免与文本选择冲突）
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        
        // 如果点击的是追问按钮，不清除选择
        if (target.closest('button') && target.closest('button')?.textContent?.includes('追问')) {
          return;
        }
        
        // 如果点击的是AI对话面板内的任何元素，不清除选择
        const chatPanel = target.closest('[data-ai-chat-panel="true"]');
        if (chatPanel) {
          e.stopPropagation(); // 阻止事件冒泡
          return; // 点击在对话框内，不执行任何清除操作
        }
        
        // 如果对话框已打开，点击对话框外部也不清除（让用户通过关闭按钮关闭）
        if (showChat) {
          return; // 对话框打开时，不自动清除，让用户手动关闭
        }
        
        setTimeout(() => {
          const selection = window.getSelection();
          // 如果点击在容器外部，或者没有选中文本，则清除
          if (container && !container.contains(e.target as Node) && (!selection || selection.toString().trim().length === 0)) {
            setSelectedText('');
            setSelectedSection(null);
            setShowChatButton(false);
            setShowChat(false);
            if (selection) {
              selection.removeAllRanges();
            }
          }
        }, 300);
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        container.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mousedown', handleClickOutside);
        if (selectionTimeoutRef.current) {
          clearTimeout(selectionTimeoutRef.current);
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showChat]); // 添加showChat作为依赖，确保对话框状态更新时重新绑定事件

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
    <div ref={containerRef} className="space-y-6 relative">
      {/* 异常数据解读 - 默认展开 */}
      <div ref={anomalySectionRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-orange-500" />
            <h3 className="text-xl font-bold text-gray-900">异常数据解读</h3>
          </div>
          {showChatButton && selectedSection === 'anomaly' && selectedText && (
            <button
              onClick={handleAskQuestion}
              className="flex items-center space-x-2 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors shadow-sm z-10"
            >
              <MessageCircle className="w-4 h-4" />
              <span>追问</span>
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-6">
          基于具体数据下钻分析，识别异常值、深挖原因、提炼风险点并提供解决方案
        </p>

        {/* 全国共性 */}
        {nationalAnomalies.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              全国共性
            </h4>
            <div className="space-y-4">
              {nationalAnomalies.map((anomaly) => (
                <AnomalyCard key={anomaly.id} anomaly={anomaly} />
              ))}
            </div>
          </div>
        )}

        {/* 部分省份预警 */}
        {provinceAnomalies.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
              部分省份预警
            </h4>
            <div className="space-y-4">
              {provinceAnomalies.map((anomaly) => (
                <AnomalyCard key={anomaly.id} anomaly={anomaly} />
              ))}
            </div>
          </div>
        )}

        {anomalies.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            暂无异常数据
          </div>
        )}
      </div>

      {/* AI总结分析 */}
      <div ref={summarySectionRef} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-6 h-6 text-primary-500" />
            <h3 className="text-xl font-bold text-gray-900">AI总结分析</h3>
          </div>
          {showChatButton && selectedSection === 'summary' && selectedText && (
            <button
              onClick={handleAskQuestion}
              className="flex items-center space-x-2 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors shadow-sm z-10"
            >
              <MessageCircle className="w-4 h-4" />
              <span>追问</span>
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 mb-4">
          基于整体数据表现，提供战略层面的综合分析与建议
        </p>
        
        <SummaryContent
          product={product}
          anomalies={anomalies}
          macroRecommendations={macroRecommendations}
        />
      </div>

      {/* 内联AI对话面板 */}
      {showChat && selectedText && chatPosition && (
        <InlineAIChat
          selectedText={selectedText}
          position={chatPosition}
          context={{ product, analysis }}
          onClose={() => {
            setShowChat(false);
            setSelectedText('');
            setSelectedSection(null);
            setShowChatButton(false);
            setChatPosition(null);
            // 清空选择
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}
    </div>
  );
}

// 异常数据卡片组件
function AnomalyCard({ anomaly }: { anomaly: AnomalyFinding }) {
  return (
    <div
      className={clsx(
        'border rounded-lg p-5 select-text',
        anomaly.severity === 'high'
          ? 'border-red-300 bg-red-50'
          : anomaly.severity === 'medium'
          ? 'border-orange-300 bg-orange-50'
          : 'border-yellow-300 bg-yellow-50'
      )}
    >
      <div className="flex items-start justify-between mb-3">
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
          <p className="text-sm text-gray-700 mb-3">{anomaly.description}</p>
          <div className="flex items-center space-x-4 text-xs text-gray-600 mb-3">
            {anomaly.location.province && (
              <span className="flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>{anomaly.location.province}</span>
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
      </div>

      {/* 相关数据 */}
      {anomaly.relatedData.length > 0 && (
        <div className="mb-4">
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
      )}

      {/* 可能原因（合并的原因深挖内容） */}
      {anomaly.possibleCauses && anomaly.possibleCauses.length > 0 && (
        <div className="mb-4 border-t pt-4">
          <h5 className="text-sm font-semibold text-gray-700 mb-2">可能原因</h5>
          <div className="space-y-3">
            {anomaly.possibleCauses.map((cause, index) => (
              <div
                key={index}
                className="bg-blue-50 border border-blue-200 rounded-lg p-3"
              >
                <p className="text-sm text-gray-800 mb-2">{cause.cause}</p>
                <div className="space-y-2">
                  {cause.evidence.map((evidence, evIndex) => (
                    <div
                      key={evIndex}
                      className="flex items-start space-x-2 text-xs bg-white p-2 rounded border border-blue-100"
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
      )}

      {/* 风险提示（合并的风险点提炼内容） */}
      {anomaly.riskImplications && (
        <div className="border-t pt-4">
          <h5 className="text-sm font-semibold text-gray-700 mb-2">风险提示</h5>
          <p className="text-sm text-gray-700 mb-3">{anomaly.riskImplications.riskDescription}</p>
          <div>
            <span
              className={clsx(
                'text-xs px-2 py-1 rounded-full',
                anomaly.riskImplications.riskLevel === 'high'
                  ? 'bg-red-200 text-red-800'
                  : anomaly.riskImplications.riskLevel === 'medium'
                  ? 'bg-orange-200 text-orange-800'
                  : 'bg-yellow-200 text-yellow-800'
              )}
            >
              {anomaly.riskImplications.riskLevel === 'high' ? '高风险' : anomaly.riskImplications.riskLevel === 'medium' ? '中风险' : '低风险'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// 生成异常数据（合并原因深挖和风险点提炼）
function generateAnomaliesWithCausesAndRisks(
  product: ProductPerformance,
  provinceDetails: ProvinceDetailPerformance[]
): AnomalyFinding[] {
  const anomalies: AnomalyFinding[] = [];
  let anomalyId = 1;

  // 1. 品牌整体解限率下降明显（全国共性）
  if (product.deLimitRateChange < -3) {
    const avgDeLimitRate = provinceDetails.reduce((sum, p) => sum + p.deLimitRate, 0) / provinceDetails.length;
    const deLimitDeclineProvinces = provinceDetails
      .filter((p) => p.deLimitRate < 70 && (p.deLimitRateChange || 0) < -2)
      .sort((a, b) => a.deLimitRate - b.deLimitRate)
      .slice(0, 3);

    anomalies.push({
      id: `anomaly-${anomalyId++}`,
      type: 'indicator',
      category: 'national',
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
      possibleCauses: deLimitDeclineProvinces.length > 0 ? [
        {
          cause: `${deLimitDeclineProvinces[0].provinceName}解限率下降尤其多，从${(deLimitDeclineProvinces[0].deLimitRate - (deLimitDeclineProvinces[0].deLimitRateChange || 0)).toFixed(1)}%下降至${deLimitDeclineProvinces[0].deLimitRate.toFixed(1)}%，可能由于集采政策影响、医院目录调整或竞品替代策略`,
          evidence: [
            {
              type: 'data' as const,
              source: '省份解限率数据',
              description: `${deLimitDeclineProvinces[0].provinceName}解限率${deLimitDeclineProvinces[0].deLimitRate.toFixed(1)}%，下降${Math.abs(deLimitDeclineProvinces[0].deLimitRateChange || 0).toFixed(1)}%`,
              dataPoint: '低于平均水平',
            },
            {
              type: 'data' as const,
              source: '健康度评分',
              description: `${deLimitDeclineProvinces[0].provinceName}健康度评分${deLimitDeclineProvinces[0].healthScore}分，低于平均水平`,
            },
            {
              type: 'external' as const,
              source: '政策信息',
              description: '第七批国家集采可能影响该省份医院准入',
            },
          ],
          confidence: 'high' as const,
        },
      ] : undefined,
      riskImplications: {
        riskLevel: Math.abs(product.deLimitRateChange) > 5 ? 'high' : 'medium',
        riskDescription: '多省份出现解限率显著下降，可能影响产品市场准入和销量',
        suggestedActions: {
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
      },
    });

    // 注意：解限率下降问题已在全国共性中深挖，不在部分省份预警中重复
  }

  // 2. 分子式内份额下降（全国共性）
  if (product.moleculeInternalShareChange < -2) {
    const lowShareProvinces = provinceDetails
      .filter((p) => p.marketShare < 10)
      .sort((a, b) => a.marketShare - b.marketShare)
      .slice(0, 3);

    anomalies.push({
      id: `anomaly-${anomalyId++}`,
      type: 'indicator',
      category: 'national',
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
      possibleCauses: lowShareProvinces.length > 0 ? [
        {
          cause: `分子式内份额下降主要集中在${lowShareProvinces.map((p) => p.provinceName).join('、')}等省份，这些省份市场份额较低，可能由于价格策略、渠道覆盖或品牌影响力问题`,
          evidence: [
            {
              type: 'data' as const,
              source: '省份市场份额',
              description: `${lowShareProvinces.map((p) => `${p.provinceName}${p.marketShare.toFixed(1)}%`).join('、')}`,
            },
            {
              type: 'external' as const,
              source: '市场分析',
              description: '竞品可能在这些省份采取了更激进的定价或推广策略',
            },
          ],
          confidence: 'high' as const,
        },
      ] : undefined,
      riskImplications: {
        riskLevel: Math.abs(product.moleculeInternalShareChange) > 3 ? 'high' : 'medium',
        riskDescription: '分子式内份额下降表明产品在同类产品中竞争力下降',
        suggestedActions: {
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
      },
    });
  }

  // 3. 竞品份额上升明显（全国共性）
  if (product.competitorShareChange > 2) {
    anomalies.push({
      id: `anomaly-${anomalyId++}`,
      type: 'indicator',
      category: 'national',
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
      possibleCauses: [
        {
          cause: '竞品份额上升可能由于竞品采取了更激进的定价策略、加强了学术推广或提升了渠道覆盖',
          evidence: [
            {
              type: 'data' as const,
              source: '市场份额数据',
              description: `竞品份额上升${product.competitorShareChange.toFixed(1)}%`,
            },
            {
              type: 'external' as const,
              source: '竞品动态',
              description: '竞品可能加大了市场投入和推广力度',
            },
          ],
          confidence: 'medium' as const,
        },
      ],
      riskImplications: {
        riskLevel: product.competitorShareChange > 3 ? 'high' : 'medium',
        riskDescription: '竞品份额上升表明市场竞争加剧，需要加强应对措施',
        suggestedActions: {
          shortTerm: [
            '分析竞品策略，制定针对性应对方案',
            '加强产品差异化优势宣传',
            '优化价格策略',
          ],
          longTerm: [
            '建立竞品监控体系',
            '加强品牌建设和市场投入',
            '优化产品组合',
          ],
        },
      },
    });
  }

  // 部分省份预警 - 关注不同的思考框架，不重复全国共性的问题
  // 1. 高潜医院做的有问题
  provinceDetails.forEach((province) => {
    const highPotentialHospitals = province.hospitals.filter((h) => h.type === 'highPotential');
    if (highPotentialHospitals.length > 0) {
      const avgPenetration = highPotentialHospitals.reduce((sum, h) => sum + h.penetrationRate, 0) / highPotentialHospitals.length;
      const decliningCount = highPotentialHospitals.filter((h) => h.penetrationRateChange < -2).length;
      const lowPenetrationCount = highPotentialHospitals.filter((h) => h.penetrationRate < 40).length;
      
      if (avgPenetration < 40 || decliningCount > highPotentialHospitals.length * 0.4 || lowPenetrationCount > highPotentialHospitals.length * 0.5) {
        anomalies.push({
          id: `anomaly-${anomalyId++}`,
          type: 'hospital',
          category: 'province',
          severity: avgPenetration < 35 || decliningCount > highPotentialHospitals.length * 0.6 ? 'high' : 'medium',
          title: `${province.provinceName}高潜医院表现不佳`,
          description: `${province.provinceName}高潜医院平均渗透率仅${avgPenetration.toFixed(1)}%，未发挥增长潜力`,
          dataPoint: {
            label: '高潜医院平均渗透率',
            value: avgPenetration.toFixed(1),
            change: decliningCount > 0 ? -((decliningCount / highPotentialHospitals.length) * 100) : 0,
            unit: '%',
          },
          location: {
            province: province.provinceName,
          },
          relatedData: [
            {
              type: '内部数据',
              source: '高潜医院平均渗透率',
              value: `${avgPenetration.toFixed(1)}%`,
            },
          ],
          possibleCauses: [
            {
              cause: '高潜医院可能未获得足够的市场投入和人员支持，或医生教育覆盖不够',
              evidence: [
                {
                  type: 'data' as const,
                  source: '高潜医院渗透率数据',
                  description: `${province.provinceName}高潜医院平均渗透率${avgPenetration.toFixed(1)}%，低于目标水平`,
                },
                {
                  type: 'internal' as const,
                  source: '资源分配',
                  description: '该省份高潜医院可能未获得足够的市场投入和人员支持',
                },
                {
                  type: 'internal' as const,
                  source: '医生教育',
                  description: '医生教育覆盖可能不够，影响高潜医院的产品认知和处方习惯',
                },
              ],
              confidence: 'high' as const,
            },
          ],
          riskImplications: {
            riskLevel: avgPenetration < 35 || decliningCount > highPotentialHospitals.length * 0.6 ? 'high' : 'medium',
            riskDescription: '高潜医院增长潜力未发挥，可能影响整体市场份额提升',
            suggestedActions: {
              shortTerm: [
                '增加高潜医院的市场投入和人员配置',
                '加强医生教育和学术推广活动',
                '优化销售团队在高潜医院的覆盖',
              ],
              longTerm: [
                '建立高潜医院识别和培育机制',
                '制定针对性的市场开发策略',
                '建立长期合作关系和KOL网络',
              ],
            },
          },
        });
      }
    }
  });

  // 2. 核心影响型医院份额没做高
  provinceDetails.forEach((province) => {
    const coreHospitals = province.hospitals.filter((h) => h.type === 'core');
    if (coreHospitals.length > 0) {
      const avgMarketShare = coreHospitals.reduce((sum, h) => sum + h.marketShare, 0) / coreHospitals.length;
      const decliningCount = coreHospitals.filter((h) => h.marketShareChange < -1).length;
      const lowShareCount = coreHospitals.filter((h) => h.marketShare < province.marketShare * 0.8).length;
      
      if (avgMarketShare < province.marketShare * 0.8 || decliningCount > coreHospitals.length * 0.4 || lowShareCount > coreHospitals.length * 0.5) {
        anomalies.push({
          id: `anomaly-${anomalyId++}`,
          type: 'hospital',
          category: 'province',
          severity: avgMarketShare < province.marketShare * 0.7 || decliningCount > coreHospitals.length * 0.6 ? 'high' : 'medium',
          title: `${province.provinceName}核心医院份额未达预期`,
          description: `${province.provinceName}核心医院平均市场份额${avgMarketShare.toFixed(1)}%，低于省份平均水平${province.marketShare.toFixed(1)}%`,
          dataPoint: {
            label: '核心医院平均市场份额',
            value: avgMarketShare.toFixed(1),
            change: decliningCount > 0 ? -((decliningCount / coreHospitals.length) * 100) : 0,
            unit: '%',
          },
          location: {
            province: province.provinceName,
          },
          relatedData: [
            {
              type: '内部数据',
              source: '核心医院平均市场份额',
              value: `${avgMarketShare.toFixed(1)}%`,
            },
            {
              type: '内部数据',
              source: '省份平均市场份额',
              value: `${province.marketShare.toFixed(1)}%`,
            },
          ],
          possibleCauses: [
            {
              cause: '核心医院可能未获得足够的学术推广支持，或医生处方习惯发生变化',
              evidence: [
                {
                  type: 'data' as const,
                  source: '核心医院市场份额数据',
                  description: `${province.provinceName}核心医院平均市场份额${avgMarketShare.toFixed(1)}%，低于省份平均水平`,
                },
                {
                  type: 'internal' as const,
                  source: '学术推广',
                  description: '核心医院可能未获得足够的学术推广活动支持',
                },
                {
                  type: 'external' as const,
                  source: '医生行为',
                  description: '医生处方习惯可能发生变化，或竞品加强了核心医院的推广',
                },
              ],
              confidence: 'medium' as const,
            },
          ],
          riskImplications: {
            riskLevel: avgMarketShare < province.marketShare * 0.7 || decliningCount > coreHospitals.length * 0.6 ? 'high' : 'medium',
            riskDescription: '核心医院份额未达预期，可能影响整体市场份额和品牌影响力',
            suggestedActions: {
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
          },
        });
      }
    }
  });

  // 3. 零售渠道份额在跌（模拟数据，基于市场份额变化推断）
  provinceDetails.forEach((province) => {
    // 假设零售渠道份额下降可以通过整体市场份额下降且非医院渠道表现不佳来推断
    if (province.marketShareChange && province.marketShareChange < -1 && province.marketShare < 8) {
      anomalies.push({
        id: `anomaly-${anomalyId++}`,
        type: 'indicator',
        category: 'province',
        severity: province.marketShareChange < -2 ? 'high' : 'medium',
        title: `${province.provinceName}零售渠道份额下降`,
        description: `${province.provinceName}整体市场份额下降${Math.abs(province.marketShareChange || 0).toFixed(1)}%，零售渠道份额可能同步下降，需要关注非医院渠道表现`,
        dataPoint: {
          label: '省份市场份额',
          value: province.marketShare.toFixed(1),
          change: province.marketShareChange || 0,
          unit: '%',
        },
        location: {
          province: province.provinceName,
        },
        relatedData: [
          {
            type: '外部数据',
            source: '省份市场份额',
            value: `${province.marketShare.toFixed(1)}%`,
          },
          {
            type: '内部数据',
            source: '市场份额变化',
            value: `${province.marketShareChange?.toFixed(1) || 0}%`,
          },
        ],
        possibleCauses: [
          {
            cause: '零售渠道可能面临价格竞争加剧、渠道覆盖不足或消费者认知度下降等问题',
            evidence: [
              {
                type: 'data' as const,
                source: '市场份额数据',
                description: `${province.provinceName}市场份额下降${Math.abs(province.marketShareChange || 0).toFixed(1)}%`,
              },
              {
                type: 'external' as const,
                source: '渠道分析',
                description: '零售渠道可能面临价格竞争加剧或渠道覆盖不足',
              },
              {
                type: 'internal' as const,
                source: '消费者认知',
                description: '消费者对产品的认知度可能下降，或竞品加强了零售渠道推广',
              },
            ],
            confidence: 'medium' as const,
          },
        ],
        riskImplications: {
          riskLevel: province.marketShareChange && province.marketShareChange < -2 ? 'high' : 'medium',
          riskDescription: '零售渠道份额下降可能影响整体市场覆盖和销量增长',
          suggestedActions: {
            shortTerm: [
              '评估零售渠道价格策略，提升竞争力',
              '加强零售渠道覆盖和终端推广',
              '提升消费者对产品的认知度',
            ],
            longTerm: [
              '建立更完善的零售渠道管理体系',
              '优化零售渠道合作伙伴关系',
              '加强品牌建设和市场教育',
            ],
          },
        },
      });
    }
  });

  return anomalies;
}

// 生成宏观建议
function generateMacroRecommendations(anomalies: AnomalyFinding[]): MacroRecommendation[] {
  const recommendations: MacroRecommendation[] = [];
  let recId = 1;

  const hasDeLimitAnomaly = anomalies.some((a) => a.title.includes('解限率'));
  const hasShareAnomaly = anomalies.some((a) => a.title.includes('份额'));
  const hasCompetitorAnomaly = anomalies.some((a) => a.title.includes('竞品'));

  if (hasDeLimitAnomaly) {
    recommendations.push({
      id: `rec-${recId++}`,
      category: 'strategy',
      title: '建立系统化的医院准入管理体系',
      description: '针对解限率下降问题，建议建立更完善的医院准入监控、预警和应对机制，确保市场准入稳定',
      priority: 'high',
      relatedRiskPoints: [],
    });
  }

  if (hasShareAnomaly) {
    recommendations.push({
      id: `rec-${recId++}`,
      category: 'strategy',
      title: '提升产品整体竞争力',
      description: '针对产品竞争力下降，建议从价格策略、渠道覆盖、品牌建设等多个维度全面提升产品竞争力',
      priority: 'high',
      relatedRiskPoints: [],
    });
  }

  if (hasCompetitorAnomaly) {
    recommendations.push({
      id: `rec-${recId++}`,
      category: 'operation',
      title: '加强竞品监控与应对',
      description: '建立完善的竞品监控体系，及时了解竞品动态，制定针对性应对策略',
      priority: 'high',
      relatedRiskPoints: [],
    });
  }

  recommendations.push({
    id: `rec-${recId++}`,
    category: 'organization',
    title: '加强数据驱动的决策机制',
    description: '建议建立更完善的数据监控和分析体系，及时发现异常值，快速响应市场变化',
    priority: 'medium',
    relatedRiskPoints: [],
  });

  return recommendations;
}

// 摘要内容组件（使用useMemo确保内容稳定）
function SummaryContent({
  product,
  anomalies,
  macroRecommendations,
}: {
  product: ProductPerformance;
  anomalies: AnomalyFinding[];
  macroRecommendations: MacroRecommendation[];
}) {
  const summary = useMemo(() => {
    const overallPerformance = product.moleculeInternalShareChange < -2 
      ? `${product.productName}在${product.period}的表现显示，分子式内份额下降${Math.abs(product.moleculeInternalShareChange).toFixed(1)}%，产品竞争力面临挑战。`
      : `${product.productName}在${product.period}的整体表现${product.moleculeShareChange > 0 ? '保持稳定' : '需要持续关注'}。`;

    const strategicInsights = anomalies.length > 0
      ? `从数据层面看，共识别出${anomalies.length}个异常数据点，主要集中在${anomalies.filter(a => a.category === 'national').length > 0 ? '全国性' : ''}${anomalies.filter(a => a.category === 'province').length > 0 ? '和部分省份' : ''}层面。`
      : '当前数据表现相对稳定，未发现重大异常。';

    const keyRecommendations = macroRecommendations.length > 0
      ? macroRecommendations.slice(0, 2).map((r) => r.title).join('；')
      : '持续监控数据变化，保持现有策略执行。';

    return { overallPerformance, strategicInsights, keyRecommendations };
  }, [product, anomalies, macroRecommendations]);

  return (
    <div className="prose prose-sm max-w-none text-gray-700 bg-blue-50 border border-blue-200 rounded-lg p-4 select-text">
      <div className="text-sm leading-relaxed">
        <p className="mb-3">
          <strong>整体评估：</strong>
          {summary.overallPerformance}
        </p>
        <p className="mb-3">
          <strong>战略洞察：</strong>
          {summary.strategicInsights}
        </p>
        <p>
          <strong>核心建议：</strong>
          {summary.keyRecommendations}
        </p>
      </div>
    </div>
  );
}
