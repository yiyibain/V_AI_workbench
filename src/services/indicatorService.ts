import axios from 'axios';
import {
  Indicator,
  IndicatorFilter,
  IndicatorEffectAnalysis,
  IndicatorRecommendation,
  IndicatorBaseline,
  IndicatorTargetPlan,
  Strategy,
} from '../types/indicator';
import {
  mockIndicators,
  mockStrategies,
  mockIndicatorEffectAnalyses,
  mockIndicatorRecommendations,
  mockIndicatorBaselines,
  mockIndicatorTargetPlans,
} from '../data/indicatorMockData';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';

// 获取所有指标（长清单）
export async function getAllIndicators(filter?: IndicatorFilter): Promise<Indicator[]> {
  // 模拟API调用延迟
  await new Promise((resolve) => setTimeout(resolve, 300));

  let filtered = [...mockIndicators];

  // 应用筛选条件
  if (filter) {
    if (filter.category && filter.category.length > 0) {
      filtered = filtered.filter((ind) => filter.category!.includes(ind.category));
    }
    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter((ind) =>
        filter.tags!.some((tag) => ind.tags.includes(tag))
      );
    }
    if (filter.isCore !== undefined) {
      filtered = filtered.filter((ind) => ind.isCore === filter.isCore);
    }
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      filtered = filtered.filter(
        (ind) =>
          ind.name.toLowerCase().includes(searchLower) ||
          ind.description.toLowerCase().includes(searchLower) ||
          ind.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }
  }

  return filtered;
}

