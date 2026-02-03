import { useState, useEffect } from 'react';
import { Indicator, IndicatorFilter, Strategy } from '../../types/indicator';
import {
  getAllIndicators,
  getPotentialIndicatorsByStrategy,
  getAllStrategies,
} from '../../services/indicatorService';
import { useIndicator } from '../../contexts/IndicatorContext';
import IndicatorAdjustmentDialog from './IndicatorAdjustmentDialog';
import { Search, ChevronDown, ChevronUp, Info, RefreshCw, Plus, Edit2, Trash2, X } from 'lucide-react';
import { clsx } from 'clsx';

export default function AvailableIndicators() {
  const [allIndicators, setAllIndicators] = useState<Indicator[]>([]);
  const [potentialIndicators, setPotentialIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showOnlyCore, setShowOnlyCore] = useState(false);
  const [expandedIndicators, setExpandedIndicators] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'all' | 'potential'>('all'); // 查看全部指标还是潜在指标
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [showAddStrategy, setShowAddStrategy] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [newStrategy, setNewStrategy] = useState({
    name: '',
    description: '',
    focusAreas: '',
    targetOutcomes: '',
  });

  const {
    strategies,
    setStrategies,
    addStrategy,
    updateStrategy,
    deleteStrategy,
    selectedStrategyTab1,
    setSelectedStrategyTab1,
    getCachedPotentialIndicators,
    setCachedPotentialIndicators,
  } = useIndicator();

  const selectedStrategy = selectedStrategyTab1;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedStrategy) {
      loadPotentialIndicators(selectedStrategy.id, false);
    } else {
      setPotentialIndicators([]);
    }
  }, [selectedStrategy]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [indicators, strategiesData] = await Promise.all([
        getAllIndicators(),
        getAllStrategies(),
      ]);
      setAllIndicators(indicators);
      // 如果Context中的策略列表为空，则初始化
      if (strategies.length === 0) {
        setStrategies(strategiesData);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPotentialIndicators = async (strategyId: string, forceRefresh: boolean = false) => {
    // 如果不需要强制刷新，先检查缓存
    if (!forceRefresh) {
      const cached = getCachedPotentialIndicators(strategyId);
      if (cached) {
        setPotentialIndicators(cached);
        return;
      }
    }

    setLoading(true);
    try {
      const indicators = await getPotentialIndicatorsByStrategy(strategyId);
      setPotentialIndicators(indicators);
      // 保存到缓存
      setCachedPotentialIndicators(strategyId, indicators);
    } catch (error) {
      console.error('加载潜在指标失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (selectedStrategy && viewMode === 'potential') {
      setShowAdjustmentDialog(true);
    }
  };

  const handleApplyAdjustment = (adjustedIndicators: Indicator[]) => {
    if (selectedStrategy) {
      setPotentialIndicators(adjustedIndicators);
      setCachedPotentialIndicators(selectedStrategy.id, adjustedIndicators);
    }
  };

  const handleAddStrategy = () => {
    if (!newStrategy.name.trim() || !newStrategy.description.trim()) {
      return;
    }

    const strategy: Strategy = {
      id: `strategy-${Date.now()}`,
      name: newStrategy.name.trim(),
      description: newStrategy.description.trim(),
      focusAreas: newStrategy.focusAreas.split(',').map((s) => s.trim()).filter(Boolean),
      targetOutcomes: newStrategy.targetOutcomes.split(',').map((s) => s.trim()).filter(Boolean),
    };

    addStrategy(strategy);
    setSelectedStrategyTab1(strategy);
    setNewStrategy({
      name: '',
      description: '',
      focusAreas: '',
      targetOutcomes: '',
    });
    setShowAddStrategy(false);
  };

  const handleUpdateStrategy = (id: string, updates: Partial<Strategy>) => {
    updateStrategy(id, updates);
    if (selectedStrategy?.id === id) {
      setSelectedStrategyTab1({ ...selectedStrategy, ...updates } as Strategy);
    }
    setEditingStrategy(null);
  };

  const handleDeleteStrategy = (id: string) => {
    if (window.confirm('确定要删除这个策略吗？')) {
      deleteStrategy(id);
    }
  };

  const handleStartEdit = (strategy: Strategy) => {
    setEditingStrategy({ ...strategy });
  };

  const toggleIndicator = (indicatorId: string) => {
    const newExpanded = new Set(expandedIndicators);
    if (newExpanded.has(indicatorId)) {
      newExpanded.delete(indicatorId);
    } else {
      newExpanded.add(indicatorId);
    }
    setExpandedIndicators(newExpanded);
  };

  // 筛选指标
  const filter: IndicatorFilter = {
    searchText: searchText || undefined,
    category: selectedCategory !== 'all' ? [selectedCategory as any] : undefined,
    isCore: showOnlyCore ? true : undefined,
  };

  const filteredIndicators = viewMode === 'all' ? allIndicators : potentialIndicators;

  const displayedIndicators = filteredIndicators.filter((ind) => {
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      if (
        !ind.name.toLowerCase().includes(searchLower) &&
        !ind.description.toLowerCase().includes(searchLower) &&
        !ind.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      ) {
        return false;
      }
    }
    if (filter.category && filter.category.length > 0) {
      if (!filter.category.includes(ind.category)) {
        return false;
      }
    }
    if (filter.isCore !== undefined && ind.isCore !== filter.isCore) {
      return false;
    }
    return true;
  });

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      result: '结果指标',
      process: '过程指标',
      input: '投入指标',
      efficiency: '效率指标',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      result: 'bg-blue-100 text-blue-800',
      process: 'bg-green-100 text-green-800',
      input: 'bg-yellow-100 text-yellow-800',
      efficiency: 'bg-purple-100 text-purple-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* 策略选择 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">选择策略</h3>
          <button
            onClick={() => setShowAddStrategy(!showAddStrategy)}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg border border-primary-200"
          >
            <Plus className="w-4 h-4" />
            <span>添加策略</span>
          </button>
        </div>

        {showAddStrategy && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">策略名称 *</label>
              <input
                type="text"
                value={newStrategy.name}
                onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })}
                placeholder="输入策略名称..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">策略描述 *</label>
              <textarea
                value={newStrategy.description}
                onChange={(e) => setNewStrategy({ ...newStrategy, description: e.target.value })}
                placeholder="输入策略描述..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">重点领域（用逗号分隔）</label>
              <input
                type="text"
                value={newStrategy.focusAreas}
                onChange={(e) => setNewStrategy({ ...newStrategy, focusAreas: e.target.value })}
                placeholder="例如：零售渠道,价格策略,渠道合作"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">目标结果（用逗号分隔）</label>
              <input
                type="text"
                value={newStrategy.targetOutcomes}
                onChange={(e) => setNewStrategy({ ...newStrategy, targetOutcomes: e.target.value })}
                placeholder="例如：零售渠道份额提升,市场覆盖扩大"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddStrategy}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                添加
              </button>
              <button
                onClick={() => {
                  setShowAddStrategy(false);
                  setNewStrategy({
                    name: '',
                    description: '',
                    focusAreas: '',
                    targetOutcomes: '',
                  });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              setSelectedStrategyTab1(null);
              setViewMode('all');
            }}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              !selectedStrategy
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            查看全部指标
          </button>
          {strategies.map((strategy) => (
            <div key={strategy.id} className="relative group">
              <button
                onClick={() => {
                  setSelectedStrategyTab1(strategy);
                  setViewMode('potential');
                }}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors pr-8',
                  selectedStrategy?.id === strategy.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {strategy.name}
              </button>
              <div className="absolute top-0 right-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(strategy);
                  }}
                  className="p-1 text-white hover:bg-primary-700 rounded"
                  title="编辑"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteStrategy(strategy.id);
                  }}
                  className="p-1 text-white hover:bg-primary-700 rounded"
                  title="删除"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
        {selectedStrategy && (
          <div className="mt-4 p-4 bg-primary-50 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">策略描述：</span>
                  {selectedStrategy.description}
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  <span className="font-semibold">重点领域：</span>
                  {selectedStrategy.focusAreas.join('、')}
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  <span className="font-semibold">目标结果：</span>
                  {selectedStrategy.targetOutcomes.join('、')}
                </p>
              </div>
              {viewMode === 'potential' && (
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="ml-4 flex items-center space-x-2 px-4 py-2 text-sm font-medium text-primary-700 bg-white hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-primary-200"
                  title="与AI对话调整潜在指标"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>换一批</span>
                </button>
              )}
            </div>
            {viewMode === 'potential' && getCachedPotentialIndicators(selectedStrategy.id) && (
              <div className="mt-3 flex items-center space-x-2 text-xs text-gray-500">
                <span>•</span>
                <span>已缓存AI筛选结果，点击"换一批"可重新生成</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 筛选和搜索 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="搜索指标名称、描述或标签..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* 分类筛选 */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">全部分类</option>
            <option value="result">结果指标</option>
            <option value="process">过程指标</option>
            <option value="input">投入指标</option>
            <option value="efficiency">效率指标</option>
          </select>

          {/* 核心指标筛选 */}
          <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={showOnlyCore}
              onChange={(e) => setShowOnlyCore(e.target.checked)}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">仅显示核心指标</span>
          </label>
        </div>

        {/* 视图模式切换 */}
        {selectedStrategy && (
          <div className="mt-4 flex items-center space-x-4">
            <span className="text-sm text-gray-600">视图模式：</span>
            <button
              onClick={() => setViewMode('potential')}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                viewMode === 'potential'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              潜在指标短清单 ({potentialIndicators.length}个)
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                viewMode === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              全部指标 ({allIndicators.length}个)
            </button>
          </div>
        )}
      </div>

      {/* 指标列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {viewMode === 'potential' && selectedStrategy
              ? `潜在指标短清单 (${displayedIndicators.length}个)`
              : `可用指标列表 (${displayedIndicators.length}个)`}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {viewMode === 'potential' && selectedStrategy
              ? 'AI基于策略筛选出的潜在相关指标，供进一步选择'
              : '基于数据湖内可得数据，预训练的指标长清单，清晰定义数据计算方法和取数逻辑'}
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-sm text-gray-600">加载中...</p>
          </div>
        ) : displayedIndicators.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">未找到匹配的指标</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {displayedIndicators.map((indicator) => (
              <div key={indicator.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{indicator.name}</h4>
                      {indicator.isCore && (
                        <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
                          核心指标
                        </span>
                      )}
                      <span
                        className={clsx(
                          'px-2 py-1 text-xs font-medium rounded-full',
                          getCategoryColor(indicator.category)
                        )}
                      >
                        {getCategoryLabel(indicator.category)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{indicator.description}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {indicator.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    {expandedIndicators.has(indicator.id) && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                        <div>
                          <div className="flex items-start space-x-2 mb-1">
                            <Info className="w-4 h-4 text-gray-500 mt-0.5" />
                            <span className="text-sm font-medium text-gray-700">计算方法：</span>
                          </div>
                          <p className="text-sm text-gray-600 ml-6">{indicator.calculationMethod}</p>
                        </div>
                        <div>
                          <div className="flex items-start space-x-2 mb-1">
                            <Info className="w-4 h-4 text-gray-500 mt-0.5" />
                            <span className="text-sm font-medium text-gray-700">数据来源：</span>
                          </div>
                          <p className="text-sm text-gray-600 ml-6">{indicator.dataSource}</p>
                        </div>
                        <div>
                          <div className="flex items-start space-x-2 mb-1">
                            <Info className="w-4 h-4 text-gray-500 mt-0.5" />
                            <span className="text-sm font-medium text-gray-700">取数逻辑：</span>
                          </div>
                          <p className="text-sm text-gray-600 ml-6">{indicator.dataLogic}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">单位：</span>
                          <span className="text-sm text-gray-600 ml-2">{indicator.unit}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleIndicator(indicator.id)}
                    className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {expandedIndicators.has(indicator.id) ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 调整对话对话框 */}
      {selectedStrategy && (
        <IndicatorAdjustmentDialog
          isOpen={showAdjustmentDialog}
          onClose={() => setShowAdjustmentDialog(false)}
          title="调整潜在指标列表"
          currentData={potentialIndicators}
          dataType="potentialIndicators"
          onApply={handleApplyAdjustment}
          context={{ strategyId: selectedStrategy.id }}
        />
      )}

      {/* 编辑策略对话框 */}
      {editingStrategy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">编辑策略</h3>
              <button
                onClick={() => setEditingStrategy(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">策略名称 *</label>
                <input
                  type="text"
                  value={editingStrategy.name}
                  onChange={(e) => setEditingStrategy({ ...editingStrategy, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">策略描述 *</label>
                <textarea
                  value={editingStrategy.description}
                  onChange={(e) => setEditingStrategy({ ...editingStrategy, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">重点领域（用逗号分隔）</label>
                <input
                  type="text"
                  value={editingStrategy.focusAreas.join(', ')}
                  onChange={(e) => setEditingStrategy({ ...editingStrategy, focusAreas: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目标结果（用逗号分隔）</label>
                <input
                  type="text"
                  value={editingStrategy.targetOutcomes.join(', ')}
                  onChange={(e) => setEditingStrategy({ ...editingStrategy, targetOutcomes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4">
                <button
                  onClick={() => setEditingStrategy(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (editingStrategy.name.trim() && editingStrategy.description.trim()) {
                      handleUpdateStrategy(editingStrategy.id, editingStrategy);
                    }
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

