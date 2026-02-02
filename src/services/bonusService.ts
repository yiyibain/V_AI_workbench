import axios from 'axios';
import { BonusDesignSuggestion, BonusRatioSuggestion, CompanyStrategy, BrandIndicator } from '../types/bonus';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 调用DeepSeek API
async function callDeepSeekAPI(messages: DeepSeekMessage[]): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    return generateMockAIResponse(messages);
  }

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    return generateMockAIResponse(messages);
  }
}

// 生成模拟AI响应
function generateMockAIResponse(messages: DeepSeekMessage[]): string {
  const userMessage = messages.find(m => m.role === 'user')?.content || '';
  
  if (userMessage.includes('奖金方案') || userMessage.includes('方法论') || userMessage.includes('原则')) {
    return `基于您的需求，我建议采用以下奖金方案设计原则：

**核心原则：**
1. **激励与公平并重**：奖金设计应能有效激励各省份进行科学规划，同时保证不同省份、不同品牌间的公平性
2. **结果与过程并重**：既要关注结果指标（如销量增长率），也要重视过程指标（如解限率、渗透率），确保长期可持续发展
3. **存量与增量并重**：建议存量维护与增量拓展的奖金比例约为 4:6，既保证现有市场稳定，又激励新市场开拓

**具体建议：**
- **存量 vs. 增量比例**：建议存量占40%，增量占60%。存量部分主要考核市场份额维护、解限率保持等；增量部分主要考核销量增长、新市场渗透等
- **结果指标 vs. 过程指标**：建议结果指标占60%，过程指标占40%。过程指标是结果指标的基础，需要给予足够重视
- **品牌差异化**：根据品牌战略重要性（如Non-CV重点品牌）和增长潜力，给予不同的奖金系数权重

**公平性考虑：**
- 考虑不同省份的基础条件差异，设置基础系数和增长系数
- 避免"一刀切"，根据品牌成熟度、市场潜力等因素差异化设计
- 建立透明的评估机制，确保奖金分配的公平性和可追溯性

**科学性保证：**
- 基于历史数据和市场趋势进行预测
- 结合AI模拟不同奖金权重对行为与销量的影响
- 建立动态调整机制，根据实际执行情况优化方案`;
  }
  
  return 'AI分析结果生成中...';
}

// 获取奖金方案设计建议
export async function getBonusDesignSuggestion(
  userRequirements: string
): Promise<BonusDesignSuggestion> {
  const systemPrompt = `你是一个专业的医药行业奖金方案设计顾问，专注于晖致公司的奖金激励体系设计。
你需要基于"最大化激励"、"公平性"和"科学性"三个核心原则，提供专业的奖金方案设计建议。
请提供结构化的建议，包括设计原则、具体建议、公平性考虑和科学依据。`;

  const userPrompt = `请基于以下需求，提供奖金方案设计建议：

${userRequirements}

请特别关注：
1. 如何设计奖金方案，使得奖金能够有效激励各省份进行科学规划
2. 如何确保各省份积极达成总部制定的结果指标和过程动作
3. 如何平衡激励效果与公平性、科学性

请提供具体的建议，如存量 vs. 增量比例、结果指标 vs. 过程指标比例等。`;

  const response = await callDeepSeekAPI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  // 解析响应并生成结构化数据
  return parseBonusDesignSuggestion(response);
}

