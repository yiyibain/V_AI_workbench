import { useMemo, useState, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { MarketDataPoint, DimensionConfig } from '../../types/strategy';

interface MekkoSegment {
  yAxisValue: string;
  value: number;
  share: number;
}

interface MekkoDataItem {
  xAxisValue: string;
  xAxisTotalValue: number;
  xAxisTotalShare: number;
  segments: MekkoSegment[];
}

interface MekkoChartProps {
  data: MekkoDataItem[];
  marketData?: MarketDataPoint[];
  selectedXAxisKey?: string;
  selectedYAxisKey?: string;
  getDimensionValue?: (point: MarketDataPoint, dimensionKey: string) => string;
  availableDimensions?: DimensionConfig[];
}

interface TooltipData {
  x: number;
  y: number;
  xAxisValue: string;
  yAxisValue: string;
  share: number;
  value: number;
  totalValue: number;
  cagr1924?: number | null;
  growth2324?: number | null;
}

// 生成颜色
const colors = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#a855f7', '#eab308', '#dc2626', '#64748b'
];

export default function MekkoChart({ 
  data, 
  marketData = [], 
  selectedXAxisKey = '', 
  selectedYAxisKey = '',
  getDimensionValue,
  availableDimensions = []
}: MekkoChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [zoomState, setZoomState] = useState<{
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const chartWidth = 1000;
  const chartHeight = 500;
  const margin = { top: 40, right: 20, bottom: 100, left: 60 };
  const baseInnerWidth = chartWidth - margin.left - margin.right;
  const baseInnerHeight = chartHeight - margin.top - margin.bottom;

  // 计算缩放后的显示范围
  const displayRange = useMemo(() => {
    if (!zoomState) {
      return {
        xMin: 0,
        xMax: 100,
        yMin: 0,
        yMax: 100,
      };
    }
    return zoomState;
  }, [zoomState]);

  // 计算每个柱子的位置和宽度（考虑缩放）
  const columns = useMemo(() => {
    // 计算总份额，用于确定X轴位置
    const totalShare = data.reduce((sum, item) => sum + item.xAxisTotalShare, 0);
    
    let accumulatedShare = 0;
    const result: Array<{
      xAxisValue: string;
      xAxisTotalValue: number;
      xAxisTotalShare: number;
      xStart: number; // X轴起始位置（百分比）
      xEnd: number; // X轴结束位置（百分比）
      x: number; // 在画布上的X位置
      width: number; // 在画布上的宽度
      segments: MekkoSegment[];
    }> = [];

    data.forEach((item) => {
      const xStartPercent = (accumulatedShare / totalShare) * 100;
      const xEndPercent = ((accumulatedShare + item.xAxisTotalShare) / totalShare) * 100;
      
      // 检查是否在显示范围内
      if (xEndPercent >= displayRange.xMin && xStartPercent <= displayRange.xMax) {
        // 计算在显示范围内的实际位置和宽度
        const visibleXStart = Math.max(displayRange.xMin, xStartPercent);
        const visibleXEnd = Math.min(displayRange.xMax, xEndPercent);
        const visibleWidthPercent = visibleXEnd - visibleXStart;
        
        // 计算在画布上的位置
        const x = ((visibleXStart - displayRange.xMin) / (displayRange.xMax - displayRange.xMin)) * baseInnerWidth;
        const width = (visibleWidthPercent / (displayRange.xMax - displayRange.xMin)) * baseInnerWidth;
        
        result.push({
          ...item,
          xStart: xStartPercent,
          xEnd: xEndPercent,
          x,
          width,
          segments: item.segments,
        });
      }
      
      accumulatedShare += item.xAxisTotalShare;
    });

    return result;
  }, [data, displayRange, baseInnerWidth]);

  // 收集所有Y轴值，用于生成图例
  const allYValues = useMemo(() => {
    const ySet = new Set<string>();
    data.forEach((item) => {
      item.segments.forEach((seg) => {
        ySet.add(seg.yAxisValue);
      });
    });
    return Array.from(ySet);
  }, [data]);

  // 为每个Y轴值分配颜色
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    allYValues.forEach((yValue, index) => {
      map.set(yValue, colors[index % colors.length]);
    });
    return map;
  }, [allYValues]);

  // 计算CAGR和增速的辅助函数
  const calculateMetrics = useMemo(() => {
    if (!marketData.length || !selectedXAxisKey || !selectedYAxisKey || !getDimensionValue) {
      return () => ({ cagr1924: null, growth2324: null });
    }

    // 找到年份维度（从availableDimensions中查找）
    const yearDim = availableDimensions.find(d => {
      const label = d.label.toLowerCase();
      return label.includes('年') || label.includes('year') || label === '年';
    });

    // 辅助函数：标准化年份值（处理各种格式：2019, 19, "2019", "2019年"等）
    const normalizeYear = (yearStr: string): string | null => {
      if (!yearStr) return null;
      const str = String(yearStr).trim();
      
      // 优先匹配4位数字（完整年份）
      const match4 = str.match(/\d{4}/);
      if (match4) {
        const num = parseInt(match4[0]);
        // 确保是合理的年份（1900-2099）
        if (num >= 1900 && num <= 2099) {
          return String(num);
        }
      }
      
      // 如果没有4位数字，尝试匹配2位数字
      const match2 = str.match(/\d{2}/);
      if (match2) {
        const num = parseInt(match2[0]);
        // 如果是两位数，判断是19xx还是20xx
        // 19-99 认为是 19xx，00-18 认为是 20xx
        if (num >= 19 && num <= 99) {
          return `19${String(num).padStart(2, '0')}`;
        } else {
          return `20${String(num).padStart(2, '0')}`;
        }
      }
      
      return null;
    };

    return (xAxisValue: string, yAxisValue: string) => {
      // xAxisValue和yAxisValue用于筛选数据点
      if (!yearDim) {
        // console.warn('[CAGR调试] 未找到年份维度，可用维度:', availableDimensions.map(d => d.label));
        return { cagr1924: null, growth2324: null };
      }

      // 筛选出匹配的数据点（这个格子的所有数据，包括所有年份）
      const matchingPoints = marketData.filter((point) => {
        const xValue = getDimensionValue!(point, selectedXAxisKey);
        const yValue = getDimensionValue!(point, selectedYAxisKey);
        return xValue === xAxisValue && yValue === yAxisValue;
      });

      // 调试：检查所有匹配点的年份原始值
      // const allRawYearValues = new Set<string>();
      // matchingPoints.forEach((point) => {
      //   const yearRaw = getDimensionValue!(point, yearDim.key);
      //   if (yearRaw) {
      //     allRawYearValues.add(yearRaw);
      //   }
      // });
      // console.log('[CAGR调试] 匹配点的所有原始年份值:', {
      //   xAxisValue,
      //   yAxisValue,
      //   原始年份值列表: Array.from(allRawYearValues).sort(),
      //   数据点总数: matchingPoints.length
      // });

      // 按年份分组，累加pdot值
      const yearData = new Map<string, number>();
      const yearValueMap = new Map<string, string>(); // 原始值 -> 标准化值
      
      matchingPoints.forEach((point) => {
        const yearRaw = getDimensionValue!(point, yearDim.key);
        if (!yearRaw || !point.value) {
          return;
        }
        
        const yearNormalized = normalizeYear(yearRaw);
        if (!yearNormalized) {
          // console.warn('[CAGR调试] 无法标准化年份:', {
          //   原始值: yearRaw,
          //   类型: typeof yearRaw,
          //   标准化结果: null
          // });
          return;
        }
        
        // 保存原始值到标准化值的映射（用于调试）
        if (!yearValueMap.has(yearNormalized)) {
          yearValueMap.set(yearNormalized, yearRaw);
        }
        
        const currentValue = yearData.get(yearNormalized) || 0;
        yearData.set(yearNormalized, currentValue + point.value);
      });

      // 调试：输出年份数据（已禁用）
      // if (matchingPoints.length > 0) {
      //   // 收集所有原始年份值（用于调试）
      //   const allRawYears = new Set<string>();
      //   const allRawYearsWithCount = new Map<string, number>();
      //   matchingPoints.forEach((point) => {
      //     const yearRaw = getDimensionValue!(point, yearDim.key);
      //     if (yearRaw) {
      //       allRawYears.add(yearRaw);
      //       allRawYearsWithCount.set(yearRaw, (allRawYearsWithCount.get(yearRaw) || 0) + 1);
      //     }
      //   });
      //   
      //   // 检查是否有2023相关的原始值
      //   const has2023Raw = Array.from(allRawYears).some(y => {
      //     const normalized = normalizeYear(y);
      //     return normalized === '2023';
      //   });
      //   
      //   console.log('[CAGR调试] 格子数据:', {
      //     xAxisValue,
      //     yAxisValue,
      //     匹配数据点数: matchingPoints.length,
      //     年份维度: yearDim.label,
      //     年份维度key: yearDim.key,
      //     所有原始年份值: Array.from(allRawYears).sort(),
      //     原始年份值计数: Object.fromEntries(allRawYearsWithCount),
      //     年份数据: Array.from(yearData.entries()).map(([k, v]) => ({ 
      //       标准化年份: k, 
      //       原始值: yearValueMap.get(k), 
      //       pdot: v 
      //     })),
      //     所有标准化年份键: Array.from(yearData.keys()).sort(),
      //     是否有2023原始值: has2023Raw,
      //     是否有2023标准化: yearData.has('2023'),
      //     是否有2024: yearData.has('2024'),
      //     是否有2019: yearData.has('2019'),
      //     // 显示所有可能包含2023的原始值
      //     可能包含2023的值: Array.from(allRawYears).filter(y => 
      //       y.includes('23') || y.includes('2023') || normalizeYear(y) === '2023'
      //     )
      //   });
      // }

      // 计算CAGR (2019-2024)
      // CAGR公式：CAGR = (终值/初值)^(1/年数) - 1
      let cagr1924: number | null = null;
      const value2019 = yearData.get('2019');
      const value2024 = yearData.get('2024');
      
      if (value2019 && value2024 && value2019 > 0) {
        const years = 5; // 2019到2024是5年
        cagr1924 = (Math.pow(value2024 / value2019, 1 / years) - 1) * 100;
        // console.log('[CAGR调试] CAGR计算:', {
        //   value2019,
        //   value2024,
        //   years,
        //   cagr: cagr1924
        // });
      } else {
        // console.log('[CAGR调试] CAGR计算失败:', {
        //   value2019: value2019 || '缺失',
        //   value2024: value2024 || '缺失',
        //   可用年份: Array.from(yearData.keys())
        // });
      }

      // 计算增速 (2023-2024)
      // 增速公式：增速 = (2024值 - 2023值) / 2023值 * 100
      let growth2324: number | null = null;
      const value2023 = yearData.get('2023');
      
      if (value2023 && value2024 && value2023 > 0) {
        growth2324 = ((value2024 - value2023) / value2023) * 100;
        // console.log('[CAGR调试] 增速计算:', {
        //   value2023,
        //   value2024,
        //   growth: growth2324
        // });
      } else {
        // console.log('[CAGR调试] 增速计算失败:', {
        //   value2023: value2023 || '缺失',
        //   value2024: value2024 || '缺失',
        //   可用年份: Array.from(yearData.keys())
        // });
      }

      return { cagr1924, growth2324 };
    };
  }, [marketData, selectedXAxisKey, selectedYAxisKey, getDimensionValue, availableDimensions]);

  // 处理鼠标移动（tooltip和选择框）
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isSelecting && selectionStart) {
      // 更新选择框结束位置
      const normalizedX = Math.max(0, Math.min(1, (x - margin.left) / baseInnerWidth));
      const normalizedY = Math.max(0, Math.min(1, (y - margin.top) / baseInnerHeight));
      setSelectionEnd({ x: normalizedX, y: normalizedY });
      return;
    }

    // 计算实际坐标（考虑缩放）
    // X轴：从左到右
    const actualXPercent = displayRange.xMin + ((x - margin.left) / baseInnerWidth) * (displayRange.xMax - displayRange.xMin);
    
    // Y轴：SVG坐标从上到下，但数据从底部（0%）到顶部（100%）
    // 所以需要反转：鼠标在SVG顶部对应100%，在底部对应0%
    const relativeY = (y - margin.top) / baseInnerHeight; // 0到1之间，0是顶部，1是底部
    const actualYPercent = displayRange.yMax - relativeY * (displayRange.yMax - displayRange.yMin);

    // 检查鼠标是否在某个段上（从底部0%开始堆叠）
    for (const column of columns) {
      if (actualXPercent >= column.xStart && actualXPercent <= column.xEnd) {
        let currentY = 0; // 从底部（0%）开始
        for (const segment of column.segments) {
          const segmentYStart = currentY;
          const segmentYEnd = currentY + segment.share;
          
          // 检查鼠标Y坐标是否在这个段的范围内
          if (actualYPercent >= segmentYStart && actualYPercent <= segmentYEnd) {
            // 计算CAGR和增速
            const metrics = calculateMetrics(column.xAxisValue, segment.yAxisValue);
            setTooltip({
              x: e.clientX,
              y: e.clientY,
              xAxisValue: column.xAxisValue,
              yAxisValue: segment.yAxisValue,
              share: segment.share,
              value: segment.value,
              totalValue: column.xAxisTotalValue,
              cagr1924: metrics.cagr1924,
              growth2324: metrics.growth2324,
            });
            return;
          }
          currentY = segmentYEnd;
        }
      }
    }
    setTooltip(null);
  };

  // 处理鼠标离开
  const handleMouseLeave = () => {
    if (!isSelecting) {
      setTooltip(null);
    }
  };

  // 处理鼠标按下（开始选择）
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // 只处理左键
    
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 检查是否在图表区域内
    if (x >= margin.left && x <= margin.left + baseInnerWidth &&
        y >= margin.top && y <= margin.top + baseInnerHeight) {
      const normalizedX = Math.max(0, Math.min(1, (x - margin.left) / baseInnerWidth));
      const normalizedY = Math.max(0, Math.min(1, (y - margin.top) / baseInnerHeight));
      
      setIsSelecting(true);
      setSelectionStart({ x: normalizedX, y: normalizedY });
      setSelectionEnd({ x: normalizedX, y: normalizedY });
    }
  };

  // 处理鼠标释放（应用缩放）
  const handleMouseUp = () => {
    if (!isSelecting || !selectionStart || !selectionEnd) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    // 计算选择框的边界
    const startX = Math.min(selectionStart.x, selectionEnd.x);
    const endX = Math.max(selectionStart.x, selectionEnd.x);
    const startY = Math.min(selectionStart.y, selectionEnd.y);
    const endY = Math.max(selectionStart.y, selectionEnd.y);

    // 检查选择框是否足够大（至少5%）
    if (Math.abs(endX - startX) > 0.05 && Math.abs(endY - startY) > 0.05) {
      // 转换为百分比范围
      const xMin = displayRange.xMin + startX * (displayRange.xMax - displayRange.xMin);
      const xMax = displayRange.xMin + endX * (displayRange.xMax - displayRange.xMin);
      const yMin = displayRange.yMin + startY * (displayRange.yMax - displayRange.yMin);
      const yMax = displayRange.yMin + endY * (displayRange.yMax - displayRange.yMin);

      setZoomState({
        xMin,
        xMax,
        yMin,
        yMax,
      });
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // 重置缩放
  const handleReset = () => {
    setZoomState(null);
    setTooltip(null);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // 双击重置
  const handleDoubleClick = () => {
    handleReset();
  };

  return (
    <div className="w-full overflow-hidden">
      {/* 控制工具栏 */}
      <div className="flex justify-between items-center mb-2 px-2">
        <div className="flex items-center gap-2">
          {zoomState && (
            <div className="text-xs text-gray-500">
              已放大 • 双击或点击重置按钮恢复
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {zoomState && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              title="重置视图"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
          )}
        </div>
      </div>

      <div className="relative border border-gray-200 rounded overflow-hidden bg-white">
        <svg
          ref={svgRef}
          width={chartWidth}
          height={chartHeight}
          className="select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: isSelecting ? 'crosshair' : 'default' }}
        >
          {/* 背景 */}
          <rect width={chartWidth} height={chartHeight} fill="white" />
          
          {/* Y轴标签和网格线 */}
          {[0, 20, 40, 60, 80, 100].map((value) => {
            // 计算在显示范围内的Y位置
            const yPercent = (value - displayRange.yMin) / (displayRange.yMax - displayRange.yMin);
            if (yPercent < 0 || yPercent > 1) return null;
            
            const y = margin.top + baseInnerHeight - yPercent * baseInnerHeight;
            return (
              <g key={value}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={margin.left + baseInnerWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <text
                  x={margin.left - 10}
                  y={y + 5}
                  textAnchor="end"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {value}%
                </text>
              </g>
            );
          })}

          {/* Y轴标题 */}
          <text
            x={margin.left - 30}
            y={margin.top + baseInnerHeight / 2}
            textAnchor="middle"
            fontSize="14"
            fill="#374151"
            transform={`rotate(-90, ${margin.left - 30}, ${margin.top + baseInnerHeight / 2})`}
          >
            市场份额 (%)
          </text>

          {/* 绘制Mekko柱子 */}
          {columns.map((column, colIndex) => {
            // 计算段的位置（考虑Y轴缩放）
            // 从底部（0%）开始往上堆叠，大的份额在底部
            let currentYPercent = 0;
            const segments = column.segments.map((segment) => {
              const segmentYStartPercent = currentYPercent;
              const segmentYEndPercent = currentYPercent + segment.share;
              
              // 检查是否在显示范围内
              if (segmentYEndPercent < displayRange.yMin || segmentYStartPercent > displayRange.yMax) {
                currentYPercent = segmentYEndPercent;
                return null;
              }
              
              // 计算在显示范围内的实际位置
              const visibleYStart = Math.max(displayRange.yMin, segmentYStartPercent);
              const visibleYEnd = Math.min(displayRange.yMax, segmentYEndPercent);
              const visibleHeightPercent = visibleYEnd - visibleYStart;
              
              // 转换为画布坐标（从底部开始）
              // Y轴从底部（0%）到顶部（100%），所以需要从底部往上计算
              const yEndPercent = (visibleYEnd - displayRange.yMin) / (displayRange.yMax - displayRange.yMin);
              const height = (visibleHeightPercent / (displayRange.yMax - displayRange.yMin)) * baseInnerHeight;
              // Y坐标：从底部往上，所以用1减去百分比
              const y = margin.top + baseInnerHeight - yEndPercent * baseInnerHeight;
              
              const result = {
                ...segment,
                x: margin.left + column.x,
                y,
                width: column.width,
                height,
              };
              
              currentYPercent = segmentYEndPercent;
              return result;
            }).filter(seg => seg !== null) as Array<{
              yAxisValue: string;
              value: number;
              share: number;
              x: number;
              y: number;
              width: number;
              height: number;
            }>;

            // 检查段内标签是否重叠（垂直方向，最小间距20px）
            const segmentLabelsWithOverlap = segments.map((seg, segIndex) => {
              if (seg.height <= 20 || seg.width <= 50 || seg.share < 1) {
                return { seg, showLabel: false };
              }
              
              const segCenterY = seg.y + seg.height / 2;
              // 检查与相邻段的标签是否太近
              let hasOverlap = false;
              for (let i = 0; i < segments.length; i++) {
                if (i === segIndex) continue;
                const otherSeg = segments[i];
                if (otherSeg.height <= 20 || otherSeg.width <= 50 || otherSeg.share < 1) continue;
                
                const otherCenterY = otherSeg.y + otherSeg.height / 2;
                const verticalDistance = Math.abs(segCenterY - otherCenterY);
                // 如果垂直距离小于20px，认为重叠
                if (verticalDistance < 20) {
                  hasOverlap = true;
                  break;
                }
              }
              
              return { seg, showLabel: !hasOverlap };
            });

            // 检查柱子顶部标签是否重叠（水平方向，最小间距60px）
            const showTopLabel = (() => {
              const currentCenterX = margin.left + column.x + column.width / 2;
              for (let i = 0; i < columns.length; i++) {
                if (i === colIndex) continue;
                const otherColumn = columns[i];
                const otherCenterX = margin.left + otherColumn.x + otherColumn.width / 2;
                const horizontalDistance = Math.abs(currentCenterX - otherCenterX);
                // 如果水平距离小于60px，认为重叠
                if (horizontalDistance < 60) {
                  return false;
                }
              }
              return true;
            })();

            return (
              <g key={colIndex}>
                {/* 绘制每个段 */}
                {segmentLabelsWithOverlap.map(({ seg, showLabel }, segIndex) => {
                  // 如果占比小于1%，使用灰色
                  const isSmallSegment = seg.share < 1;
                  const color = isSmallSegment ? '#94a3b8' : (colorMap.get(seg.yAxisValue) || '#94a3b8');
                  return (
                    <g key={segIndex}>
                      <rect
                        x={seg.x}
                        y={seg.y}
                        width={seg.width}
                        height={seg.height}
                        fill={color}
                        stroke="white"
                        strokeWidth={1}
                        className="hover:opacity-80"
                      />
                      {/* 如果段足够大且不重叠，显示标签 */}
                      {showLabel && (
                        <text
                          x={seg.x + seg.width / 2}
                          y={seg.y + seg.height / 2}
                          textAnchor="middle"
                          fontSize="10"
                          fill="white"
                          fontWeight="bold"
                          className="pointer-events-none"
                        >
                          {seg.yAxisValue}
                        </text>
                      )}
                    </g>
                  );
                })}
                
                {/* X轴标签 */}
                <text
                  x={margin.left + column.x + column.width / 2}
                  y={chartHeight - margin.bottom + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#374151"
                  transform={`rotate(-45, ${margin.left + column.x + column.width / 2}, ${chartHeight - margin.bottom + 20})`}
                >
                  {column.xAxisValue}
                </text>
                
                {/* 在柱子顶部显示总金额（如果不重叠） */}
                {showTopLabel && (
                  <text
                    x={margin.left + column.x + column.width / 2}
                    y={margin.top - 10}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#374151"
                    fontWeight="bold"
                  >
                    {column.xAxisTotalValue.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                  </text>
                )}
              </g>
            );
          })}

          {/* X轴基线 */}
          <line
            x1={margin.left}
            y1={margin.top + baseInnerHeight}
            x2={margin.left + baseInnerWidth}
            y2={margin.top + baseInnerHeight}
            stroke="#374151"
            strokeWidth={2}
          />

          {/* 选择框 */}
          {isSelecting && selectionStart && selectionEnd && (
            <rect
              x={margin.left + Math.min(selectionStart.x, selectionEnd.x) * baseInnerWidth}
              y={margin.top + Math.min(selectionStart.y, selectionEnd.y) * baseInnerHeight}
              width={Math.abs(selectionEnd.x - selectionStart.x) * baseInnerWidth}
              height={Math.abs(selectionEnd.y - selectionStart.y) * baseInnerHeight}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              style={{ pointerEvents: 'none' }}
            />
          )}
        </svg>

        {/* 悬浮提示 */}
        {tooltip && (
          <div
            className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-10 pointer-events-none"
            style={{
              left: `${Math.min(tooltip.x + 10, chartWidth - 250)}px`,
              top: `${Math.max(10, tooltip.y - 120)}px`,
              maxWidth: '230px',
            }}
          >
            <div className="text-sm font-semibold text-gray-900 mb-2">
              {tooltip.xAxisValue} × {tooltip.yAxisValue}
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">在该分类中的占比:</span>
                <span className="font-semibold text-gray-900">{tooltip.share.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">pdot:</span>
                <span className="font-semibold text-gray-900">
                  {tooltip.value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">该分类总pdot:</span>
                <span className="font-semibold text-gray-900">
                  {tooltip.totalValue.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
                </span>
              </div>
              {/* CAGR 19-24 */}
              <div className="flex justify-between gap-4 pt-1 border-t border-gray-200">
                <span className="text-gray-600">pdot 19-24 CAGR:</span>
                <span className={clsx(
                  "font-semibold",
                  tooltip.cagr1924 !== null && tooltip.cagr1924! >= 0 
                    ? "text-green-600" 
                    : tooltip.cagr1924 !== null 
                    ? "text-red-600" 
                    : "text-gray-400"
                )}>
                  {tooltip.cagr1924 !== null && tooltip.cagr1924 !== undefined
                    ? `${tooltip.cagr1924.toFixed(2)}%` 
                    : 'N/A'}
                </span>
              </div>
              {/* 增速 23-24 */}
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">pdot 23-24 增速:</span>
                <span className={clsx(
                  "font-semibold",
                  tooltip.growth2324 !== null && tooltip.growth2324! >= 0 
                    ? "text-green-600" 
                    : tooltip.growth2324 !== null 
                    ? "text-red-600" 
                    : "text-gray-400"
                )}>
                  {tooltip.growth2324 !== null && tooltip.growth2324 !== undefined
                    ? `${tooltip.growth2324.toFixed(2)}%` 
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 操作提示 */}
        {!zoomState && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white/80 px-2 py-1 rounded">
            拖拽选择区域可放大 • 双击重置
          </div>
        )}
      </div>

    </div>
  );
}