// 根据策略筛选潜在指标（短清单，10-20个）
export async function getPotentialIndicatorsByStrategy(
  strategyId: string
): Promise<Indicator[]> {
  // 模拟API调用延迟
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 优先从localStorage加载导入的策略
  let allStrategies = [...mockStrategies];
  try {
    const storedStrategies = localStorage.getItem('indicatorPlanningStrategies');
    if (storedStrategies) {
      const parsed = JSON.parse(storedStrategies);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // 合并导入的策略和mock策略，导入的策略优先
        const importedMap = new Map(parsed.map((s: Strategy) => [s.id, s]));
        mockStrategies.forEach(s => {
          if (!importedMap.has(s.id)) {
            importedMap.set(s.id, s);
          }
        });
        allStrategies = Array.from(importedMap.values());
      }
    }
  } catch (error) {
    console.error('加载导入的策略失败:', error);
  }

  const strategy = allStrategies.find((s) => s.id === strategyId);
  if (!strategy) {
    return [];
  }

  // 模拟AI筛选逻辑：根据策略的重点领域和目标结果筛选相关指标
  const relevantIndicators = mockIndicators.filter((ind) => {
    // 根据策略的focusAreas和targetOutcomes匹配指标
    const strategyKeywords = [
      ...strategy.focusAreas,
      ...strategy.targetOutcomes,
    ].map((s) => s.toLowerCase());

    return (
      strategyKeywords.some((keyword) =>
        ind.name.toLowerCase().includes(keyword)
      ) ||
      strategyKeywords.some((keyword) =>
        ind.description.toLowerCase().includes(keyword)
      ) ||
      strategyKeywords.some((keyword) =>
        ind.tags.some((tag) => tag.toLowerCase().includes(keyword))
      )
    );
  });

  // 如果API Key存在，调用AI进行更精准的筛选
  if (DEEPSEEK_API_KEY) {
    try {
      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是一个专业的业务分析师，负责根据策略筛选相关指标。
请基于策略的重点领域和目标结果，从指标列表中筛选出最相关的10-20个指标。
返回指标ID数组，格式：["ind1", "ind2", ...]`,
            },
            {
              role: 'user',
              content: `策略名称：${strategy.name}
策略描述：${strategy.description}
重点领域：${strategy.focusAreas.join('、')}
目标结果：${strategy.targetOutcomes.join('、')}

可用指标列表：
${mockIndicators.map((ind) => `- ${ind.id}: ${ind.name} (${ind.description})`).join('\n')}

请筛选出最相关的10-20个指标ID。`,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const aiResponse = response.data.choices[0]?.message?.content || '';
      // 尝试从AI响应中提取指标ID
      const indicatorIds = aiResponse
        .match(/ind\d+/g)
        ?.filter((id: string, index: number, self: string[]) => self.indexOf(id) === index) || [];

      if (indicatorIds.length > 0) {
        return mockIndicators.filter((ind) => indicatorIds.includes(ind.id));
      }
    } catch (error) {
      console.error('AI筛选指标失败，使用规则筛选:', error);
    }
  }

  // 如果没有AI或AI失败，返回规则筛选的结果（限制在10-20个）
  return relevantIndicators.slice(0, 20);
}

// 获取指标效果分析
export async function getIndicatorEffectAnalysis(
  indicatorId: string
): Promise<IndicatorEffectAnalysis | null> {
  // 模拟API调用延迟
  await new Promise((resolve) => setTimeout(resolve, 500));

  return (
    mockIndicatorEffectAnalyses.find((analysis) => analysis.indicatorId === indicatorId) || null
  );
}

// 获取所有指标的效果分析
export async function getAllIndicatorEffectAnalyses(): Promise<IndicatorEffectAnalysis[]> {
  // 模拟API调用延迟
  await new Promise((resolve) => setTimeout(resolve, 800));

  return mockIndicatorEffectAnalyses;
}

// 获取考核指标建议（基于策略和指标效果分析）
export async function getIndicatorRecommendations(
  strategyId: string
): Promise<IndicatorRecommendation[]> {
  // 模拟API调用延迟
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 如果API Key存在，调用AI生成建议
  if (DEEPSEEK_API_KEY) {
    try {
      const strategy = mockStrategies.find((s) => s.id === strategyId);
      if (!strategy) {
        return mockIndicatorRecommendations;
      }

      const effectAnalyses = mockIndicatorEffectAnalyses;
      const potentialIndicators = await getPotentialIndicatorsByStrategy(strategyId);

      // API调用（目前未使用响应，返回模拟数据）
      await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是一个专业的业务分析师，负责从指标列表中挑选合适的3-4个考核指标。
请基于策略、指标效果分析，挑选出最合适的3-4个指标，并解释各指标的优劣之处。
返回JSON格式，包含指标ID、优势、劣势、适用场景等信息。`,
            },
            {
              role: 'user',
              content: `策略名称：${strategy.name}
策略描述：${strategy.description}
重点领域：${strategy.focusAreas.join('、')}
目标结果：${strategy.targetOutcomes.join('、')}

潜在指标列表：
${potentialIndicators.map((ind) => `- ${ind.id}: ${ind.name} (${ind.description})`).join('\n')}

指标效果分析：
${effectAnalyses.map((ea) => `- ${ea.indicatorName}: 影响力得分${ea.impactScore}, 相关性${ea.correlationWithResult}`).join('\n')}

请从潜在指标中挑选出最合适的3-4个指标作为考核指标，并说明理由。`,
            },
          ],
          temperature: 0.5,
          max_tokens: 2000,
        },
        {
          headers: {
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // 这里可以解析AI响应并转换为IndicatorRecommendation格式
      // 目前先返回模拟数据
    } catch (error) {
      console.error('AI生成指标建议失败，使用模拟数据:', error);
    }
  }

  // 返回模拟数据（已筛选出3-4个指标）
  return mockIndicatorRecommendations.slice(0, 4);
}

// 获取指标基线
export async function getIndicatorBaseline(indicatorId: string): Promise<IndicatorBaseline | null> {
  // 模拟API调用延迟
  await new Promise((resolve) => setTimeout(resolve, 500));

  return mockIndicatorBaselines.find((baseline) => baseline.indicatorId === indicatorId) || null;
}

// 获取所有指标的基线
export async function getAllIndicatorBaselines(): Promise<IndicatorBaseline[]> {
  // 模拟API调用延迟
  await new Promise((resolve) => setTimeout(resolve, 800));

  return mockIndicatorBaselines;
}

