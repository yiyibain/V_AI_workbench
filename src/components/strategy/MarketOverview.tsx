import { useState, useMemo, useEffect } from 'react';
import { MarketDataPoint, DimensionConfig } from '../../types/strategy';
import { dimensionOptions } from '../../data/strategyMockData';
import { Filter, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { readExcelFile } from '../../services/excelService';
import MekkoChart from './MekkoChart';
import { analyzeScissorsGaps, analyzeProblemsAndStrategies } from '../../services/problemAnalysisService';

export default function MarketOverview() {
  const [selectedBrand, setSelectedBrand] = useState<string>('立普妥');
  const [selectedYear, setSelectedYear] = useState<string>('2024'); // 年份筛选，写死2024
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
    const value = point[dimensionKey];
    if (value === undefined || value === null) {
      return '';
    }
    // 转换为字符串并去除首尾空格
    const strValue = String(value).trim();
    // 过滤掉空字符串和"_英文"结尾的值
    if (strValue === '' || strValue.endsWith('_英文')) {
      return '';
    }
    return strValue;
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
    // 读取Excel文件 - Mekko图使用 dataset.xlsx 作为数据源
    const loadExcelData = async () => {
      try {
        setLoading(true);
        // 添加时间戳防止缓存
        const timestamp = new Date().getTime();
        // Mekko图数据源：使用 dataset.xlsx
        const excelPath = `/dataset.xlsx?t=${timestamp}`;
        
        // console.log('开始加载Excel文件:', excelPath);
        const result = await readExcelFile(excelPath);
        
        // console.log('Excel数据加载成功:', {
        //   数据条数: result.data.length,
        //   维度数量: result.dimensionConfigs.length,
        //   维度列表: result.dimensionConfigs.map(d => d.label)
        // });
        
        setMarketData(result.data);
        // 过滤掉以"_英文"结尾的维度
        const filteredDimensions = result.dimensionConfigs.filter(
          (dim) => !dim.label.endsWith('_英文')
        );
        setAvailableDimensions(filteredDimensions);
        
        // console.log('📊 所有可用维度:', filteredDimensions.map(d => `${d.label} (${d.key})`));
        
        // 智能设置默认的横纵轴：只使用"活性成分"和"商品名"
        let defaultXAxisKey: string | null = null;
        let defaultYAxisKey: string | null = null;
        
        // 查找活性成分维度（可能是：活性成分、分子、molecule、通用名等）
        const moleculeDim = filteredDimensions.find(d => {
          const label = d.label.toLowerCase();
          return label.includes('活性成分') || label.includes('分子') || 
                 label.includes('molecule') || label.includes('通用名') ||
                 label.includes('活性') || label.includes('成分');
        });
        
        // 查找商品名维度（可能是：商品名、商品、产品名、产品等）
        const productDim = filteredDimensions.find(d => {
          const label = d.label.toLowerCase();
          return label.includes('商品名') || label.includes('商品') || 
                 label.includes('产品名') || label.includes('产品') ||
                 label.includes('product') || label.includes('商品名称');
        });
        
        // 如果找到了活性成分和商品名，使用它们（活性成分作为X轴，商品名作为Y轴）
        if (moleculeDim && productDim) {
          defaultXAxisKey = moleculeDim.key;
          defaultYAxisKey = productDim.key;
          // console.log('✅ 找到活性成分和商品名维度:', {
          //   xAxis: moleculeDim.label,
          //   yAxis: productDim.label
          // });
        } else {
          // 如果找不到，使用默认逻辑（前两个可用维度）
          if (filteredDimensions.length > 0) {
            defaultXAxisKey = filteredDimensions[0].key;
            if (filteredDimensions.length > 1) {
              defaultYAxisKey = filteredDimensions[1].key;
            }
          }
          // console.log('⚠️ 未找到活性成分或商品名，使用默认维度:', {
          //   xAxis: filteredDimensions[0]?.label || '未设置',
          //   yAxis: filteredDimensions[1]?.label || '未设置'
          // });
        }
        
        // 验证当前选择的维度是否仍然存在，如果不存在则重置
        const currentXAxisExists = filteredDimensions.some(d => d.key === selectedXAxisKey);
        const currentYAxisExists = filteredDimensions.some(d => d.key === selectedYAxisKey);
        
        // 设置X轴：优先使用新计算的默认值，如果当前选择的维度不存在则重置
        if (defaultXAxisKey) {
          setSelectedXAxisKey(defaultXAxisKey);
        } else if (!currentXAxisExists && filteredDimensions.length > 0) {
          // 如果当前X轴不存在且没有默认值，使用第一个可用维度
          setSelectedXAxisKey(filteredDimensions[0].key);
        }
        
        // 设置Y轴：优先使用新计算的默认值，如果当前选择的维度不存在则重置
        if (defaultYAxisKey) {
          setSelectedYAxisKey(defaultYAxisKey);
        } else if (!currentYAxisExists && filteredDimensions.length > 1) {
          // 如果当前Y轴不存在且没有默认值，使用第二个可用维度
          setSelectedYAxisKey(filteredDimensions[1].key);
        }
        
        // console.log('🎯 最终选择的维度:', {
        //   xAxis: defaultXAxisKey ? filteredDimensions.find(d => d.key === defaultXAxisKey)?.label : 
        //          (currentXAxisExists ? filteredDimensions.find(d => d.key === selectedXAxisKey)?.label : '未设置'),
        //   yAxis: defaultYAxisKey ? filteredDimensions.find(d => d.key === defaultYAxisKey)?.label : 
        //          (currentYAxisExists ? filteredDimensions.find(d => d.key === selectedYAxisKey)?.label : '未设置'),
        // });
      } catch (error) {
        // console.error('加载Excel数据失败:', error);
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
    if (marketData.length === 0) {
      // console.log('❌ mekkoData: marketData为空');
      return [];
    }
    
    if (!selectedXAxisKey || !selectedYAxisKey) {
      // console.log('❌ mekkoData: 维度未选择', { selectedXAxisKey, selectedYAxisKey });
      return [];
    }
    
    // console.log('🔄 开始计算mekkoData:', {
    //   totalDataPoints: marketData.length,
    //   xAxisKey: selectedXAxisKey,
    //   yAxisKey: selectedYAxisKey,
    //   xAxisLabel: availableDimensions.find(d => d.key === selectedXAxisKey)?.label,
    //   yAxisLabel: availableDimensions.find(d => d.key === selectedYAxisKey)?.label,
    // });
    
    let filtered = [...marketData];

    // 应用年份筛选（默认2024）
    const yearDim = availableDimensions.find(d => {
      const label = d.label.toLowerCase();
      return label.includes('年') || label.includes('year') || label === '年';
    });
    if (yearDim && selectedYear) {
      filtered = filtered.filter((d) => {
        const yearValue = getDimensionValue(d, yearDim.key);
        return yearValue === selectedYear || String(yearValue) === String(selectedYear);
      });
      // console.log(`📅 应用年份筛选: ${selectedYear}, 筛选后数据量: ${filtered.length}`);
    }

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
    
    if (totalValue === 0) {
      // console.log('❌ mekkoData: 过滤后总金额为0');
      return [];
    }

    // console.log('💰 过滤后数据统计:', {
    //   filteredCount: filtered.length,
    //   totalValue: totalValue.toLocaleString('zh-CN'),
    // });

    // 第一步：按X轴维度分组，计算每个X轴维度的总金额
    const xAxisGroups = new Map<string, number>();
    filtered.forEach((point) => {
      const xValue = getDimensionValue(point, selectedXAxisKey);
      if (!xValue || xValue.trim() === '') {
        return;
      }
      // 过滤掉以"_英文"结尾的维度
      if (xValue.endsWith('_英文')) {
        return;
      }
      
      const pointValue = point.value || 0;
      if (pointValue > 0) {
        xAxisGroups.set(xValue, (xAxisGroups.get(xValue) || 0) + pointValue);
      }
    });

    // console.log('📈 X轴维度分组结果:', {
    //   uniqueXValues: xAxisGroups.size,
    //   validPoints: validXAxisCount,
    //   invalidPoints: invalidXAxisCount,
    //   sampleXValues: Array.from(xAxisGroups.keys()).slice(0, 5),
    // });

    if (xAxisGroups.size === 0) {
      // console.log('❌ mekkoData: X轴维度分组后无数据', {
      //   selectedXAxisKey,
      //   totalPoints: filtered.length,
      //   validXAxisCount,
      //   invalidXAxisCount,
      // });
      return [];
    }

    // 检查Y轴维度值是否存在
    const yAxisValueSet = new Set<string>();
    filtered.forEach((point) => {
      const yValue = getDimensionValue(point, selectedYAxisKey);
      if (yValue && yValue.trim() !== '' && !yValue.endsWith('_英文')) {
        yAxisValueSet.add(yValue);
      }
    });
    
    // console.log('📊 Y轴维度值统计:', {
    //   uniqueYValues: yAxisValueSet.size,
    //   sampleYValues: Array.from(yAxisValueSet).slice(0, 10),
    // });

    if (yAxisValueSet.size === 0) {
      // console.log('❌ mekkoData: Y轴维度没有有效值', {
      //   selectedYAxisKey,
      //   yAxisLabel: availableDimensions.find(d => d.key === selectedYAxisKey)?.label,
      // });
      return [];
    }

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

    // 调试：检查第一个X轴值的Y轴数据（已禁用）
    // const firstXAxisValue = Array.from(xAxisGroups.keys())[0];
    // if (firstXAxisValue) {
    //   filtered.forEach((point) => {
    //     const xValue = getDimensionValue(point, selectedXAxisKey);
    //     const yValue = getDimensionValue(point, selectedYAxisKey);
    //     if (xValue === firstXAxisValue) {
    //       // 调试逻辑
    //     }
    //   });
    // }

    xAxisGroups.forEach((xAxisTotalValue, xAxisValue) => {
      // 计算该X轴维度占总市场的百分比（决定柱子宽度）
      const xAxisTotalShare = (xAxisTotalValue / totalValue) * 100;

      // 在该X轴维度内，按Y轴维度分组
      const yAxisGroups = new Map<string, number>();
      
      filtered.forEach((point) => {
        const xValue = getDimensionValue(point, selectedXAxisKey);
        const yValue = getDimensionValue(point, selectedYAxisKey);
        
        if (xValue === xAxisValue) {
          // 检查Y轴值是否有效（非空且非"_英文"结尾）
          if (yValue && yValue.trim() !== '' && !yValue.endsWith('_英文')) {
            const pointValue = point.value || 0;
            if (pointValue > 0) {
              yAxisGroups.set(yValue, (yAxisGroups.get(yValue) || 0) + pointValue);
            }
          }
        }
      });

      // 调试：输出第一个X轴值的Y轴分组结果
      // if (xAxisValue === firstXAxisValue) {
      //   console.log('🔍 第一个X轴值的Y轴分组结果:', {
      //     xAxisValue,
      //     yAxisGroupsCount: yAxisGroups.size,
      //     yAxisMatchedCount,
      //     yAxisUnmatchedCount,
      //     sampleYAxisValues: Array.from(yAxisGroups.keys()).slice(0, 5),
      //   });
      // }

      // 计算每个Y轴维度在该X轴维度中的占比
      const segments: Array<{
        yAxisValue: string;
        value: number;
        share: number;
      }> = [];

      // 如果该X轴维度下没有有效的Y轴数据，创建一个默认段（100%）
      if (yAxisGroups.size === 0) {
        // console.warn(`⚠️ X轴值"${xAxisValue}"下没有有效的Y轴数据，将显示为完整柱子`);
        // 创建一个默认段，占100%
        segments.push({
          yAxisValue: '其他',
          value: xAxisTotalValue,
          share: 100,
        });
      }

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

    // console.log('✅ mekkoData计算结果:', {
    //   totalItems: result.length,
    //   totalShare: result.reduce((sum, item) => sum + item.xAxisTotalShare, 0).toFixed(2) + '%',
    //   sampleItem: result[0] ? {
    //     xAxisValue: result[0].xAxisValue,
    //     xAxisTotalValue: result[0].xAxisTotalValue,
    //     segmentsCount: result[0].segments.length,
    //     topSegment: result[0].segments[0] ? {
    //       yAxisValue: result[0].segments[0].yAxisValue,
    //       share: result[0].segments[0].share.toFixed(2) + '%',
    //     } : null,
    //   } : null,
    // });

    return result;
  }, [marketData, selectedXAxisKey, selectedYAxisKey, filters, availableDimensions, selectedYear, getDimensionValue]);


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
      {/* 品牌选择和年份筛选 */}
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
        
        {/* 年份筛选 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">选择年份</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedYear('2024')}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedYear === '2024'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              2024
            </button>
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
          <MekkoChart 
            data={mekkoData} 
            marketData={marketData}
            selectedXAxisKey={selectedXAxisKey}
            selectedYAxisKey={selectedYAxisKey}
            getDimensionValue={getDimensionValue}
            availableDimensions={availableDimensions}
          />
        ) : (
          <div className="flex items-center justify-center h-96">
            <p className="text-gray-500">暂无数据可显示</p>
          </div>
        )}
      </div>

      {/* 问题定位 */}
      <ProblemIdentification 
        marketData={marketData}
        mekkoData={mekkoData}
        selectedXAxisKey={selectedXAxisKey}
        selectedYAxisKey={selectedYAxisKey}
        availableDimensions={availableDimensions}
        getDimensionValue={getDimensionValue}
        selectedBrand={selectedBrand}
      />

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

// 问题定位组件
interface ProblemIdentificationProps {
  marketData: MarketDataPoint[];
  mekkoData: Array<{
    xAxisValue: string;
    xAxisTotalValue: number;
    xAxisTotalShare: number;
    segments: Array<{
      yAxisValue: string;
      value: number;
      share: number;
    }>;
  }>;
  selectedXAxisKey: string;
  selectedYAxisKey: string;
  availableDimensions: DimensionConfig[];
  getDimensionValue: (point: MarketDataPoint, dimensionKey: string) => string;
  selectedBrand: string;
}

function ProblemIdentification({
  marketData,
  mekkoData,
  selectedXAxisKey,
  selectedYAxisKey,
  availableDimensions,
  getDimensionValue,
  selectedBrand,
}: ProblemIdentificationProps) {
  // AI分析状态
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'gaps' | 'problems' | 'causes' | 'strategies' | null>(null);
  
  // 步骤1：剪刀差（第一步不包含possibleReasons）
  const [aiScissorsGaps, setAiScissorsGaps] = useState<Array<{
    title: string;
    phenomenon: string;
    possibleReasons?: string; // 第一步不包含，第二步才添加
  }>>([]);
  const [editingGaps, setEditingGaps] = useState(false);
  const [newGapTitle, setNewGapTitle] = useState('');
  const [newGapPhenomenon, setNewGapPhenomenon] = useState('');
  // 第一步不包含可能原因
  
  
  // 步骤3：成因分析
  const [aiCauses, setAiCauses] = useState<Array<{
    problem: string;
    environmentFactors?: string;
    commercialFactors?: string;
    productFactors?: string;
    resourceFactors?: string;
  }>>([]);
  const [editingCauses, setEditingCauses] = useState(false);
  
  // 步骤4：策略建议
  const [aiStrategies, setAiStrategies] = useState<Array<{
    problem: string;
    strategies: string[];
  }>>([]);
  const [editingStrategies, setEditingStrategies] = useState(false);
  
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

  // 找出品牌维度
  const brandDimension = useMemo(() => {
    return availableDimensions.find(d => 
      d.label.toLowerCase().includes('品牌') || 
      d.label.toLowerCase().includes('brand')
    );
  }, [availableDimensions]);

  // 晖致品牌列表（包括立普妥等）
  const huiZhiBrands = useMemo(() => {
    const brands = new Set<string>();
    if (brandDimension) {
      const huiZhiKeywords = ['立普妥', '络活喜', '晖致', 'hui zhi', 'huizhi', 'lipitor', 'norvasc'];
      marketData.forEach(point => {
        const brand = getDimensionValue(point, brandDimension.key);
        if (brand) {
          const brandLower = brand.toLowerCase();
          // 检查是否包含晖致关键词，或者直接匹配selectedBrand
          if (huiZhiKeywords.some(keyword => brand.includes(keyword) || brandLower.includes(keyword.toLowerCase())) || 
              brand === selectedBrand) {
            brands.add(brand);
          }
        }
      });
    }
    return Array.from(brands);
  }, [marketData, brandDimension, getDimensionValue, selectedBrand]);

  // 主要竞品列表
  const competitorBrands = useMemo(() => {
    const brands = new Set<string>();
    if (brandDimension) {
      marketData.forEach(point => {
        const brand = getDimensionValue(point, brandDimension.key);
        if (brand && !huiZhiBrands.includes(brand)) {
          brands.add(brand);
        }
      });
    }
    // 返回市场份额最大的几个竞品
    const brandShares = Array.from(brands).map(brand => {
      const total = marketData
        .filter(p => getDimensionValue(p, brandDimension!.key) === brand)
        .reduce((sum, p) => sum + (p.value || 0), 0);
      return { brand, total };
    }).sort((a, b) => b.total - a.total);
    
    return brandShares.slice(0, 3).map(b => b.brand);
  }, [marketData, brandDimension, huiZhiBrands, getDimensionValue]);

  // 1. 定位"剪刀差"：找出晖致份额明显低于竞品的区域
  const gapAnalysis = useMemo(() => {
    if (!brandDimension || huiZhiBrands.length === 0 || competitorBrands.length === 0) {
      return [];
    }

    const gaps: Array<{
      xAxisValue: string;
      yAxisValue: string;
      huiZhiShare: number;
      competitorShare: number;
      gap: number;
      totalValue: number;
    }> = [];

    // 遍历所有X轴和Y轴组合
    mekkoData.forEach(column => {
      column.segments.forEach(segment => {
        const xValue = column.xAxisValue;
        const yValue = segment.yAxisValue;

        // 计算该组合下晖致和竞品的份额
        const huiZhiTotal = marketData
          .filter(p => {
            const x = getDimensionValue(p, selectedXAxisKey);
            const y = getDimensionValue(p, selectedYAxisKey);
            const brand = getDimensionValue(p, brandDimension.key);
            return x === xValue && y === yValue && huiZhiBrands.includes(brand);
          })
          .reduce((sum, p) => sum + (p.value || 0), 0);

        const competitorTotal = marketData
          .filter(p => {
            const x = getDimensionValue(p, selectedXAxisKey);
            const y = getDimensionValue(p, selectedYAxisKey);
            const brand = getDimensionValue(p, brandDimension.key);
            return x === xValue && y === yValue && competitorBrands.includes(brand);
          })
          .reduce((sum, p) => sum + (p.value || 0), 0);

        const total = marketData
          .filter(p => {
            const x = getDimensionValue(p, selectedXAxisKey);
            const y = getDimensionValue(p, selectedYAxisKey);
            return x === xValue && y === yValue;
          })
          .reduce((sum, p) => sum + (p.value || 0), 0);

        if (total > 0) {
          const huiZhiShare = (huiZhiTotal / total) * 100;
          const competitorShare = (competitorTotal / total) * 100;
          const gap = competitorShare - huiZhiShare;

          // 只记录差距明显的情况（差距>10%且总金额较大）
          if (gap > 10 && total > 1000) {
            gaps.push({
              xAxisValue: xValue,
              yAxisValue: yValue,
              huiZhiShare,
              competitorShare,
              gap,
              totalValue: total,
            });
          }
        }
      });
    });

    return gaps.sort((a, b) => b.gap - a.gap).slice(0, 5);
  }, [marketData, mekkoData, selectedXAxisKey, selectedYAxisKey, brandDimension, huiZhiBrands, competitorBrands, getDimensionValue]);

  // 2. 生成分析论述
  const analysisText = useMemo(() => {
    if (gapAnalysis.length === 0) {
      return '当前数据未发现明显的份额差距问题。';
    }

    const topGap = gapAnalysis[0];
    const xAxisLabel = availableDimensions.find(d => d.key === selectedXAxisKey)?.label || '横轴维度';
    const yAxisLabel = availableDimensions.find(d => d.key === selectedYAxisKey)?.label || '纵轴维度';
    
    // 查找主要竞品名称
    const mainCompetitor = competitorBrands[0] || '竞品';
    
    // 查找是否有更细粒度的下钻维度
    const additionalDimensions = availableDimensions.filter(d => 
      d.key !== selectedXAxisKey && d.key !== selectedYAxisKey && d.key !== brandDimension?.key
    );

    let text = `${selectedBrand}在${xAxisLabel}为"${topGap.xAxisValue}"、${yAxisLabel}为"${topGap.yAxisValue}"的细分市场中，`;
    text += `分子式内份额为${topGap.huiZhiShare.toFixed(1)}%，而${mainCompetitor}为${topGap.competitorShare.toFixed(1)}%，差距达${topGap.gap.toFixed(1)}个百分点。`;

    if (additionalDimensions.length > 0) {
      const additionalDim = additionalDimensions[0];
      text += `进一步拆分来看，主要问题集中在${additionalDim.label}维度。`;
    }

    return text;
  }, [gapAnalysis, selectedBrand, selectedXAxisKey, selectedYAxisKey, availableDimensions, competitorBrands, brandDimension]);


  // 触发AI分析 - 只分析第一步
  const handleAIAnalysis = async () => {
    console.log('🎯 用户点击AI智能分析按钮');
    console.log('📊 数据检查 - mekkoData长度:', mekkoData.length, 'marketData长度:', marketData.length);
    
    if (mekkoData.length === 0 || marketData.length === 0) {
      alert('请先确保有数据可分析');
      return;
    }

    console.log('✅ 数据检查通过，开始AI分析');
    setAiAnalysisLoading(true);
    setShowAIAnalysis(true);
    setCurrentStep('gaps');

    try {
      console.log('🎯 开始第一步：全面扫描数据，生成剪刀差');
      // 第一步：全面扫描数据，生成剪刀差（AI会自动完成合并，最终输出10条）
      const gapsResult = await analyzeScissorsGaps(
        marketData,
        mekkoData,
        selectedXAxisKey,
        selectedYAxisKey,
        availableDimensions,
        selectedBrand,
        10 // 最终输出10条（AI会先扫描生成更多，然后合并，最后输出10条）
      );
      
      // AI已经完成了合并，直接显示最终结果
      setAiScissorsGaps(gapsResult.scissorsGaps.slice(0, 10));
      setEditingGaps(true);
    } catch (error) {
      console.error('❌ AI分析失败:', error);
      alert('AI分析失败，请稍后重试');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // 确认步骤1（剪刀差）并进入步骤2
  const handleConfirmGaps = async () => {
    if (aiScissorsGaps.length === 0) {
      alert('请至少保留一条剪刀差分析');
      return;
    }
    
    setEditingGaps(false);
    setCurrentStep('causes'); // 进入第二步：深挖原因
    setAiAnalysisLoading(true);

    try {
      // 第二步：深挖背后原因（基于确认的剪刀差）
      const problemsResult = await analyzeProblemsAndStrategies(
        aiScissorsGaps,
        selectedBrand,
        marketData,
        availableDimensions,
        undefined,
        5,
        undefined // 不传入问题列表，直接基于剪刀差分析成因
      );
      
      setAiCauses(problemsResult.causes.slice(0, 5));
      setAiStrategies(problemsResult.strategies.slice(0, 5));
      setEditingCauses(true);
    } catch (error) {
      // console.error('成因分析失败:', error);
      alert('成因分析失败，请稍后重试');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // 确认步骤2（成因和策略）
  const handleConfirmCauses = () => {
    setEditingCauses(false);
    setEditingStrategies(false);
    setCurrentStep('strategies');
  };

  // 删除剪刀差条目
  const handleDeleteGap = (index: number) => {
    setAiScissorsGaps(prev => prev.filter((_, i) => i !== index));
  };

  // 添加剪刀差条目
  const handleAddGap = () => {
    if (!newGapTitle.trim() || !newGapPhenomenon.trim()) {
      alert('请填写标题和现象描述');
      return;
    }
    if (aiScissorsGaps.length >= 10) {
      alert('最多只能添加10条剪刀差');
      return;
    }
    setAiScissorsGaps(prev => [...prev, {
      title: newGapTitle,
      phenomenon: newGapPhenomenon,
      // 第一步不包含possibleReasons
    }]);
    setNewGapTitle('');
    setNewGapPhenomenon('');
  };


  // 删除成因条目
  const handleDeleteCause = (index: number) => {
    setAiCauses(prev => prev.filter((_, i) => i !== index));
  };

  // 删除策略条目
  const handleDeleteStrategy = (index: number) => {
    setAiStrategies(prev => prev.filter((_, i) => i !== index));
  };

  // 始终显示问题定位板块，让用户可以点击AI智能分析
  // 移除了条件判断，确保板块始终显示
  // if (gapAnalysis.length === 0 && !brandDimension && !showAIAnalysis) {
  //   return null;
  // }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <h3 className="text-xl font-bold text-gray-900">问题定位</h3>
        </div>
        <button
          onClick={handleAIAnalysis}
          disabled={aiAnalysisLoading || mekkoData.length === 0}
          className={clsx(
            'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            aiAnalysisLoading || mekkoData.length === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          )}
        >
          {aiAnalysisLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI分析中...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>AI智能分析</span>
            </>
          )}
        </button>
      </div>

      {/* AI分析结果 */}
      {showAIAnalysis && (
        <div className="mb-6 border-t pt-6">
          <div className="flex items-center space-x-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h4 className="text-lg font-semibold text-gray-900">AI智能分析结果</h4>
          </div>

          {/* 步骤1：剪刀差分析 */}
          {currentStep && currentStep !== null && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-md font-semibold text-gray-800">
                  第一步：全面扫描数据，生成剪刀差 {aiScissorsGaps.length > 0 && `(${aiScissorsGaps.length}/10)`}
                </h5>
                {editingGaps && (
                  <span className="text-xs text-gray-500">编辑模式：可删除或添加条目（AI已自动合并重复项目）</span>
                )}
              </div>
              
              {aiScissorsGaps.length > 0 && (
                <div className="space-y-3 mb-4">
                  {aiScissorsGaps.map((gap, index) => (
                    <div
                      key={index}
                      className="border border-primary-200 rounded-lg p-4 bg-primary-50 relative"
                    >
                      {editingGaps && (
                        <button
                          onClick={() => handleDeleteGap(index)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          title="删除"
                        >
                          <span className="text-lg">×</span>
                        </button>
                      )}
                      <div className="font-semibold text-gray-900 mb-2">{gap.title}</div>
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">现象：</span>
                        {gap.phenomenon}
                      </div>
                      {/* 第一步不显示可能原因，原因分析在第二步进行 */}
                    </div>
                  ))}
                </div>
              )}

              {editingGaps && (
                <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 mb-4">
                  <h6 className="text-sm font-medium text-gray-700 mb-3">添加新剪刀差</h6>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newGapTitle}
                      onChange={(e) => setNewGapTitle(e.target.value)}
                      placeholder="标题（例如：零售渠道分子式内份额落后）"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <textarea
                      value={newGapPhenomenon}
                      onChange={(e) => setNewGapPhenomenon(e.target.value)}
                      placeholder="现象描述（必须引用真实数据，清晰说明时间框架、增速计算口径）"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                      rows={3}
                    />
                    {/* 第一步不包含可能原因输入框，原因分析在第二步进行 */}
                    <button
                      onClick={handleAddGap}
                      disabled={aiScissorsGaps.length >= 15}
                      className={clsx(
                        'px-4 py-2 rounded-lg text-sm font-medium',
                        aiScissorsGaps.length >= 15
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      )}
                    >
                      添加
                    </button>
                  </div>
                </div>
              )}

              {editingGaps && (
                <button
                  onClick={handleConfirmGaps}
                  disabled={aiScissorsGaps.length === 0 || aiAnalysisLoading}
                  className={clsx(
                    'w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    aiScissorsGaps.length === 0 || aiAnalysisLoading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  )}
                >
                  {aiAnalysisLoading ? '分析中...' : '确认并进入第二步'}
                </button>
              )}
            </div>
          )}

          {/* 步骤2：深挖背后原因 */}
          {(currentStep === 'causes' || currentStep === 'strategies') && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-md font-semibold text-gray-800">
                  第二步：深挖背后原因（优先使用数据库维度，必要时联网搜索） {aiCauses.length > 0 && `(${aiCauses.length}/5)`}
                </h5>
                {editingCauses && (
                  <span className="text-xs text-gray-500">编辑模式：可删除条目</span>
                )}
              </div>
              
              {aiCauses.length > 0 && (
                <div className="space-y-4 mb-4">
                  {aiCauses.map((cause, index) => (
                    <div
                      key={index}
                      className="border border-blue-200 rounded-lg p-4 bg-blue-50 relative"
                    >
                      {editingCauses && (
                        <button
                          onClick={() => handleDeleteCause(index)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          title="删除"
                        >
                          <span className="text-lg">×</span>
                        </button>
                      )}
                      <div className="font-semibold text-gray-900 mb-3">{cause.problem}</div>
                      <div className="space-y-2 text-sm">
                        {cause.environmentFactors && (
                          <div>
                            <span className="font-medium text-blue-700">环境因素：</span>
                            <span className="text-gray-700 ml-2">{cause.environmentFactors}</span>
                          </div>
                        )}
                        {cause.commercialFactors && (
                          <div>
                            <span className="font-medium text-blue-700">商业推广因素：</span>
                            <span className="text-gray-700 ml-2">{cause.commercialFactors}</span>
                          </div>
                        )}
                        {cause.productFactors && (
                          <div>
                            <span className="font-medium text-blue-700">产品因素：</span>
                            <span className="text-gray-700 ml-2">{cause.productFactors}</span>
                          </div>
                        )}
                        {cause.resourceFactors && (
                          <div>
                            <span className="font-medium text-blue-700">资源分配因素：</span>
                            <span className="text-gray-700 ml-2">{cause.resourceFactors}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {editingCauses && (
                <button
                  onClick={handleConfirmCauses}
                  disabled={aiCauses.length === 0}
                  className={clsx(
                    'w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    aiCauses.length === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  )}
                >
                  确认完成
                </button>
              )}
            </div>
          )}

          {/* 步骤4：策略建议 */}
          {currentStep === 'strategies' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h5 className="text-md font-semibold text-gray-800">4. 具体可执行策略 {aiStrategies.length > 0 && `(${aiStrategies.length}/5)`}</h5>
                {editingStrategies && (
                  <span className="text-xs text-gray-500">编辑模式：可删除条目</span>
                )}
              </div>
              
              {aiStrategies.length > 0 && (
                <div className="space-y-4">
                  {aiStrategies.map((strategy, index) => (
                    <div
                      key={index}
                      className="border border-green-200 rounded-lg p-4 bg-green-50 relative"
                    >
                      {editingStrategies && (
                        <button
                          onClick={() => handleDeleteStrategy(index)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                          title="删除"
                        >
                          <span className="text-lg">×</span>
                        </button>
                      )}
                      <div className="font-semibold text-gray-900 mb-3">{strategy.problem}</div>
                      <div className="space-y-2">
                        {strategy.strategies.map((s, sIndex) => (
                          <div
                            key={sIndex}
                            className="flex items-start space-x-2 text-sm text-gray-700"
                          >
                            <span className="text-green-600 font-bold mt-0.5">{sIndex + 1}.</span>
                            <span className="flex-1">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* 1. 剪刀差定位（基础分析） */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">
          1. 值得关注的"剪刀差"定位（基础分析）
        </h4>
        {gapAnalysis.length > 0 ? (
          <div className="space-y-3">
            {gapAnalysis.map((gap, index) => {
              const xAxisLabel = availableDimensions.find(d => d.key === selectedXAxisKey)?.label || '横轴维度';
              const yAxisLabel = availableDimensions.find(d => d.key === selectedYAxisKey)?.label || '纵轴维度';
              
              return (
                <div
                  key={index}
                  className="border border-red-200 rounded-lg p-4 bg-red-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-2">
                        {xAxisLabel}: {gap.xAxisValue} × {yAxisLabel}: {gap.yAxisValue}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">晖致份额:</span>
                          <span className="ml-2 font-semibold text-red-600">{gap.huiZhiShare.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">竞品份额:</span>
                          <span className="ml-2 font-semibold text-gray-900">{gap.competitorShare.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600">差距:</span>
                          <span className="ml-2 font-semibold text-red-700">{gap.gap.toFixed(1)}个百分点</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        总金额: {gap.totalValue.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 元
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-gray-500 text-sm bg-gray-50 border border-gray-200 rounded-lg p-4">
            当前数据未发现明显的份额差距问题。
          </div>
        )}
      </div>

      {/* 2. 分析论述 */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">
          2. 进一步分析与下钻
        </h4>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {analysisText}
          </p>
        </div>
      </div>

    </div>
  );
}
