import { useState, useEffect } from 'react';
import {
  IndicatorEffectAnalysis,
  IndicatorRecommendation,
  Strategy,
} from '../../types/indicator';
import {
  getAllIndicatorEffectAnalyses,
  getIndicatorRecommendations,
  getAllStrategies,
} from '../../services/indicatorService';
import { useIndicator } from '../../contexts/IndicatorContext';
import IndicatorAdjustmentDialog from './IndicatorAdjustmentDialog';
import { CheckCircle2, XCircle, Info, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function KeyIndicatorAnalysis() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [effectAnalyses, setEffectAnalyses] = useState<IndicatorEffectAnalysis[]>([]);
  const [recommendations, setRecommendations] = useState<IndicatorRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [activeTab, setActiveTab] = useState<'effect' | 'recommendation'>('effect');
  const [showEffectDialog, setShowEffectDialog] = useState(false);
  const [showRecommendationDialog, setShowRecommendationDialog] = useState(false);

  const {
    setCachedEffectAnalysis,
    getCachedRecommendations,
    setCachedRecommendations,
  } = useIndicator();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedStrategy) {
      loadRecommendations(selectedStrategy.id, false);
    } else {
      setRecommendations([]);
    }
  }, [selectedStrategy]);

  const loadData = async (forceRefresh: boolean = false) => {
    setLoading(true);
    try {
      const strategiesData = await getAllStrategies();
      setStrategies(strategiesData);
      if (strategiesData.length > 0) {
        setSelectedStrategy(strategiesData[0]);
      }

      // 加载指标效果分析（全局缓存，使用特殊key）
      // const cacheKey = 'all-effect-analyses';
      if (!forceRefresh) {
        // 尝试从缓存加载（但这里缓存的是单个指标的分析，所以需要特殊处理）
        // 为了简化，我们直接加载所有分析，但可以优化为按需加载
      }
      
      const analyses = await getAllIndicatorEffectAnalyses();
      setEffectAnalyses(analyses);
      // 缓存每个指标的分析
      analyses.forEach((analysis) => {
        setCachedEffectAnalysis(analysis.indicatorId, analysis);
      });
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async (strategyId: string, forceRefresh: boolean = false) => {
    // 如果不需要强制刷新，先检查缓存
    if (!forceRefresh) {
      const cached = getCachedRecommendations(strategyId);
      if (cached) {
        setRecommendations(cached);
        return;
      }
    }

    setLoadingRecommendations(true);
    try {
      const recs = await getIndicatorRecommendations(strategyId);
      setRecommendations(recs);
      // 保存到缓存
      setCachedRecommendations(strategyId, recs);
    } catch (error) {
      console.error('加载指标建议失败:', error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleRefreshEffect = () => {
    setShowEffectDialog(true);
  };

  const handleRefreshRecommendations = () => {
    setShowRecommendationDialog(true);
  };

  const handleApplyEffectAdjustment = (adjustedData: IndicatorEffectAnalysis[]) => {
    setEffectAnalyses(adjustedData);
    adjustedData.forEach((analysis) => {
      setCachedEffectAnalysis(analysis.indicatorId, analysis);
    });
  };

  const handleApplyRecommendationAdjustment = (adjustedData: IndicatorRecommendation[]) => {
    if (selectedStrategy) {
      setRecommendations(adjustedData);
      setCachedRecommendations(selectedStrategy.id, adjustedData);
    }
  };

  const getImpactLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactLevelLabel = (level: string) => {
    switch (level) {
      case 'high':
        return '高影响力';
      case 'medium':
        return '中影响力';
      case 'low':
        return '低影响力';
      default:
        return level;
    }
  };

  // 准备图表数据
  const effectChartData = effectAnalyses.map((analysis) => ({
    name: analysis.indicatorName,
    影响力得分: analysis.impactScore,
    相关性: (analysis.correlationWithResult * 100).toFixed(1),
  }));

  const recommendationChartData = recommendations.map((rec) => ({
    name: rec.indicatorName,
    优先级得分: rec.priorityScore,
    策略匹配度: rec.strategyAlignment.alignmentScore,
  }));

  return (
    <div className="space-y-6">
      {/* 策略选择 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">选择策略</h3>
        <div className="flex flex-wrap gap-3">
          {strategies.map((strategy) => (
            <button
              key={strategy.id}
              onClick={() => setSelectedStrategy(strategy)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedStrategy?.id === strategy.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {strategy.name}
            </button>
          ))}
        </div>
        {selectedStrategy && (
          <div className="mt-4 p-4 bg-primary-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">策略描述：</span>
              {selectedStrategy.description}
            </p>
          </div>
        )}
      </div>

      {/* 标签页 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('effect')}
            className={clsx(
              'flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2',
              activeTab === 'effect'
                ? 'border-primary-600 text-primary-700 bg-primary-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            指标效果判断模型
          </button>
          <button
            onClick={() => setActiveTab('recommendation')}
            className={clsx(
              'flex-1 px-6 py-4 text-sm font-medium transition-colors border-b-2',
              activeTab === 'recommendation'
                ? 'border-primary-600 text-primary-700 bg-primary-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            考核指标建议报告
          </button>
        </div>

        <div className="p-6">
          {(loading || (activeTab === 'recommendation' && loadingRecommendations)) ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-4 text-sm text-gray-600">分析中...</p>
            </div>
          ) : activeTab === 'effect' ? (
            <div className="space-y-6">
              {/* 指标效果分析概览 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      指标效果分析概览
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      基于过往指标表现及结果数据（多年/多季度，分省），分析各指标变动的影响力
                    </p>
                  </div>
                  <button
                    onClick={handleRefreshEffect}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-primary-700 bg-white hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-primary-200"
                    title="换一批分析结果"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>换一批</span>
                  </button>
                </div>
                {effectAnalyses.length > 0 && (
                  <div className="mb-4 flex items-center space-x-2 text-xs text-gray-500">
                    <span>•</span>
                    <span>已缓存AI分析结果，点击"换一批"可重新生成</span>
                  </div>
                )}

                {/* 图表 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">影响力得分</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={effectChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="影响力得分" fill="#0ea5e9" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-4">与结果指标相关性</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={effectChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="相关性" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 详细分析列表 */}
                <div className="space-y-4">
                  {effectAnalyses.map((analysis) => (
                    <div
                      key={analysis.indicatorId}
                      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">
                            {analysis.indicatorName}
                          </h4>
                          <div className="flex items-center space-x-3">
                            <span
                              className={clsx(
                                'px-3 py-1 text-sm font-medium rounded-full border',
                                getImpactLevelColor(analysis.impactLevel)
                              )}
                            >
                              {getImpactLevelLabel(analysis.impactLevel)}
                            </span>
                            <span className="text-sm text-gray-600">
                              影响力得分：<span className="font-semibold">{analysis.impactScore}</span>
                            </span>
                            <span className="text-sm text-gray-600">
                              相关性：<span className="font-semibold">
                                {(analysis.correlationWithResult * 100).toFixed(1)}%
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 历史趋势 */}
                      {analysis.historicalTrend.length > 0 && (
                        <div className="mb-4">
                          <h5 className="text-sm font-semibold text-gray-700 mb-2">历史趋势</h5>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <ResponsiveContainer width="100%" height={200}>
                              <LineChart
                                data={analysis.historicalTrend.map((ht) => ({
                                  period: ht.period,
                                  平均值: ht.avgValue,
                                  方差: ht.variance,
                                }))}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="平均值" stroke="#0ea5e9" />
                                <Line type="monotone" dataKey="方差" stroke="#10b981" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* 影响因素 */}
                      <div className="mb-4">
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">影响因素</h5>
                        <div className="space-y-2">
                          {analysis.influencingFactors.map((factor, index) => (
                            <div key={index} className="flex items-start space-x-2">
                              <div className="flex-1 bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-gray-900">
                                    {factor.factor}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    影响程度：{(factor.impact * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600">{factor.evidence}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 建议 */}
                      <div className="bg-primary-50 rounded-lg p-4">
                        <div className="flex items-start space-x-2">
                          <Info className="w-5 h-5 text-primary-600 mt-0.5" />
                          <div>
                            <h5 className="text-sm font-semibold text-primary-900 mb-1">分析建议</h5>
                            <p className="text-sm text-primary-800">{analysis.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 考核指标建议 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">考核指标建议</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      基于公司最新策略、指标效果判断模型输出内容，AI从指标长清单中挑选合适的3-4个指标，并解释各指标的优劣之处
                    </p>
                  </div>
                  {selectedStrategy && (
                    <button
                      onClick={handleRefreshRecommendations}
                      disabled={loadingRecommendations}
                      className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-primary-700 bg-white hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-primary-200"
                      title="换一批建议"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingRecommendations ? 'animate-spin' : ''}`} />
                      <span>换一批</span>
                    </button>
                  )}
                </div>
                {selectedStrategy && getCachedRecommendations(selectedStrategy.id) && (
                  <div className="mb-4 flex items-center space-x-2 text-xs text-gray-500">
                    <span>•</span>
                    <span>已缓存AI建议结果，点击"换一批"可重新生成</span>
                  </div>
                )}

                {!selectedStrategy ? (
                  <div className="p-12 text-center bg-gray-50 rounded-lg">
                    <p className="text-gray-500">请先选择策略</p>
                  </div>
                ) : recommendations.length === 0 ? (
                  <div className="p-12 text-center bg-gray-50 rounded-lg">
                    <p className="text-gray-500">暂无建议，请稍后再试</p>
                  </div>
                ) : (
                  <>
                    {/* 图表 */}
                    <div className="mb-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4">指标优先级对比</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={recommendationChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="优先级得分" fill="#0ea5e9" />
                            <Bar dataKey="策略匹配度" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 建议列表 */}
                    <div className="space-y-4">
                      {recommendations.map((rec, index) => (
                        <div
                          key={rec.indicatorId}
                          className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="text-lg font-semibold text-gray-900">
                                  {index + 1}. {rec.indicatorName}
                                </span>
                                <span
                                  className={clsx(
                                    'px-2 py-1 text-xs font-medium rounded-full',
                                    rec.category === 'result'
                                      ? 'bg-blue-100 text-blue-800'
                                      : rec.category === 'process'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-gray-100 text-gray-800'
                                  )}
                                >
                                  {rec.category === 'result'
                                    ? '结果指标'
                                    : rec.category === 'process'
                                    ? '过程指标'
                                    : rec.category}
                                </span>
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span>
                                  优先级得分：<span className="font-semibold">{rec.priorityScore}</span>
                                </span>
                                <span>
                                  策略匹配度：<span className="font-semibold">
                                    {rec.strategyAlignment.alignmentScore}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 优势 */}
                          <div className="mb-4">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
                              优势
                            </h5>
                            <ul className="space-y-1">
                              {rec.advantages.map((adv, i) => (
                                <li key={i} className="text-sm text-gray-600 flex items-start">
                                  <span className="text-green-600 mr-2">•</span>
                                  <span>{adv}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* 劣势 */}
                          <div className="mb-4">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                              <XCircle className="w-4 h-4 text-red-600 mr-2" />
                              劣势
                            </h5>
                            <ul className="space-y-1">
                              {rec.disadvantages.map((dis, i) => (
                                <li key={i} className="text-sm text-gray-600 flex items-start">
                                  <span className="text-red-600 mr-2">•</span>
                                  <span>{dis}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* 适用场景 */}
                          <div className="mb-4">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">适用场景</h5>
                            <div className="flex flex-wrap gap-2">
                              {rec.applicableScenarios.map((scenario, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                                >
                                  {scenario}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* 策略关联 */}
                          <div className="bg-primary-50 rounded-lg p-4">
                            <h5 className="text-sm font-semibold text-primary-900 mb-2">
                              与策略的关联
                            </h5>
                            <p className="text-sm text-primary-800">
                              {rec.strategyAlignment.reasoning}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 调整对话对话框 */}
      <IndicatorAdjustmentDialog
        isOpen={showEffectDialog}
        onClose={() => setShowEffectDialog(false)}
        title="调整指标效果分析"
        currentData={effectAnalyses}
        dataType="effectAnalysis"
        onApply={handleApplyEffectAdjustment}
      />

      {selectedStrategy && (
        <IndicatorAdjustmentDialog
          isOpen={showRecommendationDialog}
          onClose={() => setShowRecommendationDialog(false)}
          title="调整考核指标建议"
          currentData={recommendations}
          dataType="recommendations"
          onApply={handleApplyRecommendationAdjustment}
          context={{ strategyId: selectedStrategy.id }}
        />
      )}
    </div>
  );
}

