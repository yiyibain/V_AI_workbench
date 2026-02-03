import { useState, useMemo, useEffect } from 'react';
import { MarketDataPoint, DimensionConfig } from '../../types/strategy';
import { dimensionOptions } from '../../data/strategyMockData';
import { Filter, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { readExcelFile } from '../../services/excelService';
import MekkoChart from './MekkoChart';

export default function MarketOverview() {
  const [selectedBrand, setSelectedBrand] = useState<string>('立普妥');
  const [filters, setFilters] = useState<{
    province?: string[];
    channel?: string[];
  }>({});
  
  // 从数据中提取维度配置
  const [availableDimensions, setAvailableDimensions] = useState<DimensionConfig[]>([]);
  const [selectedXAxisKey, setSelectedXAxisKey] = useState<string>('dimension1');
  const [selectedYAxisKey, setSelectedYAxisKey] = useState<string>('dimension2');
  const [marketData, setMarketData] = useState<MarketDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // 获取维度值的辅助函数
  const getDimensionValue = (point: MarketDataPoint, dimensionKey: string): string => {
    return (point[dimensionKey] as string) || '';
  };
  
  // 从数据中提取渠道选项
  const channelOptions = useMemo(() => {
    if (marketData.length === 0) return [];
    
    // 找到渠道维度
    const channelDim = availableDimensions.find(d => 
      d.label.toLowerCase().includes('渠道') || 
      d.label.toLowerCase().includes('channel') ||
      d.label.toLowerCase().includes('店铺') ||
      d.label.toLowerCase().includes('平台')
    );
    
    if (!channelDim) return [];
    
    // 提取所有唯一的渠道值
    const channelSet = new Set<string>();
    marketData.forEach((point) => {
      const channelValue = getDimensionValue(point, channelDim.key);
      if (channelValue) {
        channelSet.add(channelValue);
      }
    });
    
    return Array.from(channelSet).sort();
  }, [marketData, availableDimensions]);
  
  useEffect(() => {
    // 读取Excel文件
    const loadExcelData = async () => {
      try {
        setLoading(true);
        // 添加时间戳防止缓存
        const timestamp = new Date().getTime();
        const excelPath = `/dataset.xlsx?t=${timestamp}`;
        
        console.log('开始加载Excel文件:', excelPath);
        const result = await readExcelFile(excelPath);
        
        console.log('Excel数据加载成功:', {
          数据条数: result.data.length,
          维度数量: result.dimensionConfigs.length,
          维度列表: result.dimensionConfigs.map(d => d.label)
        });
        
        setMarketData(result.data);
        setAvailableDimensions(result.dimensionConfigs);
        
        // 设置默认的横纵轴
        if (result.dimensionConfigs.length > 0) {
          setSelectedXAxisKey(result.dimensionConfigs[0].key);
          if (result.dimensionConfigs.length > 1) {
            setSelectedYAxisKey(result.dimensionConfigs[1].key);
          }
        }
      } catch (error) {
        console.error('加载Excel数据失败:', error);
        setMarketData([]);
        setAvailableDimensions([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadExcelData();
  }, []);
  
  // 处理渠道筛选变化
  const handleChannelFilterChange = (channel: string) => {
    setFilters((prev) => {
      const current = prev.channel || [];
      const newValue = current.includes(channel)
        ? current.filter((v: string) => v !== channel)
        : [...current, channel];
      return {
        ...prev,
        channel: newValue.length > 0 ? newValue : undefined,
      };
    });
  };

  // 处理数据，生成Mekko图表所需格式
  // Mekko图：X轴维度作为柱子，柱子宽度代表总市场份额，柱子内部按Y轴维度堆叠，高度代表占比
  const mekkoData = useMemo(() => {
    if (marketData.length === 0) return [];
    
    let filtered = [...marketData];

    // 应用渠道筛选
    if (filters.channel && filters.channel.length > 0) {
      const channelDim = availableDimensions.find(d => 
        d.label.toLowerCase().includes('渠道') || 
        d.label.toLowerCase().includes('channel') ||
        d.label.toLowerCase().includes('店铺') ||
        d.label.toLowerCase().includes('平台')
      );
      if (channelDim) {
        filtered = filtered.filter((d) => {
          const channelValue = getDimensionValue(d, channelDim.key);
          return filters.channel!.includes(channelValue);
        });
      }
    }

    // 应用省份筛选
    if (filters.province && filters.province.length > 0) {
      filtered = filtered.filter((d) => filters.province!.includes(d.province || ''));
    }

    // 计算总金额（用于计算百分比）
    const totalValue = filtered.reduce((sum, point) => sum + (point.value || 0), 0);
    
    if (totalValue === 0) return [];

    // 第一步：按X轴维度分组，计算每个X轴维度的总金额
    const xAxisGroups = new Map<string, number>();
    filtered.forEach((point) => {
      const xValue = getDimensionValue(point, selectedXAxisKey);
      if (!xValue) return;
      xAxisGroups.set(xValue, (xAxisGroups.get(xValue) || 0) + (point.value || 0));
    });

    // 第二步：为每个X轴维度，按Y轴维度分组，计算占比
    const result: Array<{
      xAxisValue: string;
      xAxisTotalValue: number;
      xAxisTotalShare: number; // X轴维度占总市场的百分比（决定柱子宽度）
      segments: Array<{
        yAxisValue: string;
        value: number;
        share: number; // Y轴维度在该X轴维度中的占比（决定柱子内段的高度）
      }>;
    }> = [];

    xAxisGroups.forEach((xAxisTotalValue, xAxisValue) => {
      // 计算该X轴维度占总市场的百分比（决定柱子宽度）
      const xAxisTotalShare = (xAxisTotalValue / totalValue) * 100;

      // 在该X轴维度内，按Y轴维度分组
      const yAxisGroups = new Map<string, number>();
      filtered.forEach((point) => {
        const xValue = getDimensionValue(point, selectedXAxisKey);
        const yValue = getDimensionValue(point, selectedYAxisKey);
        if (xValue === xAxisValue && yValue) {
          yAxisGroups.set(yValue, (yAxisGroups.get(yValue) || 0) + (point.value || 0));
        }
      });

      // 计算每个Y轴维度在该X轴维度中的占比
      const segments: Array<{
        yAxisValue: string;
        value: number;
        share: number;
      }> = [];

      yAxisGroups.forEach((value, yAxisValue) => {
        const share = (value / xAxisTotalValue) * 100;
        segments.push({ yAxisValue, value, share });
      });

      // 确保占比总和为100%
      const segmentSum = segments.reduce((s, seg) => s + seg.share, 0);
      if (Math.abs(segmentSum - 100) > 0.01) {
        const scale = 100 / segmentSum;
        segments.forEach(seg => {
          seg.share = seg.share * scale;
        });
      }

      // 按占比降序排序
      segments.sort((a, b) => b.share - a.share);

      result.push({
        xAxisValue,
        xAxisTotalValue,
        xAxisTotalShare,
        segments,
      });
    });

    // 按X轴总份额降序排序
    result.sort((a, b) => b.xAxisTotalShare - a.xAxisTotalShare);

    return result;
  }, [marketData, selectedXAxisKey, selectedYAxisKey, filters, availableDimensions]);

  // 识别机会点（市场份额大的细分市场）
  const opportunities = useMemo(() => {
    const allSegments: Array<{
      segment: string;
      totalShare: number;
      totalValue: number;
    }> = [];
    
    mekkoData.forEach((xAxisGroup) => {
      xAxisGroup.segments.forEach((segment) => {
        // 计算该细分市场占总市场的百分比
        const totalShare = (xAxisGroup.xAxisTotalShare * segment.share) / 100;
        allSegments.push({
          segment: `${xAxisGroup.xAxisValue} × ${segment.yAxisValue}`,
          totalShare,
          totalValue: segment.value,
        });
      });
    });
    
    return allSegments
      .filter((item) => item.totalShare > 5) // 市场份额大于5%
      .sort((a, b) => b.totalShare - a.totalShare)
      .slice(0, 5);
  }, [mekkoData]);

  const handleDimensionChange = (axis: 'xAxis' | 'yAxis', dimensionKey: string) => {
    if (axis === 'xAxis') {
      setSelectedXAxisKey(dimensionKey);
    } else {
      setSelectedYAxisKey(dimensionKey);
    }
  };

  // 获取当前选择的维度标签
  const getSelectedXAxisLabel = () => {
    const dim = availableDimensions.find(d => d.key === selectedXAxisKey);
    return dim ? dim.label : '横轴维度';
  };

  const getSelectedYAxisLabel = () => {
    const dim = availableDimensions.find(d => d.key === selectedYAxisKey);
    return dim ? dim.label : '纵轴维度';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-gray-600">正在加载数据...</p>
        </div>
      </div>
    );
  }

  if (marketData.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">未能加载数据，请检查 dataset.xlsx 文件</p>
        </div>
      </div>
    );
  }

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
        
        {/* 渠道筛选 */}
        {channelOptions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">选择渠道</label>
            <div className="flex flex-wrap gap-2">
              {channelOptions.map((channel) => (
                <button
                  key={channel}
                  onClick={() => handleChannelFilterChange(channel)}
                  className={clsx(
                    'px-3 py-1 rounded-lg text-sm transition-colors',
                    filters.channel?.includes(channel)
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                  )}
                >
                  {channel}
                </button>
              ))}
            </div>
          </div>
        )}
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
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {availableDimensions.length > 0 ? (
                availableDimensions.map((dim) => (
                  <button
                    key={dim.key}
                    onClick={() => handleDimensionChange('xAxis', dim.key)}
                    className={clsx(
                      'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                      selectedXAxisKey === dim.key
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                      dim.key === selectedYAxisKey && 'opacity-50 cursor-not-allowed'
                    )}
                    disabled={dim.key === selectedYAxisKey} // 不能与纵轴相同
                  >
                    {dim.label}
                  </button>
                ))
              ) : (
                <p className="text-gray-500 text-sm">暂无可用维度</p>
              )}
            </div>
          </div>

          {/* 纵轴选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">纵轴维度</label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
              {availableDimensions.length > 0 ? (
                availableDimensions.map((dim) => (
                  <button
                    key={dim.key}
                    onClick={() => handleDimensionChange('yAxis', dim.key)}
                    className={clsx(
                      'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                      selectedYAxisKey === dim.key
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                      dim.key === selectedXAxisKey && 'opacity-50 cursor-not-allowed'
                    )}
                    disabled={dim.key === selectedXAxisKey} // 不能与横轴相同
                  >
                    {dim.label}
                  </button>
                ))
              ) : (
                <p className="text-gray-500 text-sm">暂无可用维度</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mekko图表 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Mekko数据看板</h3>
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-primary-600">{selectedBrand}</span> - {getSelectedXAxisLabel()} × {getSelectedYAxisLabel()} 市场份额分析
          </p>
          {mekkoData.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              总计: {mekkoData.reduce((sum, item) => sum + item.xAxisTotalShare, 0).toFixed(2)}%
            </p>
          )}
        </div>

        {mekkoData.length > 0 ? (
          <MekkoChart data={mekkoData} />
        ) : (
          <div className="flex items-center justify-center h-96">
            <p className="text-gray-500">暂无数据可显示</p>
          </div>
        )}
      </div>

      {/* 机会点识别 */}
      {opportunities.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-bold text-gray-900">主要细分市场</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            市场份额大于5%的主要细分市场：
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
                        市场份额 {opp.totalShare.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      金额: {opp.totalValue.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 元
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
