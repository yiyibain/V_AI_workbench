import { useState } from 'react';
import { StrategyProposal } from '../../types/strategy';
import { mockStrategyProposals } from '../../data/strategyMockData';
import { Edit2, Trash2, Copy, GripVertical, Plus, Save } from 'lucide-react';
import { clsx } from 'clsx';

export default function StrategyCoCreation() {
  const [strategies, setStrategies] = useState<StrategyProposal[]>(mockStrategyProposals);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStrategy, setEditingStrategy] = useState<StrategyProposal | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleEdit = (strategy: StrategyProposal) => {
    setEditingId(strategy.id);
    setEditingStrategy({ ...strategy });
  };

  const handleSave = () => {
    if (!editingStrategy) return;

    setStrategies(
      strategies.map((s) => (s.id === editingStrategy.id ? { ...editingStrategy, updatedAt: new Date() } : s))
    );
    setEditingId(null);
    setEditingStrategy(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingStrategy(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个策略建议吗？')) {
      setStrategies(strategies.filter((s) => s.id !== id));
    }
  };

  const handleCopy = (strategy: StrategyProposal) => {
    const newStrategy: StrategyProposal = {
      ...strategy,
      id: `sp-${Date.now()}`,
      title: `${strategy.title} (副本)`,
      status: 'draft',
      priority: strategies.length + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      isFromAI: false,
    };
    setStrategies([...strategies, newStrategy]);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newStrategies = [...strategies];
    const dragged = newStrategies[draggedIndex];
    newStrategies.splice(draggedIndex, 1);
    newStrategies.splice(index, 0, dragged);

    // 更新优先级
    const updated = newStrategies.map((s, i) => ({ ...s, priority: i + 1 }));
    setStrategies(updated);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleAddNew = () => {
    const newStrategy: StrategyProposal = {
      id: `sp-${Date.now()}`,
      title: '新策略建议',
      description: '',
      priority: strategies.length + 1,
      status: 'draft',
      actions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isFromAI: false,
    };
    setStrategies([...strategies, newStrategy]);
    setEditingId(newStrategy.id);
    setEditingStrategy(newStrategy);
  };

  const sortedStrategies = [...strategies].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-6">
      {/* 策略列表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">策略建议</h3>
          <button
            onClick={handleAddNew}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            <span>添加策略</span>
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          基于预先输入的策略辅助方法论，AI对于发现的"机会点"脑暴数条初版"策略建议"。
          您可以拖拽调整优先级，或编辑、删除、复制策略。
        </p>

        <div className="space-y-4">
          {sortedStrategies.map((strategy, index) => (
            <div
              key={strategy.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={clsx(
                'border rounded-lg p-4 transition-all',
                editingId === strategy.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              {editingId === strategy.id && editingStrategy ? (
                // 编辑模式
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                    <input
                      type="text"
                      value={editingStrategy.title}
                      onChange={(e) =>
                        setEditingStrategy({ ...editingStrategy, title: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                    <textarea
                      value={editingStrategy.description}
                      onChange={(e) =>
                        setEditingStrategy({ ...editingStrategy, description: e.target.value })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">具体行动</label>
                    <textarea
                      value={editingStrategy.actions.join('\n')}
                      onChange={(e) =>
                        setEditingStrategy({
                          ...editingStrategy,
                          actions: e.target.value.split('\n').filter((a) => a.trim()),
                        })
                      }
                      rows={4}
                      placeholder="每行一个行动项"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  {editingStrategy.expectedOutcome !== undefined && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">预期效果</label>
                      <input
                        type="text"
                        value={editingStrategy.expectedOutcome}
                        onChange={(e) =>
                          setEditingStrategy({ ...editingStrategy, expectedOutcome: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSave}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      <Save className="w-4 h-4" />
                      <span>保存</span>
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                // 查看模式
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="cursor-move mt-1 text-gray-400 hover:text-gray-600">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-gray-900">{strategy.title}</span>
                          <span className="text-xs px-2 py-1 rounded bg-primary-100 text-primary-700">
                            优先级 {strategy.priority}
                          </span>
                          {strategy.isFromAI && (
                            <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">AI生成</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{strategy.description}</p>
                        {strategy.actions.length > 0 && (
                          <div className="mb-2">
                            <div className="text-sm font-medium text-gray-700 mb-1">具体行动：</div>
                            <ul className="space-y-1">
                              {strategy.actions.map((action, i) => (
                                <li key={i} className="flex items-start text-sm text-gray-600">
                                  <span className="text-primary-600 mr-2">→</span>
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {strategy.expectedOutcome && (
                          <div className="text-sm text-gray-600">
                            <span className="font-medium">预期效果：</span>
                            {strategy.expectedOutcome}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(strategy)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCopy(strategy)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                        title="复制"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(strategy.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 提示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>提示：</strong> 使用右下角的AI助手，可以在AI建议的基础上要求进行修改，也可以输入新的想法，要求AI对策略进行调整。
          AI会对讨论进行总结，并引导您进行优先级排序等过程，确保策略可落地。
        </p>
      </div>
    </div>
  );
}