// 解析奖金方案设计建议
function parseBonusDesignSuggestion(response: string): BonusDesignSuggestion {
  // 简单的解析逻辑，实际应该用更复杂的NLP
  const principles: string[] = [];
  const recommendations: Array<{ category: string; suggestion: string; rationale: string }> = [];
  const fairnessConsiderations: string[] = [];
  const scientificBasis: string[] = [];

  // 提取原则
  if (response.includes('激励与公平并重')) {
    principles.push('激励与公平并重');
  }
  if (response.includes('结果与过程并重')) {
    principles.push('结果与过程并重');
  }
  if (response.includes('存量与增量并重')) {
    principles.push('存量与增量并重');
  }

  // 提取建议
  const ratioMatch = response.match(/存量.*?(\d+)%.*?增量.*?(\d+)%/);
  if (ratioMatch) {
    recommendations.push({
      category: '存量 vs. 增量比例',
      suggestion: `存量占${ratioMatch[1]}%，增量占${ratioMatch[2]}%`,
      rationale: '存量部分主要考核市场份额维护、解限率保持等；增量部分主要考核销量增长、新市场渗透等',
    });
  }

  const processMatch = response.match(/过程指标.*?(\d+)%/);
  const resultMatch = response.match(/结果指标.*?(\d+)%/);
  if (processMatch && resultMatch) {
    recommendations.push({
      category: '结果指标 vs. 过程指标',
      suggestion: `结果指标占${resultMatch[1]}%，过程指标占${processMatch[1]}%`,
      rationale: '过程指标是结果指标的基础，需要给予足够重视',
    });
  }

  // 提取公平性考虑
  if (response.includes('基础条件差异')) {
    fairnessConsiderations.push('考虑不同省份的基础条件差异，设置基础系数和增长系数');
  }
  if (response.includes('差异化')) {
    fairnessConsiderations.push('根据品牌成熟度、市场潜力等因素差异化设计');
  }
  if (response.includes('透明')) {
    fairnessConsiderations.push('建立透明的评估机制，确保奖金分配的公平性和可追溯性');
  }

  // 提取科学依据
  if (response.includes('历史数据')) {
    scientificBasis.push('基于历史数据和市场趋势进行预测');
  }
  if (response.includes('AI模拟')) {
    scientificBasis.push('结合AI模拟不同奖金权重对行为与销量的影响');
  }
  if (response.includes('动态调整')) {
    scientificBasis.push('建立动态调整机制，根据实际执行情况优化方案');
  }

  return {
    id: `suggestion-${Date.now()}`,
    title: '奖金方案设计建议',
    description: '基于AI分析生成的奖金方案设计建议',
    principles: principles.length > 0 ? principles : ['激励与公平并重', '结果与过程并重', '存量与增量并重'],
    recommendations: recommendations.length > 0 ? recommendations : [
      {
        category: '存量 vs. 增量比例',
        suggestion: '存量占40%，增量占60%',
        rationale: '存量部分主要考核市场份额维护、解限率保持等；增量部分主要考核销量增长、新市场渗透等',
      },
    ],
    fairnessConsiderations: fairnessConsiderations.length > 0 ? fairnessConsiderations : [
      '考虑不同省份的基础条件差异',
      '根据品牌成熟度、市场潜力等因素差异化设计',
    ],
    scientificBasis: scientificBasis.length > 0 ? scientificBasis : [
      '基于历史数据和市场趋势进行预测',
      '结合AI模拟不同奖金权重对行为与销量的影响',
    ],
    createdAt: new Date(),
  };
}

// 获取奖金比例智能建议
export async function getBonusRatioSuggestions(
  strategies: CompanyStrategy[],
  indicators: BrandIndicator[]
): Promise<BonusRatioSuggestion[]> {
  const systemPrompt = `你是一个专业的医药行业奖金方案设计顾问，专注于晖致公司的奖金激励体系设计。
你需要基于公司策略和品牌指标，为各品牌的指标细项提供合理的奖金比例建议。
请考虑品牌战略重要性、增长目标难度、当前完成度等因素，提供0-1之间的奖金系数建议。`;

  const strategiesText = strategies.map(s => s.description).join('\n');
  const indicatorsText = indicators.map(i => 
    `${i.brandName} - ${i.indicatorName} (当前: ${i.currentValue}${i.unit || ''}, 目标: ${i.targetValue}${i.unit || ''})`
  ).join('\n');

  const userPrompt = `请基于以下公司策略和品牌指标，为各品牌的指标细项提供奖金比例建议：

**公司策略：**
${strategiesText}

**品牌指标：**
${indicatorsText}

请为每个指标提供：
1. 建议的奖金系数（0-1之间）
2. 建议理由
3. 置信度（high/medium/low）
4. 考虑因素及其影响

请特别关注：
- Non-CV品牌作为重点发展品牌，应给予较高奖金系数
- 增长目标较高的品牌，应给予更高激励
- 过程指标（如解限率）对结果指标有重要影响，需要给予适当权重`;

  const response = await callDeepSeekAPI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  // 解析响应并生成结构化数据
  return parseBonusRatioSuggestions(response, indicators, strategies);
}

