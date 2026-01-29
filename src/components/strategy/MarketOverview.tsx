import { useState, useMemo } from 'react';
import { MarketDimension, MarketDataPoint, MekkoConfig } from '../../types/strategy';
import { mockMarketData, dimensionOptions } from '../../data/strategyMockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Filter, TrendingUp, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

export default function MarketOverview() {
  const [selectedBrand, setSelectedBrand] = useState<string>('立普妥');
  const [selectedDimensions, setSelectedDimensions] = useState<MekkoConfig>({
    xAxis: 'channel',
    yAxis: 'department',
    metric: 'share',
  });
  const [filters, setFilters] = useState<{
    province?: string[];
  }>({});

  // 获取维度值的辅助函数
  const getDimensionValue = (point: MarketDataPoint, dimension: MarketDimension): string => {
    switch (dimension) {
      case 'channel':
        // dimension1是渠道
        return point.dimension1;
      case 'department':
        // dimension2是科室
        return point.dimension2;
      case 'brand':
        // 品牌在数据中不直接存储，通过筛选获得
        return point.dimension2;
      default:
        return point.dimension1;
    }
  };

  // 处理数据，生成Mekko图表所需格式（堆叠柱状图）
  const processedData = useMemo(() => {
    let filtered = [...mockMarketData];

    // 首先按品牌筛选（当前数据都是立普妥，所以暂时不过滤，后续可以扩展）
    // 注意：当前mockData都是立普妥的数据，如果后续添加其他品牌数据，需要在这里筛选
    // filtered = filtered.filter((point) => {
    //   return point.brand === selectedBrand;
    // });

    // 应用省份筛选
    if (filters.province && filters.province.length > 0) {
      filtered = filtered.filter((d) => filters.province!.includes(d.province || ''));
    }

    // 按选择的维度分组（排除brand维度，因为已经按品牌筛选了）
    const grouped = new Map<string, { 
      segment: string; 
      totalShare: number; 
      huiZhiShare: number; 
      competitorShare: number;
      otherShare: number;
    }>();

    filtered.forEach((point) => {
      // 获取横轴和纵轴的值
      const xValue = getDimensionValue(point, selectedDimensions.xAxis);
      const yValue = getDimensionValue(point, selectedDimensions.yAxis);
      
      // 构建细分市场标识
      const segment = `${xValue} × ${yValue}`;

      if (!grouped.has(segment)) {
        grouped.set(segment, {
          segment,
          totalShare: 0,
          huiZhiShare: 0,
          competitorShare: 0,
          otherShare: 0,
        });
      }

      const group = grouped.get(segment)!;
      // 累加市场份额
      group.totalShare += point.value;
      // 累加晖致和竞品份额（基于总份额的百分比）
      group.huiZhiShare += (point.huiZhiShare || 0) * (point.value / 100);
      group.competitorShare += (point.competitorShare || 0) * (point.value / 100);
    });

    // 转换为数组，计算其他份额，并按总份额排序
    const result = Array.from(grouped.values()).map((item) => {
      // 计算其他份额（总份额 - 晖致份额 - 竞品份额）
      item.otherShare = Math.max(0, item.totalShare - item.huiZhiShare - item.competitorShare);
      return item;
    });

    // 按总份额降序排序
    result.sort((a, b) => b.totalShare - a.totalShare);

    return result;
  }, [selectedBrand, selectedDimensions, filters]);

  // 识别机会点（晖致份额明显低、市场潜力大的细分市场）
  const opportunities = useMemo(() => {
    return processedData
      .filter((item) => item.huiZhiShare < 20 && item.totalShare > 15) // 份额低于20%且市场规模大于15
      .sort((a, b) => b.totalShare - a.totalShare)
      .slice(0, 5);
  }, [processedData]);

  const handleDimensionChange = (axis: 'xAxis' | 'yAxis', dimension: MarketDimension) => {
    setSelectedDimensions((prev) => ({
      ...prev,
      [axis]: dimension,
    }));
  };

  const handleFilterChange = (key: 'province', value: string) => {
    setFilters((prev) => {
      const current = prev[key] || [];
      const newValue = current.includes(value)
        ? current.filter((v: string) => v !== value)
        : [...current, value];
      return {
        ...prev,
        [key]: newValue.length > 0 ? newValue : undefined,
      };
    });
  };

  // 获取维度显示名称
  const getDimensionLabel = (dim: MarketDimension): string => {
    const labels: Record<MarketDimension, string> = {
      class: '类别',
      molecule: '分子式',
      department: '治疗科室',
      priceBand: '价格带',
      brand: '品牌',
      channel: '渠道',
      province: '省份',
    };
    return labels[dim] || dim;
  };

  return (
    <div className="space-y-6">
      {/* 品牌选择 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">选择品牌</label>
          <div className="flex flex-wrap gap-2">
            {dimensionOptions.brand.map((brand) => (
              <button
                key={brand}
                onClick={() => setSelectedBrand(brand)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  selectedBrand === brand
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 维度选择和筛选 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-bold text-gray-900">维度配置</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 横轴选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">横轴维度</label>
            <div className="flex flex-wrap gap-2">
              {(['channel', 'department'] as MarketDimension[]).map((dim) => (
                <button
                  key={dim}
                  onClick={() => handleDimensionChange('xAxis', dim)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                    selectedDimensions.xAxis === dim
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {getDimensionLabel(dim)}
                </button>
              ))}
            </div>
          </div>

          {/* 纵轴选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">纵轴维度</label>
            <div className="flex flex-wrap gap-2">
              {(['department', 'channel'] as MarketDimension[]).map((dim) => (
                <button
                  key={dim}
                  onClick={() => handleDimensionChange('yAxis', dim)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                    selectedDimensions.yAxis === dim
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  {getDimensionLabel(dim)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">省份筛选</label>
            <div className="flex flex-wrap gap-2">
              {dimensionOptions.province.map((province) => (
                <button
                  key={province}
                  onClick={() => handleFilterChange('province', province)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-sm transition-colors',
                    filters.province?.includes(province)
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  )}
                >
                  {province}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mekko图表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Mekko数据看板</h3>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-primary-600">{selectedBrand}</span> - {getDimensionLabel(selectedDimensions.xAxis === 'brand' ? selectedDimensions.yAxis : selectedDimensions.xAxis)} 市场份额分析
            </p>
          </div>

        <ResponsiveContainer width="100%" height={600}>
          <BarChart 
            data={processedData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="segment" 
              angle={-45}
              textAnchor="end"
              height={120}
              interval={0}
              tick={{ fontSize: 11 }}
            />
            <YAxis 
              domain={[0, 'dataMax']}
              label={{ value: '市场份额 (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value: any, name: string) => {
                return [`${value.toFixed(1)}%`, name];
              }}
              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
            />
            {/* 堆叠柱状图：晖致份额、竞品份额、其他份额 */}
            <Bar 
              dataKey="huiZhiShare" 
              name="晖致份额" 
              stackId="market"
              fill="#10b981"
            >
              {processedData.map((_, index) => (
                <Cell key={`cell-huiZhi-${index}`} fill="#10b981" />
              ))}
            </Bar>
            <Bar 
              dataKey="competitorShare" 
              name="竞品份额" 
              stackId="market"
              fill="#ef4444"
            >
              {processedData.map((_, index) => (
                <Cell key={`cell-competitor-${index}`} fill="#ef4444" />
              ))}
            </Bar>
            <Bar 
              dataKey="otherShare" 
              name="其他份额" 
              stackId="market"
              fill="#94a3b8"
            >
              {processedData.map((_, index) => (
                <Cell key={`cell-other-${index}`} fill="#94a3b8" />
              ))}
              {/* 在最后一个堆叠柱子上方显示总份额 */}
              <LabelList 
                dataKey="totalShare" 
                position="top" 
                formatter={(value: number) => `${value.toFixed(1)}%`}
                style={{ fill: '#333', fontSize: '11px', fontWeight: 'bold' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 机会点识别 */}
      {opportunities.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-bold text-gray-900">机会点识别</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            AI识别出以下值得晖致明显未布局/份额明显低、具备提升潜力的细分市场：
          </p>
          <div className="space-y-3">
            {opportunities.map((opp, index) => (
              <div
                key={index}
                className="border border-orange-200 rounded-lg p-4 bg-orange-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-gray-900">
                        {opp.segment}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-200 text-orange-800">
                        市场份额 {opp.totalShare.toFixed(1)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">晖致份额：</span>
                        <span className="font-semibold text-red-600">{opp.huiZhiShare.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">竞品份额：</span>
                        <span className="font-semibold text-gray-900">{opp.competitorShare.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">差距：</span>
                        <span className="font-semibold text-orange-600">{(opp.competitorShare - opp.huiZhiShare).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 提示：使用Chatbot进行维度问答 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>提示：</strong> 使用右下角的AI助手，可以询问"什么是有意义的看市场的维度？"或"我应该从哪个维度切入看市场？"
          AI会根据产品商业特性推荐适合的分析维度。
        </p>
      </div>
    </div>
  );
}

