import { useState } from 'react';
import AvailableIndicators from '../components/indicator/AvailableIndicators';
import KeyIndicatorAnalysis from '../components/indicator/KeyIndicatorAnalysis';
import IndicatorTargetSetting from '../components/indicator/IndicatorTargetSetting';
import { List, Target, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';

type TabType = 'available' | 'analysis' | 'target';

export default function IndicatorPlanning() {
  const [activeTab, setActiveTab] = useState<TabType>('available');

  const tabs = [
    {
      id: 'available' as TabType,
      label: '可用指标列表',
      icon: List,
      description: '指标长清单 + 潜在指标短清单',
    },
    {
      id: 'analysis' as TabType,
      label: '关键指标维度识别',
      icon: Target,
      description: '指标效果判断 + 考核指标建议',
    },
    {
      id: 'target' as TabType,
      label: '指标目标值设定',
      icon: TrendingUp,
      description: '基线展示 + AI目标规划 + Excel导出',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">指标规划</h1>
          <p className="text-gray-600">
            链接内部客观指标数据，结合策略辅助与历史数据，推导最能提升结果的过程指标及合理目标值
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* 标签页导航 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex-1 flex items-center justify-center space-x-2 px-6 py-4 text-sm font-medium transition-colors border-b-2',
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-700 bg-primary-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <div className="text-left">
                    <div>{tab.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 内容区域 */}
        <div>
          {activeTab === 'available' && <AvailableIndicators />}
          {activeTab === 'analysis' && <KeyIndicatorAnalysis />}
          {activeTab === 'target' && <IndicatorTargetSetting />}
        </div>
      </div>
    </div>
  );
}