// 解析奖金比例建议
function parseBonusRatioSuggestions(
  _response: string, // AI响应文本，目前使用模拟数据
  indicators: BrandIndicator[],
  strategies: CompanyStrategy[]
): BonusRatioSuggestion[] {
  const suggestions: BonusRatioSuggestion[] = [];

  // 为每个指标生成建议
  indicators.forEach((indicator, index) => {
    // 计算基础系数
    let baseRatio = 0.15; // 默认系数

    // 根据品牌类别调整
    if (indicator.category === 'Non-CV') {
      const nonCVStrategy = strategies.find(s => s.description.includes('Non-CV'));
      if (nonCVStrategy) {
        baseRatio += 0.1; // Non-CV品牌增加0.1
      }
    }

    // 根据指标类型调整
    if (indicator.indicatorType === 'process') {
      baseRatio -= 0.03; // 过程指标略低
    }

    // 根据目标挑战性调整
    if (indicator.currentValue !== undefined && indicator.targetValue !== undefined) {
      const gap = indicator.targetValue - indicator.currentValue;
      const challengeRatio = gap / indicator.currentValue;
      if (challengeRatio > 0.5) {
        baseRatio += 0.1; // 挑战性高，增加系数
      } else if (challengeRatio < 0.2) {
        baseRatio -= 0.05; // 挑战性低，降低系数
      }
    }

    // 确保系数在合理范围内
    baseRatio = Math.max(0.05, Math.min(0.5, baseRatio));

    // 生成建议理由
    let rationale = '';
    const factors: Array<{ factor: string; impact: 'positive' | 'negative' | 'neutral'; weight: number }> = [];

    if (indicator.category === 'Non-CV') {
      rationale += '作为Non-CV重点品牌，';
      factors.push({ factor: '战略重要性（Non-CV）', impact: 'positive', weight: 0.4 });
    }

    if (indicator.indicatorType === 'result') {
      rationale += '结果指标对业务影响直接，';
      factors.push({ factor: '结果指标重要性', impact: 'positive', weight: 0.3 });
    } else {
      rationale += '过程指标是结果指标的基础，';
      factors.push({ factor: '过程指标重要性', impact: 'positive', weight: 0.3 });
    }

    if (indicator.currentValue !== undefined && indicator.targetValue !== undefined) {
      const gap = indicator.targetValue - indicator.currentValue;
      if (gap > 0) {
        rationale += `增长目标具有挑战性，`;
        factors.push({ factor: '增长目标挑战性', impact: 'positive', weight: 0.3 });
      }
    }

    rationale += '建议给予相应的奖金系数以激励。';

    // 确定置信度
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (factors.length >= 3 && indicator.currentValue !== undefined) {
      confidence = 'high';
    } else if (factors.length < 2) {
      confidence = 'low';
    }

    suggestions.push({
      id: `suggestion-${indicator.id}-${Date.now()}`,
      brandId: `brand-${index}`,
      brandName: indicator.brandName,
      indicatorId: indicator.id,
      indicatorName: indicator.indicatorName,
      suggestedRatio: Math.round(baseRatio * 100) / 100, // 保留两位小数
      rationale,
      confidence,
      factors: factors.length > 0 ? factors : [
        { factor: '品牌成熟度', impact: 'neutral', weight: 0.3 },
        { factor: '增长目标难度', impact: 'positive', weight: 0.4 },
        { factor: '战略重要性', impact: 'neutral', weight: 0.3 },
      ],
    });
  });

  return suggestions;
}

// 奖金包调整方案
export interface BonusAdjustmentPlan {
  adjustments: {
    brandId: string;
    brandName: string;
    subBrandName?: string;
    totalRatioChange: number; // 总奖金包变化量
    indicatorAdjustments?: {
      indicatorId: string;
      indicatorName: string;
      type: 'result' | 'process';
      ratioChange: number; // 指标比例变化量
    }[];
  }[];
  explanation: string; // 调整说明
  totalRatioAfter: number; // 调整后总奖金包（应该为100%）
}

