import axios from 'axios';
import { MarketDataPoint, DimensionConfig } from '../types/strategy';
import { readExcelFile } from './excelService';

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

// 加载数据库文件
async function loadDatabaseData(): Promise<{
  data: MarketDataPoint[];
  dimensions: DimensionConfig[];
}> {
  // 如果缓存存在且未过期（5分钟），直接返回
  const now = Date.now();
  if (databaseDataCache && (now - databaseDataCache.timestamp) < 5 * 60 * 1000) {
    return {
      data: databaseDataCache.data,
      dimensions: databaseDataCache.dimensions
    };
  }

  try {
    const timestamp = new Date().getTime();
    const filePath = `${DATABASE_FILE_PATH}?t=${timestamp}`;
    console.log('📂 加载数据库文件:', filePath);
    
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
    
    console.log('数据库文件加载成功:', {
      数据条数: result.data.length,
      维度数量: databaseDataCache.dimensions.length
    });
    
    return {
      data: databaseDataCache.data,
      dimensions: databaseDataCache.dimensions
    };
  } catch (error) {
    console.error('加载数据库文件失败:', error);
    // 如果加载失败，返回空数据
    return {
      data: [],
      dimensions: []
    };
  }
}

// 数据查询函数定义（Function Calling格式）
const DATA_QUERY_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'queryByProvince',
      description: '按省份筛选数据，分析品牌在不同省份的表现差异',
      parameters: {
        type: 'object',
        properties: {
          province: {
            type: 'string',
            description: '省份名称，如"浙江"、"安徽"。如果传入"all"，则返回所有省份的统计信息'
          },
          brand: {
            type: 'string',
            description: '可选：品牌名称，如"立普妥"。如果不提供，则返回所有品牌的数据'
          }
        },
        required: ['province']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'queryByProductSpec',
      description: '按产品特性筛选数据（价格带、包装大小、剂量等），分析特定品规的销售表现',
      parameters: {
        type: 'object',
        properties: {
          priceBand: {
            type: 'string',
            description: '价格带，如"高价"、"低价"、"中价"'
          },
          packageSize: {
            type: 'string',
            description: '包装大小，如"大包装"、"小包装"'
          },
          dosage: {
            type: 'string',
            description: '剂量，如"10mg"、"20mg"'
          },
          brand: {
            type: 'string',
            description: '可选：品牌名称'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'queryPriceDifference',
      description: '查询渠道间价差（电商vs零售），分析价格差异对销售的影响',
      parameters: {
        type: 'object',
        properties: {
          brand: {
            type: 'string',
            description: '可选：品牌名称。如果不提供，则返回所有品牌的价差对比'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'queryPublicAwareness',
      description: '查询公域认知度数据，对比不同品牌的认知度差异',
      parameters: {
        type: 'object',
        properties: {
          brand: {
            type: 'string',
            description: '可选：品牌名称。如果不提供，则返回所有品牌的认知度对比'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'queryWD',
      description: '查询分销率WD数据，分析渠道铺货情况',
      parameters: {
        type: 'object',
        properties: {
          province: {
            type: 'string',
            description: '可选：省份名称'
          },
          brand: {
            type: 'string',
            description: '可选：品牌名称'
          },
          packageSize: {
            type: 'string',
            description: '可选：包装大小'
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
function fuzzyMatchBrand(dataBrand: string | undefined | null, targetBrand: string): boolean {
  if (!dataBrand || !targetBrand) return false;
  
  // 标准化：去除空格、转换为小写
  const normalizedDataBrand = String(dataBrand).trim().toLowerCase();
  const normalizedTargetBrand = String(targetBrand).trim().toLowerCase();
  
  // 如果完全匹配，直接返回true
  if (normalizedDataBrand === normalizedTargetBrand) {
    return true;
  }
  
  // 模糊匹配：检查数据中的品牌是否包含目标品牌，或目标品牌是否包含数据中的品牌
  // 例如："立普妥" 匹配 "立普妥片"、"立普妥胶囊"、"立普妥(阿托伐他汀钙片)"等
  if (normalizedDataBrand.includes(normalizedTargetBrand) || 
      normalizedTargetBrand.includes(normalizedDataBrand)) {
    return true;
  }
  
  return false;
}

// 执行数据查询函数
async function executeDataQuery(
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
      case 'queryByProvince': {
        const { province, brand } = args;
        
        if (province === 'all') {
          // 返回所有省份的统计信息
          const provinceStats = new Map<string, { total: number; brandTotal: number; count: number }>();
          
          filteredData.forEach(point => {
            const prov = point.province || '未知';
            const stats = provinceStats.get(prov) || { total: 0, brandTotal: 0, count: 0 };
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
            
            provinceStats.set(prov, stats);
          });
          
          result.push('## 省份维度分析结果');
          result.push(`共分析 ${provinceStats.size} 个省份的数据：`);
          Array.from(provinceStats.entries())
            .sort((a, b) => b[1].total - a[1].total)
            .forEach(([prov, stats]) => {
              const share = stats.total > 0 ? ((stats.brandTotal / stats.total) * 100).toFixed(2) : '0.00';
              result.push(`- ${prov}: 总金额 ${stats.total.toLocaleString('zh-CN')} 元，${brand || selectedBrand} 金额 ${stats.brandTotal.toLocaleString('zh-CN')} 元，份额 ${share}%，数据点 ${stats.count} 条`);
            });
        } else {
          // 筛选特定省份
          filteredData = filteredData.filter(point => point.province === province);
          
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
          result.push(`## 省份维度查询结果：${province}`);
          result.push(`筛选条件：省份=${province}${brand ? `, 品牌=${brand}` : `, 品牌=${selectedBrand}`}`);
          result.push(`匹配数据点：${filteredData.length} 条`);
          result.push(`总金额：${total.toLocaleString('zh-CN')} 元`);
          if (filteredData.length > 0) {
            result.push(`平均金额：${(total / filteredData.length).toLocaleString('zh-CN')} 元/条`);
          }
        }
        break;
      }

      case 'queryByProductSpec': {
        const { priceBand, packageSize, dosage, brand } = args;
        
        // 根据维度配置查找对应的字段
        if (priceBand) {
          const priceKey = getDimensionKeyByLabel(queryDimensions, ['价格', 'price', '价格带']);
          if (priceKey) {
            filteredData = filteredData.filter(point => 
              String(point[priceKey] || '').includes(priceBand)
            );
          }
        }
        
        if (packageSize) {
          const packageKey = getDimensionKeyByLabel(queryDimensions, ['包装', 'package', '规格']);
          if (packageKey) {
            filteredData = filteredData.filter(point => 
              String(point[packageKey] || '').includes(packageSize)
            );
          }
        }
        
        if (dosage) {
          const dosageKey = getDimensionKeyByLabel(queryDimensions, ['剂量', 'dosage', 'mg']);
          if (dosageKey) {
            filteredData = filteredData.filter(point => 
              String(point[dosageKey] || '').includes(dosage)
            );
          }
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
        result.push('## 产品特性维度查询结果');
        result.push(`筛选条件：${priceBand ? `价格带=${priceBand}, ` : ''}${packageSize ? `包装=${packageSize}, ` : ''}${dosage ? `剂量=${dosage}, ` : ''}${brand || selectedBrand}`);
        result.push(`匹配数据点：${filteredData.length} 条`);
        result.push(`总金额：${total.toLocaleString('zh-CN')} 元`);
        if (filteredData.length > 0) {
          result.push(`平均金额：${(total / filteredData.length).toLocaleString('zh-CN')} 元/条`);
        }
        break;
      }

      case 'queryPriceDifference': {
        const { brand } = args;
        const targetBrand = brand || selectedBrand;
        
        // 查找渠道和价格相关字段
        const channelKey = getDimensionKeyByLabel(queryDimensions, ['渠道', 'channel']);
        const priceKey = getDimensionKeyByLabel(queryDimensions, ['价格', 'price']);
        const brandKey = getDimensionKeyByLabel(queryDimensions, ['品牌', 'brand']);
        
        if (brandKey) {
          filteredData = filteredData.filter(point => fuzzyMatchBrand(point[brandKey] as string, targetBrand));
        }
        
        // 按渠道分组统计
        const channelStats = new Map<string, { total: number; count: number; avgPrice: number }>();
        
        filteredData.forEach(point => {
          const channel = channelKey ? String(point[channelKey] || '未知') : '未知';
          const price = priceKey ? (point[priceKey] as number) || 0 : 0;
          const value = point.value || 0;
          
          const stats = channelStats.get(channel) || { total: 0, count: 0, avgPrice: 0 };
          stats.total += value;
          stats.count += 1;
          if (price > 0) {
            stats.avgPrice = (stats.avgPrice * (stats.count - 1) + price) / stats.count;
          }
          channelStats.set(channel, stats);
        });
        
        result.push(`## 渠道间价差查询结果：${targetBrand}`);
        Array.from(channelStats.entries()).forEach(([channel, stats]) => {
          result.push(`- ${channel}: 总金额 ${stats.total.toLocaleString('zh-CN')} 元，数据点 ${stats.count} 条${stats.avgPrice > 0 ? `，平均价格 ${stats.avgPrice.toFixed(2)} 元` : ''}`);
        });
        break;
      }

      case 'queryPublicAwareness': {
        const { brand } = args;
        const targetBrand = brand || selectedBrand;
        
        // 查找认知度相关字段
        const awarenessKey = getDimensionKeyByLabel(queryDimensions, ['认知度', 'awareness', '认知', '公域']);
        const brandKey = getDimensionKeyByLabel(queryDimensions, ['品牌', 'brand']);
        
        if (brandKey) {
          filteredData = filteredData.filter(point => fuzzyMatchBrand(point[brandKey] as string, targetBrand));
        }
        
        result.push(`## 公域认知度查询结果：${targetBrand}`);
        
        if (awarenessKey) {
          const awarenessData = filteredData
            .map(p => ({ value: p.value || 0, awareness: p[awarenessKey] as number || 0 }))
            .filter(d => d.awareness > 0);
          
          if (awarenessData.length > 0) {
            const avgAwareness = awarenessData.reduce((sum, d) => sum + d.awareness, 0) / awarenessData.length;
            result.push(`平均认知度：${avgAwareness.toFixed(2)}`);
            result.push(`数据点：${awarenessData.length} 条`);
          } else {
            result.push('未找到认知度数据');
          }
        } else {
          result.push('数据库中未包含认知度字段');
        }
        break;
      }

      case 'queryWD': {
        const { province, brand, packageSize } = args;
        const targetBrand = brand || selectedBrand;
        
        // 查找WD相关字段
        const wdKey = getDimensionKeyByLabel(queryDimensions, ['WD', 'wd', '分销', '分销率', '加权铺货率']);
        const brandKey = getDimensionKeyByLabel(queryDimensions, ['品牌', 'brand']);
        const packageKey = getDimensionKeyByLabel(queryDimensions, ['包装', 'package', '规格']);
        
        console.log('🔍 queryWD - 品牌列key:', brandKey, '目标品牌:', targetBrand);
        console.log('🔍 queryWD - WD列key:', wdKey, '规格列key:', packageKey);
        
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
        
        if (province) {
          filteredData = filteredData.filter(point => point.province === province);
        }
        
        if (packageSize && packageKey) {
          filteredData = filteredData.filter(point => 
            String(point[packageKey] || '').includes(packageSize)
          );
        }
        
        result.push(`## 分销率WD查询结果：${targetBrand}`);
        result.push(`筛选条件：${province ? `省份=${province}, ` : ''}${packageSize ? `包装=${packageSize}, ` : ''}品牌=${targetBrand}`);
        
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
  maxItems: number = 10
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
- 第一步：全面扫描数据，优先识别与${selectedBrand}相关的代表性剪刀差，并生成尽可能多的剪刀差项目（10条以上）
- 第二步：针对发现的剪刀差，发现其中重复项目，并合并，具体的判断方法
  - 如果两条剪刀差项目中要素完全相同（包括对比的对象、细分市场的定义、对比的是当前份额/历史增速），则为同一条剪刀差，应该合并
- 第三步：针对特定的剪刀差项目，深挖其背后原因
  - 深挖时，优先使用数据库中已经提供的数据维度进行深挖，比如
    - 省份，是否品牌表现主要受小部分省份拖累？如果是，这些省份的共同点是什么？（比如集采政策严格、集采中阿托伐他汀仅有10mg中标、都属于东部分省份等）
    - 产品特性，是否品牌的特定品规销售表现差（包含价格带、包装大小、剂量维度，比如大包装、10mg低剂量产品）？如果是，限制这些品规销售的原因是什么？（比如大包装产品渠道分销WD表现不佳）
    - 公域认知度，是否品牌的公域认知度不如竞对，导致份额较低？为何公域认知度较低（可联网搜索）？
    - 渠道间价差，是否品牌在电商中的价格高于零售，导致患者都去电商购买，而不在零售购买？
  - 如果无客观数据，可联网搜索原因，包含以下角度，注意需要附上对应新闻来源（此部分可简略进行）
    - 1）环境因素：医院准入、集采政策、医保与处方外流政策、地方监管或政策变化等；
    - 2）商业推广因素：渠道策略（院内 vs 院外、电商 vs 零售）、定价与促销策略、市场推广模式（学术推广、消费者教育、药店活动等）、零售可及度；
    - 3）产品因素：产品特性（疗效、安全性）、适应症定位、规格与包装设计、价格竞争力、患者评价等；
    - 4）资源分配因素：人力投入（代表 / KA 覆盖）、市场费用投入、区域 / 渠道资源配置是否均衡等。

以${selectedBrand}-零售市场为例，建议的分析步骤是：
- 第一步：先看${selectedBrand}在零售降血脂整体市场中的表现，再按"分子式 × 剂量→时间序列"逐级下钻，在每个层级将${selectedBrand}与主要竞品及其自身其他细分市场对比，围绕"同品牌内部 / 品牌间 / 渠道间 / 时间趋势 / 价格规格"这几类剪刀差视角系统性地扫描和归纳问题
- 随后提炼每一项剪刀差涉及的关键要素（对比对象、细分市场定义、对比的是当期份额/历史增速），发现重复项目，进行合并
- 针对每项剪刀差条目，深挖原因，输出解释

## 三、输出格式（非常重要）
- 整体方针：你的目标不是把所有数字逐条复述，而是筛选出大约10条以上最关键的剪刀差信息，这些信息要能够清晰指向"目前品牌运营中存在的核心问题"，并用简洁、业务化的语言表达出来。
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
1. 全面扫描数据，生成尽可能多的剪刀差项目（10条以上）
2. 发现其中重复项目并合并（如果两条剪刀差项目中要素完全相同，包括对比的对象、细分市场的定义、对比的是当前份额/历史增速，则为同一条剪刀差，应该合并）
3. 输出合并后的最终剪刀差列表，限制为最多${maxItems}条最关键的剪刀差信息，这些信息要能够清晰指向"目前品牌运营中存在的核心问题"。

**注意：第一步只输出title和phenomenon，不要输出possibleReasons。原因分析将在用户确认后进行。**`;

  const userPrompt = `请基于以下市场数据，按照以下步骤进行分析：

第一步：全面扫描数据，识别与${selectedBrand}相关的代表性剪刀差，生成尽可能多的剪刀差项目（10条以上）
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
    environmentFactors?: string;
    commercialFactors?: string;
    productFactors?: string;
    resourceFactors?: string;
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
    const problemsText = confirmedProblems.map((p, idx) => `${idx + 1}. ${p}`).join('\n');
    const systemPromptForCauses = `你是一名负责零售渠道心血管（降血脂）市场的资深数据分析专家。
基于已确认的问题列表，请完成成因分析和策略建议。

## ⚠️ 重要：你必须使用工具函数查询数据库（强制要求）
**在开始分析之前，你必须先调用以下工具函数查询数据库获取真实数据，不能直接推测！**

系统为你提供了以下数据查询工具，**你必须根据分析需要主动调用这些工具**：
1. **queryByProvince**: 按省份筛选数据，分析品牌在不同省份的表现差异
2. **queryByProductSpec**: 按产品特性筛选（价格带、包装大小、剂量等），分析特定品规的销售表现
3. **queryPriceDifference**: 查询渠道间价差（电商vs零售），分析价格差异对销售的影响
4. **queryPublicAwareness**: 查询公域认知度数据，对比不同品牌的认知度差异
5. **queryWD**: 查询分销率WD数据，分析渠道铺货情况

**强制要求**：
1. **在分析每个问题时，必须先调用相关工具函数查询数据库获取真实数据**
2. **不能在没有查询数据的情况下直接进行推测**
3. **所有分析结论必须基于查询函数返回的真实数据**
4. **如果查询函数返回的数据不足，再考虑联网搜索**
5. **在输出中必须明确说明使用了哪些查询函数，以及查询结果是什么**

## 分析路径（非常重要）
深挖时，**优先使用数据库中已经提供的数据维度进行深挖**，按以下顺序进行分析：

1. **省份维度**：是否品牌表现主要受小部分省份拖累？如果是，这些省份的共同点是什么？
2. **产品特性维度**：是否品牌的特定品规销售表现差？如果是，限制这些品规销售的原因是什么？
3. **公域认知度维度**：是否品牌的公域认知度不如竞对，导致份额较低？为何公域认知度较低？
4. **渠道间价差维度**：是否品牌在电商中的价格高于零售，导致患者都去电商购买，而不在零售购买？

如果无客观数据，可联网搜索原因，包含以下角度，**注意需要附上对应新闻来源（此部分可简略进行）**：
1. **环境因素**：医院准入、集采政策、医保与处方外流政策、地方监管或政策变化等
2. **商业推广因素**：渠道策略、定价与促销策略、市场推广模式等
3. **产品因素**：产品特性、适应症定位、规格与包装设计、价格竞争力等
4. **资源分配因素**：人力投入、市场费用投入、区域/渠道资源配置是否均衡等

## 输出格式要求
请以JSON格式输出：
{
  "causes": [
    {
      "problem": "问题描述",
      "environmentFactors": "环境因素分析（优先使用数据库维度，如无客观数据则联网搜索，需附新闻来源）",
      "commercialFactors": "商业推广因素分析（优先使用数据库维度，如无客观数据则联网搜索，需附新闻来源）",
      "productFactors": "产品因素分析（优先使用数据库维度，如无客观数据则联网搜索，需附新闻来源）",
      "resourceFactors": "资源分配因素分析（优先使用数据库维度，如无客观数据则联网搜索，需附新闻来源）"
    }
  ],
  "strategies": [
    {
      "problem": "问题描述",
      "strategies": ["策略1", "策略2", ...]
    }
  ]
}

请为每个问题提供成因分析和策略建议，最多${maxProblems}条。所有分析必须引用真实数据。`;

    const userPromptForCauses = `请基于以下已确认的问题列表，针对每个问题深挖其背后原因：

${problemsText}

**分析要求**：
1. 优先使用数据库中已经提供的数据维度进行深挖（省份、产品特性、公域认知度、渠道间价差）
2. 如果无客观数据，可联网搜索原因，包含四大因素（环境、商业推广、产品、资源分配），注意需要附上对应新闻来源（此部分可简略进行）
3. 为每个问题提出1-3条具体可执行策略

请严格按照JSON格式输出，只输出JSON，不要包含其他文字说明。`;

    try {
      let responseText = '';
      
      console.log('🔑 检查API Key（confirmedProblems分支）:', DEEPSEEK_API_KEY ? '已配置' : '未配置（将使用模拟数据）');
      
      if (!DEEPSEEK_API_KEY) {
        console.log('⚠️ 未配置DEEPSEEK_API_KEY，使用模拟响应（不会调用查询函数）');
        // 模拟响应
        responseText = JSON.stringify({
          causes: confirmedProblems.map(p => ({
            problem: p,
            environmentFactors: '环境因素分析示例',
            commercialFactors: '商业推广因素分析示例',
            productFactors: '产品因素分析示例',
            resourceFactors: '资源分配因素分析示例',
          })),
          strategies: confirmedProblems.map(p => ({
            problem: p,
            strategies: ['策略1示例', '策略2示例'],
          })),
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
          { role: 'user', content: userPromptForCauses }
        ];

        const maxIterations = 10;
        let iteration = 0;
        
        console.log('🚀 开始AI分析（confirmedProblems分支），支持Function Calling，工具数量:', DATA_QUERY_TOOLS.length);

        while (iteration < maxIterations) {
          const response = await axios.post(
            DEEPSEEK_API_URL,
            {
              model: 'deepseek-chat',
              messages: messages,
              tools: DATA_QUERY_TOOLS,
              tool_choice: 'auto',
              temperature: 0.7,
              max_tokens: 4000,
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
            console.log('🔍 AI请求调用查询函数，共', message.tool_calls.length, '个函数调用');
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

            iteration++;
            continue;
          } else {
            console.log('📝 AI返回最终分析结果（未调用查询函数）');
            responseText = message.content || '';
            break;
          }
        }

        if (iteration >= maxIterations) {
          console.warn('Function calling reached max iterations');
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
        return {
          problems: confirmedProblems, // 返回确认的问题列表
          causes: (result.causes || []).slice(0, maxProblems),
          strategies: (result.strategies || []).slice(0, maxProblems),
        };
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        return {
          problems: confirmedProblems,
          causes: [],
          strategies: [],
        };
      }
    } catch (error) {
      console.error('AI Analysis Error:', error);
      return {
        problems: confirmedProblems,
        causes: [],
        strategies: [],
      };
    }
  }

  const systemPrompt = `你是一名负责零售渠道心血管（降血脂）市场的资深数据分析专家。
在此之前，你已经完成了针对${selectedBrand}及其竞争产品的"剪刀差分析"，系统识别出多个市场表现上的剪刀差现象。

## 你的任务
针对特定的剪刀差项目，深挖其背后原因。

## ⚠️ 重要：你必须使用工具函数查询数据库（强制要求）
**在开始分析之前，你必须先调用以下工具函数查询数据库获取真实数据，不能直接推测！**

系统为你提供了以下数据查询工具，**你必须根据分析需要主动调用这些工具**：
1. **queryByProvince**: 按省份筛选数据，分析品牌在不同省份的表现差异
   - 使用场景：分析"是否品牌表现主要受小部分省份拖累"时，必须调用此函数
   - 示例：queryByProvince({province: "all", brand: "${selectedBrand}"}) 查看所有省份数据
2. **queryByProductSpec**: 按产品特性筛选（价格带、包装大小、剂量等），分析特定品规的销售表现
   - 使用场景：分析"是否品牌的特定品规销售表现差"时，必须调用此函数
   - 示例：queryByProductSpec({dosage: "10mg", brand: "${selectedBrand}"}) 查看10mg产品数据
3. **queryPriceDifference**: 查询渠道间价差（电商vs零售），分析价格差异对销售的影响
   - 使用场景：分析"是否品牌在电商中的价格高于零售"时，必须调用此函数
4. **queryPublicAwareness**: 查询公域认知度数据，对比不同品牌的认知度差异
   - 使用场景：分析"是否品牌的公域认知度不如竞对"时，必须调用此函数
5. **queryWD**: 查询分销率WD数据，分析渠道铺货情况
   - 使用场景：分析"是否品牌的特定品规分销率WD表现不佳"时，必须调用此函数
   - 示例：queryWD({province: "浙江", brand: "${selectedBrand}"}) 查看浙江的WD数据

**强制要求**：
1. **在分析每个剪刀差时，必须先调用相关工具函数查询数据库获取真实数据**
2. **不能在没有查询数据的情况下直接进行推测**
3. **所有分析结论必须基于查询函数返回的真实数据**
4. **如果查询函数返回的数据不足，再考虑联网搜索**
5. **在输出中必须明确说明使用了哪些查询函数，以及查询结果是什么**

### 分析路径（非常重要）
深挖时，**优先使用数据库中已经提供的数据维度进行深挖**，按以下顺序进行分析：

1. **省份维度**：是否品牌表现主要受小部分省份拖累？如果是，这些省份的共同点是什么？
   - 例如：集采政策严格、集采中阿托伐他汀仅有10mg中标、都属于东部分省份等
   - 需要引用具体省份数据和对比分析

2. **产品特性维度**：是否品牌的特定品规销售表现差（包含价格带、包装大小、剂量维度，比如大包装、10mg低剂量产品）？
   - 如果是，限制这些品规销售的原因是什么？
   - 例如：大包装产品渠道分销WD表现不佳
   - 需要引用具体品规数据和WD等分销指标

3. **公域认知度维度**：是否品牌的公域认知度不如竞对，导致份额较低？
   - 为何公域认知度较低（可联网搜索）？
   - 需要对比竞品的公域认知度数据

4. **渠道间价差维度**：是否品牌在电商中的价格高于零售，导致患者都去电商购买，而不在零售购买？
   - 需要对比电商vs零售的价格数据

### 如果无客观数据，可联网搜索原因
如果上述数据库维度无法完全解释问题，可联网搜索原因，包含以下角度，**注意需要附上对应新闻来源（此部分可简略进行）**：

1. **环境因素**：医院准入、集采政策、医保与处方外流政策、地方监管或政策变化等
2. **商业推广因素**：渠道策略（院内 vs 院外、电商 vs 零售）、定价与促销策略、市场推广模式（学术推广、消费者教育、药店活动等）、零售可及度
3. **产品因素**：产品特性（疗效、安全性）、适应症定位、规格与包装设计、价格竞争力、患者评价等
4. **资源分配因素**：人力投入（代表 / KA 覆盖）、市场费用投入、区域 / 渠道资源配置是否均衡等

### 分析建议
以${selectedBrand}-零售市场为例，建议的分析步骤是：
- 针对每项剪刀差条目，深挖原因，输出解释
- 优先使用数据库维度（省份、产品特性、公域认知度、渠道间价差）进行分析
- 如果数据库维度无法完全解释，再联网搜索四大因素，并附上新闻来源

## 输出格式要求
请以JSON格式输出：
{
  "causes": [
    {
      "problem": "剪刀差标题（用于标识对应的剪刀差）",
      "environmentFactors": "环境因素分析（优先使用数据库维度，如无客观数据则联网搜索，需附新闻来源）",
      "commercialFactors": "商业推广因素分析（优先使用数据库维度，如无客观数据则联网搜索，需附新闻来源）",
      "productFactors": "产品因素分析（优先使用数据库维度，如无客观数据则联网搜索，需附新闻来源）",
      "resourceFactors": "资源分配因素分析（优先使用数据库维度，如无客观数据则联网搜索，需附新闻来源）"
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
- 每个剪刀差对应一个cause条目，problem字段使用剪刀差的title
- 四大因素分析中，优先使用数据库维度（省份、产品特性、公域认知度、渠道间价差）进行分析
- 如果某个因素在数据库维度中已有充分分析，可直接使用；如果无客观数据，再联网搜索并附上新闻来源
- 所有分析必须引用真实数据，数据要详细、真实、具体（清晰说明时间框架、数据来源）
- 策略建议要具体可执行，避免只有原则性口号

请严格基于给定的剪刀差分析结果进行推理，不要凭空捏造数据。`;

  let userPrompt = `请基于以下剪刀差分析结果，针对每个剪刀差项目深挖其背后原因：

${gapsText}

**⚠️ 强制分析流程（必须遵循）**：

**第一步：必须调用查询函数获取数据**
在分析每个剪刀差之前，你必须先调用相关的查询函数获取真实数据：
1. **省份维度分析**：必须调用 queryByProvince({province: "all", brand: "${selectedBrand}"}) 查看所有省份数据，识别表现差的省份
2. **产品特性维度分析**：必须调用 queryByProductSpec({brand: "${selectedBrand}"}) 查看产品特性数据，识别表现差的品规
3. **渠道间价差分析**：必须调用 queryPriceDifference({brand: "${selectedBrand}"}) 查看价格差异数据
4. **公域认知度分析**：必须调用 queryPublicAwareness({brand: "${selectedBrand}"}) 查看认知度数据
5. **分销率WD分析**：必须调用 queryWD({brand: "${selectedBrand}"}) 查看分销率数据

**第二步：基于查询结果进行分析**
根据查询函数返回的真实数据，按以下维度进行深入分析：
- **省份维度**：基于queryByProvince的查询结果，分析哪些省份表现差，这些省份的共同点是什么？
- **产品特性维度**：基于queryByProductSpec的查询结果，分析哪些品规表现差，限制这些品规销售的原因是什么？
- **公域认知度维度**：基于queryPublicAwareness的查询结果，分析品牌的公域认知度是否不如竞对？
- **渠道间价差维度**：基于queryPriceDifference的查询结果，分析品牌在电商中的价格是否高于零售？

**第三步：如果数据库数据不足，再联网搜索**
只有在查询函数返回的数据无法完全解释问题时，才考虑联网搜索原因，包含以下角度，注意需要附上对应新闻来源（此部分可简略进行）：
- 环境因素：医院准入、集采政策、医保与处方外流政策、地方监管或政策变化等
- 商业推广因素：渠道策略、定价与促销策略、市场推广模式等
- 产品因素：产品特性、适应症定位、规格与包装设计、价格竞争力等
- 资源分配因素：人力投入、市场费用投入、区域/渠道资源配置是否均衡等

**第四步：提出策略建议**
为每个剪刀差提出1-3条具体可执行策略。

**输出要求**：
- 在JSON输出的每个cause条目中，必须明确说明使用了哪些查询函数
- 必须引用查询函数返回的具体数据（如"根据queryByProvince查询结果，立普妥在浙江的份额为X%，低于全国平均Y%"）
- 如果某个维度没有查询到数据，必须说明"数据库中没有相关数据，基于推测..."
- 请严格按照JSON格式输出，只输出JSON，不要包含其他文字说明。每个剪刀差必须对应一个cause条目和一个strategy条目。`;

  if (userFeedback) {
    userPrompt += `\n\n用户反馈：\n${userFeedback}\n\n请根据用户反馈调整分析。`;
  }

  try {
    let responseText = '';
    
    console.log('🔑 检查API Key:', DEEPSEEK_API_KEY ? '已配置' : '未配置（将使用模拟数据）');
    
    if (!DEEPSEEK_API_KEY) {
      console.log('⚠️ 未配置DEEPSEEK_API_KEY，使用模拟响应（不会调用查询函数）');
      // 模拟响应 - 针对每个剪刀差项目深挖原因
      // 假设scissorsGaps有数据，为每个剪刀差生成对应的cause和strategy
      const mockCauses = scissorsGaps.slice(0, maxProblems).map(gap => ({
        problem: gap.title, // 使用剪刀差的title
        environmentFactors: "优先使用数据库维度分析：通过省份维度分析发现，品牌表现主要受部分省份拖累，这些省份的共同点是集采政策严格、集采中阿托伐他汀仅有10mg中标。如无客观数据，可联网搜索：集采政策对原研品冲击较大，导致院内处方更多集中在10mg规格。",
        commercialFactors: "优先使用数据库维度分析：通过产品特性维度分析发现，大包装产品渠道分销WD表现不佳（WD为44，对比其他省份60），导致院外承接院内处方能力差。如无客观数据，可联网搜索：零售渠道资源配置可能不足，特别是10mg中标省份。",
        productFactors: "优先使用数据库维度分析：通过产品特性维度分析发现，10mg低剂量产品在零售渠道表现较差，主要受大包装WD偏低影响。如无客观数据，可联网搜索：大包装产品可能不符合零售渠道的销售习惯，影响长疗程患者的购买体验。",
        resourceFactors: "优先使用数据库维度分析：通过渠道间价差维度分析发现，品牌在电商中的价格高于零售，可能导致患者都去电商购买。如无客观数据，可联网搜索：零售渠道资源配置可能不足，特别是10mg中标省份，人力投入和市场费用投入可能不均衡。"
      }));
      
      const mockStrategies = scissorsGaps.slice(0, maxProblems).map(gap => ({
        problem: gap.title, // 使用剪刀差的title
        strategies: [
          "在仅10mg中标省份，优先提升立普妥10mg大包装的分销水平，明确KPI（如WD提升至60%），通过重点连锁药房合作、补货激励和陈列资源倾斜，缩小与可定等竞品的终端覆盖差距",
          "在院外增加推广立普妥长疗程大包装的铺货（辅以适当价格优惠与促销），将其明确定位为'长疗程、更优惠'方案，提升大包装在零售端的销售"
        ]
      }));
      
      responseText = JSON.stringify({
        causes: mockCauses,
        strategies: mockStrategies
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
        { role: 'user', content: userPrompt }
      ];

      const maxIterations = 10; // 防止无限循环
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
            max_tokens: 4000,
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

          iteration++;
          continue; // 继续下一轮对话
        } else {
          // 没有函数调用，AI返回了最终结果
          console.log('📝 AI返回最终分析结果（主分支，未调用查询函数）');
          responseText = message.content || '';
          break;
        }
      }

      if (iteration >= maxIterations) {
        console.warn('⚠️ Function calling reached max iterations（主分支）');
        // 使用最后一次响应的内容
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
      return {
        problems: result.problems || [],
        causes: result.causes || [],
        strategies: result.strategies || [],
      };
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return {
        problems: [],
        causes: [],
        strategies: [],
      };
    }
  } catch (error) {
    console.error('AI Analysis Error:', error);
    return {
      problems: [],
      causes: [],
      strategies: [],
    };
  }
}

