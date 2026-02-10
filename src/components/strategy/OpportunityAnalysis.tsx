import { useState, useEffect } from 'react';
import { Opportunity } from '../../types/strategy';
import { mockOpportunities } from '../../data/strategyMockData';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import StrategyAnalysisFlow from './StrategyAnalysisFlow';

export default function OpportunityAnalysis() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(mockOpportunities);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(opportunities[0] || null);
  const [showNewAnalysisFlow, setShowNewAnalysisFlow] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [showAddOpportunity, setShowAddOpportunity] = useState(false);
  const [newOpportunity, setNewOpportunity] = useState({
    title: '',
    description: '',
    marketSegment: '',
    currentGap: '',
    potential: 'medium' as 'high' | 'medium' | 'low',
  });
  
  // 从localStorage读取问题数据并自动创建问题
  useEffect(() => {
    const strategyProblemsData = localStorage.getItem('strategyProblems');
    if (strategyProblemsData) {
      try {
        const data = JSON.parse(strategyProblemsData);
        // 检查数据是否过期（1小时内有效）
        const oneHour = 60 * 60 * 1000;
        if (Date.now() - data.timestamp < oneHour && data.problems && data.problems.length > 0) {
          // 将问题转换为Opportunity格式
          const timestamp = data.timestamp || Date.now();
          const newOpportunities: Opportunity[] = data.problems.map((problem: {
            title: string;
            description: string;
            problem: string;
          }, index: number) => ({
            id: `opp-auto-${timestamp}-${index}`,
            title: problem.title,
            description: problem.description,
            marketSegment: data.brand || '未知市场',
            currentGap: problem.problem,
            potential: 'high' as 'high' | 'medium' | 'low',
            createdAt: new Date(timestamp),
            updatedAt: new Date(timestamp),
          }));
          
          // 添加到现有问题列表（避免重复）
          setOpportunities(prev => {
            const existingIds = new Set(prev.map(o => o.id));
            const newOnes = newOpportunities.filter(o => !existingIds.has(o.id));
            if (newOnes.length > 0) {
              return [...prev, ...newOnes];
            }
            return prev;
          });
          
          // 自动选择第一个新创建的问题
          if (newOpportunities.length > 0) {
            setSelectedOpportunity(newOpportunities[0]);
          }
          
          // 清除localStorage中的数据，避免重复加载
          localStorage.removeItem('strategyProblems');
        }
      } catch (error) {
        console.error('读取策略问题数据失败:', error);
      }
    }
  }, []);


  // 当opportunities变化时，更新selectedOpportunity
  useEffect(() => {
    if (opportunities.length > 0 && !selectedOpportunity) {
      setSelectedOpportunity(opportunities[0]);
    } else if (selectedOpportunity && !opportunities.find((o) => o.id === selectedOpportunity.id)) {
      // 如果当前选中的机会点被删除了，选择第一个
      setSelectedOpportunity(opportunities[0] || null);
    }
  }, [opportunities, selectedOpportunity]);

  const handleAddOpportunity = () => {
    if (!newOpportunity.title.trim() || !newOpportunity.marketSegment.trim()) {
      return;
    }

    const opp: Opportunity = {
      id: `opp-${Date.now()}`,
      title: newOpportunity.title.trim(),
      description: newOpportunity.description.trim(),
      marketSegment: newOpportunity.marketSegment.trim(),
      currentGap: newOpportunity.currentGap.trim(),
      potential: newOpportunity.potential,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setOpportunities([...opportunities, opp]);
    setSelectedOpportunity(opp);
    setNewOpportunity({
      title: '',
      description: '',
      marketSegment: '',
      currentGap: '',
      potential: 'medium',
    });
    setShowAddOpportunity(false);
  };

  const handleUpdateOpportunity = (id: string, updates: Partial<Opportunity>) => {
    setOpportunities(
      opportunities.map((opp) =>
        opp.id === id
          ? { ...opp, ...updates, updatedAt: new Date() }
          : opp
      )
    );
    if (selectedOpportunity?.id === id) {
      setSelectedOpportunity({ ...selectedOpportunity, ...updates, updatedAt: new Date() });
    }
    setEditingOpportunity(null);
  };

  const handleDeleteOpportunity = (id: string) => {
    if (window.confirm('确定要删除这个机会点吗？')) {
      setOpportunities(opportunities.filter((opp) => opp.id !== id));
      if (selectedOpportunity?.id === id) {
        setSelectedOpportunity(null);
      }
    }
  };

  const handleStartEdit = (opp: Opportunity) => {
    setEditingOpportunity({ ...opp });
  };

  return (
    <div className="space-y-6">
      {/* 机会点选择 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">潜在问题列表</h3>
          <button
            onClick={() => setShowAddOpportunity(!showAddOpportunity)}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg border border-primary-200"
          >
            <Plus className="w-4 h-4" />
            <span>添加问题</span>
          </button>
        </div>

        {showAddOpportunity && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
              <input
                type="text"
                value={newOpportunity.title}
                onChange={(e) => setNewOpportunity({ ...newOpportunity, title: e.target.value })}
                placeholder="输入机会点标题..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">细分市场 *</label>
              <input
                type="text"
                value={newOpportunity.marketSegment}
                onChange={(e) => setNewOpportunity({ ...newOpportunity, marketSegment: e.target.value })}
                placeholder="输入细分市场..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={newOpportunity.description}
                onChange={(e) => setNewOpportunity({ ...newOpportunity, description: e.target.value })}
                placeholder="输入机会点描述..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">当前缺口</label>
              <input
                type="text"
                value={newOpportunity.currentGap}
                onChange={(e) => setNewOpportunity({ ...newOpportunity, currentGap: e.target.value })}
                placeholder="输入当前缺口描述..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">潜力</label>
              <select
                value={newOpportunity.potential}
                onChange={(e) => setNewOpportunity({ ...newOpportunity, potential: e.target.value as 'high' | 'medium' | 'low' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="high">高潜力</option>
                <option value="medium">中潜力</option>
                <option value="low">低潜力</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddOpportunity}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                添加
              </button>
              <button
                onClick={() => {
                  setShowAddOpportunity(false);
                  setNewOpportunity({
                    title: '',
                    description: '',
                    marketSegment: '',
                    currentGap: '',
                    potential: 'medium',
                  });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className={clsx(
                'relative text-left p-4 rounded-lg border-2 transition-all',
                selectedOpportunity?.id === opp.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <button
                onClick={() => {
                  setSelectedOpportunity(opp);
                }}
                className="w-full text-left"
              >
                <div className="font-semibold text-base text-gray-900 mb-2">{opp.title}</div>
                {opp.description && (
                  <div className="text-base text-gray-600 mb-3 line-clamp-2 leading-relaxed">{opp.description}</div>
                )}
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
              <div className="absolute top-2 right-2 flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(opp);
                  }}
                  className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  title="编辑"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteOpportunity(opp.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 编辑机会点对话框 */}
      {editingOpportunity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">编辑机会点</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                <input
                  type="text"
                  value={editingOpportunity.title}
                  onChange={(e) => setEditingOpportunity({ ...editingOpportunity, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">细分市场 *</label>
                <input
                  type="text"
                  value={editingOpportunity.marketSegment}
                  onChange={(e) => setEditingOpportunity({ ...editingOpportunity, marketSegment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={editingOpportunity.description}
                  onChange={(e) => setEditingOpportunity({ ...editingOpportunity, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">潜力</label>
                <select
                  value={editingOpportunity.potential}
                  onChange={(e) => setEditingOpportunity({ ...editingOpportunity, potential: e.target.value as 'high' | 'medium' | 'low' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="high">高潜力</option>
                  <option value="medium">中潜力</option>
                  <option value="low">低潜力</option>
                </select>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-4">
                <button
                  onClick={() => setEditingOpportunity(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (editingOpportunity.title.trim() && editingOpportunity.marketSegment.trim()) {
                      handleUpdateOpportunity(editingOpportunity.id, editingOpportunity);
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

      {selectedOpportunity && (
        <>
          {/* 新的5步分析流程 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">AI策略分析流程</h3>
                <p className="text-base text-gray-600 leading-relaxed">
                  基于5步流程进行问题原因梳理和策略制定：原因分析 → 策略建议 → 用户校准 → 迭代优化 → 最终总结
                </p>
              </div>
              <button
                onClick={() => setShowNewAnalysisFlow(!showNewAnalysisFlow)}
                className={clsx(
                  'px-4 py-2 rounded-lg font-medium transition-colors',
                  showNewAnalysisFlow
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                )}
              >
                {showNewAnalysisFlow ? '隐藏分析' : '开始AI分析'}
              </button>
            </div>

            {showNewAnalysisFlow && (
              <StrategyAnalysisFlow
                opportunity={selectedOpportunity}
                onComplete={(result) => {
                  console.log('分析完成:', result);
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

