import { useState } from 'react';
import { ProvincePerformance } from '../types';
import { mockProvincePerformance } from '../data/mockData';
import ProvinceDiagnosis from '../components/ProvinceDiagnosis';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function ProvinceAnalysis() {
  const [selectedProvince, setSelectedProvince] = useState<ProvincePerformance | null>(
    mockProvincePerformance[0]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'healthScore' | 'marketShare' | 'roi'>('healthScore');

  // 排序省份数据
  const sortedProvinces = [...mockProvincePerformance].sort((a, b) => {
    switch (sortBy) {
      case 'healthScore':
        return b.healthScore - a.healthScore;
      case 'marketShare':
        return b.marketShare - a.marketShare;
      case 'roi':
        return b.roi - a.roi;
      default:
        return 0;
    }
  });

  const filteredProvinces = sortedProvinces.filter((province) =>
    province.provinceName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getHealthColor = (level: string) => {
    switch (level) {
      case 'excellent':
        return '#10b981';
      case 'good':
        return '#3b82f6';
      case 'average':
        return '#f59e0b';
      case 'poor':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const chartData = mockProvincePerformance.map((p) => ({
    name: p.provinceName,
    healthScore: p.healthScore,
    marketShare: p.marketShare,
    roi: p.roi,
    level: p.healthLevel,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            省份间表现智能横向对比
          </h1>
          <p className="text-gray-600">
            各省表现诊断报告：健康度评分 + 核心维度对比，AI智能定位表现优异和不理想的省份
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* 整体概览图表 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">省份健康度概览</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="healthScore" name="健康度评分">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getHealthColor(entry.level)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧省份列表 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-24">
              <div className="mb-4">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索省份..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="healthScore">按健康度排序</option>
                  <option value="marketShare">按市场份额排序</option>
                  <option value="roi">按ROI排序</option>
                </select>
              </div>

              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {filteredProvinces.map((province) => (
                  <button
                    key={province.provinceId}
                    onClick={() => setSelectedProvince(province)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedProvince?.provinceId === province.provinceId
                        ? 'bg-primary-50 border-primary-500 text-primary-900'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-sm">{province.provinceName}</div>
                      <div
                        className={`text-xs px-2 py-1 rounded ${
                          province.healthLevel === 'excellent'
                            ? 'bg-green-100 text-green-700'
                            : province.healthLevel === 'good'
                            ? 'bg-blue-100 text-blue-700'
                            : province.healthLevel === 'average'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {province.healthScore}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>市场份额: {province.marketShare}%</div>
                      <div>ROI: {province.roi.toFixed(2)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧诊断报告 */}
          <div className="lg:col-span-3">
            {selectedProvince ? (
              <ProvinceDiagnosis province={selectedProvince} />
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-500">请从左侧选择一个省份查看诊断报告</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