// 生成指标目标值规划
export async function generateIndicatorTargetPlan(
  indicatorId: string,
  options?: {
    nationalSalesGrowth?: number; // 全国销售增速（可选）
  }
): Promise<IndicatorTargetPlan | null> {
  // 模拟API调用延迟
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const baseline = await getIndicatorBaseline(indicatorId);
  if (!baseline) {
    return null;
  }

  // 如果API Key存在，调用AI生成目标值规划
  if (DEEPSEEK_API_KEY) {
    try {
      const indicator = mockIndicators.find((ind) => ind.id === indicatorId);
      if (!indicator) {
        return mockIndicatorTargetPlans.find((plan) => plan.indicatorId === indicatorId) || null;
      }

      // API调用（目前未使用响应，返回模拟数据）
      await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是一个专业的业务规划师，负责基于历史数据、环境变化等因素，规划指标的未来目标值。
请分析指标基线、历史趋势、省份方差、环境变化等因素，规划合理的全国和分省目标值。
返回JSON格式，包含目标值、规划依据、置信度、风险提示等信息。`,
            },
            {
              role: 'user',
              content: `指标名称：${indicator.name}
指标描述：${indicator.description}

指标基线：
- 全国当前值：${baseline.nationalBaseline.current}
- 全国历史平均值：${baseline.nationalBaseline.historicalAvg}
- 全国历史中位数：${baseline.nationalBaseline.historicalMedian}
- 全国趋势：${baseline.nationalBaseline.trend}

省份基线：
${baseline.provinceBaselines.map((pb) => `- ${pb.province}: 当前值${pb.current}, 历史平均${pb.historicalAvg}, 方差${pb.variance}, 趋势${pb.trend}`).join('\n')}

环境因素：
${baseline.environmentalFactors.map((ef) => `- ${ef.factor}: ${ef.impact} - ${ef.description}`).join('\n')}

${options?.nationalSalesGrowth ? `全国销售增速目标：${options.nationalSalesGrowth}%` : ''}

请规划未来目标值（全国和分省），并说明规划依据。`,
            },
          ],
          temperature: 0.4,
          max_tokens: 2000,
        },
        {
          headers: {
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // 这里可以解析AI响应并转换为IndicatorTargetPlan格式
      // 目前先返回模拟数据
    } catch (error) {
      console.error('AI生成目标值规划失败，使用模拟数据:', error);
    }
  }

  // 返回模拟数据
  const plan = mockIndicatorTargetPlans.find((p) => p.indicatorId === indicatorId);
  if (plan && options?.nationalSalesGrowth) {
    // 如果提供了销售增速，调整目标值
    const adjustedPlan = {
      ...plan,
      targetValue: {
        ...plan.targetValue,
        national: plan.targetValue.national * (1 + options.nationalSalesGrowth / 100),
      },
    };
    return adjustedPlan;
  }

  return plan || null;
}

// 获取所有策略
export async function getAllStrategies(): Promise<Strategy[]> {
  // 模拟API调用延迟
  await new Promise((resolve) => setTimeout(resolve, 200));

  // 优先从localStorage加载导入的策略
  try {
    const storedStrategies = localStorage.getItem('indicatorPlanningStrategies');
    if (storedStrategies) {
      const parsed = JSON.parse(storedStrategies);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('加载导入的策略失败:', error);
  }

  return mockStrategies;
}

// 根据用户对话内容调整指标规划数据
export async function adjustIndicatorData(
  currentData: any,
  dataType: 'potentialIndicators' | 'effectAnalysis' | 'recommendations' | 'baseline' | 'targetPlan',
  conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context?: {
    strategyId?: string;
    indicatorId?: string;
    salesGrowth?: number;
  }
): Promise<any> {
  // 模拟API调用延迟
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // 提取用户的所有调整需求
  const userRequirements = conversationMessages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ');

  // 如果API Key存在，调用AI调整数据
  if (DEEPSEEK_API_KEY) {
    try {
      let systemPrompt = '';
      let userPrompt = '';

      switch (dataType) {
        case 'potentialIndicators':
          systemPrompt = `你是一个专业的业务分析师，负责根据用户需求调整指标筛选结果。
用户会告诉你如何调整潜在指标列表（比如：更保守、更严格、增加某些类型等）。
请根据用户需求，从当前指标列表中筛选出合适的指标，返回调整后的指标ID数组。`;
          userPrompt = `当前指标列表：
${JSON.stringify(currentData, null, 2)}

用户调整需求：${userRequirements}

请根据用户需求调整指标列表，返回调整后的指标ID数组（JSON格式）。`;
          break;

        case 'targetPlan':
          systemPrompt = `你是一个专业的业务规划师，负责根据用户需求调整指标目标值规划。
用户会告诉你如何调整目标值（比如：更保守、调低10%、考虑悲观环境等）。
请根据用户需求，调整目标值规划，返回完整的调整后的规划数据（JSON格式）。`;
          userPrompt = `当前目标值规划：
${JSON.stringify(currentData, null, 2)}

用户调整需求：${userRequirements}

请根据用户需求调整目标值规划，返回调整后的完整规划数据（JSON格式）。`;
          break;

        case 'recommendations':
          systemPrompt = `你是一个专业的业务分析师，负责根据用户需求调整考核指标建议。
用户会告诉你如何调整建议（比如：更保守、只推荐3个、增加过程指标等）。
请根据用户需求，调整指标建议，返回调整后的建议列表（JSON格式）。`;
          userPrompt = `当前指标建议：
${JSON.stringify(currentData, null, 2)}

用户调整需求：${userRequirements}

请根据用户需求调整指标建议，返回调整后的建议列表（JSON格式）。`;
          break;

        default:
          // 对于其他类型，返回当前数据（可以后续扩展）
          return currentData;
      }

      const response = await axios.post(
        DEEPSEEK_API_URL,
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 2000,
        },
        {
          headers: {
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const aiResponse = response.data.choices[0]?.message?.content || '';
      
      // 尝试从AI响应中提取JSON
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const adjustedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          return adjustedData;
        } catch (e) {
          console.error('Failed to parse AI response:', e);
        }
      }

      // 如果无法解析JSON，根据用户需求进行简单的规则调整
      return applySimpleAdjustment(currentData, dataType, userRequirements);
    } catch (error) {
      console.error('AI调整数据失败，使用规则调整:', error);
      return applySimpleAdjustment(currentData, dataType, userRequirements);
    }
  }

  // 如果没有API Key，使用规则调整
  return applySimpleAdjustment(currentData, dataType, userRequirements);
}

// 简单的规则调整（当AI不可用时使用）
function applySimpleAdjustment(
  currentData: any,
  dataType: string,
  userRequirements: string
): any {
  const lowerReq = userRequirements.toLowerCase();

  switch (dataType) {
    case 'targetPlan':
      // 调整目标值
      if (lowerReq.includes('保守') || lowerReq.includes('调低') || lowerReq.includes('降低')) {
        const adjustment = extractPercentage(lowerReq) || 0.1; // 默认降低10%
        const adjusted = JSON.parse(JSON.stringify(currentData));
        adjusted.targetValue.national = currentData.targetValue.national * (1 - adjustment);
        adjusted.targetValue.provinces = currentData.targetValue.provinces.map((pv: any) => ({
          ...pv,
          target: pv.target * (1 - adjustment),
        }));
        adjusted.planningBasis.environmentalChange += `\n根据用户要求，目标值已调低${(adjustment * 100).toFixed(0)}%。`;
        return adjusted;
      } else if (lowerReq.includes('激进') || lowerReq.includes('调高') || lowerReq.includes('提升')) {
        const adjustment = extractPercentage(lowerReq) || 0.1; // 默认提升10%
        const adjusted = JSON.parse(JSON.stringify(currentData));
        adjusted.targetValue.national = currentData.targetValue.national * (1 + adjustment);
        adjusted.targetValue.provinces = currentData.targetValue.provinces.map((pv: any) => ({
          ...pv,
          target: pv.target * (1 + adjustment),
        }));
        adjusted.planningBasis.environmentalChange += `\n根据用户要求，目标值已调高${(adjustment * 100).toFixed(0)}%。`;
        return adjusted;
      }
      break;

    case 'potentialIndicators':
    case 'recommendations':
      // 如果是数组，可以根据需求筛选
      if (Array.isArray(currentData)) {
        if (lowerReq.includes('保守') || lowerReq.includes('减少') || lowerReq.includes('只保留')) {
          // 只保留核心指标或前几个
          const count = extractNumber(lowerReq) || Math.ceil(currentData.length * 0.7);
          return currentData.slice(0, count);
        }
      }
      break;
  }

  // 默认返回原数据
  return currentData;
}

// 从文本中提取百分比
function extractPercentage(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)%/);
  return match ? parseFloat(match[1]) / 100 : null;
}

// 从文本中提取数字
function extractNumber(text: string): number | null {
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// 导出指标规划为Excel（使用前端库）
export function exportIndicatorPlanToExcel(
  plans: IndicatorTargetPlan[],
  filename: string = '指标规划.xlsx'
): void {
  // 这里需要使用xlsx库，先创建一个占位函数
  // 实际实现需要安装 xlsx 库：npm install xlsx
  console.log('导出Excel功能需要安装xlsx库');
  console.log('计划导出:', plans);
  console.log('文件名:', filename);
  
  // TODO: 实现Excel导出功能
  // import * as XLSX from 'xlsx';
  // const workbook = XLSX.utils.book_new();
  // const worksheet = XLSX.utils.json_to_sheet(data);
  // XLSX.utils.book_append_sheet(workbook, worksheet, '指标规划');
  // XLSX.writeFile(workbook, filename);
}

