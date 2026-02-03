import * as XLSX from 'xlsx';
import { MarketDataPoint, DimensionConfig } from '../types/strategy';

/**
 * 读取Excel文件并提取数据
 */
export async function readExcelFile(filePath: string): Promise<{
  data: MarketDataPoint[];
  columns: string[];
  dimensionConfigs: DimensionConfig[];
}> {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // 读取第一个工作表
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // 转换为JSON格式
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length === 0) {
      throw new Error('Excel文件为空');
    }
    
    // 第一行是列名
    const headers = jsonData[0] as string[];
    
    // 清理和标准化列名
    const cleanedHeaders = headers.map((h, idx) => {
      if (!h || h === '') return `列${idx + 1}`;
      return String(h).trim();
    });
    
    console.log('Excel文件列名:', cleanedHeaders);
    
    // 指标列（需要排除，不作为维度）
    const metricColumns: string[] = [
      '金额', '盒', '片', 'pdot', 'value', '市场份额', '销售额', 
      'sales', 'market share', '销量', '数量', 'amount', 'quantity',
      'huiZhiShare', '晖致份额', 'competitorShare', '竞品份额',
      'growthRate', '增长率', 'growth', '增速'
    ];
    
    // 提取维度列（排除指标列和ID列）
    const dimensionColumns: string[] = [];
    cleanedHeaders.forEach((header) => {
      if (!header || header === '') return;
      
      const headerLower = header.toLowerCase().trim();
      const isMetric = metricColumns.some(m => headerLower.includes(m.toLowerCase()));
      const isId = headerLower === 'id' || headerLower === '序号' || headerLower === '编号' || headerLower === 'sku';
      
      if (!isMetric && !isId) {
        dimensionColumns.push(header);
      }
    });
    
    console.log('提取的维度列:', dimensionColumns);
    
    // 创建维度配置
    const dimensionConfigs: DimensionConfig[] = dimensionColumns.map((col, idx) => ({
      key: `dimension${idx + 1}`,
      label: col,
      type: inferDimensionType(col),
      isAvailableForAxis: true,
    }));
    
    // 转换数据
    const data: MarketDataPoint[] = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;
      
      const dataPoint: any = {
        id: `row-${i}`,
      };
      
      // 映射列名到数据点
      cleanedHeaders.forEach((header, colIndex) => {
        const value = row[colIndex];
        if (value === undefined || value === null || value === '') return;
        
        const headerLower = header?.toLowerCase() || '';
        
        // 特殊字段处理
        if (headerLower === 'id' || headerLower === '序号' || headerLower === '编号') {
          dataPoint.id = String(value);
        } else if (headerLower.includes('金额') || headerLower.includes('amount') || headerLower.includes('value')) {
          // 金额作为 value（用于计算市场份额）
          const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, '')) || 0;
          dataPoint.value = numValue;
        } else if (headerLower.includes('province') || headerLower.includes('省份') || headerLower.includes('地区') || headerLower.includes('区域')) {
          dataPoint.province = String(value);
        } else {
          // 维度字段：找到对应的维度索引
          const dimIndex = dimensionColumns.indexOf(header);
          if (dimIndex >= 0) {
            dataPoint[`dimension${dimIndex + 1}`] = String(value);
          }
        }
      });
      
      // 确保有value字段（使用金额）
      if (!dataPoint.value || dataPoint.value === 0) {
        // 如果没有金额字段，尝试从其他数值字段获取
        const amountIndex = cleanedHeaders.findIndex(h => 
          h?.toLowerCase().includes('金额') || h?.toLowerCase().includes('amount')
        );
        if (amountIndex >= 0 && row[amountIndex]) {
          dataPoint.value = typeof row[amountIndex] === 'number' 
            ? row[amountIndex] 
            : parseFloat(String(row[amountIndex]).replace(/,/g, '')) || 0;
        } else {
          dataPoint.value = 0;
        }
      }
      
      // 只添加有有效值的数据点
      if (dataPoint.value > 0) {
        data.push(dataPoint as MarketDataPoint);
      }
    }
    
    console.log(`成功读取 ${data.length} 条数据，${dimensionConfigs.length} 个维度`);
    console.log('维度配置:', dimensionConfigs.map(d => `${d.label} (${d.key})`));
    
    return {
      data,
      columns: cleanedHeaders,
      dimensionConfigs,
    };
  } catch (error) {
    console.error('读取Excel文件失败:', error);
    throw error;
  }
}

/**
 * 推断维度类型
 */
function inferDimensionType(columnName: string): 'channel' | 'department' | 'brand' | 'province' | 'molecule' | 'class' | 'priceBand' {
  const lower = columnName.toLowerCase();
  
  if (lower.includes('渠道') || lower.includes('channel') || lower.includes('医院') || lower.includes('零售') || lower.includes('电商') || lower.includes('店铺') || lower.includes('平台')) {
    return 'channel';
  }
  if (lower.includes('科室') || lower.includes('department') || lower.includes('科')) {
    return 'department';
  }
  if (lower.includes('品牌') || lower.includes('brand')) {
    return 'brand';
  }
  if (lower.includes('省份') || lower.includes('province') || lower.includes('地区') || lower.includes('区域')) {
    return 'province';
  }
  if (lower.includes('分子') || lower.includes('molecule') || lower.includes('活性成分') || lower.includes('通用名')) {
    return 'molecule';
  }
  if (lower.includes('类别') || lower.includes('class') || lower.includes('类型')) {
    return 'class';
  }
  if (lower.includes('价格') || lower.includes('price')) {
    return 'priceBand';
  }
  
  // 默认返回channel
  return 'channel';
}