// 理解策略指令并生成调整方案
export async function understandStrategyAndAdjust(
  userInstruction: string,
  currentPackages: any[] // ExtendedBonusPackage[]
): Promise<BonusAdjustmentPlan> {
  const systemPrompt = `你是一个专业的医药行业奖金方案优化顾问。你需要理解用户的策略性指令，并生成具体的奖金包调整方案。

用户可能输入的指令类型包括：
1. 品牌策略：如"发展Non-CV产品"、"重点支持CV品牌"、"提升疼痛品牌"
2. 指标策略：如"结果指标给多一点"、"过程指标增加权重"、"提高解限率指标"
3. 组合策略：如"发展Non-CV产品，结果指标给多一点"

你需要：
1. 理解用户的策略意图
2. 识别需要调整的品牌和指标
3. 计算合理的调整幅度
4. 确保调整后总奖金包为100%（通过按比例缩放所有品牌）

请以JSON格式返回调整方案，格式如下：
{
  "adjustments": [
    {
      "brandId": "brand-3",
      "brandName": "疼痛",
      "subBrandName": "西乐葆",
      "totalRatioChange": 2,
      "indicatorAdjustments": [
        {
          "indicatorId": "ind-pain-result-1",
          "indicatorName": "医院PDOT份额(塞来昔布/普瑞巴林)",
          "type": "result",
          "ratioChange": 1
        }
      ]
    }
  ],
  "explanation": "根据'发展Non-CV产品，结果指标给多一点'的策略，增加了疼痛品牌（特别是西乐葆）的总奖金包，并提高了结果指标的权重。",
  "totalRatioAfter": 100
}`;

  // 构建当前配置的描述
  const currentConfig = currentPackages.map((pkg) => {
    const brand = pkg.brandName;
    const totalRatio = pkg.subBrandPackages 
      ? pkg.subBrandPackages.reduce((sum: number, sub: any) => sum + sub.totalRatio, 0)
      : pkg.totalRatio;
    const resultRatio = pkg.subBrandPackages
      ? pkg.subBrandPackages.reduce((sum: number, sub: any) => 
          sum + sub.resultIndicators.reduce((s: number, i: any) => s + i.ratio, 0), 0)
      : pkg.resultIndicators.reduce((sum: number, ind: any) => sum + ind.ratio, 0);
    const processRatio = pkg.subBrandPackages
      ? pkg.subBrandPackages.reduce((sum: number, sub: any) => 
          sum + sub.processIndicators.reduce((s: number, i: any) => s + i.ratio, 0), 0)
      : pkg.processIndicators.reduce((sum: number, ind: any) => sum + ind.ratio, 0);
    
    return `${brand}: 总奖金包${totalRatio}%，结果指标${resultRatio}%，过程指标${processRatio}%`;
  }).join('\n');

  const userPrompt = `用户指令：${userInstruction}

当前奖金包配置：
${currentConfig}

请分析用户指令，生成具体的调整方案。确保：
1. 调整方案符合用户的策略意图
2. 调整后总奖金包为100%（通过按比例缩放）
3. 调整幅度合理（单个品牌调整不超过±5%）`;

  const response = await callDeepSeekAPI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  // 尝试解析JSON响应
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const plan = JSON.parse(jsonMatch[0]);
      return plan;
    }
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error);
  }

  // 如果解析失败，使用规则生成调整方案
  return generateRuleBasedAdjustment(userInstruction, currentPackages);
}

