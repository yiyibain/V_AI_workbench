import axios from 'axios';
import { MarketDataPoint, DimensionConfig } from '../types/strategy';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';

interface ProblemAnalysisResult {
  scissorsGaps: Array<{
    title: string;
    phenomenon: string;
    possibleReasons: string;
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
你将拿到立普妥及其竞争产品在零售渠道的详细市场数据。

## 你的任务
全面扫描数据，优先识别与立普妥相关的代表性"剪刀差"现象。

## "剪刀差"定义
在任意两个可比对象之间（品牌 / 剂量 / 省份 / 渠道 / 时间），如果它们的份额水平或走势在一段时间内持续向相反方向拉开，并形成明显差距，就称为"剪刀差"现象。

## 剪刀差分类
1. 同品牌内部剪刀差：同一品牌在不同细分市场中的表现分化明显
2. 品牌间剪刀差：同一细分市场内，不同品牌的份额水平或走势出现"此消彼长"
3. 渠道间剪刀差：同一品牌在不同渠道中的表现出现明显拉开
4. 原研品间剪刀差：同属原研品的两个产品，在分子式内表现差异大
5. 时间趋势剪刀差：随时间推移，两个对象的份额曲线越来越"张开"
6. 价格/规格剪刀差：同一"分子式 × 剂量"下，不同价格带或规格包型间的表现分化

## 输出格式要求
请以JSON格式输出，包含以下结构：
{
  "scissorsGaps": [
    {
      "title": "简短标题，概括问题和维度",
      "phenomenon": "1-2句话说明具体数据表现（谁高谁低、差多少、和哪一类对比）",
      "possibleReasons": "1-2句话推测背后的品牌运营/资源配置/渠道执行问题"
    }
  ]
}

请筛选出最多${maxItems}条最关键的剪刀差信息，这些信息要能够清晰指向"目前品牌运营中存在的核心问题"。`;

  const userPrompt = `请基于以下市场数据，识别与${selectedBrand}相关的"剪刀差"现象：

${formattedData}

请严格按照JSON格式输出，只输出JSON，不要包含其他文字说明。`;

  try {
    let responseText = '';
    
    if (!DEEPSEEK_API_KEY) {
      // 模拟响应
      responseText = JSON.stringify({
        scissorsGaps: [
          {
            title: "零售渠道分子式内份额落后：立普妥相对可定弱势",
            phenomenon: "医院内立普妥分子式内份额与可定持平（均约12%），零售渠道内立普妥在分子式内份额低于可定（约9%对12%）",
            possibleReasons: "零售渠道分销覆盖不足，特别是10mg中标省份的终端执行较弱"
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
          max_tokens: 3000,
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
    possibleReasons: string;
  }>,
  selectedBrand: string,
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
    `${idx + 1}. ${gap.title}\n   现象：${gap.phenomenon}\n   可能原因：${gap.possibleReasons}`
  ).join('\n\n');

  // 如果用户已经确认了问题列表，直接基于这些问题分析成因和策略
  if (confirmedProblems && confirmedProblems.length > 0) {
    const problemsText = confirmedProblems.map((p, idx) => `${idx + 1}. ${p}`).join('\n');
    const systemPromptForCauses = `你是一名负责零售渠道心血管（降血脂）市场的资深品牌策略顾问。
基于已确认的问题列表，请完成成因分析和策略建议。

## 输出格式要求
请以JSON格式输出：
{
  "causes": [
    {
      "problem": "问题描述",
      "environmentFactors": "环境因素分析",
      "commercialFactors": "商业推广因素分析",
      "productFactors": "产品因素分析",
      "resourceFactors": "资源分配因素分析"
    }
  ],
  "strategies": [
    {
      "problem": "问题描述",
      "strategies": ["策略1", "策略2", ...]
    }
  ]
}

请为每个问题提供成因分析和策略建议，最多${maxProblems}条。`;

    const userPromptForCauses = `请基于以下已确认的问题列表，完成成因分析和策略建议：

${problemsText}

请严格按照JSON格式输出，只输出JSON，不要包含其他文字说明。`;

    try {
      let responseText = '';
      
      if (!DEEPSEEK_API_KEY) {
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
        const response = await axios.post(
          DEEPSEEK_API_URL,
          {
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPromptForCauses },
              { role: 'user', content: userPromptForCauses }
            ],
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

        responseText = response.data.choices[0]?.message?.content || '';
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

  const systemPrompt = `你是一名负责零售渠道心血管（降血脂）市场的资深品牌策略顾问。
在此之前，你已经完成了针对${selectedBrand}及其竞争产品的"剪刀差分析"，系统识别出多个市场表现上的剪刀差现象。

## 你的任务
基于给定的剪刀差分析结果，完成以下三个任务：

### 任务一：提炼"潜在问题列表"
将剪刀差中隐含的"问题点"提炼为一个清晰的问题列表。每个问题用一句话概括，聚焦"品牌当前在哪一块表现不理想/存在结构性弱点"。

### 任务二：用"四大因素"拆解问题成因
对每一个问题逐一进行成因分析，从以下四大因素出发：
1. 环境因素：医院准入、集采政策、医保与处方外流政策、地方监管或政策变化等
2. 商业推广因素：渠道策略、定价与促销策略、市场推广模式等
3. 产品因素：产品特性、适应症定位、规格与包装设计、价格竞争力等
4. 资源分配因素：人力投入、市场费用投入、区域/渠道资源配置是否均衡等

### 任务三：提出具体可执行策略
为每一个优先级较高的问题（通常3-5个），设计1-3条具体策略。策略要做到"可执行、可跟踪"，避免只有原则性口号。

## 输出格式要求
请以JSON格式输出：
{
  "problems": ["问题1", "问题2", ...],
  "causes": [
    {
      "problem": "问题描述",
      "environmentFactors": "环境因素分析",
      "commercialFactors": "商业推广因素分析",
      "productFactors": "产品因素分析",
      "resourceFactors": "资源分配因素分析"
    }
  ],
  "strategies": [
    {
      "problem": "问题描述",
      "strategies": ["策略1", "策略2", ...]
    }
  ]
}

请严格基于给定的剪刀差分析结果进行推理，不要凭空捏造数据。`;

  let userPrompt = `请基于以下剪刀差分析结果，完成问题提炼、成因分析和策略建议：

${gapsText}`;

  if (userFeedback) {
    userPrompt += `\n\n用户反馈：\n${userFeedback}\n\n请根据用户反馈调整分析，并在输出中明确标注"这是一版基于用户修正后的更新"。`;
  }

  userPrompt += `\n\n请严格按照JSON格式输出，只输出JSON，不要包含其他文字说明。`;

  try {
    let responseText = '';
    
    if (!DEEPSEEK_API_KEY) {
      // 模拟响应
      responseText = JSON.stringify({
        problems: [
          "立普妥零售渠道分子式内份额低于可定",
          "立普妥10mg中标省份的份额明显低"
        ],
        causes: [
          {
            problem: "立普妥零售渠道分子式内份额低于可定",
            environmentFactors: "由于仅10mg中标，医保报销环境对20mg规格更不友好",
            commercialFactors: "零售端立普妥10mg WD偏低，导致院外承接院内处方能力差",
            productFactors: "大包装WD更低，影响长疗程患者的购买体验",
            resourceFactors: "零售渠道资源配置可能不足，特别是10mg中标省份"
          }
        ],
        strategies: [
          {
            problem: "立普妥零售渠道分子式内份额低于可定",
            strategies: [
              "在仅10mg中标省份，优先提升立普妥10mg大包装的分销水平，明确KPI（如WD提升至xx%），通过重点连锁药房合作、补货激励和陈列资源倾斜，缩小与可定等竞品的终端覆盖差距",
              "在院外增加推广立普妥长疗程大包装的铺货（辅以适当价格优惠与促销），将其明确定位为'长疗程、更优惠'方案，提升大包装在零售端的销售"
            ]
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
          max_tokens: 4000,
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

