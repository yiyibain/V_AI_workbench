import { Link } from 'react-router-dom';
import { FileText, BarChart3, TrendingUp, Sparkles, AlertTriangle, Target } from 'lucide-react';

export default function Home() {
  const features = [
    {
      title: '公司体检报告',
      description: '链接多源市场与经营数据，AI自动生成诊断报告，识别各产品风险点',
      icon: FileText,
      color: 'bg-blue-500',
      link: '/product-analysis',
      status: 'active',
    },
    {
      title: '策略制定',
      description: '基于体检报告，智能生成策略建议和行动计划',
      icon: Target,
      color: 'bg-green-500',
      link: '/strategy-planning',
      status: 'active',
    },
    {
      title: '指标规划',
      description: '设定和追踪关键业务指标，确保策略落地',
      icon: TrendingUp,
      color: 'bg-purple-500',
      link: '#',
      status: 'coming-soon',
    },
    {
      title: '奖金设置',
      description: '基于指标完成情况，智能计算和分配奖金',
      icon: BarChart3,
      color: 'bg-orange-500',
      link: '#',
      status: 'coming-soon',
    },
  ];

  const modules = [
    {
      title: '全国层面各产品表现整体解读',
      description: '分产品诊断报告：就数论数 + 数据解读，AI自动识别风险点',
      link: '/product-analysis',
      icon: AlertTriangle,
    },
    {
      title: '省份间表现智能横向对比',
      description: '各省表现诊断报告：健康度评分 + 核心维度对比',
      link: '/province-analysis',
      icon: BarChart3,
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

        {/* 公司体检报告模块 */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">公司体检报告</h2>
              <p className="text-gray-600">
                链接多源市场与经营数据，AI自动生成诊断报告，识别各产品风险点
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-2 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>已上线</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <Link
                  key={index}
                  to={module.link}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start space-x-4">
                    <div className="bg-primary-50 rounded-lg p-3 group-hover:bg-primary-100 transition-colors">
                      <Icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                        {module.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">{module.description}</p>
                      <div className="text-primary-600 text-sm font-medium">
                        查看详情 →
                      </div>
                    </div>
                  </div>
                </Link>
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