// 基于规则的调整方案生成（当AI解析失败时使用）
function generateRuleBasedAdjustment(
  userInstruction: string,
  currentPackages: any[]
): BonusAdjustmentPlan {
  const adjustments: BonusAdjustmentPlan['adjustments'] = [];
  let explanation = '';
  const lowerInstruction = userInstruction.toLowerCase();

  // 识别Non-CV品牌
  const nonCVBrands = ['疼痛', '精神', '爱宁达', '利加隆', '维固力', '迪敏思'];
  // const cvBrands = ['立普妥', '络活喜', '可多华']; // 保留用于未来扩展

  // 策略1: 发展Non-CV产品
  if (lowerInstruction.includes('non-cv') || lowerInstruction.includes('非cv') || 
      lowerInstruction.includes('发展') && (lowerInstruction.includes('非') || lowerInstruction.includes('non'))) {
    explanation = '根据"发展Non-CV产品"的策略，增加Non-CV品牌的总奖金包比例。';
    
    currentPackages.forEach((pkg) => {
      const isNonCV = nonCVBrands.some(brand => pkg.brandName.includes(brand));
      if (isNonCV) {
        if (pkg.subBrandPackages) {
          pkg.subBrandPackages.forEach((sub: any) => {
            const isNonCVSub = nonCVBrands.some(brand => sub.subBrandName.includes(brand));
            if (isNonCVSub) {
              adjustments.push({
                brandId: pkg.brandId,
                brandName: pkg.brandName,
                subBrandName: sub.subBrandName,
                totalRatioChange: 1.5, // 增加1.5%
              });
            }
          });
        } else {
          adjustments.push({
            brandId: pkg.brandId,
            brandName: pkg.brandName,
            totalRatioChange: 1.5,
          });
        }
      } else {
        // 减少CV品牌的比例
        if (pkg.subBrandPackages) {
          pkg.subBrandPackages.forEach((sub: any) => {
            adjustments.push({
              brandId: pkg.brandId,
              brandName: pkg.brandName,
              subBrandName: sub.subBrandName,
              totalRatioChange: -0.5,
            });
          });
        } else {
          adjustments.push({
            brandId: pkg.brandId,
            brandName: pkg.brandName,
            totalRatioChange: -0.5,
          });
        }
      }
    });
  }

  // 策略2: 结果指标给多一点
  if (lowerInstruction.includes('结果指标') && (lowerInstruction.includes('多') || lowerInstruction.includes('增加'))) {
    explanation += ' 同时增加结果指标的权重。';
    
    currentPackages.forEach((pkg) => {
      if (pkg.subBrandPackages) {
        pkg.subBrandPackages.forEach((sub: any) => {
          sub.resultIndicators.forEach((ind: any) => {
            adjustments.push({
              brandId: pkg.brandId,
              brandName: pkg.brandName,
              subBrandName: sub.subBrandName,
              totalRatioChange: 0,
              indicatorAdjustments: [{
                indicatorId: ind.indicatorId,
                indicatorName: ind.indicatorName,
                type: 'result',
                ratioChange: ind.ratio * 0.2, // 增加20%
              }],
            });
          });
        });
      } else {
        pkg.resultIndicators.forEach((ind: any) => {
          adjustments.push({
            brandId: pkg.brandId,
            brandName: pkg.brandName,
            totalRatioChange: 0,
            indicatorAdjustments: [{
              indicatorId: ind.indicatorId,
              indicatorName: ind.indicatorName,
              type: 'result',
              ratioChange: ind.ratio * 0.2,
            }],
          });
        });
      }
    });
  }

  // 计算调整后总奖金包
  let totalAfter = currentPackages.reduce((sum, pkg) => {
    if (pkg.subBrandPackages) {
      return sum + pkg.subBrandPackages.reduce((s: number, sub: any) => s + sub.totalRatio, 0);
    }
    return sum + pkg.totalRatio;
  }, 0);

  // 加上总奖金包的变化
  const totalRatioChange = adjustments.reduce((sum, adj) => {
    if (adj.totalRatioChange) {
      return sum + adj.totalRatioChange;
    }
    return sum;
  }, 0);
  totalAfter += totalRatioChange;

  // 如果总奖金包不是100%，按比例缩放
  if (totalAfter !== 100) {
    const scaleFactor = 100 / totalAfter;
    adjustments.forEach((adj) => {
      if (adj.totalRatioChange) {
        adj.totalRatioChange = (adj.totalRatioChange + (adj.totalRatioChange * (scaleFactor - 1)));
      }
    });
    totalAfter = 100;
  }

  return {
    adjustments,
    explanation: explanation || '根据您的指令，已生成调整方案。',
    totalRatioAfter: totalAfter,
  };
}

