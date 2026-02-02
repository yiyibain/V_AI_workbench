import { useState } from 'react';
import { ProductPerformance } from '../types';
import { mockProductPerformance } from '../data/mockData';
import ProductDiagnosis from '../components/ProductDiagnosis';
import MarketOverview from '../components/strategy/MarketOverview';
import { Search, BarChart3, FileText } from 'lucide-react';
import { clsx } from 'clsx';

type ViewType = 'diagnosis' | 'market';

export default function ProductAnalysis() {
  const [selectedProduct, setSelectedProduct] = useState<ProductPerformance | null>(
    mockProductPerformance[0]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [activeView, setActiveView] = useState<ViewType>('diagnosis');

  const filteredProducts = mockProductPerformance.filter((product) =>
    product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.moleculeFormula.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const views = [
    {
      id: 'diagnosis' as ViewType,
      label: '产品诊断报告',
      icon: FileText,
      description: '就数论数 + 数据解读，AI自动识别风险点',
    },
    {
      id: 'market' as ViewType,
      label: '生意大盘观测',
      icon: BarChart3,
      description: '切分维度定义 + Mekko数据看板',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            全国层面各产品表现整体解读
          </h1>
          <p className="text-gray-600">
            分产品诊断报告：就数论数 + 数据解读，AI自动识别风险点并提供优化建议
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* 视图切换标签 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {views.map((view) => {
              const Icon = view.icon;
              return (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id)}
                  className={clsx(
                    'flex-1 flex items-center justify-center space-x-2 px-6 py-4 text-sm font-medium transition-colors border-b-2',
                    activeView === view.id
                      ? 'border-primary-600 text-primary-700 bg-primary-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <div className="text-left">
                    <div>{view.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{view.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 内容区域 */}
        {activeView === 'diagnosis' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 左侧产品列表 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-24">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜索产品..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.productId}
                      onClick={() => setSelectedProduct(product)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        selectedProduct?.productId === product.productId
                          ? 'bg-primary-50 border-primary-500 text-primary-900'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-semibold text-sm">{product.productName}</div>
                      <div className="text-xs text-gray-500 mt-1">{product.moleculeFormula}</div>
                      <div className="text-xs text-gray-400 mt-1">{product.period}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 右侧诊断报告 */}
            <div className="lg:col-span-3">
              {selectedProduct ? (
                <ProductDiagnosis product={selectedProduct} />
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                  <p className="text-gray-500">请从左侧选择一个产品查看诊断报告</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <MarketOverview />
        )}
      </div>
    </div>
  );
}

