import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { MarketDataPoint, DimensionConfig } from '../../types/strategy';
import { dimensionOptions } from '../../data/strategyMockData';
import { Filter, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import { readExcelFile } from '../../services/excelService';
import MekkoChart from './MekkoChart';
import { analyzeScissorsGaps, analyzeProblemsAndStrategies } from '../../services/problemAnalysisService';

// 全局缓存，避免重复加载
let excelDataCache: {
  data: MarketDataPoint[];
  dimensionConfigs: DimensionConfig[];
  timestamp: number;
} | null = null;

const CACHE_DURATION = 30 * 60 * 1000; // 缓存30分钟（延长缓存时间）

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
  const isLoadingRef = useRef<boolean>(false); // 防止重复加载
  
  // 获取维度值的辅助函数 - 使用useCallback避免每次渲染都重新创建
  const getDimensionValue = useCallback((point: MarketDataPoint, dimensionKey: string): string => {
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
  }, []);
  
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
      // 防止重复加载
      if (isLoadingRef.current) {
        console.log('⏸️ Excel文件正在加载中，跳过重复请求');
        return;
      }

      // 检查缓存
      const now = new Date().getTime();
      if (excelDataCache && (now - excelDataCache.timestamp) < CACHE_DURATION) {
        console.log('✅ 使用缓存的Excel数据');
        setMarketData(excelDataCache.data);
        const filteredDimensions = excelDataCache.dimensionConfigs.filter(
          (dim) => !dim.label.endsWith('_英文')
        );
        setAvailableDimensions(filteredDimensions);
        
        // 设置默认维度
        const moleculeDim = filteredDimensions.find(d => {
          const label = d.label.toLowerCase();
          return label.includes('活性成分') || label.includes('分子') || 
                 label.includes('molecule') || label.includes('通用名') ||
                 label.includes('活性') || label.includes('成分');
        });
        const productDim = filteredDimensions.find(d => {
          const label = d.label.toLowerCase();
          return label.includes('商品名') || label.includes('商品') || 
                 label.includes('产品名') || label.includes('产品') ||
                 label.includes('product') || label.includes('商品名称');
        });
        
        if (moleculeDim && productDim) {
          setSelectedXAxisKey(moleculeDim.key);
          setSelectedYAxisKey(productDim.key);
        } else if (filteredDimensions.length > 0) {
          setSelectedXAxisKey(filteredDimensions[0].key);
          if (filteredDimensions.length > 1) {
            setSelectedYAxisKey(filteredDimensions[1].key);
          }
        }
        
        setLoading(false);
        return;
      }

      try {
        isLoadingRef.current = true;
        setLoading(true);
        
        // 不使用时间戳，使用缓存机制
        const excelPath = `/dataset.xlsx`;
        
        console.log('📥 开始加载Excel文件:', excelPath);
        const result = await readExcelFile(excelPath);
        
        // 保存到缓存
        excelDataCache = {
          data: result.data,
          dimensionConfigs: result.dimensionConfigs,
          timestamp: new Date().getTime()
        };
        
        setMarketData(result.data);
        // 过滤掉以"_英文"结尾的维度
        const filteredDimensions = result.dimensionConfigs.filter(
          (dim) => !dim.label.endsWith('_英文')
        );
        setAvailableDimensions(filteredDimensions);
        
        console.log('✅ Excel数据加载成功并已缓存');
        
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
        console.error('❌ 加载Excel数据失败:', error);
        setMarketData([]);
        setAvailableDimensions([]);
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
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
      return [];
    }
    
    if (!selectedXAxisKey || !selectedYAxisKey) {
      return [];
    }
    
    // 优化：先找到所有需要的维度，避免在循环中重复查找
    const yearDim = availableDimensions.find(d => {
      const label = d.label.toLowerCase();
      return label.includes('年') || label.includes('year') || label === '年';
    });
    
    const channelDim = availableDimensions.find(d => 
      d.label.toLowerCase().includes('渠道') || 
      d.label.toLowerCase().includes('channel') ||
      d.label.toLowerCase().includes('店铺') ||
      d.label.toLowerCase().includes('平台')
    );

    // 优化：一次性遍历完成所有筛选和分组
    let filtered: MarketDataPoint[] = [];
    const xAxisGroups = new Map<string, number>();
    const xAxisYAxisGroups = new Map<string, Map<string, number>>(); // xAxisValue -> Map<yAxisValue, value>
    
    // 单次遍历完成筛选和分组
    for (let i = 0; i < marketData.length; i++) {
      const point = marketData[i];
      
      // 年份筛选
      if (yearDim && selectedYear) {
        const yearValue = getDimensionValue(point, yearDim.key);
        if (yearValue !== selectedYear && String(yearValue) !== String(selectedYear)) {
          continue;
        }
      }
      
      // 渠道筛选
      if (filters.channel && filters.channel.length > 0 && channelDim) {
        const channelValue = getDimensionValue(point, channelDim.key);
        if (!filters.channel.includes(channelValue)) {
          continue;
        }
      }
      
      // 省份筛选
      if (filters.province && filters.province.length > 0) {
        if (!filters.province.includes(point.province || '')) {
          continue;
        }
      }
      
      // 获取X轴和Y轴值
      const xValue = getDimensionValue(point, selectedXAxisKey);
      const yValue = getDimensionValue(point, selectedYAxisKey);
      
      // 跳过无效值
      if (!xValue || xValue.trim() === '' || xValue.endsWith('_英文')) {
        continue;
      }
      if (!yValue || yValue.trim() === '' || yValue.endsWith('_英文')) {
        continue;
      }
      
      const pointValue = point.value || 0;
      if (pointValue <= 0) {
        continue;
      }
      
      // 添加到筛选后的数据
      filtered.push(point);
      
      // 更新X轴分组
      xAxisGroups.set(xValue, (xAxisGroups.get(xValue) || 0) + pointValue);
      
      // 更新X-Y轴分组
      if (!xAxisYAxisGroups.has(xValue)) {
        xAxisYAxisGroups.set(xValue, new Map<string, number>());
      }
      const yAxisMap = xAxisYAxisGroups.get(xValue)!;
      yAxisMap.set(yValue, (yAxisMap.get(yValue) || 0) + pointValue);
    }

    // 计算总金额（用于计算百分比）
    const totalValue = filtered.reduce((sum, point) => sum + (point.value || 0), 0);
    
    if (totalValue === 0 || xAxisGroups.size === 0) {
      return [];
    }

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

    // 优化：直接使用已分组的xAxisYAxisGroups，避免再次遍历
    xAxisGroups.forEach((xAxisTotalValue, xAxisValue) => {
      // 计算该X轴维度占总市场的百分比（决定柱子宽度）
      const xAxisTotalShare = (xAxisTotalValue / totalValue) * 100;

      // 从已分组的Map中获取Y轴数据
      const yAxisGroups = xAxisYAxisGroups.get(xAxisValue) || new Map<string, number>();

      // 计算每个Y轴维度在该X轴维度中的占比
      const segments: Array<{
        yAxisValue: string;
        value: number;
        share: number;
      }> = [];

      // 如果该X轴维度下没有有效的Y轴数据，创建一个默认段（100%）
      if (yAxisGroups.size === 0) {
        segments.push({
          yAxisValue: '其他',
          value: xAxisTotalValue,
          share: 100,
        });
      } else {
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
      }

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
  getDimensionValue: _getDimensionValue, // 暂时未使用，保留以保持接口一致性
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
    statement: string; // 总结性的分析陈述
  }>>([]);
  const [editingCauses, setEditingCauses] = useState(false);
  
  // 进度更新状态
  const [progressMessage, setProgressMessage] = useState<string>('');
  // 存档状态
  const [isSaving, setIsSaving] = useState(false);
  
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);





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
    setProgressMessage('正在全面扫描数据，识别剪刀差现象...');

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
      setProgressMessage('');
    } catch (error) {
      console.error('❌ AI分析失败:', error);
      alert('AI分析失败，请稍后重试');
      setProgressMessage('');
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
    setAiCauses([]); // 清空之前的结果
    setEditingCauses(true);

    try {
      // 逐个问题处理，实时更新UI
      const problemsToAnalyze = aiScissorsGaps.slice(0, 5);
      
      for (let i = 0; i < problemsToAnalyze.length; i++) {
        const gap = problemsToAnalyze[i];
        setProgressMessage(`正在分析第 ${i + 1}/${problemsToAnalyze.length} 个问题: ${gap.title}...`);

        try {
          // 每次只分析一个问题
          const problemsResult = await analyzeProblemsAndStrategies(
            [gap], // 只传入当前这一个问题
            selectedBrand,
            marketData,
            availableDimensions,
            undefined, // userFeedback
            1 // maxProblems，每次只分析1个
          );
          
          // 实时更新UI：将新分析的结果添加到现有结果中
          if (problemsResult.causes.length > 0) {
            setAiCauses(prev => [...prev, problemsResult.causes[0]]);
          }
        } catch (error) {
          console.error(`分析问题 ${i + 1} 失败:`, error);
          // 即使某个问题失败，也继续处理下一个
          // 可以选择添加一个错误标记的条目
          setAiCauses(prev => [...prev, {
            problem: gap.title,
            statement: '分析失败，请稍后重试'
          }]);
        }
      }
      
      setProgressMessage('');
    } catch (error) {
      console.error('成因分析失败:', error);
      alert('成因分析失败，请稍后重试');
      setProgressMessage('');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // 生成markdown报告
  const generateMarkdownReport = (): string => {
    const timestamp = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    let markdown = `# 问题定位分析报告\n\n`;
    markdown += `**生成时间**: ${timestamp}\n\n`;
    markdown += `**分析品牌**: ${selectedBrand}\n\n`;
    markdown += `---\n\n`;

    // 第一部分：问题定位（剪刀差）
    markdown += `## 一、问题定位\n\n`;
    if (aiScissorsGaps.length > 0) {
      aiScissorsGaps.forEach((gap, index) => {
        markdown += `### ${index + 1}. ${gap.title}\n\n`;
        markdown += `**现象描述**:\n\n${gap.phenomenon}\n\n`;
        if (gap.possibleReasons) {
          markdown += `**可能原因**:\n\n${gap.possibleReasons}\n\n`;
        }
        markdown += `---\n\n`;
      });
    } else {
      markdown += `暂无问题定位数据\n\n`;
    }

    // 第二部分：深挖原因
    markdown += `## 二、深挖原因\n\n`;
    if (aiCauses.length > 0) {
      aiCauses.forEach((cause, index) => {
        markdown += `### ${index + 1}. ${cause.problem}\n\n`;
        if (cause.statement) {
          markdown += `**原因分析**:\n\n${cause.statement}\n\n`;
        }
        markdown += `---\n\n`;
      });
    } else {
      markdown += `暂无深挖原因数据\n\n`;
    }

    markdown += `---\n\n`;
    markdown += `*本报告由策略规划工具自动生成*\n`;

    return markdown;
  };

  // 下载markdown文件
  const downloadMarkdown = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 确认步骤2（成因分析）
  const handleConfirmCauses = async () => {
    // 显示存档弹窗
    setIsSaving(true);
    
    try {
      // 生成markdown内容
      const markdownContent = generateMarkdownReport();
      
      // 生成文件名
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `问题定位分析报告_${selectedBrand}_${timestamp}.md`;
      
      // 模拟存档过程（给用户看到提示）
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 下载文件
      downloadMarkdown(markdownContent, filename);
      
      // 关闭弹窗
      setIsSaving(false);
      
      // 更新UI状态
      setEditingCauses(false);
      setCurrentStep(null);
    } catch (error) {
      console.error('存档失败:', error);
      alert('存档失败，请稍后重试');
      setIsSaving(false);
    }
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

  // 始终显示问题定位板块，让用户可以点击AI智能分析
  // 移除了条件判断，确保板块始终显示
  // if (gapAnalysis.length === 0 && !brandDimension && !showAIAnalysis) {
  //   return null;
  // }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <h3 className="text-xl font-bold text-gray-900">问题定位</h3>
        </div>
      </div>

      {/* AI分析按钮 - 居中醒目位置 */}
      {!showAIAnalysis && (
        <div className="flex flex-col items-center justify-center py-12 mb-6">
          <button
            onClick={handleAIAnalysis}
            disabled={aiAnalysisLoading || mekkoData.length === 0}
            className={clsx(
              'flex flex-col items-center justify-center space-y-3 px-8 py-6 rounded-xl text-base font-semibold transition-all transform hover:scale-105',
              aiAnalysisLoading || mekkoData.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary-600 to-primary-700 text-white hover:from-primary-700 hover:to-primary-800 shadow-lg'
            )}
          >
            {aiAnalysisLoading ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin" />
                <span>AI分析中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-8 h-8" />
                <span>AI智能分析</span>
                <span className="text-sm font-normal opacity-90">点击开始分析市场问题</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 进度更新显示 */}
      {progressMessage && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">{progressMessage}</p>
            </div>
          </div>
        </div>
      )}

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
                      {cause.statement && (
                        <div className="text-sm text-gray-700 leading-relaxed">
                          {cause.statement}
                        </div>
                      )}
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

        </div>
      )}

      {/* 存档中弹窗 */}
      {isSaving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-lg font-medium text-gray-900">当前分析报告存档中...</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
