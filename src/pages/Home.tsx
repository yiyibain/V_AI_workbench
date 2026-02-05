import { Link } from 'react-router-dom';
import { FileText, TrendingUp, Sparkles, Target, DollarSign } from 'lucide-react';

export default function Home() {
  const features = [
    {
      title: '业务回顾',
      description: '链接多源市场与经营数据，AI自动生成诊断报告，识别各产品风险点',
      icon: FileText,
      color: 'bg-blue-500',
      link: '/product-analysis',
      status: 'active',
    },
    {
      title: '策略辅助',
      description: '基于业务回顾，智能生成策略建议和行动计划',
      icon: Target,
      color: 'bg-green-500',
      link: '/strategy-planning',
      status: 'active',
    },
    {
      title: '指标规划',
      description: '链接内部客观指标数据，结合策略辅助与历史数据，推导最能提升结果的过程指标及合理目标值',
      icon: TrendingUp,
      color: 'bg-purple-500',
      link: '/indicator-planning',
      status: 'active',
    },
    {
      title: '奖金设置',
      description: '结合全国整体策略制定，AI模拟不同奖金权重对行为与销量的影响，优化全国品牌间激励分配方案',
      icon: DollarSign,
      color: 'bg-orange-500',
      link: '/bonus-setting',
      status: 'active',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 英雄区域 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Sparkles className="w-12 h-12 text-primary-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              策略规划工具
            </h1>
            <p className="text-xl text-gray-600 mb-2">
              面向CEO和决策层的智能决策平台
            </p>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              内置晖致"三环"运营体系与产品矩阵知识库，所有AI建议均基于"以患者为中心"和"解限-渗透-做广"的业务逻辑生成
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* 四大板块 */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">核心功能板块</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isActive = feature.status === 'active';
              return (
                <div
                  key={index}
                  className={`bg-white rounded-lg shadow-sm border-2 transition-all ${
                    isActive
                      ? 'border-primary-500 hover:shadow-md cursor-pointer'
                      : 'border-gray-200 opacity-75'
                  }`}
                >
                  {isActive ? (
                    <Link to={feature.link}>
                      <div className="p-6">
                        <div className={`${feature.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                        <p className="text-gray-600 text-sm">{feature.description}</p>
                        <div className="mt-4 text-primary-600 text-sm font-medium">
                          立即使用 →
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="p-6">
                      <div className={`${feature.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 opacity-50`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600 text-sm">{feature.description}</p>
                      <div className="mt-4 text-gray-400 text-sm">
                        即将推出
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 核心特性 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">核心特性</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Sparkles className="w-6 h-6 text-primary-600 mr-3" />
                <h3 className="text-xl font-bold text-gray-900">全局 AI 业务大脑</h3>
              </div>
              <p className="text-gray-600">
                内置晖致"三环"运营体系与产品矩阵知识库，所有AI建议均基于"以患者为中心"和"解限-渗透-做广"的业务逻辑生成。
              </p>
            </div>
            <div>
              <div className="flex items-center mb-4">
                <TrendingUp className="w-6 h-6 text-primary-600 mr-3" />
                <h3 className="text-xl font-bold text-gray-900">实时 AI Copilot</h3>
              </div>
              <p className="text-gray-600">
                贯穿全流程的智能助手，实时监控用户操作，提供诊断分析、风险预警和优化建议。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

