import axios from 'axios';
import { MarketDataPoint, DimensionConfig } from '../types/strategy';
import { readExcelFile } from './excelService';
import { LIPITOR_BACKGROUND } from '../data/productBackground';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';

// 数据库文件路径（用于AI查询）
const DATABASE_FILE_PATH = '/全国及分省分销.xlsx';

// 缓存数据库数据
let databaseDataCache: {
  data: MarketDataPoint[];
  dimensions: DimensionConfig[];
  timestamp: number;
} | null = null;

// 加载Promise缓存，防止并发重复加载
let loadingPromise: Promise<{
  data: MarketDataPoint[];
  dimensions: DimensionConfig[];
}> | null = null;

// 加载数据库文件
async function loadDatabaseData(): Promise<{
  data: MarketDataPoint[];
  dimensions: DimensionConfig[];
}> {
  // 如果缓存存在且未过期（30分钟），直接返回
  const now = Date.now();
  const CACHE_DURATION = 30 * 60 * 1000; // 30分钟缓存
  if (databaseDataCache && (now - databaseDataCache.timestamp) < CACHE_DURATION) {
    console.log('✅ 使用缓存的数据库数据');
    return {
      data: databaseDataCache.data,
      dimensions: databaseDataCache.dimensions
    };
  }

  // 如果正在加载中，等待正在进行的加载完成
  if (loadingPromise) {
    console.log('⏸️ 数据库文件正在加载中，等待现有加载完成...');
    return loadingPromise;
  }

  // 开始新的加载
  loadingPromise = (async () => {
    try {
      const timestamp = new Date().getTime();
      const filePath = `${DATABASE_FILE_PATH}?t=${timestamp}`;
      console.log('📂 开始加载数据库文件:', filePath);
      
      // 数据库文件不过滤value=0的数据，因为可能包含WD等指标数据
      const result = await readExcelFile(filePath, false);
      console.log('📊 数据库文件读取结果:', {
        原始数据条数: result.data.length,
        维度配置数量: result.dimensionConfigs.length,
        维度列表: result.dimensionConfigs.map(d => `${d.label}(${d.key})`)
      });
      
      // 更新缓存
      databaseDataCache = {
        data: result.data,
        dimensions: result.dimensionConfigs.filter(dim => !dim.label.endsWith('_英文')),
        timestamp: now
      };
      
      console.log('✅ 数据库文件加载成功并已缓存:', {
        数据条数: result.data.length,
        维度数量: databaseDataCache.dimensions.length
      });
      
      return {
        data: databaseDataCache.data,
        dimensions: databaseDataCache.dimensions
      };
    } catch (error) {
      console.error('❌ 加载数据库文件失败:', error);
      // 如果加载失败，返回空数据
      return {
        data: [],
        dimensions: []
      };
    } finally {
      // 清除加载Promise，允许下次重新加载
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

// 数据查询函数定义（Function Calling格式）
// 注意：目前只启用品牌和剂量相关的查询函数，其他查询函数暂时禁用用于调试
const DATA_QUERY_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'queryByDosage',
      description: '按剂量筛选数据，分析品牌在不同剂量下的表现差异。可以传入"all"查看所有剂量的对比，也可以传入具体剂量（如"10mg"、"20mg"）查看该剂量的详细数据。建议先调用dosage="all"查看整体分布，再针对不同剂量深入分析。',
      parameters: {
        type: 'object',
        properties: {
          dosage: {
            type: 'string',
            description: '剂量名称，如"10mg"、"20mg"。如果传入"all"，则返回所有剂量的统计信息（推荐先调用此方式查看整体分布）'
          },
          brand: {
            type: 'string',
            description: '可选：品牌名称，如"立普妥"、"可定"。如果不提供，则返回所有品牌的数据。支持模糊匹配，如"立普妥"可以匹配"立普妥(阿托伐他汀钙片)"等'
          }
        },
        required: ['dosage']
      }
    }
  },
  // 以下查询函数暂时禁用，用于调试
  // {
  //   type: 'function',
  //   function: {
  //     name: 'queryByProductSpec',
  //     description: '按产品特性筛选数据（价格带、包装大小、剂量等），分析特定品规的销售表现。可以单独使用某个参数，也可以组合使用多个参数进行交叉分析。建议先不传参数查看所有规格，再针对表现好/差的规格深入分析。',
  //     parameters: {
  //       type: 'object',
  //       properties: {
  //         priceBand: {
  //           type: 'string',
  //           description: '价格带，如"高价"、"低价"、"中价"'
  //         },
  //         packageSize: {
  //           type: 'string',
  //           description: '包装大小，如"大包装"、"小包装"、"20mgx28s"、"10mgx14s"等'
  //         },
  //         dosage: {
  //           type: 'string',
  //           description: '剂量，如"10mg"、"20mg"'
  //         },
  //         brand: {
  //           type: 'string',
  //           description: '可选：品牌名称，如"立普妥"、"可定"。支持模糊匹配'
  //         }
  //       }
  //     }
  //   }
  // },
  // {
  //   type: 'function',
  //   function: {
  //     name: 'queryPriceDifference',
  //     description: '查询渠道间价差（电商vs零售），分析价格差异对销售的影响',
  //     parameters: {
  //       type: 'object',
  //       properties: {
  //         brand: {
  //           type: 'string',
  //           description: '可选：品牌名称。如果不提供，则返回所有品牌的价差对比'
  //         }
  //       }
  //     }
  //   }
  // },
  // {
  //   type: 'function',
  //   function: {
  //     name: 'queryPublicAwareness',
  //     description: '查询公域认知度数据，对比不同品牌的认知度差异',
  //     parameters: {
  //       type: 'object',
  //       properties: {
  //         brand: {
  //           type: 'string',
  //           description: '可选：品牌名称。如果不提供，则返回所有品牌的认知度对比'
  //         }
  //       }
  //     }
  //   }
  // },
  {
    type: 'function',
    function: {
      name: 'queryWD',
      description: '查询分销率WD数据，分析渠道铺货情况。可以单独查询某个品牌的整体WD，也可以结合剂量、规格等维度进行交叉分析。建议先查询整体WD，再结合剂量、规格等维度深入分析数据分布和异常值。特别建议：查询相同品牌不同剂量的WD，对比分析不同剂量下的分销表现差异。',
      parameters: {
        type: 'object',
        properties: {
          dosage: {
            type: 'string',
            description: '可选：剂量，如"10mg"、"20mg"。可以结合brand参数查看特定品牌特定剂量的WD。建议对比同一品牌不同剂量的WD，分析剂量对分销的影响'
          },
          brand: {
            type: 'string',
            description: '可选：品牌名称，如"立普妥"、"可定"。支持模糊匹配。如果不提供，则返回所有品牌的WD数据。建议结合dosage参数，对比同一品牌不同剂量的WD'
          },
          packageSize: {
            type: 'string',
            description: '可选：包装大小，如"大包装"、"小包装"、"20mgx28s"等。可以结合brand和dosage参数进行多维度交叉分析'
          }
        }
      }
    }
  }
];

interface ProblemAnalysisResult {
  scissorsGaps: Array<{
    title: string;
    phenomenon: string;
    possibleReasons?: string; // 第一步不包含，第二步才添加
  }>;
  problems: string[];
  causes: Array<{
    problem: string;
    environmentFactors?: string;
    commercialFactors?: string;
    productFactors?: string;
    resourceFactors?: string;
  }>;
  strategies: Array<{
    problem: string;
    strategies: string[];
  }>;
}

// 格式化市场数据为AI可理解的格式
function formatMarketDataForAI(
  marketData: MarketDataPoint[],
  mekkoData: Array<{
    xAxisValue: string;
    xAxisTotalValue: number;
    xAxisTotalShare: number;
    segments: Array<{
      yAxisValue: string;
      value: number;
      share: number;
    }>;
  }>,
  selectedXAxisKey: string,
  selectedYAxisKey: string,
  availableDimensions: DimensionConfig[],
  selectedBrand: string
): string {
  const xAxisLabel = availableDimensions.find(d => d.key === selectedXAxisKey)?.label || '横轴维度';
  const yAxisLabel = availableDimensions.find(d => d.key === selectedYAxisKey)?.label || '纵轴维度';
  
  // 提取品牌维度
  const brandDimension = availableDimensions.find(d => 
    d.label.toLowerCase().includes('品牌') || d.label.toLowerCase().includes('brand')
  );

  // 统计各维度的数据
  const summary: string[] = [];
  summary.push(`## 数据概览`);
  summary.push(`- 总数据点：${marketData.length}条`);
  summary.push(`- 横轴维度：${xAxisLabel}`);
  summary.push(`- 纵轴维度：${yAxisLabel}`);
  summary.push(`- 分析品牌：${selectedBrand}`);
  summary.push(``);

  // Mekko数据摘要
  summary.push(`## Mekko图表数据摘要`);
  mekkoData.slice(0, 10).forEach((column) => {
    summary.push(`### ${xAxisLabel}: ${column.xAxisValue}`);
    summary.push(`- 总市场份额：${column.xAxisTotalShare.toFixed(2)}%`);
    summary.push(`- 总金额：${column.xAxisTotalValue.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 元`);
    summary.push(`- ${yAxisLabel}分布：`);
    column.segments.slice(0, 5).forEach(seg => {
      summary.push(`  - ${seg.yAxisValue}: ${seg.share.toFixed(2)}% (${seg.value.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 元)`);
    });
    summary.push(``);
  });

  // 品牌维度数据（如果有）
  if (brandDimension) {
    const brandStats = new Map<string, number>();
    marketData.forEach(point => {
      const brand = (point[brandDimension.key] as string) || '';
      if (brand) {
        brandStats.set(brand, (brandStats.get(brand) || 0) + (point.value || 0));
      }
    });
    
    summary.push(`## 品牌维度数据`);
    Array.from(brandStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([brand, total]) => {
        summary.push(`- ${brand}: ${total.toLocaleString('zh-CN', { maximumFractionDigits: 0 })} 元`);
      });
    summary.push(``);
  }

  return summary.join('\n');
}

// 获取维度字段名（根据label查找对应的key）
function getDimensionKeyByLabel(
  availableDimensions: DimensionConfig[],
  labelKeywords: string[]
): string | null {
  for (const dim of availableDimensions) {
    const dimLabelLower = dim.label.toLowerCase();
    if (labelKeywords.some(keyword => dimLabelLower.includes(keyword.toLowerCase()))) {
      return dim.key;
    }
  }
  return null;
}

// 模糊匹配品牌名称（用于处理"立普妥"、"立普妥片"、"立普妥胶囊"等变体）
// 通用模糊匹配函数（用于所有维度的查询）
function fuzzyMatch(dataValue: string | undefined | null, targetValue: string): boolean {
  if (!dataValue || !targetValue) return false;
  
  // 标准化：去除空格、转换为小写
  const normalizedDataValue = String(dataValue).trim().toLowerCase();
  const normalizedTargetValue = String(targetValue).trim().toLowerCase();
  
  // 如果完全匹配，直接返回true
  if (normalizedDataValue === normalizedTargetValue) {
    return true;
  }
  
  // 对于剂量等数值型字段，使用更严格的匹配
  // 如果目标值看起来像剂量（包含"mg"），则要求更精确的匹配
  if (normalizedTargetValue.includes('mg')) {
    // 提取数字部分进行匹配
    const targetNum = normalizedTargetValue.match(/\d+/)?.[0];
    const dataNum = normalizedDataValue.match(/\d+/)?.[0];
    
    if (targetNum && dataNum) {
      // 如果数字部分匹配，再检查是否都包含"mg"
      if (targetNum === dataNum && 
          normalizedDataValue.includes('mg') && 
          normalizedTargetValue.includes('mg')) {
        return true;
      }
    }
    
    // 如果数据值包含目标值（如"10mg"包含在"10mgx14s"中），也匹配
    if (normalizedDataValue.includes(normalizedTargetValue)) {
      return true;
    }
    
    // 如果目标值包含数据值（如"10mgx14s"包含"10mg"），也匹配
    if (normalizedTargetValue.includes(normalizedDataValue)) {
      return true;
    }
    
    return false;
  }
  
  // 对于其他字段，使用原有的模糊匹配逻辑
  // 例如："立普妥" 匹配 "立普妥(阿托伐他汀钙片)"、"浙江" 匹配 "浙江省"等
  if (normalizedDataValue.includes(normalizedTargetValue) || 
      normalizedTargetValue.includes(normalizedDataValue)) {
    return true;
  }
  
  return false;
}

// 品牌模糊匹配（保持向后兼容，内部调用通用模糊匹配）
function fuzzyMatchBrand(dataBrand: string | undefined | null, targetBrand: string): boolean {
  return fuzzyMatch(dataBrand, targetBrand);
}

// 执行数据查询函数
// 注意：所有查询都使用模糊匹配（fuzzyMatch），包括品牌、省份、规格、剂量、价格等维度
export async function executeDataQuery(
  functionName: string,
  args: any,
  _marketData: MarketDataPoint[], // 保留参数以保持接口一致性，但实际使用数据库文件
  _availableDimensions: DimensionConfig[], // 保留参数以保持接口一致性，但实际使用数据库文件的维度
  selectedBrand: string
): Promise<string> {
  try {
    console.log('🔎 开始执行查询:', functionName, '参数:', args);
    // 从数据库文件加载数据（用于AI查询）
    const { data: databaseData, dimensions: databaseDimensions } = await loadDatabaseData();
    console.log('📦 数据库数据加载完成，数据条数:', databaseData.length, '维度数量:', databaseDimensions.length);
    
    // 使用数据库数据而不是marketData
    let filteredData = [...databaseData];
    const result: string[] = [];
    
    // 使用数据库的维度配置
    const queryDimensions = databaseDimensions.length > 0 ? databaseDimensions : _availableDimensions;

    switch (functionName) {
      case 'queryByDosage': {
        const { dosage, brand } = args;
        
        if (dosage === 'all') {
          // 返回所有剂量的统计信息
          const dosageStats = new Map<string, { total: number; brandTotal: number; count: number }>();
          
          const dosageKey = getDimensionKeyByLabel(queryDimensions, ['剂量', 'dosage', 'mg']);
          
          filteredData.forEach(point => {
            const dosageValue = dosageKey ? String(point[dosageKey] || '未知') : '未知';
            const stats = dosageStats.get(dosageValue) || { total: 0, brandTotal: 0, count: 0 };
            stats.total += point.value || 0;
            stats.count += 1;
            
            // 检查品牌匹配（使用模糊搜索）
            if (brand) {
              const brandKey = getDimensionKeyByLabel(queryDimensions, ['品牌', 'brand']);
              if (brandKey && fuzzyMatchBrand(point[brandKey] as string, brand)) {
                stats.brandTotal += point.value || 0;
              }
            } else {
              // 如果没有指定品牌，使用selectedBrand
              const brandKey = getDimensionKeyByLabel(queryDimensions, ['品牌', 'brand']);
              if (brandKey && fuzzyMatchBrand(point[brandKey] as string, selectedBrand)) {
                stats.brandTotal += point.value || 0;
              }
            }
            
            dosageStats.set(dosageValue, stats);
          });
          
          result.push('## 剂量维度分析结果');
          result.push(`共分析 ${dosageStats.size} 个剂量的数据：`);
          Array.from(dosageStats.entries())
            .sort((a, b) => b[1].total - a[1].total)
            .forEach(([dos, stats]) => {
              const share = stats.total > 0 ? ((stats.brandTotal / stats.total) * 100).toFixed(2) : '0.00';
              result.push(`- ${dos}: 总金额 ${stats.total.toLocaleString('zh-CN')} 元，${brand || selectedBrand} 金额 ${stats.brandTotal.toLocaleString('zh-CN')} 元，份额 ${share}%，数据点 ${stats.count} 条`);
            });
        } else {
          // 筛选特定剂量（使用模糊匹配）
          const dosageKey = getDimensionKeyByLabel(queryDimensions, ['剂量', 'dosage', 'mg']);
          if (dosageKey) {
            filteredData = filteredData.filter(point => {
              const dosageValue = String(point[dosageKey] || '');
              return fuzzyMatch(dosageValue, dosage);
            });
          } else {
            result.push('## 剂量维度查询结果：错误');
            result.push('数据库中未找到剂量字段');
            return result.join('\n');
          }
          
          if (brand) {
            const brandKey = getDimensionKeyByLabel(queryDimensions, ['品牌', 'brand']);
            if (brandKey) {
              filteredData = filteredData.filter(point => fuzzyMatchBrand(point[brandKey] as string, brand));
            }
          } else {
            const brandKey = getDimensionKeyByLabel(queryDimensions, ['品牌', 'brand']);
            if (brandKey) {
              filteredData = filteredData.filter(point => fuzzyMatchBrand(point[brandKey] as string, selectedBrand));
            }
          }
          
          const total = filteredData.reduce((sum, p) => sum + (p.value || 0), 0);
          result.push(`## 剂量维度查询结果：${dosage}`);
          result.push(`筛选条件：剂量=${dosage}${brand ? `, 品牌=${brand}` : `, 品牌=${selectedBrand}`}`);
          result.push(`匹配数据点：${filteredData.length} 条`);
          result.push(`总金额：${total.toLocaleString('zh-CN')} 元`);
          if (filteredData.length > 0) {
            result.push(`平均金额：${(total / filteredData.length).toLocaleString('zh-CN')} 元/条`);
          }
        }
        break;
      }

      case 'queryByProductSpec': {
        // 暂时禁用此查询函数
        result.push('## 产品特性维度查询结果：暂时禁用');
        result.push('此查询函数暂时禁用，用于调试。请使用 queryByDosage 和 queryWD 进行查询。');
        return result.join('\n');
      }

      case 'queryPriceDifference': {
        // 暂时禁用此查询函数
        result.push('## 渠道间价差查询结果：暂时禁用');
        result.push('此查询函数暂时禁用，用于调试。请使用 queryByDosage 和 queryWD 进行查询。');
        return result.join('\n');
      }

      case 'queryPublicAwareness': {
        // 暂时禁用此查询函数
        result.push('## 公域认知度查询结果：暂时禁用');
        result.push('此查询函数暂时禁用，用于调试。请使用 queryByDosage 和 queryWD 进行查询。');
        return result.join('\n');
      }

      case 'queryWD': {
        const { dosage, brand, packageSize } = args;
        const targetBrand = brand || selectedBrand;
        
        // 查找WD相关字段
        const wdKey = getDimensionKeyByLabel(queryDimensions, ['WD', 'wd', '分销', '分销率', '加权铺货率']);
        const brandKey = getDimensionKeyByLabel(queryDimensions, ['品牌', 'brand']);
        const packageKey = getDimensionKeyByLabel(queryDimensions, ['包装', 'package', '规格']);
        const dosageKey = getDimensionKeyByLabel(queryDimensions, ['剂量', 'dosage', 'mg']);
        
        console.log('🔍 queryWD - 品牌列key:', brandKey, '目标品牌:', targetBrand);
        console.log('🔍 queryWD - WD列key:', wdKey, '规格列key:', packageKey, '剂量列key:', dosageKey);
        console.log('🔍 queryWD - 请求的剂量:', dosage);
        
        if (brandKey) {
          const beforeCount = filteredData.length;
          filteredData = filteredData.filter(point => {
            const brandValue = point[brandKey] as string;
            const matched = fuzzyMatchBrand(brandValue, targetBrand);
            if (matched && beforeCount < 100) {
              // 只在前100条数据时打印，避免日志过多
              console.log('✅ 品牌匹配成功:', brandValue, '->', targetBrand);
            }
            return matched;
          });
          console.log('📊 queryWD - 品牌筛选后数据条数:', filteredData.length, '(筛选前:', beforeCount, ')');
          
          // 显示匹配到的品牌样本（最多5个）
          if (filteredData.length > 0) {
            const uniqueBrands = new Set(filteredData.slice(0, 20).map(p => String(p[brandKey] || '')));
            console.log('📋 匹配到的品牌样本:', Array.from(uniqueBrands).slice(0, 5));
          } else {
            console.warn('⚠️ queryWD - 没有匹配到任何品牌数据！');
            // 显示前5个品牌值，帮助调试
            const sampleBrands = new Set(filteredData.slice(0, 50).map(p => String(p[brandKey] || '')));
            console.log('📋 数据库中的品牌样本（前5个）:', Array.from(sampleBrands).slice(0, 5));
          }
        } else {
          console.warn('⚠️ queryWD - 未找到品牌列！可用维度:', queryDimensions.map(d => d.label));
        }
        
        if (dosage) {
          if (dosageKey) {
            const beforeDosageCount = filteredData.length;
            
            // 先显示剂量值的样本，帮助调试
            const dosageSamples = new Set(filteredData.slice(0, 20).map(p => String(p[dosageKey] || '')));
            console.log('📋 剂量筛选前，数据中的剂量样本（前10个）:', Array.from(dosageSamples).slice(0, 10));
            
            filteredData = filteredData.filter(point => {
              const dosageValue = String(point[dosageKey] || '');
              const matched = fuzzyMatch(dosageValue, dosage);
              if (matched && beforeDosageCount < 100) {
                console.log('✅ 剂量匹配成功:', dosageValue, '->', dosage);
              }
              return matched;
            });
            console.log('📊 queryWD - 剂量筛选后数据条数:', filteredData.length, '(筛选前:', beforeDosageCount, ')');
            
            if (filteredData.length === beforeDosageCount && beforeDosageCount > 0) {
              console.warn('⚠️ 警告：剂量筛选后数据条数没有变化！可能剂量筛选没有生效');
              console.warn('⚠️ 请求的剂量:', dosage);
              console.warn('⚠️ 数据中的剂量样本:', Array.from(dosageSamples).slice(0, 10));
            }
          } else {
            console.warn('⚠️ queryWD - 未找到剂量列！可用维度:', queryDimensions.map(d => d.label));
            console.warn('⚠️ 无法按剂量筛选，将返回所有剂量的数据');
          }
        }
        
        if (packageSize && packageKey) {
          filteredData = filteredData.filter(point => 
            fuzzyMatch(String(point[packageKey] || ''), packageSize)
          );
        }
        
        result.push(`## 分销率WD查询结果：${targetBrand}`);
        result.push(`筛选条件：${dosage ? `剂量=${dosage}, ` : ''}${packageSize ? `包装=${packageSize}, ` : ''}品牌=${targetBrand}`);
        
        if (wdKey) {
          // 提取WD数据，确保正确转换为数字
          const wdData = filteredData
            .map(p => {
              const wdValue = p[wdKey];
              // 尝试转换为数字
              let wdNum = 0;
              if (wdValue !== undefined && wdValue !== null && wdValue !== '') {
                if (typeof wdValue === 'number') {
                  wdNum = wdValue;
                } else {
                  // 尝试解析字符串
                  const parsed = parseFloat(String(wdValue).replace(/,/g, ''));
                  wdNum = isNaN(parsed) ? 0 : parsed;
                }
              }
              return { 
                value: p.value || 0, 
                wd: wdNum,
                rawWd: wdValue // 保留原始值用于调试
              };
            })
            .filter(d => d.wd > 0);
          
          console.log('📊 queryWD - 找到WD数据:', wdData.length, '条（筛选后总数据:', filteredData.length, '条）');
          
          if (wdData.length > 0) {
            // 显示前几个WD值的样本，用于调试
            if (wdData.length <= 5) {
              console.log('📋 WD数据样本:', wdData.map(d => ({ wd: d.wd, rawWd: d.rawWd })));
            } else {
              console.log('📋 WD数据样本（前5个）:', wdData.slice(0, 5).map(d => ({ wd: d.wd, rawWd: d.rawWd })));
            }
            
            const sumWD = wdData.reduce((sum, d) => {
              const wd = d.wd;
              if (isNaN(wd) || !isFinite(wd)) {
                console.warn('⚠️ 发现无效的WD值:', d.rawWd, '转换为:', wd);
                return sum;
              }
              return sum + wd;
            }, 0);
            
            const avgWD = sumWD / wdData.length;
            
            if (isNaN(avgWD) || !isFinite(avgWD)) {
              console.error('❌ 计算平均WD时出错:', {
                sumWD,
                count: wdData.length,
                样本: wdData.slice(0, 3).map(d => ({ wd: d.wd, rawWd: d.rawWd }))
              });
              result.push(`平均WD：计算错误（请检查WD数据格式）`);
            } else {
              result.push(`平均WD：${avgWD.toFixed(2)}`);
            }
            
            const totalValue = wdData.reduce((sum, d) => sum + (d.value || 0), 0);
            result.push(`总金额：${totalValue.toLocaleString('zh-CN')} 元`);
            result.push(`数据点：${wdData.length} 条`);
          } else {
            console.warn('⚠️ queryWD - 筛选后的数据中没有WD值>0的记录');
            // 显示前几个WD原始值，帮助调试
            const sampleWDs = filteredData.slice(0, 5).map(p => ({
              raw: p[wdKey],
              type: typeof p[wdKey],
              value: p.value
            }));
            console.log('📋 WD原始值样本:', sampleWDs);
            result.push('未找到WD数据（筛选后的数据中WD值均为0或空）');
          }
        } else {
          console.warn('⚠️ queryWD - 未找到WD列！可用维度:', queryDimensions.map(d => d.label));
          result.push('数据库中未包含WD字段（请检查列名是否为"WD"、"wd"、"分销"、"分销率"或"加权铺货率"）');
        }
        break;
      }

      default:
        return `错误：未知的查询函数 "${functionName}"`;
    }

    return result.join('\n');
  } catch (error) {
    return `查询执行错误：${error instanceof Error ? error.message : String(error)}`;
  }
}

// 调用AI进行剪刀差分析
export async function analyzeScissorsGaps(
  marketData: MarketDataPoint[],
  mekkoData: Array<{
    xAxisValue: string;
    xAxisTotalValue: number;
    xAxisTotalShare: number;
    segments: Array<{
      yAxisValue: string;
      value: number;
      share: number;
    }>;
  }>,
  selectedXAxisKey: string,
  selectedYAxisKey: string,
  availableDimensions: DimensionConfig[],
  selectedBrand: string,
  maxItems: number = 5
): Promise<ProblemAnalysisResult> {
  const formattedData = formatMarketDataForAI(
    marketData,
    mekkoData,
    selectedXAxisKey,
    selectedYAxisKey,
    availableDimensions,
    selectedBrand
  );

  const systemPrompt = `你是一名负责零售渠道心血管（降血脂）市场的资深数据分析专家。
你将拿到${selectedBrand}及其竞争产品在零售渠道的详细市场数据。

## 📚 产品背景资料（重要参考）
在进行剪刀差分析时，请结合以下立普妥产品的背景资料，这些资料可以帮助你更好地理解市场环境、竞争结构、生意逻辑和渠道动作：

${LIPITOR_BACKGROUND}

**重要提示**：在识别剪刀差时，请结合这些背景资料来理解市场环境（如集采政策影响、竞争结构等），这有助于你更准确地识别有意义的剪刀差现象。

## 数据说明
- 整体方法论是将市场切分为数个细分市场，分析其中"剪刀差"（剪刀差的定义见后文）
  - 如，降血脂市场可按照 "分子式×剂量"被切分为多个细分市场，例如"阿托伐他汀‑10mg""阿托伐他汀‑20mg"等，进一步分析各个细分市场内品牌的表现
- 数据维度说明
  - 可用于切分市场的数据维度包括：分子式（如阿托伐他汀）、Class（如他汀）、原研/仿制、品牌最早上市时间、品牌平均单片价格、品牌平均单盒价格、品牌平均包装大小、是否中标品、品牌在零售渠道内份额、省份
  - 此外，还有一些可用于计算市场内份额的数据，包括：销售量及销售额、集采前（19年）零售渠道内份额
  - 还有一些可用于分析品牌表现为何好、为何不好的数据，如：衡量渠道铺货优劣的分销率WD、渠道间价格差（电商vs零售）、公域认知度
  - 数据可拆分到每个季度、每个省份的颗粒度，因此你可以对数据进行筛选，例如只查看某个省份（如浙江）的数据

## 一、"剪刀差"的定义
1. 工作定义
在任意两个可比对象之间（品牌 / 剂量 / 省份 / 渠道 / 时间），1）当前时间的份额水平，或2）历史增速变化趋势，向相反方向拉开，并形成明显差距，就称为"剪刀差"现象。所有的剪刀差，都应该同时观察份额/增速这两个维度，输出其中有意义的维度（可以是仅输出其中之一，也可以同时输出对份额和增速的洞察）。
重点关注的对象仍然是晖致品牌表现（如${selectedBrand}），可以重点关注对比竞品品牌的"剪刀差"（如可定）

2. 剪刀差分类
- 同品牌，不同细分市场剪刀差：同一品牌在不同细分市场中的表现分化明显，如${selectedBrand}在10mg 与20mg这两个市场内的份额和增长率差异显著；或${selectedBrand} 10mg 在浙江vs 全国平均表现差异大
- 同细分市场，不同品牌剪刀差：同一细分市场内，不同品牌的份额水平或走势出现"此消彼长"，如在"阿托伐他汀‑10mg"细分市场中，${selectedBrand}份额持续下降，而核心竞争品牌份额持续上升
- 同细分市场，不同价格 / 规格剪刀差：同一"分子式 × 剂量"下，不同价格带或规格包型间的表现分化，如高价规格份额稳定提升，而低价规格份额持续流失，或反之
- 同为原研品，不同细分市场内表现剪刀差：同属原研品（如阿托伐他汀原研品 – ${selectedBrand}、瑞舒伐他汀原研品 – 可定）的两个产品，在分子式内表现差异大，如两个分子式同样在2019年参与集采，${selectedBrand}在阿伐零售渠道内份额从60%降低到30%，可定在瑞伐零售渠道内份额从60%降低到42%，可定份额下降幅度更小
  - 由于集采对于原研品份额冲击大，分析时需要"拉齐集采时间轴"，比如，如果两个分子式在不同年份被首次集采，应该同样对比分子式被集采后第x年的数据，而非单纯对比同一年的数据
- 以上列举非穷尽，你可以自己定义其他的剪刀差，并在数据中寻找这样的剪刀差

## 二、你的任务与分析路径
在理解上述"剪刀差"定义和分类的基础上，你需要：
- 第一步：全面扫描数据，优先识别与${selectedBrand}相关的代表性剪刀差，并生成尽可能多的剪刀差项目
- 第二步：针对发现的剪刀差，发现其中重复项目，并合并，具体的判断方法
    - 如果两条剪刀差项目中对比对象（如同为立普妥 vs. 可定）、渠道（如同为零售渠道）、份额计算口径（包含输出内容中提到的所有份额计算口径，如均包含了分子式内份额）相同，则为同一条剪刀差，应该合并
      - 举例来说：
        - 剪刀差A：
          - 零售渠道分子式内份额落后：立普妥相对可定弱势
          - 现象：在零售渠道整体降血脂市场中，立普妥在其所属的‘阿托伐他汀’分子式内份额为29.92%，而核心竞品可定在其所属的‘瑞舒伐他汀’分子式内份额为39.11%，立普妥在分子式内的统治力落后可定近10个百分点。
        - 剪刀差B
          - 同细分市场品牌间此消彼长：阿托伐他汀市场内立普妥与仿制品份额剪刀差
          - 现象：在‘阿托伐他汀’细分市场（占整体市场55.53%）内，原研品牌立普妥份额为29.92%，而主要仿制品牌美达信份额已达21.68%，舒迈通为10.84%，优力平为7.83%。立普妥份额虽仍为第一，但与头部仿制品牌的差距正在快速缩小，呈现‘此消彼长’的竞争态势。
        - 这两条剪刀差对比的均为立普妥vs可定，渠道均为零售渠道，均提及了“品牌在分子式内份额”这一份额计算口径，因此属于重复项目- 第三步：针对特定的剪刀差项目，深挖其背后原因
  - 深挖时，优先使用数据库中已经提供的数据维度进行深挖，比如
    - 省份，是否品牌表现主要受小部分省份拖累？如果是，这些省份的共同点是什么？（比如集采政策严格、集采中阿托伐他汀仅有10mg中标、都属于东部分省份等）
    - 产品特性，是否品牌的特定品规销售表现差（包含价格带、包装大小、剂量维度，比如大包装、10mg低剂量产品）？如果是，限制这些品规销售的原因是什么？（比如大包装产品渠道分销WD表现不佳）
    - 公域认知度，是否品牌的公域认知度不如竞对，导致份额较低？为何公域认知度较低？
    - 渠道间价差，是否品牌在电商中的价格高于零售，导致患者都去电商购买，而不在零售购买？

以${selectedBrand}-零售市场为例，建议的分析步骤是：
- 第一步：先看${selectedBrand}在零售降血脂整体市场中的表现，再按"分子式 × 剂量→时间序列"逐级下钻，在每个层级将${selectedBrand}与主要竞品及其自身其他细分市场对比，围绕"同品牌内部 / 品牌间 / 渠道间 / 时间趋势 / 价格规格"这几类剪刀差视角系统性地扫描和归纳问题
- 随后提炼每一项剪刀差涉及的关键要素（对比对象、细分市场定义、对比的是当期份额/历史增速），发现重复项目，进行合并
- 针对每项剪刀差条目，深挖原因，输出解释

## 三、输出格式（非常重要）
- 整体方针：你的目标不是把所有数字逐条复述，而是筛选出大约5条左右最关键的剪刀差信息，这些信息要能够清晰指向"目前品牌运营中存在的核心问题"，并用简洁、业务化的语言表达出来。
- **重要：第一步只输出剪刀差现象，不输出原因分析。原因分析将在第二步（用户确认后）进行。**
- 具体格式：中文，bullet point形式，每一个"剪刀差"用统一结构描述：
  - 小标题：一句简短的话，先概括问题，再点出维度（例如"零售渠道分子式内份额落后：${selectedBrand}相对可定弱势"）。
  - 现象描述：用1–2 句话说明具体数据表现（谁高谁低、差多少、和哪一类对比，例如"医院内与可定持平，零售渠道内落后了xx%，其中${selectedBrand}xx%，可定xx%"）。**所有分析都要引用真实数据来说明，数据要详细、真实。数据要具体（清晰说明时间框架、增速计算口径 - pdot/销售额）。**
- 输出举例：医院内，${selectedBrand}分子式内份额与可定持平（均为~12%），零售渠道内，${selectedBrand}在分子式内份额低于可定（~9%对比~12%）；拆分来看，${selectedBrand}主要是10mg中标省份（如安徽、合肥）的份额明显低。同时，发现${selectedBrand}10mg中标省份的WD较低（44对比其他省份60），基于WD分销作为零售的重要因素，可能存在进一步提升的空间

## 输出格式要求
请以JSON格式输出，包含以下结构：
{
  "scissorsGaps": [
    {
      "title": "简短标题，概括问题和维度",
      "phenomenon": "现象描述：用1-2句话说明具体数据表现（必须引用真实数据，清晰说明时间框架、增速计算口径），例如'医院内与可定持平（均为~12%），零售渠道内落后了3个百分点，其中${selectedBrand}9%，可定12%；拆分来看，${selectedBrand}主要是10mg中标省份（如安徽、合肥）的份额明显低，同时发现${selectedBrand}10mg中标省份的WD较低（44对比其他省份60）'"
    }
  ]
}

**重要：请完成以下两步后输出最终结果（第一步不包含原因分析）：**
1. 全面扫描数据，生成尽可能多的剪刀差项目（5条左右）
2. 发现其中重复项目并合并（如果两条剪刀差项目中要素完全相同，包括对比的对象、细分市场的定义、对比的是当前份额/历史增速，则为同一条剪刀差，应该合并）
3. 输出合并后的最终剪刀差列表，限制为最多${maxItems}条最关键的剪刀差信息，这些信息要能够清晰指向"目前品牌运营中存在的核心问题"。

**注意：第一步只输出title和phenomenon，不要输出possibleReasons。原因分析将在用户确认后进行。**`;

  const userPrompt = `请基于以下市场数据，按照以下步骤进行分析：

第一步：全面扫描数据，识别与${selectedBrand}相关的代表性剪刀差，生成尽可能多的剪刀差项目（5条左右）
第二步：发现其中重复项目并合并（如果两条剪刀差项目中要素完全相同，包括对比的对象、细分市场的定义、对比的是当前份额/历史增速，则为同一条剪刀差，应该合并）

**重要：第一步只输出剪刀差现象（title和phenomenon），不要输出原因分析（possibleReasons）。原因分析将在用户确认后进行。**

市场数据：
${formattedData}

请严格按照JSON格式输出，只输出JSON，不要包含其他文字说明。每个剪刀差必须包含：
- title: 简短标题，概括问题和维度
- phenomenon: 现象描述，必须引用真实数据，清晰说明时间框架、增速计算口径（pdot/销售额）

**不要包含possibleReasons字段。**`;

  try {
    console.log('🎯 开始第一步：剪刀差分析');
    console.log('🔑 检查API Key:', DEEPSEEK_API_KEY ? '已配置' : '未配置（将使用模拟数据）');
    let responseText = '';
    
    if (!DEEPSEEK_API_KEY) {
      console.log('⚠️ 未配置DEEPSEEK_API_KEY，使用模拟响应（第一步分析）');
      // 模拟响应
      responseText = JSON.stringify({
        scissorsGaps: [
          {
            title: "零售渠道分子式内份额落后：立普妥相对可定弱势",
            phenomenon: "医院内立普妥分子式内份额与可定持平（均为~12%），零售渠道内立普妥在分子式内份额低于可定（~9%对比~12%，差距3个百分点）；拆分来看，立普妥主要是10mg中标省份（如安徽、合肥）的份额明显低。同时，发现立普妥10mg中标省份的WD较低（44对比其他省份60），基于WD分销作为零售的重要因素，可能存在进一步提升的空间"
            // 第一步不包含possibleReasons
          }
        ]
      });
    } else {
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 5000,
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      responseText = response.data.choices[0]?.message?.content || '';
    }

    // 尝试解析JSON响应
    try {
      // 如果响应包含代码块，提取JSON部分
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                       responseText.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;
      
      const result = JSON.parse(jsonText.trim());
      return {
        scissorsGaps: result.scissorsGaps || [],
        problems: [],
        causes: [],
        strategies: [],
      };
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // 如果解析失败，返回默认结构
      return {
        scissorsGaps: [],
        problems: [],
        causes: [],
        strategies: [],
      };
    }
  } catch (error) {
    console.error('AI Analysis Error:', error);
    return {
      scissorsGaps: [],
      problems: [],
      causes: [],
      strategies: [],
    };
  }
}

// 分析问题原因和策略
export async function analyzeProblemsAndStrategies(
  scissorsGaps: Array<{
    title: string;
    phenomenon: string;
    possibleReasons?: string; // 第一步可能不包含
  }>,
  selectedBrand: string,
  marketData: MarketDataPoint[],
  availableDimensions: DimensionConfig[],
  userFeedback?: string,
  maxProblems: number = 10,
  confirmedProblems?: string[]
): Promise<{
  problems: string[];
  causes: Array<{
    problem: string;
    statement: string; // 总结性的分析陈述，不再分四个因素
  }>;
  strategies: Array<{
    problem: string;
    strategies: string[];
  }>;
}> {
  const gapsText = scissorsGaps.map((gap, idx) => 
    `${idx + 1}. ${gap.title}\n   现象：${gap.phenomenon}${gap.possibleReasons ? `\n   可能原因：${gap.possibleReasons}` : ''}`
  ).join('\n\n');

  // 如果用户已经确认了问题列表，直接基于这些问题分析成因和策略
  if (confirmedProblems && confirmedProblems.length > 0) {
    const systemPromptForCauses = `你是一名负责零售渠道心血管（降血脂）市场的资深数据分析专家。
基于已确认的问题列表，请完成成因分析。

## 📚 产品背景资料（重要参考）
在进行问题分析时，请结合以下立普妥产品的背景资料，这些资料可以帮助你更好地理解市场环境、竞争结构、生意逻辑和渠道动作：

${LIPITOR_BACKGROUND}

**重要提示**：在分析时，请结合这些背景资料来丰富你的domain knowledge，特别是在分析环境因素、产品因素和资源分配因素时，可以引用这些背景资料中的信息（如集采政策、竞争结构、渠道动作等）来让分析更加深入和准确。

## ⚠️ 重要：你必须使用工具函数查询数据库（强制要求）
**在开始分析之前，你必须先调用以下工具函数查询数据库获取真实数据，不能直接推测！**

系统为你提供了以下数据查询工具，**你必须根据分析需要主动调用这些工具**：
1. **queryByDosage**: 按剂量筛选数据，分析品牌在不同剂量下的表现差异。可以传入"all"查看所有剂量的对比
2. **queryWD**: 查询分销率WD数据，分析渠道铺货情况。**特别重要**：建议查询相同品牌不同剂量的WD，对比分析不同剂量下的分销表现差异（如queryWD({brand: '立普妥', dosage: '10mg'})和queryWD({brand: '立普妥', dosage: '20mg'})）

**注意**：以下查询函数暂时禁用，用于调试：
- queryByProductSpec（产品特性查询）
- queryPriceDifference（渠道间价差查询）
- queryPublicAwareness（公域认知度查询）

请优先使用 queryByDosage 和 queryWD 进行数据分析。
3. **queryPriceDifference**: 查询渠道间价差（电商vs零售），分析价格差异对销售的影响
4. **queryPublicAwareness**: 查询公域认知度数据，对比不同品牌的认知度差异
5. **queryWD**: 查询分销率WD数据，分析渠道铺货情况。**特别重要**：建议查询相同品牌不同剂量的WD，对比分析不同剂量下的分销表现差异（如queryWD({brand: '立普妥', dosage: '10mg'})和queryWD({brand: '立普妥', dosage: '20mg'})）

**强制要求**：
1. **在分析每个问题时，必须先调用相关工具函数查询数据库获取真实数据**
2. **不能在没有查询数据的情况下直接进行推测**
3. **所有分析结论必须基于查询函数返回的真实数据**
4. **在输出中必须明确说明使用了哪些查询函数，以及查询结果是什么**

## 分析路径（非常重要）
深挖时，**必须使用数据库中已经提供的数据维度进行深挖**，按以下顺序进行分析：

1. **省份维度**：是否品牌表现主要受小部分省份拖累？如果是，这些省份的共同点是什么？（比如集采政策严格、集采中阿托伐他汀仅有10mg中标、都属于东部分省份等）
2. **产品特性维度**：是否品牌的特定品规销售表现差（包含价格带、包装大小、剂量维度，比如大包装、10mg低剂量产品）？如果是，限制这些品规销售的原因是什么？（比如大包装产品渠道分销WD表现不佳）
3. **公域认知度维度**：是否品牌的公域认知度不如竞对，导致份额较低？为何公域认知度较低？
4. **渠道间价差维度**：是否品牌在电商中的价格高于零售，导致患者都去电商购买，而不在零售购买？

**注意**：如果数据库中没有相关数据，请在分析中明确说明"数据库中暂无相关数据"。

## 输出格式要求
请以JSON格式输出：
{
  "causes": [
    {
      "problem": "问题描述",
      "statement": "总结性的分析陈述，必须包含环境因素、商业推广因素、产品因素、资源分配因素四个维度的分析。必须使用结构化格式：用两个换行符\\n\\n分隔段落（注意：必须使用两个换行符\\n\\n，不是单个\\n），每个维度独立成段，使用**环境因素**、**商业推广因素**、**产品因素**、**资源分配因素**作为小标题。⚠️ 重要：不要在statement中提及金额和份额数据。例如：'医院内，立普妥分子式内表现与可定持平，零售渠道内，立普妥表现低于可定。\\n\\n**环境因素**：立普妥主要是10mg中标省份（如安徽、合肥）的表现明显低，这些省份集采政策严格，仅10mg中标导致院内处方向零售转移受限。\\n\\n**产品因素**：立普妥在10mg剂量数据量是20mg的近2倍，说明10mg是主要使用剂量，但立普妥在10mg剂量的产品定位和患者教育可能不足，导致患者对低剂量产品的认知和接受度有限。\\n\\n**商业推广因素**：立普妥10mg的WD为25.92，而可定10mg的WD为46.85，两者相差20.93个百分点，说明在10mg剂量的商业推广和渠道覆盖上，立普妥明显弱于可定，渠道铺货不足限制了产品的可及性。\\n\\n**资源分配因素**：立普妥可能将更多资源投入到高剂量产品的学术推广和医生教育上，而低剂量产品的市场教育和患者管理投入相对不足，相比之下，可定在10mg剂量上的市场投入更充分，包括患者教育、渠道建设和医生沟通，这解释了为什么可定表现更好。'"
    }
  ]
}

**重要**：
- **必须包含四个维度的分析**：
  - **环境因素**：集采政策、省份差异、市场环境、政策影响等（不要提WD，用domain knowledge分析政策、市场环境的影响）
  - **商业推广因素**：渠道覆盖、推广策略、市场投入、WD分销率等（这是唯一可以提WD的维度，WD是渠道覆盖的重要指标）
  - **产品因素**：剂量规格、包装大小、产品特性、产品定位等（不要提WD，用domain knowledge分析产品本身的特点和定位）
  - **资源分配因素**：资源投入、渠道资源配置、市场策略重点等（不要只提WD，用domain knowledge分析资源分配策略）
- **必须使用结构化格式**：不要一长串话，要用段落和小标题来组织内容，每个维度独立成段，使用**环境因素**、**商业推广因素**、**产品因素**、**资源分配因素**作为小标题，用两个换行符\\n\\n分隔段落（注意：必须使用两个换行符\\n\\n，不是单个\\n）
- 必须引用查询结果中的具体数据（如数值、省份名称等），但**不要提及金额和份额数据**
- **重要**：WD（分销率）数据只在商业推广因素中提及，其他维度要用domain knowledge来丰富分析，让故事更丰满
- 可以基于domain knowledge补充合理的分析，但要与查询数据结合
- 所有分析必须基于查询函数返回的真实数据，但可以在数据基础上进行合理推断
- **⚠️ 重要：不要在statement中提及金额（如"XX元"、"XX万元"）和份额（如"XX%"、"份额"等）数据**

请为每个问题提供成因分析，最多${maxProblems}条。所有分析必须引用真实数据。注意：只需要输出成因分析，不需要输出策略建议。`;

    try {
      console.log('🔑 检查API Key（confirmedProblems分支）:', DEEPSEEK_API_KEY ? '已配置' : '未配置（将使用模拟数据）');
      
      const allCauses: Array<{ problem: string; statement: string }> = [];
      
      // 逐个问题处理，每次只分析一个问题
      for (let i = 0; i < confirmedProblems.length && i < maxProblems; i++) {
        const problem = confirmedProblems[i];
        console.log(`\n📌 开始分析第 ${i + 1}/${Math.min(confirmedProblems.length, maxProblems)} 个问题: ${problem}`);
        
        const userPromptForSingleProblem = `请针对以下问题深挖其背后原因：

${problem}

**分析要求**：
1. 必须使用数据库中已经提供的数据维度进行深挖（省份、产品特性、公域认知度、渠道间价差）
2. 如果数据库中没有相关数据，请在分析中明确说明"数据库中暂无相关数据"
3. 所有分析必须基于查询函数返回的真实数据，不能进行推测
4. **只分析这一个问题，不要分析其他问题**

请严格按照JSON格式输出，只输出JSON，不要包含其他文字说明。注意：只需要输出成因分析（causes），不需要输出策略建议（strategies）。`;

      let responseText = '';
      
      if (!DEEPSEEK_API_KEY) {
        console.log('⚠️ 未配置DEEPSEEK_API_KEY，使用模拟响应（不会调用查询函数）');
        // 模拟响应
        responseText = JSON.stringify({
            causes: [{
              problem: problem,
              statement: '基于数据库维度分析：通过省份维度分析发现，品牌表现主要受部分省份拖累，这些省份的共同点是集采政策严格、集采中阿托伐他汀仅有10mg中标。同时，通过产品特性维度分析发现，大包装产品渠道分销WD表现不佳（WD为44，对比其他省份60），导致院外承接院内处方能力差。',
            }],
        });
      } else {
        // 支持Function Calling的多轮对话
        const messages: Array<{
          role: 'system' | 'user' | 'assistant' | 'tool';
          content?: string;
          tool_calls?: Array<{
            id: string;
            type: 'function';
            function: {
              name: string;
              arguments: string;
            };
          }>;
          tool_call_id?: string;
          name?: string;
        }> = [
          { role: 'system', content: systemPromptForCauses },
            { role: 'user', content: userPromptForSingleProblem }
        ];

          const maxIterations = 15;
        let iteration = 0;
        
          console.log('🚀 开始AI分析（单个问题），支持Function Calling，工具数量:', DATA_QUERY_TOOLS.length);

        while (iteration < maxIterations) {
          const response = await axios.post(
            DEEPSEEK_API_URL,
            {
              model: 'deepseek-chat',
              messages: messages,
              tools: DATA_QUERY_TOOLS,
              tool_choice: 'auto',
              temperature: 0.7,
                max_tokens: 8000, // 增加token限制
            },
            {
              headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          );

          const message = response.data.choices[0]?.message;
          if (!message) {
            break;
          }

          messages.push({
            role: 'assistant',
            content: message.content || undefined,
            tool_calls: message.tool_calls || undefined
          });

          if (message.tool_calls && message.tool_calls.length > 0) {
              console.log(`🔍 AI请求调用查询函数（问题 ${i + 1}），共`, message.tool_calls.length, '个函数调用');
            for (const toolCall of message.tool_calls) {
              const functionName = toolCall.function.name;
              let functionArgs: any;
              
              try {
                functionArgs = JSON.parse(toolCall.function.arguments);
                console.log('📊 调用查询函数:', functionName, '参数:', functionArgs);
              } catch (e) {
                console.error('Failed to parse function arguments:', e);
                functionArgs = {};
              }

              const queryResult = await executeDataQuery(
                functionName,
                functionArgs,
                marketData,
                availableDimensions,
                selectedBrand
              );

              console.log('✅ 查询结果:', functionName, '返回数据长度:', queryResult.length, '字符');
              console.log('📋 查询结果预览:', queryResult.substring(0, 200) + '...');

              messages.push({
                role: 'tool',
                content: queryResult,
                tool_call_id: toolCall.id,
                name: functionName
              });
            }

              // 在查询结果返回后，提醒AI继续分析
              messages.push({
                role: 'user',
                content: `查询结果已返回。请基于这些查询结果进行深度分析，并输出JSON格式的分析结果。记住：只分析当前这一个问题，输出格式为 {"causes": [{"problem": "${problem}", "statement": "总结性的分析陈述..."}]}`
              });

            iteration++;
            continue;
          } else {
              console.log(`📝 AI返回最终分析结果（问题 ${i + 1}）`);
            responseText = message.content || '';
            break;
          }
        }

        if (iteration >= maxIterations) {
            console.warn(`⚠️ Function calling reached max iterations（问题 ${i + 1}）`);
          const lastMessage = messages[messages.length - 1];
          responseText = lastMessage.content || '分析超时，请重试';
        }
      }

      // 尝试解析JSON响应
      try {
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                         responseText.match(/```\s*([\s\S]*?)\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;
        
        const result = JSON.parse(jsonText.trim());
          const causes = result.causes || [];
          
          if (causes.length > 0) {
            // 确保problem字段正确
            const cause = causes[0];
            if (cause.statement) {
              allCauses.push({
                problem: problem,
                statement: cause.statement
              });
              console.log(`✅ 成功解析问题 ${i + 1} 的分析结果`);
            } else {
              console.warn(`⚠️ 问题 ${i + 1} 的响应缺少statement字段`);
            }
          } else {
            console.warn(`⚠️ 问题 ${i + 1} 的响应中没有causes数组`);
          }
        } catch (parseError) {
          console.error(`❌ 解析问题 ${i + 1} 的响应失败:`, parseError);
          console.error('响应内容（前500字符）:', responseText.substring(0, 500));
          // 继续处理下一个问题，不中断整个流程
        }
      }
      
        return {
          problems: confirmedProblems, // 返回确认的问题列表
        causes: allCauses,
          strategies: [], // 不再生成策略
        };
    } catch (error) {
      console.error('AI Analysis Error:', error);
      return {
        problems: confirmedProblems,
        causes: [],
        strategies: [], // 不再生成策略
      };
    }
  }

  const systemPrompt = `你是一名负责零售渠道心血管（降血脂）市场的资深数据分析专家。
在此之前，你已经完成了针对${selectedBrand}及其竞争产品的"剪刀差分析"，系统识别出多个市场表现上的剪刀差现象。

## 📚 产品背景资料（重要参考）
在进行问题分析时，请结合以下立普妥产品的背景资料，这些资料可以帮助你更好地理解市场环境、竞争结构、生意逻辑和渠道动作：

${LIPITOR_BACKGROUND}

**重要提示**：在分析时，请结合这些背景资料来丰富你的domain knowledge，特别是在分析环境因素、产品因素和资源分配因素时，可以引用这些背景资料中的信息（如集采政策、竞争结构、渠道动作等）来让分析更加深入和准确。

## 你的任务
针对特定的剪刀差项目，深挖其背后原因。

## ⚠️ 重要：你必须使用工具函数查询数据库（强制要求）
**在开始分析之前，你必须先调用以下工具函数查询数据库获取真实数据，不能直接推测！**

系统为你提供了以下数据查询工具，**你必须根据分析需要主动调用这些工具**：
1. **queryByProvince**: 按省份筛选数据，分析品牌在不同省份的表现差异
   - 使用场景：分析"是否品牌表现主要受小部分省份拖累"时，必须调用此函数
   - 示例：queryByProvince({province: 'all', brand: '${selectedBrand}'}) 查看所有省份数据
2. **queryByProductSpec**: 按产品特性筛选（价格带、包装大小、剂量等），分析特定品规的销售表现
   - 使用场景：分析"是否品牌的特定品规销售表现差"时，必须调用此函数
   - 示例：queryByProductSpec({dosage: '10mg', brand: '${selectedBrand}'}) 查看10mg产品数据
3. **queryPriceDifference**: 查询渠道间价差（电商vs零售），分析价格差异对销售的影响
   - 使用场景：分析"是否品牌在电商中的价格高于零售"时，必须调用此函数
4. **queryPublicAwareness**: 查询公域认知度数据，对比不同品牌的认知度差异
   - 使用场景：分析"是否品牌的公域认知度不如竞对"时，必须调用此函数
5. **queryWD**: 查询分销率WD数据，分析渠道铺货情况
   - 使用场景：分析"是否品牌的特定品规分销率WD表现不佳"时，必须调用此函数
   - 示例：queryWD({province: '浙江', brand: '${selectedBrand}'}) 查看浙江的WD数据

**强制要求**：
1. **在分析每个剪刀差时，必须先调用相关工具函数查询数据库获取真实数据**
2. **不能在没有查询数据的情况下直接进行推测**
3. **所有分析结论必须基于查询函数返回的真实数据**
4. **如果数据库中没有相关数据，请在分析中明确说明"数据库中暂无相关数据"**
5. **在输出中必须明确说明使用了哪些查询函数，以及查询结果是什么**

### 分析路径（非常重要 - 深度分析要求）
**⚠️ 关键要求：不要只做简单的数据对比！必须主动探索数据模式并进行深度分析！**

深挖时，**必须使用数据库中已经提供的数据维度进行深挖**，按以下顺序进行分析：

1. **省份维度**：是否品牌表现主要受小部分省份拖累？如果是，这些省份的共同点是什么？（比如集采政策严格、集采中阿托伐他汀仅有10mg中标、都属于东部分省份等）
   - 调用 queryByProvince({province: 'all', brand: '${selectedBrand}'}) 查看所有省份数据
   - 识别表现差的省份，分析这些省份的共同特征

2. **产品特性维度**：是否品牌的特定品规销售表现差（包含价格带、包装大小、剂量维度，比如大包装、10mg低剂量产品）？如果是，限制这些品规销售的原因是什么？（比如大包装产品渠道分销WD表现不佳）
   - 调用 queryByProductSpec 查询特定品规数据
   - 调用 queryWD 分析不同品规的分销率表现

3. **公域认知度维度**：是否品牌的公域认知度不如竞对，导致份额较低？为何公域认知度较低？
   - 调用 queryPublicAwareness 对比不同品牌的认知度差异

4. **渠道间价差维度**：是否品牌在电商中的价格高于零售，导致患者都去电商购买，而不在零售购买？
   - 调用 queryPriceDifference 查询渠道间价差数据

**注意**：如果数据库中没有相关数据，请在分析中明确说明"数据库中暂无相关数据"。

**分析深度要求**：
- 每个剪刀差至少调用3-5个不同的查询函数进行深入分析
- 不要只报告单一指标的平均值，要分析数据分布、异常值、模式
- 要提出假设并验证（如"假设：立普妥在东部省份WD更高 → 验证：通过查询发现..."）
- 要进行多维度交叉分析（省份×规格、省份×品牌等）
- 要识别"为什么"而不仅仅是"是什么"

**注意**：如果数据库中没有相关数据，请在分析中明确说明"数据库中暂无相关数据"。

### 分析建议（深度分析示例）
以${selectedBrand}-零售市场为例，**不要只做简单的数据对比**，必须进行深度分析：

**❌ 错误示例（太机械，不要这样做）**：
"立普妥的平均WD为46.33，可定的平均WD为39.19。立普妥的分销率WD略高于可定"

**✅ 正确示例（深度分析，必须这样做）**：
"通过queryWD查询发现，立普妥的平均WD为46.33，可定为39.19。但进一步分析发现：
1. **剂量分化明显**：通过queryByDosage和queryWD交叉分析，立普妥10mg的WD为40-，而20mg的WD为50+，存在明显的剂量分化
2. **规格差异**：通过queryByProductSpec和queryWD分析，立普妥大包装规格（20mgx28s）的WD为50+，而小包装规格（10mgx14s）的WD为40-，这种差异在10mg剂量更加明显
3. **竞品对比**：可定虽然整体WD较低，但在10mg剂量的WD反而略高于立普妥（42 vs 40），说明立普妥在10mg剂量的分销存在明显短板
4. **可能原因**：结合剂量和规格分析，立普妥10mg大包装规格的WD偏低，可能与低剂量患者更偏好小包装、短疗程有关，而立普妥在10mg剂量的大包装铺货不足"

**分析步骤**：
1. 针对每项剪刀差条目，先调用基础查询函数获取整体数据
2. **必须主动调用更多查询函数**，从省份、产品特性、公域认知度、渠道间价差等多个角度深入分析
3. 识别数据中的模式和异常值
4. 提出假设并验证
5. 进行多维度交叉分析
6. 如果数据库中没有相关数据，请在分析中明确说明"数据库中暂无相关数据"

## ⚠️ 输出格式要求（非常重要）
**在完成所有查询函数调用后，你必须返回JSON格式的分析结果，而不是查询结果的原始文本。**

**JSON格式**：
{
  "causes": [
    {
      "problem": "剪刀差标题（用于标识对应的剪刀差）",
      "environmentFactors": "环境因素分析（基于数据库维度分析，如省份、产品特性等）",
      "commercialFactors": "商业推广因素分析（基于数据库维度分析，如渠道间价差、分销率等）",
      "productFactors": "产品因素分析（基于数据库维度分析，如产品特性、剂量、包装等）",
      "resourceFactors": "资源分配因素分析（基于数据库维度分析，如省份分布、渠道表现等）"
    }
  ],
  "strategies": [
    {
      "problem": "剪刀差标题（用于标识对应的剪刀差）",
      "strategies": ["策略1", "策略2", ...]
    }
  ]
}

**重要说明**：
1. **不要直接返回查询结果的文本**（如"## 分销率WD查询结果..."），而是要对查询结果进行分析和总结
2. **在完成所有查询后，必须返回JSON格式的分析结果**
3. **JSON中应该包含基于查询结果的深度分析，而不是查询结果的原始文本**
4. **必须引用查询结果中的具体数据**，不能使用占位符文本（如"环境因素分析"、"商业推广因素分析"等）
5. **必须引用具体的数值和发现**，如"通过queryWD查询发现，立普妥10mg的WD为40，而20mg的WD为50，说明存在明显的剂量分化"
6. **必须进行深度分析**，说明"为什么"而不仅仅是"是什么"
7. **只输出JSON，不要包含任何其他文字说明**

**⚠️ 禁止使用占位符文本**：
- ❌ 错误示例："environmentFactors": "环境因素分析"
- ✅ 正确示例："environmentFactors": "通过queryWD查询发现，立普妥10mg的WD为40，而20mg的WD为50，结合queryByDosage分析，说明10mg剂量在零售渠道的分销存在明显短板，可能与集采政策导致10mg中标省份的渠道资源配置不足有关"

- 每个剪刀差对应一个cause条目，problem字段使用剪刀差的title
- **每个剪刀差至少调用3-5个不同的查询函数进行深入分析**，不要只调用1-2个函数就得出结论
- 四大因素分析中，优先使用数据库维度（剂量、WD分销率）进行分析。注意：产品特性、公域认知度、渠道间价差等查询函数暂时禁用
- **不要只报告平均值**，要分析数据分布、异常值、模式，并进行多维度交叉分析
- 如果数据库中没有相关数据，请在分析中明确说明"数据库中暂无相关数据"
- 所有分析必须引用真实数据，数据要详细、真实、具体（清晰说明时间框架、数据来源）
- **分析要深入**：要说明"为什么"而不仅仅是"是什么"，要识别数据中的模式和异常

请严格基于给定的剪刀差分析结果进行推理，不要凭空捏造数据。`;

  let userPrompt = `请基于以下剪刀差分析结果，针对每个剪刀差项目深挖其背后原因：

${gapsText}

**⚠️ 强制分析流程（必须遵循）**：

**第一步：必须调用查询函数获取数据**
在分析每个剪刀差之前，你必须先调用相关的查询函数获取真实数据：
1. **剂量维度分析**：必须调用 queryByDosage({dosage: 'all', brand: '${selectedBrand}'}) 查看所有剂量数据，识别表现差的剂量
2. **分销率WD分析**：**特别重要**：必须调用 queryWD({brand: '${selectedBrand}', dosage: '10mg'}) 和 queryWD({brand: '${selectedBrand}', dosage: '20mg'}) 对比同一品牌不同剂量的WD

**注意**：产品特性、渠道间价差、公域认知度等查询函数暂时禁用，请优先使用剂量和WD维度进行分析。

**第二步：基于查询结果进行深入分析（非常重要）**
**不要只做简单的数据对比！** 你必须基于初步查询结果，主动进行多角度、多层次的深入分析：

1. **主动探索数据模式**：
   - 如果初步查询发现"立普妥的平均WD为46.33，可定为39.19"，不要只停留在"立普妥略高"的结论
   - **必须主动调用更多查询函数**，从多个角度深入分析：
     - 调用 queryByDosage({dosage: 'all', brand: '立普妥'}) 查看剂量分布，识别哪些剂量拉高了平均值，哪些剂量拖了后腿
     - **必须调用** queryWD({brand: '立普妥', dosage: '10mg'}) 和 queryWD({brand: '立普妥', dosage: '20mg'}) 对比同一品牌不同剂量的WD
     - 结合剂量和品牌：queryWD({dosage: '10mg', brand: '立普妥'}) 和 queryWD({dosage: '20mg', brand: '立普妥'}) 查看特定剂量的表现

2. **识别数据异常和模式**：
   - 如果发现某些剂量/规格的WD明显偏离平均值，必须深入分析原因
   - 识别数据中的"剪刀差"模式（如：某些剂量WD高但某些剂量WD低）
   - 对比不同维度下的表现差异

3. **提出假设并验证**：
   - 基于初步数据提出假设（如"立普妥在高剂量WD更高"）
   - 主动调用相关查询函数验证假设（如queryWD({brand: '立普妥', dosage: '10mg'})和queryWD({brand: '立普妥', dosage: '20mg'})）
   - 如果假设不成立，提出新的假设并继续验证

4. **多维度交叉分析**：
   - 不要孤立地看单一指标，要结合多个维度：
     - 剂量 × 规格：哪些剂量的哪些规格表现差？
     - 剂量 × 品牌：不同剂量下品牌对比如何？
     - 规格 × 品牌：不同规格下品牌对比如何？

**分析要求**：
- 每个剪刀差至少调用3-5个不同的查询函数进行深入分析
- 不要只报告平均值，要分析数据分布、异常值、模式
- 要识别"为什么"而不仅仅是"是什么"
- 要提出具体的、可验证的假设并验证

**输出要求（深度分析要求）**：
- 在JSON输出的每个cause条目中，必须明确说明使用了哪些查询函数（至少3-5个，越多越好）
- 必须引用查询函数返回的具体数据，并进行深入分析：
  - ❌ **错误示例（太机械）**："立普妥的平均WD为46.33，可定的平均WD为39.19。立普妥的分销率WD略高于可定"
  - ✅ **正确示例（深度分析）**："通过queryWD查询发现，立普妥的平均WD为46.33，可定为39.19。但进一步分析发现：
    1. 剂量分化明显：通过queryByDosage和queryWD交叉分析，立普妥10mg的WD为40-，而20mg的WD为50+，存在明显的剂量分化
    2. 规格差异：通过queryByProductSpec和queryWD分析，立普妥大包装规格（20mgx28s）的WD为50+，而小包装规格（10mgx14s）的WD为40-，这种差异在10mg剂量更加明显
    3. 竞品对比：可定虽然整体WD较低，但在10mg剂量的WD反而略高于立普妥（42 vs 40），说明立普妥在10mg剂量的分销存在明显短板
    4. 可能原因：结合剂量和规格分析，立普妥10mg大包装规格的WD偏低，可能与低剂量患者更偏好小包装、短疗程有关，而立普妥在10mg剂量的大包装铺货不足"
- 要分析数据分布、异常值、模式，而不仅仅是平均值
- 要提出具体的假设并说明验证结果（如"假设：立普妥在高剂量WD更高 → 验证：通过queryWD查询发现，立普妥20mg的WD为50+，而10mg的WD为40-，假设成立"）
- 要进行多维度交叉分析（剂量×规格、剂量×品牌、规格×品牌等）
- 如果某个维度没有查询到数据，必须说明"数据库中暂无相关数据"
**⚠️ 重要：输出格式要求**
- **必须严格按照JSON格式输出，只输出JSON，不要包含任何其他文字说明**
- **不要输出查询结果的原始文本，只输出分析后的JSON结果**
- **必须包含四个维度的分析**：
  - **环境因素**：集采政策、省份差异、市场环境、政策影响等（不要提WD，用domain knowledge分析政策、市场环境的影响）
  - **商业推广因素**：渠道覆盖、推广策略、市场投入、WD分销率等（这是唯一可以提WD的维度，WD是渠道覆盖的重要指标）
  - **产品因素**：剂量规格、包装大小、产品特性、产品定位等（不要提WD，用domain knowledge分析产品本身的特点和定位）
  - **资源分配因素**：资源投入、渠道资源配置、市场策略重点等（不要只提WD，用domain knowledge分析资源分配策略）
- **必须使用结构化格式**：不要一长串话，要用段落和小标题来组织内容，每个维度独立成段，使用**环境因素**、**商业推广因素**、**产品因素**、**资源分配因素**作为小标题，用两个换行符\\n\\n分隔段落（注意：必须使用两个换行符\\n\\n，不是单个\\n）
- **重要**：WD（分销率）数据只在商业推广因素中提及，其他维度要用domain knowledge来丰富分析，让故事更丰满
- **可以基于domain knowledge补充合理的分析**，但要与查询数据结合
- **⚠️ 重要：不要在statement中提及金额和份额数据**
- **JSON格式示例**：
\`\`\`json
{
  "causes": [
    {
      "problem": "剪刀差标题",
      "statement": "总结性的分析陈述，必须包含环境因素、商业推广因素、产品因素、资源分配因素四个维度的分析。必须使用结构化格式：用两个换行符\\n\\n分隔段落（注意：必须使用两个换行符\\n\\n，不是单个\\n），每个维度独立成段，使用**环境因素**、**商业推广因素**、**产品因素**、**资源分配因素**作为小标题。WD（分销率）数据只在商业推广因素中提及，其他维度要用domain knowledge来丰富分析。⚠️ 重要：不要在statement中提及金额和份额数据。例如：'医院内，立普妥分子式内表现与可定持平，零售渠道内，立普妥表现低于可定。\\n\\n**环境因素**：立普妥主要是10mg中标省份（如安徽、合肥）的表现明显低，这些省份集采政策严格，仅10mg中标导致院内处方向零售转移受限，同时这些省份的零售市场准入门槛较高，对原研产品的接受度相对较低。\\n\\n**产品因素**：立普妥在10mg剂量数据量是20mg的近2倍，说明10mg是主要使用剂量，但立普妥在10mg剂量的产品定位和患者教育可能不足，导致患者对低剂量产品的认知和接受度有限，而高剂量产品虽然使用频率低但单次价值高，更容易获得市场关注。\\n\\n**商业推广因素**：立普妥10mg的WD为25.92，而可定10mg的WD为46.85，两者相差20.93个百分点，说明在10mg剂量的商业推广和渠道覆盖上，立普妥明显弱于可定，渠道铺货不足限制了产品的可及性。\\n\\n**资源分配因素**：立普妥可能将更多资源投入到高剂量产品的学术推广和医生教育上，而低剂量产品的市场教育和患者管理投入相对不足，相比之下，可定在10mg剂量上的市场投入更充分，包括患者教育、渠道建设和医生沟通，这解释了为什么可定表现更好。'"
    }
  ]
}
\`\`\`
- 每个剪刀差必须对应一个cause条目
- **注意：只需要输出成因分析（causes），不需要输出策略建议（strategies）**
- **不要在JSON前后添加任何解释性文字，直接输出JSON即可**`;

  if (userFeedback) {
    userPrompt += `\n\n用户反馈：\n${userFeedback}\n\n请根据用户反馈调整分析。`;
  }

  const allCauses: Array<{ problem: string; statement: string }> = [];
  const problemsToAnalyze = scissorsGaps.slice(0, maxProblems);
    
  try {
    console.log('🔑 检查API Key:', DEEPSEEK_API_KEY ? '已配置' : '未配置（将使用模拟数据）');
    
    // 逐个问题处理，每次只分析一个问题
    for (let i = 0; i < problemsToAnalyze.length; i++) {
      const gap = problemsToAnalyze[i];
      console.log(`\n📌 开始分析第 ${i + 1}/${problemsToAnalyze.length} 个剪刀差: ${gap.title}`);
      
      const singleGapText = `${gap.title}\n   现象：${gap.phenomenon}${gap.possibleReasons ? `\n   可能原因：${gap.possibleReasons}` : ''}`;
      
      let userPromptForSingleGap = `请基于以下剪刀差分析结果，针对这个剪刀差项目深挖其背后原因：

${singleGapText}

**⚠️ 强制分析流程（必须遵循）**：

**第一步：必须调用查询函数获取数据**
在分析这个剪刀差之前，你必须先调用相关的查询函数获取真实数据：
1. **剂量维度分析**：必须调用 queryByDosage({dosage: 'all', brand: '${selectedBrand}'}) 查看所有剂量数据，识别表现差的剂量
2. **分销率WD分析**：**特别重要**：必须调用 queryWD({brand: '${selectedBrand}', dosage: '10mg'}) 和 queryWD({brand: '${selectedBrand}', dosage: '20mg'}) 对比同一品牌不同剂量的WD

**注意**：产品特性、渠道间价差、公域认知度等查询函数暂时禁用，请优先使用剂量和WD维度进行分析。

**第二步：基于查询结果进行深入分析（非常重要）**
**不要只做简单的数据对比！** 你必须基于初步查询结果，主动进行多角度、多层次的深入分析。

**输出要求**：
- **必须包含四个维度的分析**：
  - **环境因素**：集采政策、省份差异、市场环境、政策影响等（不要提WD，用domain knowledge分析政策、市场环境的影响）
  - **商业推广因素**：渠道覆盖、推广策略、市场投入、WD分销率等（这是唯一可以提WD的维度，WD是渠道覆盖的重要指标）
  - **产品因素**：剂量规格、包装大小、产品特性、产品定位等（不要提WD，用domain knowledge分析产品本身的特点和定位）
  - **资源分配因素**：资源投入、渠道资源配置、市场策略重点等（不要只提WD，用domain knowledge分析资源分配策略）
- **必须使用结构化格式**：不要一长串话，要用段落和小标题来组织内容，每个维度独立成段，使用**环境因素**、**商业推广因素**、**产品因素**、**资源分配因素**作为小标题，用两个换行符\\n\\n分隔段落（注意：必须使用两个换行符\\n\\n，不是单个\\n）
- 必须引用查询结果中的具体数据（如数值、省份名称等），但**不要提及金额和份额数据**
- **重要**：WD（分销率）数据只在商业推广因素中提及，其他维度要用domain knowledge来丰富分析，让故事更丰满
- 可以基于domain knowledge补充合理的分析，但要与查询数据结合
- 所有分析必须基于查询函数返回的真实数据，但可以在数据基础上进行合理推断
- **只分析这一个剪刀差，不要分析其他剪刀差**
- **⚠️ 重要：不要在statement中提及金额（如"XX元"、"XX万元"）和份额（如"XX%"、"份额"等）数据**

**statement示例格式**（⚠️ 必须严格按照此格式，使用两个换行符\\n\\n分隔段落，使用**加粗**标记小标题）：
"医院内，立普妥分子式内表现与可定持平，零售渠道内，立普妥表现低于可定。\\n\\n**环境因素**：立普妥主要是10mg中标省份（如安徽、合肥）的表现明显低，这些省份集采政策严格，仅10mg中标导致院内处方向零售转移受限，同时这些省份的零售市场准入门槛较高，对原研产品的接受度相对较低。\\n\\n**产品因素**：立普妥在10mg剂量数据量是20mg的近2倍，说明10mg是主要使用剂量，但立普妥在10mg剂量的产品定位和患者教育可能不足，导致患者对低剂量产品的认知和接受度有限，而高剂量产品虽然使用频率低但单次价值高，更容易获得市场关注。\\n\\n**商业推广因素**：立普妥10mg的WD为25.92，而可定10mg的WD为46.85，两者相差20.93个百分点，说明在10mg剂量的商业推广和渠道覆盖上，立普妥明显弱于可定，渠道铺货不足限制了产品的可及性。\\n\\n**资源分配因素**：立普妥可能将更多资源投入到高剂量产品的学术推广和医生教育上，而低剂量产品的市场教育和患者管理投入相对不足，相比之下，可定在10mg剂量上的市场投入更充分，包括患者教育、渠道建设和医生沟通，这解释了为什么可定表现更好。"

**⚠️ 格式要求（非常重要）**：
1. 必须在statement字符串中使用\\n\\n（两个换行符）来分隔段落
2. 必须使用**环境因素**、**商业推广因素**、**产品因素**、**资源分配因素**作为加粗小标题（使用**加粗**markdown语法）
3. 每个维度必须独立成段，段落之间用\\n\\n分隔
4. 不要将所有内容放在一个长段落中

请严格按照JSON格式输出，只输出JSON，不要包含其他文字说明。格式为：
\`\`\`json
{
  "causes": [
    {
      "problem": "${gap.title}",
      "statement": "总结性的分析陈述，必须包含环境因素、商业推广因素、产品因素、资源分配因素四个维度的分析..."
    }
  ]
}
\`\`\``;

      if (userFeedback) {
        userPromptForSingleGap += `\n\n用户反馈：\n${userFeedback}\n\n请根据用户反馈调整分析。`;
      }
      
      let responseText = '';
    
    if (!DEEPSEEK_API_KEY) {
      console.log('⚠️ 未配置DEEPSEEK_API_KEY，使用模拟响应（不会调用查询函数）');
        // 模拟响应
      responseText = JSON.stringify({
          causes: [{
            problem: gap.title,
            statement: '基于数据库维度分析：通过省份维度分析发现，品牌表现主要受部分省份拖累，这些省份的共同点是集采政策严格、集采中阿托伐他汀仅有10mg中标。同时，通过产品特性维度分析发现，大包装产品渠道分销WD表现不佳（WD为44，对比其他省份60），导致院外承接院内处方能力差。',
          }],
      });
    } else {
      // 支持Function Calling的多轮对话
      const messages: Array<{
        role: 'system' | 'user' | 'assistant' | 'tool';
        content?: string;
        tool_calls?: Array<{
          id: string;
          type: 'function';
          function: {
            name: string;
            arguments: string;
          };
        }>;
        tool_call_id?: string;
        name?: string;
      }> = [
        { role: 'system', content: systemPrompt },
          { role: 'user', content: userPromptForSingleGap }
      ];

      const maxIterations = 15; // 增加迭代次数，给AI更多机会完成分析
      let iteration = 0;

      while (iteration < maxIterations) {
        const response = await axios.post(
          DEEPSEEK_API_URL,
          {
            model: 'deepseek-chat',
            messages: messages,
            tools: DATA_QUERY_TOOLS,
            tool_choice: 'auto',
            temperature: 0.7,
            max_tokens: 8000, // 增加token限制，避免JSON被截断
          },
          {
            headers: {
              'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const message = response.data.choices[0]?.message;
        if (!message) {
          break;
        }

        // 将AI的响应添加到消息历史
        messages.push({
          role: 'assistant',
          content: message.content || undefined,
          tool_calls: message.tool_calls || undefined
        });

        // 检查是否有函数调用
        if (message.tool_calls && message.tool_calls.length > 0) {
          console.log('🔍 AI请求调用查询函数（confirmedProblems分支），共', message.tool_calls.length, '个函数调用');
          // 执行所有函数调用
          for (const toolCall of message.tool_calls) {
            const functionName = toolCall.function.name;
            let functionArgs: any;
            
            try {
              functionArgs = JSON.parse(toolCall.function.arguments);
              console.log('📊 调用查询函数:', functionName, '参数:', functionArgs);
            } catch (e) {
              console.error('Failed to parse function arguments:', e);
              functionArgs = {};
            }

            // 执行查询函数
            const queryResult = await executeDataQuery(
              functionName,
              functionArgs,
              marketData,
              availableDimensions,
              selectedBrand
            );

            console.log('✅ 查询结果:', functionName, '返回数据长度:', queryResult.length, '字符');
            console.log('📋 查询结果预览:', queryResult.substring(0, 200) + '...');

            // 将查询结果作为tool消息返回
            messages.push({
              role: 'tool',
              content: queryResult,
              tool_call_id: toolCall.id,
              name: functionName
            });
          }

          // 在查询结果返回后，明确告诉AI下一步应该做什么
          // 收集所有查询结果，让AI基于这些结果进行分析
          const allQueryResults = messages
            .filter(m => m.role === 'tool')
            .map(m => m.content)
            .join('\n\n');
          
          messages.push({
            role: 'user',
            content: `查询结果已全部返回。现在请基于以下查询结果进行深度分析：

**重要要求**：
1. **必须引用查询结果中的具体数据**，不能使用占位符文本
2. **必须基于查询结果进行深度分析**，说明"为什么"而不仅仅是"是什么"
3. **必须引用具体的数值**，如"立普妥10mg的WD为40，20mg的WD为50"，但**不要提及金额和份额数据**
4. **必须进行多维度交叉分析**，结合不同查询结果
5. **必须包含四个维度的分析**：
   - **环境因素**：集采政策、省份差异、市场环境、政策影响等（不要提WD，用domain knowledge分析政策、市场环境的影响）
   - **商业推广因素**：渠道覆盖、推广策略、市场投入、WD分销率等（这是唯一可以提WD的维度，WD是渠道覆盖的重要指标）
   - **产品因素**：剂量规格、包装大小、产品特性、产品定位等（不要提WD，用domain knowledge分析产品本身的特点和定位）
   - **资源分配因素**：资源投入、渠道资源配置、市场策略重点等（不要只提WD，用domain knowledge分析资源分配策略）
6. **必须使用结构化格式**：不要一长串话，要用段落和小标题来组织内容，每个维度独立成段，使用**环境因素**、**商业推广因素**、**产品因素**、**资源分配因素**作为小标题，用两个换行符\\n\\n分隔段落（注意：必须使用两个换行符\\n\\n，不是单个\\n）
7. **重要**：WD（分销率）数据只在商业推广因素中提及，其他维度要用domain knowledge来丰富分析，让故事更丰满
8. **可以基于domain knowledge补充合理的分析**，但要与查询数据结合
9. **⚠️ 重要：不要在statement中提及金额（如"XX元"、"XX万元"）和份额（如"XX%"、"份额"等）数据**

**查询结果汇总**：
${allQueryResults.substring(0, 2000)}${allQueryResults.length > 2000 ? '\n...(查询结果已截断，请基于已提供的查询结果进行分析)' : ''}

**输出要求**：
请以JSON格式输出分析结果，格式如下：
\`\`\`json
{
  "causes": [
    {
      "problem": "${gap.title}",
      "statement": "总结性的分析陈述，必须包含环境因素、商业推广因素、产品因素、资源分配因素四个维度的分析。必须使用结构化格式：用两个换行符\\n\\n分隔段落（注意：必须使用两个换行符\\n\\n，不是单个\\n），每个维度独立成段，使用**环境因素**、**商业推广因素**、**产品因素**、**资源分配因素**作为小标题。必须引用具体数据，但⚠️ 重要：不要在statement中提及金额和份额数据。例如：'医院内，立普妥分子式内表现与可定持平，零售渠道内，立普妥表现低于可定。\\n\\n**环境因素**：立普妥主要是10mg中标省份（如安徽、合肥）的表现明显低，这些省份集采政策严格，仅10mg中标导致院内处方向零售转移受限。\\n\\n**产品因素**：立普妥在10mg剂量数据量是20mg的近2倍，说明10mg是主要使用剂量，但立普妥在10mg剂量的产品定位和患者教育可能不足，导致患者对低剂量产品的认知和接受度有限。\\n\\n**商业推广因素**：立普妥10mg的WD为25.92，而可定10mg的WD为46.85，两者相差20.93个百分点，说明在10mg剂量的商业推广和渠道覆盖上，立普妥明显弱于可定，渠道铺货不足限制了产品的可及性。\\n\\n**资源分配因素**：立普妥可能将更多资源投入到高剂量产品的学术推广和医生教育上，而低剂量产品的市场教育和患者管理投入相对不足，相比之下，可定在10mg剂量上的市场投入更充分，包括患者教育、渠道建设和医生沟通，这解释了为什么可定表现更好。'"
    }
  ]
}
\`\`\`

**⚠️ 禁止**：
- 不要返回占位符文本
- 不要直接返回查询结果的原始文本
- 不要使用示例文本，必须基于实际查询结果进行分析
- 不要按照四个因素分类列出，要融合在一句连贯的statement中
- 只输出JSON，不要包含其他文字说明`
          });

          iteration++;
          continue; // 继续下一轮对话
        } else {
          // 没有函数调用，AI返回了最终结果
          console.log('📝 AI返回最终分析结果');
          responseText = message.content || '';
          
          // 检查响应是否包含JSON
          const hasJson = responseText.trim().startsWith('{') || 
                         responseText.includes('```json') || 
                         responseText.match(/\{[\s\S]*\}/);
          
          if (!hasJson) {
            console.warn('⚠️ AI响应可能不是JSON格式，内容预览:', responseText.substring(0, 200));
            
            // 如果AI返回的是查询结果文本而不是JSON，提示AI应该返回JSON
            if (responseText.includes('查询结果') || responseText.includes('##') || 
                responseText.includes('请基于这些查询结果')) {
              console.warn('⚠️ AI返回了查询结果文本，需要提醒AI返回JSON格式');
              
              // 检查是否已经达到最大迭代次数
              if (iteration >= maxIterations - 1) {
                console.warn('⚠️ 已达到最大迭代次数，尝试从响应中提取JSON');
                // 不继续对话，直接尝试解析
                break;
              }
              
              // 收集所有查询结果
              const allQueryResults = messages
                .filter(m => m.role === 'tool')
                .map(m => m.content)
                .join('\n\n');
              
              // 添加一个用户消息，提醒AI返回JSON
              messages.push({
                role: 'user',
                content: `你刚才返回的是提示文本，而不是基于查询结果的分析。请重新分析：

**查询结果汇总**：
${allQueryResults.substring(0, 2000)}${allQueryResults.length > 2000 ? '\n...(查询结果已截断)' : ''}

**要求**：
1. 必须基于上述查询结果进行深度分析
2. 必须引用查询结果中的具体数据（如"立普妥10mg的WD为40"），但**不要提及金额和份额数据**
3. 不能使用占位符文本
4. 必须说明"为什么"而不仅仅是"是什么"
5. **必须包含四个维度的分析**：
   - **环境因素**：集采政策、省份差异、市场环境、政策影响等（不要提WD，用domain knowledge分析政策、市场环境的影响）
   - **商业推广因素**：渠道覆盖、推广策略、市场投入、WD分销率等（这是唯一可以提WD的维度，WD是渠道覆盖的重要指标）
   - **产品因素**：剂量规格、包装大小、产品特性、产品定位等（不要提WD，用domain knowledge分析产品本身的特点和定位）
   - **资源分配因素**：资源投入、渠道资源配置、市场策略重点等（不要只提WD，用domain knowledge分析资源分配策略）
6. **必须使用结构化格式**：不要一长串话，要用段落和小标题来组织内容，每个维度独立成段，使用**环境因素**、**商业推广因素**、**产品因素**、**资源分配因素**作为小标题，用两个换行符\\n\\n分隔段落（注意：必须使用两个换行符\\n\\n，不是单个\\n）
7. **重要**：WD（分销率）数据只在商业推广因素中提及，其他维度要用domain knowledge来丰富分析，让故事更丰满
8. **可以基于domain knowledge补充合理的分析**，但要与查询数据结合
9. **⚠️ 重要：不要在statement中提及金额（如"XX元"、"XX万元"）和份额（如"XX%"、"份额"等）数据**
10. 只输出JSON格式，不要包含其他文字

**JSON格式**：
\`\`\`json
{
  "causes": [
    {
      "problem": "${gap.title}",
      "statement": "总结性的分析陈述，必须包含环境因素、商业推广因素、产品因素、资源分配因素四个维度的分析。必须使用结构化格式：用两个换行符\\n\\n分隔段落（注意：必须使用两个换行符\\n\\n，不是单个\\n），每个维度独立成段，使用**环境因素**、**商业推广因素**、**产品因素**、**资源分配因素**作为小标题。必须引用具体数据，但⚠️ 重要：不要在statement中提及金额和份额数据。WD（分销率）数据只在商业推广因素中提及，其他维度要用domain knowledge来丰富分析，让故事更丰满"
    }
  ]
}
\`\`\``
              });
              iteration++;
              continue; // 继续下一轮，让AI重新返回JSON
            }
          }
          
          break;
        }
      }

      if (iteration >= maxIterations) {
          console.warn(`⚠️ Function calling reached max iterations（问题 ${i + 1}）`);
        // 使用最后一次响应的内容
        const lastMessage = messages[messages.length - 1];
        responseText = lastMessage.content || '分析超时，请重试';
      }
    }

    // 尝试解析JSON响应
    try {
          console.log(`📝 尝试解析AI响应（问题 ${i + 1}），响应长度:`, responseText.length);
          console.log(`📝 响应前500字符:`, responseText.substring(0, 500));
      
      // 尝试多种方式提取JSON
      let jsonText = responseText;
      
      // 方法1: 尝试提取markdown代码块中的JSON
      const jsonCodeBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonCodeBlockMatch) {
        jsonText = jsonCodeBlockMatch[1];
        console.log('✅ 从json代码块中提取JSON');
      } else {
        // 方法2: 尝试提取普通代码块中的JSON
        const codeBlockMatch = responseText.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          const codeContent = codeBlockMatch[1];
          // 检查是否是JSON格式
          if (codeContent.trim().startsWith('{')) {
            jsonText = codeContent;
            console.log('✅ 从代码块中提取JSON');
          }
          } else {
              // 方法3: 尝试直接查找JSON对象
            const jsonObjectMatch = responseText.match(/\{[\s\S]*?\}/);
            if (jsonObjectMatch) {
              jsonText = jsonObjectMatch[0];
              console.log('✅ 直接提取JSON对象');
            }
          }
      }
      
      // 清理JSON文本
      jsonText = jsonText.trim();
      jsonText = jsonText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
      
          const result = JSON.parse(jsonText.trim());
          const causes = result.causes || [];
          
          if (causes.length > 0) {
            // 确保problem字段正确，并检查是否有statement字段
            const cause = causes[0];
            if (cause.statement) {
              allCauses.push({
                problem: gap.title,
                statement: cause.statement
              });
              console.log(`✅ 成功解析问题 ${i + 1} 的分析结果`);
                } else {
              console.warn(`⚠️ 问题 ${i + 1} 的响应缺少statement字段`);
                }
              } else {
            console.warn(`⚠️ 问题 ${i + 1} 的响应中没有causes数组`);
          }
        } catch (parseError) {
          console.error(`❌ 解析问题 ${i + 1} 的响应失败:`, parseError);
          console.error('响应内容（前1000字符）:', responseText.substring(0, 1000));
          // 继续处理下一个问题，不中断整个流程
        }
      }
      
      return {
      problems: problemsToAnalyze.map(g => g.title),
      causes: allCauses,
        strategies: [], // 不再生成策略
      };
  } catch (error) {
    console.error('AI Analysis Error:', error);
    return {
      problems: problemsToAnalyze.map(g => g.title),
      causes: allCauses,
      strategies: [],
    };
  }
}

