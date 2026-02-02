import { useState, useEffect } from 'react';
import {
  Indicator,
  IndicatorBaseline,
  IndicatorTargetPlan,
} from '../../types/indicator';
import {
  getAllIndicators,
  getIndicatorBaseline,
  generateIndicatorTargetPlan,
  exportIndicatorPlanToExcel,
} from '../../services/indicatorService';
import { useIndicator } from '../../contexts/IndicatorContext';
import IndicatorAdjustmentDialog from './IndicatorAdjustmentDialog';
import { TrendingUp, TrendingDown, Minus, Download, AlertCircle, Info, Loader2, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function IndicatorTargetSetting() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [baseline, setBaseline] = useState<IndicatorBaseline | null>(null);
  const [targetPlan, setTargetPlan] = useState<IndicatorTargetPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [nationalSalesGrowth, setNationalSalesGrowth] = useState<number | undefined>(undefined);
  const [showBaselineDialog, setShowBaselineDialog] = useState(false);
  const [showTargetPlanDialog, setShowTargetPlanDialog] = useState(false);

  const {
    getCachedBaseline,
    setCachedBaseline,
    getCachedTargetPlan,
    setCachedTargetPlan,
  } = useIndicator();

  useEffect(() => {
    loadIndicators();
  }, []);

  useEffect(() => {
    if (selectedIndicator) {
      loadBaseline(selectedIndicator.id, false);
    }
  }, [selectedIndicator]);

  useEffect(() => {
    if (selectedIndicator) {
      // 检查是否有缓存的目标规划
      const cachedPlan = getCachedTargetPlan(selectedIndicator.id, nationalSalesGrowth);
      if (cachedPlan) {
        setTargetPlan(cachedPlan);
      } else if (targetPlan) {
        // 如果销售增速改变但没有缓存，清空当前规划
        setTargetPlan(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndicator, nationalSalesGrowth]);

  const loadIndicators = async () => {
    setLoading(true);
    try {
      const data = await getAllIndicators({ isCore: true }); // 只加载核心指标
      setIndicators(data);
      if (data.length > 0) {
        setSelectedIndicator(data[0]);
      }
    } catch (error) {
      console.error('加载指标失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBaseline = async (indicatorId: string, forceRefresh: boolean = false) => {
    // 如果不需要强制刷新，先检查缓存
    if (!forceRefresh) {
      const cached = getCachedBaseline(indicatorId);
      if (cached) {
        setBaseline(cached);
        return;
      }
    }

    setLoading(true);
    try {
      const data = await getIndicatorBaseline(indicatorId);
      setBaseline(data);
      // 保存到缓存
      if (data) {
        setCachedBaseline(indicatorId, data);
      }
    } catch (error) {
      console.error('加载基线失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async (forceRefresh: boolean = false) => {
    if (!selectedIndicator) return;

    // 如果不需要强制刷新，先检查缓存
    if (!forceRefresh) {
      const cached = getCachedTargetPlan(selectedIndicator.id, nationalSalesGrowth);
      if (cached) {
        setTargetPlan(cached);
        return;
      }
    }

    setGenerating(true);
    try {
      const plan = await generateIndicatorTargetPlan(selectedIndicator.id, {
        nationalSalesGrowth,
      });
      setTargetPlan(plan);
      // 保存到缓存
      if (plan) {
        setCachedTargetPlan(selectedIndicator.id, nationalSalesGrowth, plan);
      }
    } catch (error) {
      console.error('生成目标规划失败:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleRefreshBaseline = () => {
    setShowBaselineDialog(true);
  };

  const handleRefreshPlan = () => {
    setShowTargetPlanDialog(true);
  };

  const handleApplyBaselineAdjustment = (adjustedData: IndicatorBaseline) => {
    if (selectedIndicator) {
      setBaseline(adjustedData);
      setCachedBaseline(selectedIndicator.id, adjustedData);
    }
  };

  const handleApplyTargetPlanAdjustment = (adjustedData: IndicatorTargetPlan) => {
    if (selectedIndicator) {
      setTargetPlan(adjustedData);
      setCachedTargetPlan(selectedIndicator.id, nationalSalesGrowth, adjustedData);
    }
  };

  const handleExportExcel = () => {
    if (!targetPlan) return;
    exportIndicatorPlanToExcel([targetPlan], `${selectedIndicator?.name}_指标规划.xlsx`);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'up':
        return '上升';
      case 'down':
        return '下降';
      default:
        return '稳定';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return '高置信度';
      case 'medium':
        return '中置信度';
      case 'low':
        return '低置信度';
      default:
        return confidence;
    }
  };

  // 准备图表数据
  const baselineChartData = baseline
    ? [
        {
          name: '当前值',
          value: baseline.nationalBaseline.current,
        },
        {
          name: '历史平均',
          value: baseline.nationalBaseline.historicalAvg,
        },
        {
          name: '历史中位数',
          value: baseline.nationalBaseline.historicalMedian,
        },
        ...(targetPlan
          ? [
              {
                name: '目标值',
                value: targetPlan.targetValue.national,
              },
            ]
          : []),
      ]
    : [];

  const provinceChartData = targetPlan
    ? targetPlan.targetValue.provinces.map((pv) => ({
        province: pv.province,
        基线: pv.baseline,
        目标: pv.target,
        增长率: pv.growthRate,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* 指标选择 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">选择指标</h3>
        <div className="flex flex-wrap gap-3">
          {indicators.map((indicator) => (
            <button
              key={indicator.id}
              onClick={() => setSelectedIndicator(indicator)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedIndicator?.id === indicator.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {indicator.name}
            </button>
          ))}
        </div>
      </div>

      {selectedIndicator && (
        <>
          {/* 指标基线 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">指标基线</h3>
              <button
                onClick={handleRefreshBaseline}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-primary-700 bg-white hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-primary-200"
                title="换一批基线数据"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>换一批</span>
              </button>
            </div>
            {baseline && getCachedBaseline(selectedIndicator.id) && (
              <div className="mb-4 flex items-center space-x-2 text-xs text-gray-500">
                <span>•</span>
                <span>已缓存基线数据，点击"换一批"可重新加载</span>
              </div>
            )}

            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
                <p className="text-sm text-gray-600">加载中...</p>
              </div>
            ) : baseline ? (
              <div className="space-y-6">
                {/* 全国基线 */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">全国基线</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">当前值</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {baseline.nationalBaseline.current}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">历史平均</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {baseline.nationalBaseline.historicalAvg.toFixed(1)}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">历史中位数</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {baseline.nationalBaseline.historicalMedian.toFixed(1)}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-500 mb-1">趋势</div>
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(baseline.nationalBaseline.trend)}
                        <span
                          className={clsx(
                            'text-lg font-bold',
                            getTrendColor(baseline.nationalBaseline.trend)
                          )}
                        >
                          {getTrendLabel(baseline.nationalBaseline.trend)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 基线对比图表 */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={baselineChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#0ea5e9" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 省份基线 */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">省份基线</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            省份
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                            当前值
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                            历史平均
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                            方差
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                            趋势
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {baseline.provinceBaselines.map((pb, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-900">{pb.province}</td>
                            <td className="py-3 px-4 text-sm text-gray-900 text-right">
                              {pb.current}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 text-right">
                              {pb.historicalAvg.toFixed(1)}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 text-right">
                              {pb.variance.toFixed(1)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                {getTrendIcon(pb.trend)}
                                <span className={clsx('text-xs', getTrendColor(pb.trend))}>
                                  {getTrendLabel(pb.trend)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 环境因素 */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">环境因素</h4>
                  <div className="space-y-2">
                    {baseline.environmentalFactors.map((factor, index) => (
                      <div
                        key={index}
                        className={clsx(
                          'p-4 rounded-lg border',
                          factor.impact === 'positive'
                            ? 'bg-green-50 border-green-200'
                            : factor.impact === 'negative'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{factor.factor}</span>
                          <span
                            className={clsx(
                              'px-2 py-1 text-xs font-medium rounded-full',
                              factor.impact === 'positive'
                                ? 'bg-green-100 text-green-800'
                                : factor.impact === 'negative'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            )}
                          >
                            {factor.impact === 'positive'
                              ? '正面影响'
                              : factor.impact === 'negative'
                              ? '负面影响'
                              : '中性'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{factor.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">暂无基线数据</p>
              </div>
            )}
          </div>

          {/* 目标值规划 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">指标目标值设定</h3>
              <div className="flex items-center space-x-4">
                {/* 全国销售增速输入 */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-700">全国销售增速（可选）：</label>
                  <input
                    type="number"
                    value={nationalSalesGrowth || ''}
                    onChange={(e) =>
                      setNationalSalesGrowth(
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="15"
                    className="w-20 px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
                <button
                  onClick={() => handleGeneratePlan(false)}
                  disabled={generating}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    generating
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  )}
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
                      生成中...
                    </>
                  ) : (
                    '生成目标规划'
                  )}
                </button>
                {targetPlan && (
                  <button
                    onClick={handleRefreshPlan}
                    disabled={generating}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-primary-700 bg-white hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-primary-200"
                    title="换一批目标规划"
                  >
                    <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                    <span>换一批</span>
                  </button>
                )}
              </div>
            </div>

            {generating ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
                <p className="text-sm text-gray-600">AI正在分析历史趋势、省份方差、环境变化等因素，生成目标值规划...</p>
              </div>
            ) : targetPlan ? (
              <div className="space-y-6">
                {/* 缓存提示 */}
                {getCachedTargetPlan(selectedIndicator.id, nationalSalesGrowth) && (
                  <div className="mb-4 flex items-center space-x-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                    <span>•</span>
                    <span>已缓存AI规划结果，点击"换一批"可重新生成</span>
                  </div>
                )}
                {/* 目标值概览 */}
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
                      <div className="text-xs text-primary-600 mb-1">全国目标值</div>
                      <div className="text-3xl font-bold text-primary-900">
                        {targetPlan.targetValue.national.toFixed(1)}
                      </div>
                      <div className="text-xs text-primary-600 mt-2">
                        基线：{baseline?.nationalBaseline.current.toFixed(1)}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-600 mb-1">置信度</div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={clsx(
                            'px-3 py-1 text-sm font-medium rounded-full border',
                            getConfidenceColor(targetPlan.confidence)
                          )}
                        >
                          {getConfidenceLabel(targetPlan.confidence)}
                        </span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-xs text-gray-600 mb-1">需要人工调整</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {targetPlan.needsManualAdjustment ? '是' : '否'}
                      </div>
                    </div>
                  </div>

                  {/* 导出按钮 */}
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={handleExportExcel}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>导出Excel工具</span>
                    </button>
                  </div>
                </div>

                {/* 规划依据 */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">规划依据</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">历史趋势分析</div>
                      <p className="text-sm text-gray-600">{targetPlan.planningBasis.historicalTrend}</p>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">省份方差分析</div>
                      <p className="text-sm text-gray-600">{targetPlan.planningBasis.provinceVariance}</p>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">环境变化</div>
                      <p className="text-sm text-gray-600">{targetPlan.planningBasis.environmentalChange}</p>
                    </div>
                    {targetPlan.planningBasis.salesGrowthImpact && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">销售增速影响</div>
                        <p className="text-sm text-gray-600">
                          {targetPlan.planningBasis.salesGrowthImpact}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 省份目标值 */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">省份目标值</h4>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={provinceChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="province" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="基线" fill="#94a3b8" />
                        <Bar dataKey="目标" fill="#0ea5e9" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            省份
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                            基线
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                            目标
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                            增长率
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                            规划理由
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {targetPlan.targetValue.provinces.map((pv, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-900">{pv.province}</td>
                            <td className="py-3 px-4 text-sm text-gray-600 text-right">
                              {pv.baseline.toFixed(1)}
                            </td>
                            <td className="py-3 px-4 text-sm font-semibold text-primary-900 text-right">
                              {pv.target.toFixed(1)}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 text-right">
                              {pv.growthRate > 0 ? '+' : ''}
                              {pv.growthRate.toFixed(1)}%
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">{pv.reasoning}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 风险提示 */}
                {targetPlan.riskWarnings.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-4">风险提示</h4>
                    <div className="space-y-2">
                      {targetPlan.riskWarnings.map((warning, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                        >
                          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <p className="text-sm text-yellow-800">{warning}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 人工调整提示 */}
                {targetPlan.needsManualAdjustment && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h5 className="text-sm font-semibold text-blue-900 mb-1">
                          需要人工调整
                        </h5>
                        <p className="text-sm text-blue-800">
                          {targetPlan.adjustmentReason ||
                            '由于指标对全年业务影响大，各数据仅为模型参考值，可能存在需要人工矫正的部分。建议下载Excel工具进行后续人工调整。'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center bg-gray-50 rounded-lg">
                <p className="text-gray-500 mb-4">点击"生成目标规划"按钮，AI将基于历史趋势、省份方差、环境变化等因素生成目标值规划</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* 调整对话对话框 */}
      {selectedIndicator && baseline && (
        <IndicatorAdjustmentDialog
          isOpen={showBaselineDialog}
          onClose={() => setShowBaselineDialog(false)}
          title="调整指标基线"
          currentData={baseline}
          dataType="baseline"
          onApply={handleApplyBaselineAdjustment}
          context={{ indicatorId: selectedIndicator.id }}
        />
      )}

      {selectedIndicator && targetPlan && (
        <IndicatorAdjustmentDialog
          isOpen={showTargetPlanDialog}
          onClose={() => setShowTargetPlanDialog(false)}
          title="调整指标目标值规划"
          currentData={targetPlan}
          dataType="targetPlan"
          onApply={handleApplyTargetPlanAdjustment}
          context={{
            indicatorId: selectedIndicator.id,
            salesGrowth: nationalSalesGrowth,
          }}
        />
      )}
    </div>
  );
}

