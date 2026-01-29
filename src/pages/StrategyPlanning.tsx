import { useState } from 'react';
import MarketOverview from '../components/strategy/MarketOverview';
import OpportunityAnalysis from '../components/strategy/OpportunityAnalysis';
import StrategyCoCreation from '../components/strategy/StrategyCoCreation';
import { BarChart3, Target, Users } from 'lucide-react';
import { clsx } from 'clsx';

type TabType = 'overview' | 'opportunity' | 'coCreation';

export default function StrategyPlanning() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    {
      id: 'overview' as TabType,
      label: '生意大盘观测',
      icon: BarChart3,
      description: '切分维度定义 + Mekko数据看板',
    },
    {
      id: 'opportunity' as TabType,
      label: '机会点甄别与提炼',
      icon: Target,
      description: '分析维度问答 + 机会提炼报告',
    },
    {
      id: 'coCreation' as TabType,
      label: '策略共创',
      icon: Users,
      description: '策略建议 + 编辑 + 优先级排序',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">策略制定</h1>
          <p className="text-gray-600">
            基于问题诊断，对应产出分产品增长的优先级、各产品的增长点以及从渠道及内部动作上抓手
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
          {activeTab === 'overview' && <MarketOverview />}
          {activeTab === 'opportunity' && <OpportunityAnalysis />}
          {activeTab === 'coCreation' && <StrategyCoCreation />}
        </div>
      </div>
    </div>
  );
}

