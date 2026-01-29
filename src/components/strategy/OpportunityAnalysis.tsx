import { useState } from 'react';
import { Opportunity, ReasonDimension, OpportunityAnalysis as OppAnalysis } from '../../types/strategy';
import { mockOpportunities, defaultReasonDimensions } from '../../data/strategyMockData';
import { Plus, X, CheckCircle, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

export default function OpportunityAnalysis() {
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(mockOpportunities[0]);
  const [reasonDimensions, setReasonDimensions] = useState<ReasonDimension[]>(defaultReasonDimensions);
  const [analysis, setAnalysis] = useState<OppAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newDimensionName, setNewDimensionName] = useState('');
  const [showAddDimension, setShowAddDimension] = useState(false);

  const handleAddDimension = () => {
    if (!newDimensionName.trim()) return;

    const newDimension: ReasonDimension = {
      id: `rd-${Date.now()}`,
      name: newDimensionName.trim(),
      category: 'other',
      isUserAdded: true,
    };

    setReasonDimensions([...reasonDimensions, newDimension]);
    setNewDimensionName('');
    setShowAddDimension(false);
  };

  const handleRemoveDimension = (id: string) => {
    setReasonDimensions(reasonDimensions.filter((d) => d.id !== id));
  };

  const handleAnalyze = async () => {
    if (!selectedOpportunity) return;

    setIsAnalyzing(true);
    // 模拟AI分析
    setTimeout(() => {
      setAnalysis({
        opportunityId: selectedOpportunity.id,
        reasons: reasonDimensions.map((dim) => ({
          dimension: dim,
          analysis: generateMockAnalysis(dim, selectedOpportunity),
          evidence: generateMockEvidence(dim),
        })),
        strategyDirections: generateMockStrategyDirections(selectedOpportunity),
        createdAt: new Date(),
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  const generateMockAnalysis = (dim: ReasonDimension, opp: Opportunity): string => {
    const analyses: Record<string, string> = {
      product: `产品因素：${opp.marketSegment}中，晖致产品在适应症覆盖、价格竞争力等方面存在不足，需要优化产品定位和定价策略。`,
      businessModel: `商业模式因素：当前渠道策略和推广模式可能不适合该细分市场，需要调整商业模式以适应市场特点。`,
      resource: `资源分配因素：在该细分市场的投入相对不足，人力、市场资源分配需要优化，以提升市场竞争力。`,
      organization: `组织因素：团队能力建设和激励机制可能不够完善，需要加强组织能力建设和优化激励机制。`,
      other: `其他因素：市场准入、政策变化等因素可能影响了在该细分市场的表现，需要关注政策变化和市场准入情况。`,
    };
    return analyses[dim.category] || `需要进一步分析${dim.name}对该机会点的影响。`;
  };

  const generateMockEvidence = (dim: ReasonDimension): string[] => {
    return [
      `基于${dim.name}维度的数据分析显示存在明显差距`,
      `相关市场调研和竞品分析支持该判断`,
      `内部运营数据验证了该维度的关键影响`,
    ];
  };

  const generateMockStrategyDirections = (opp: Opportunity): any[] => {
    return [
      {
        id: 'sd1',
        title: '提升Non-CV占比',
        description: '通过优化产品组合和推广策略，提升非心血管产品在该细分市场的占比',
        actions: [
          '从管理上优化对于Non-CV产品的激励政策',
          '鼓励各省组建Non-CV产品转队',
          '加强Non-CV产品的学术推广和医生教育',
        ],
        basedOnLogic: 'expansion',
      },
      {
        id: 'sd2',
        title: '加强解限工作',
        description: '针对该细分市场的重点医院，加强解限工作，提升市场准入',
        actions: [
          '识别该细分市场的核心影响型医院',
          '制定针对性的解限策略和行动计划',
          '建立解限进度跟踪机制',
        ],
        basedOnLogic: 'deLimit',
      },
      {
        id: 'sd3',
        title: '深化市场渗透',
        description: '通过学术推广和医生关系维护，深化在该细分市场的渗透',
        actions: [
          '开展针对性的学术推广活动',
          '建立该细分市场的KOL关系网络',
          '提供专业化的推广材料和工具',
        ],
        basedOnLogic: 'penetration',
      },
    ];
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      product: 'bg-blue-100 text-blue-800',
      businessModel: 'bg-green-100 text-green-800',
      resource: 'bg-yellow-100 text-yellow-800',
      organization: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getLogicLabel = (logic: string) => {
    const labels: Record<string, string> = {
      deLimit: '解限',
      penetration: '渗透',
      expansion: '做广',
    };
    return labels[logic] || logic;
  };

  return (
    <div className="space-y-6">
      {/* 机会点选择 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">选择机会点</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mockOpportunities.map((opp) => (
            <button
              key={opp.id}
              onClick={() => {
                setSelectedOpportunity(opp);
                setAnalysis(null);
              }}
              className={clsx(
                'text-left p-4 rounded-lg border-2 transition-all',
                selectedOpportunity?.id === opp.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="font-semibold text-gray-900 mb-1">{opp.title}</div>
              <div className="text-sm text-gray-600 mb-2">{opp.marketSegment}</div>
              <div className="flex items-center space-x-2">
                <span
                  className={clsx(
                    'text-xs px-2 py-1 rounded',
                    opp.potential === 'high'
                      ? 'bg-red-100 text-red-700'
                      : opp.potential === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  )}
                >
                  {opp.potential === 'high' ? '高潜力' : opp.potential === 'medium' ? '中潜力' : '低潜力'}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedOpportunity && (
        <>
          {/* 分析维度问答 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">分析维度</h3>
              <button
                onClick={() => setShowAddDimension(!showAddDimension)}
                className="flex items-center space-x-2 px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>添加维度</span>
              </button>
            </div>

            {showAddDimension && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newDimensionName}
                    onChange={(e) => setNewDimensionName(e.target.value)}
                    placeholder="输入新维度名称..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddDimension()}
                  />
                  <button
                    onClick={handleAddDimension}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    添加
                  </button>
                  <button
                    onClick={() => {
                      setShowAddDimension(false);
                      setNewDimensionName('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            <p className="text-sm text-gray-600 mb-4">
              AI总结产生目前在该细分市场中存在缺口的原因维度列表：
            </p>

            <div className="space-y-2">
              {reasonDimensions.map((dim) => (
                <div
                  key={dim.id}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">{dim.name}</span>
                      <span className={clsx('text-xs px-2 py-1 rounded', getCategoryColor(dim.category))}>
                        {dim.category}
                      </span>
                      {dim.isUserAdded && (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">用户添加</span>
                      )}
                    </div>
                    {dim.description && (
                      <p className="text-sm text-gray-600">{dim.description}</p>
                    )}
                  </div>
                  {dim.isUserAdded && (
                    <button
                      onClick={() => handleRemoveDimension(dim.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || reasonDimensions.length === 0}
                className={clsx(
                  'px-6 py-2 rounded-lg font-medium transition-colors',
                  isAnalyzing || reasonDimensions.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                )}
              >
                {isAnalyzing ? '分析中...' : '开始分析'}
              </button>
            </div>
          </div>

          {/* 机会提炼报告 */}
          {analysis && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-bold text-gray-900">机会提炼报告</h3>
              </div>

              {/* 原因分析 */}
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-900 mb-3">为何当前没有赢得该市场</h4>
                <div className="space-y-4">
                  {analysis.reasons.map((reason, index) => (
                    <div key={index} className="border-l-4 border-primary-500 pl-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-medium text-gray-900">{reason.dimension.name}</span>
                        <span className={clsx('text-xs px-2 py-1 rounded', getCategoryColor(reason.dimension.category))}>
                          {reason.dimension.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{reason.analysis}</p>
                      <div className="space-y-1">
                        {reason.evidence.map((ev, i) => (
                          <div key={i} className="flex items-start text-sm text-gray-600">
                            <span className="text-primary-600 mr-2">•</span>
                            <span>{ev}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 策略方向 */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">策略方向</h4>
                <div className="space-y-4">
                  {analysis.strategyDirections.map((direction) => (
                    <div
                      key={direction.id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-semibold text-gray-900">{direction.title}</span>
                            <span className="text-xs px-2 py-1 rounded bg-primary-100 text-primary-700">
                              {getLogicLabel(direction.basedOnLogic)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{direction.description}</p>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">具体实施建议：</div>
                        <ul className="space-y-1">
                          {direction.actions.map((action, i) => (
                            <li key={i} className="flex items-start text-sm text-gray-600">
                              <span className="text-primary-600 mr-2">→</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 提示 */}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>提示：</strong> 可以通过右下角的AI助手提出特定问题，如"为什么xx分子式上涨，但是晖致分子式内份额下跌？"
                  AI会基于数据和信息检索进行回答。
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

