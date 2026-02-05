import axios from 'axios';
import {
  Opportunity,
  StrategyAnalysisResult,
  ProblemCauseAnalysis,
  StrategySolution,
  UserFeedback,
} from '../types/strategy';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';

/**
 * 第一步：问题对应原因再梳理
 * 整合信息，统一表述，列出关键事实依据
 */
export async function analyzeProblemCauses(
  opportunity: Opportunity,
  historicalAnalyses?: ProblemCauseAnalysis[]
): Promise<ProblemCauseAnalysis> {
  const systemPrompt = `你是一名负责零售渠道心血管（降血脂）市场的资深数据分析专家。
你的任务是针对特定问题，整合所有相关信息，梳理出关键的事实依据和原因分析。

## 任务要求
1. **整合信息**：整合与该问题相关的所有回答，包括：
   - 业务回顾中的基础指标
   - 历史保存的生意大盘观测报告
   - 用户在日常交流中对归因提供的输入
   - 新的联网新闻（如果可用）

2. **问题与事实的统一表述**：
   - 用1-2句话，列出1-3条最关键、最新且可被数据支持的事实依据（fact-base）
   - 每条事实尽量包含定量信息（如份额、WD、价格、时间节点）
   - 与问题高度相关，能直接解释问题出现背后的原因
   - 如发现原因解释之间出现矛盾，以最新、最明确且与上下文最一致的事实为准

3. **原因总结**：
   - 基于事实依据，总结问题的根本原因
   - 原因陈述要简洁、准确、有数据支撑

## 输出格式
请以JSON格式输出：
{
  "coreFacts": [
    {
      "content": "事实描述（包含定量信息）",
      "dataSource": "数据来源",
      "relevance": "与问题的相关性说明"
    }
  ],
  "causeStatement": "总结性的原因分析陈述"
}`;

  const historicalContext = historicalAnalyses && historicalAnalyses.length > 0
    ? `\n\n## 历史分析记录\n${historicalAnalyses.map((h) => 
        `版本${h.version}（${h.updatedAt.toLocaleDateString()}）：\n` +
        `- 核心事实：${h.coreFacts.map(f => f.content).join('；')}\n` +
        `- 原因分析：${h.causeStatement}`
      ).join('\n\n')}`
    : '';

  const userPrompt = `请分析以下问题：

**问题标题**：${opportunity.title}
**问题描述**：${opportunity.description}
**细分市场**：${opportunity.marketSegment}
**当前缺口**：${opportunity.currentGap}
${historicalContext}

请完成第一步：问题对应原因再梳理，输出关键事实依据和原因分析。`;

  try {
    const response = await callDeepSeekAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // 解析JSON响应
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法解析AI响应为JSON格式');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const version = historicalAnalyses && historicalAnalyses.length > 0
      ? Math.max(...historicalAnalyses.map(h => h.version)) + 1
      : 1;

    return {
      problemId: opportunity.id,
      problemTitle: opportunity.title,
      coreFacts: parsed.coreFacts.map((fact: any, idx: number) => ({
        id: `fact-${opportunity.id}-${version}-${idx}`,
        content: fact.content,
        dataSource: fact.dataSource || '数据分析',
        relevance: fact.relevance || '与问题高度相关',
      })),
      causeStatement: parsed.causeStatement,
      version,
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('分析问题原因失败:', error);
    // 返回默认分析
    return {
      problemId: opportunity.id,
      problemTitle: opportunity.title,
      coreFacts: [
        {
          id: `fact-${opportunity.id}-default-1`,
          content: `${opportunity.title}：${opportunity.currentGap}`,
          dataSource: '问题描述',
          relevance: '直接反映问题现状',
        },
      ],
      causeStatement: `基于问题描述，${opportunity.title}的主要原因需要进一步数据验证和分析。`,
      version: 1,
      updatedAt: new Date(),
    };
  }
}

/**
 * 第二步：提出解决方案
 * 基于原因分析，提出2-3条具体可落地的策略建议
 */
export async function generateStrategySolutions(
  opportunity: Opportunity,
  causeAnalysis: ProblemCauseAnalysis
): Promise<StrategySolution[]> {
  const systemPrompt = `你是一名负责零售渠道心血管（降血脂）市场的资深策略规划专家。
你的任务是基于问题原因分析，提出具体可落地且能上升到策略级的解决方案。

## 任务要求
1. **为每个问题提出2-3条解决方案**
2. **每条方案需要同时满足两点**：
   - 有具体动作，可以在现实中执行，并与事实依据一一对应
   - 能上升到策略级表达，体现清晰的方向性和优先级

3. **建议结构**：
   - 策略建议1（渠道/覆盖）：……
   - 策略建议2（产品/包装/价格）：……
   - 策略建议3（资源/推广模式）：……

4. **示例风格**（仅作参考，不要机械套用）：
   - "基于10mg中标省份中立普妥WD明显低于可定，且大包装WD更低这一事实，建议将'提升10mg大包装分销率'设为优先级最高的渠道目标。具体动作包括：在仅10mg中标省份，对核心连锁药房设定WD提升至XX%的阶段性KPI，并通过进货返利、陈列资源和店员培训，确保大包装上架率显著改善。"
   - "由于立普妥零售端包装规格小、长疗程使用不便，而竞品可定在大包装规格上更具优势，建议在院外推出或重点推广立普妥长疗程大包装，并配套'长期用药更省心'的患者教育话术和短期促销，以提升分子式内大包装占比，从而改善整体份额。"

## 输出格式
请以JSON格式输出：
{
  "strategies": [
    {
      "title": "策略标题",
      "category": "channel|product|resource|promotion",
      "description": "策略描述（包含策略级表达）",
      "specificActions": ["具体动作1", "具体动作2", "具体动作3"],
      "strategicLevel": "策略级表达（体现方向性和优先级）",
      "expectedOutcome": "预期效果",
      "basedOnFacts": ["事实ID1", "事实ID2"]
    }
  ]
}`;

  const factsText = causeAnalysis.coreFacts.map((f, idx) => 
    `${idx + 1}. ${f.content}（来源：${f.dataSource}，相关性：${f.relevance}）`
  ).join('\n');

  const userPrompt = `请为以下问题提出解决方案：

**问题**：${opportunity.title}
**问题描述**：${opportunity.description}

**原因分析**：
${causeAnalysis.causeStatement}

**关键事实依据**：
${factsText}

请完成第二步：提出2-3条解决方案，每条方案需同时满足具体可执行和策略级表达两个要求。`;

  try {
    const response = await callDeepSeekAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // 解析JSON响应
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法解析AI响应为JSON格式');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    return parsed.strategies.map((strategy: any, idx: number) => ({
      id: `strategy-${opportunity.id}-${idx + 1}`,
      problemId: opportunity.id,
      title: strategy.title,
      category: strategy.category || 'resource',
      description: strategy.description,
      specificActions: strategy.specificActions || [],
      strategicLevel: strategy.strategicLevel || strategy.description,
      expectedOutcome: strategy.expectedOutcome,
      basedOnFacts: strategy.basedOnFacts || [],
    }));
  } catch (error) {
    console.error('生成策略解决方案失败:', error);
    // 返回默认策略
    return [
      {
        id: `strategy-${opportunity.id}-default`,
        problemId: opportunity.id,
        title: '待完善策略',
        category: 'resource' as const,
        description: '需要基于具体数据进一步完善策略建议',
        specificActions: ['收集更多数据', '分析竞品策略', '制定行动计划'],
        strategicLevel: '需要进一步分析',
        basedOnFacts: [],
      },
    ];
  }
}

/**
 * 第三步：与用户的交互校准
 * 主动向用户确认分析是否满足需求，并引导用户给出反馈
 */
export async function requestUserFeedback(
  opportunity: Opportunity,
  causeAnalysis: ProblemCauseAnalysis,
  strategies: StrategySolution[]
): Promise<{
  clarificationQuestions: string[];
  feedbackPrompt: string;
}> {
  const strategiesText = strategies.map((s, idx) => 
    `${idx + 1}. ${s.title}：${s.description}\n   具体动作：${s.specificActions.join('；')}`
  ).join('\n\n');

  const feedbackPrompt = `以上得出的策略，请问这是否符合你的预期？

**问题**：${opportunity.title}

**原因分析**：
${causeAnalysis.causeStatement}

**策略建议**：
${strategiesText}

请选择：
- **A**：整体方向与逻辑基本符合，只需在少数问题上做补充/精炼
- **B**：部分策略不合理，希望你围绕某一类问题（请说明）做更深入分析
- **C**：与我真实判断差距较大，我希望指定正确的结论，再让你帮我完善推理过程
- **自定义反馈**：直接输入你的具体反馈意见`;

  const clarificationQuestions = [
    '你觉得哪个策略判断有偏差？是否认为该策略无法解决问题、无法落地、或是存在其他顾虑？',
    '你能给出1-2条你认为"更接近真实情况"的问题表述或策略方向吗？我将以此为基准重新调整分析和建议。',
  ];

  return {
    clarificationQuestions,
    feedbackPrompt,
  };
}

/**
 * 第四步：基于用户输入，修改策略输出
 */
export async function reviseAnalysisBasedOnFeedback(
  opportunity: Opportunity,
  originalCauseAnalysis: ProblemCauseAnalysis,
  originalStrategies: StrategySolution[],
  userFeedback: UserFeedback,
  iterationCount: number
): Promise<{
  revisedAnalysis: ProblemCauseAnalysis;
  revisedStrategies: StrategySolution[];
}> {
  const systemPrompt = `你是一名负责零售渠道心血管（降血脂）市场的资深数据分析专家。
用户对你的分析提出了反馈，你需要根据用户的反馈调整分析和策略建议。

## 任务要求
1. **理解用户反馈**：仔细分析用户的反馈内容，理解用户的真实意图
2. **调整原因分析**：如果用户指出了原因分析的偏差，需要重新梳理事实依据和原因
3. **调整策略建议**：根据用户的反馈，修改或重新生成策略建议
4. **明确标注**：在输出中明确标注"这是一版基于用户修正后的更新"

## 输出格式
请以JSON格式输出：
{
  "revisedCauseAnalysis": {
    "coreFacts": [...],
    "causeStatement": "..."
  },
  "revisedStrategies": [...]
}`;

  const userPrompt = `用户对以下分析提出了反馈，请根据反馈进行调整：

**原始问题**：${opportunity.title}
**原始原因分析**：
${originalCauseAnalysis.causeStatement}

**原始策略建议**：
${originalStrategies.map(s => `- ${s.title}：${s.description}`).join('\n')}

**用户反馈类型**：${userFeedback.feedbackType}
**用户反馈内容**：${userFeedback.content}
${userFeedback.clarification ? `**澄清问题**：${userFeedback.clarification}` : ''}
${userFeedback.suggestedCorrection ? `**建议的正确结论**：${userFeedback.suggestedCorrection}` : ''}

**这是第${iterationCount}次迭代调整**。

请完成第四步：基于用户输入，修改策略输出。`;

  try {
    const response = await callDeepSeekAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // 解析JSON响应
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法解析AI响应为JSON格式');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const newVersion = originalCauseAnalysis.version + 1;

    const revisedAnalysis: ProblemCauseAnalysis = {
      problemId: opportunity.id,
      problemTitle: opportunity.title,
      coreFacts: parsed.revisedCauseAnalysis.coreFacts.map((fact: any, idx: number) => ({
        id: `fact-${opportunity.id}-${newVersion}-${idx}`,
        content: fact.content,
        dataSource: fact.dataSource || '数据分析',
        relevance: fact.relevance || '与问题高度相关',
      })),
      causeStatement: `【基于用户修正后的更新】${parsed.revisedCauseAnalysis.causeStatement}`,
      version: newVersion,
      updatedAt: new Date(),
    };

    const revisedStrategies: StrategySolution[] = parsed.revisedStrategies.map((strategy: any, idx: number) => ({
      id: `strategy-${opportunity.id}-revised-${idx + 1}`,
      problemId: opportunity.id,
      title: strategy.title,
      category: strategy.category || 'resource',
      description: strategy.description,
      specificActions: strategy.specificActions || [],
      strategicLevel: strategy.strategicLevel || strategy.description,
      expectedOutcome: strategy.expectedOutcome,
      basedOnFacts: strategy.basedOnFacts || [],
    }));

    return {
      revisedAnalysis,
      revisedStrategies,
    };
  } catch (error) {
    console.error('基于反馈修改分析失败:', error);
    // 返回原始分析
    return {
      revisedAnalysis: originalCauseAnalysis,
      revisedStrategies: originalStrategies,
    };
  }
}

/**
 * 第五步：输出并总结所有策略
 */
export async function generateFinalStrategySummary(
  opportunity: Opportunity,
  finalCauseAnalysis: ProblemCauseAnalysis,
  allStrategies: StrategySolution[]
): Promise<{
  finalSummary: string;
  strategyGoals: Array<{
    strategyId: string;
    goal: string;
    implementation: string;
  }>;
}> {
  const systemPrompt = `你是一名负责零售渠道心血管（降血脂）市场的资深策略规划专家。
你的任务是总结所有策略，明确策略目标和实现方式。

## 任务要求
1. **生成最终总结**：用简洁的语言总结整个分析过程和核心策略
2. **明确策略目标**：为每条策略明确目标
3. **说明实现方式**：为每条策略说明具体的实现方式

## 输出格式
请以JSON格式输出：
{
  "finalSummary": "最终总结文本",
  "strategyGoals": [
    {
      "strategyId": "策略ID",
      "goal": "策略目标",
      "implementation": "实现方式"
    }
  ]
}`;

  const strategiesText = allStrategies.map((s, idx) => 
    `${idx + 1}. ${s.title}：${s.description}\n   具体动作：${s.specificActions.join('；')}`
  ).join('\n\n');

  const userPrompt = `请为以下分析生成最终总结：

**问题**：${opportunity.title}
**原因分析**：
${finalCauseAnalysis.causeStatement}

**所有策略建议**：
${strategiesText}

请完成第五步：输出并总结所有策略，写明策略目标以及实现方式。`;

  try {
    const response = await callDeepSeekAPI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);

    // 解析JSON响应
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法解析AI响应为JSON格式');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      finalSummary: parsed.finalSummary,
      strategyGoals: parsed.strategyGoals.map((goal: any) => ({
        strategyId: goal.strategyId,
        goal: goal.goal,
        implementation: goal.implementation,
      })),
    };
  } catch (error) {
    console.error('生成最终总结失败:', error);
    // 返回默认总结
    return {
      finalSummary: `针对${opportunity.title}，我们完成了原因分析和策略制定，共提出${allStrategies.length}条策略建议。`,
      strategyGoals: allStrategies.map(s => ({
        strategyId: s.id,
        goal: s.title,
        implementation: s.specificActions.join('；'),
      })),
    };
  }
}

/**
 * 完整的5步分析流程
 */
export async function performFullStrategyAnalysis(
  opportunity: Opportunity,
  onProgress?: (step: number, message: string) => void
): Promise<StrategyAnalysisResult> {
  const result: StrategyAnalysisResult = {
    problemId: opportunity.id,
    problemTitle: opportunity.title,
    step1: {} as ProblemCauseAnalysis,
    step2: [],
    step3: {
      needsClarification: true,
    },
    status: 'analyzing',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  try {
    // 第一步：问题对应原因再梳理
    onProgress?.(1, '正在分析问题原因...');
    result.step1 = await analyzeProblemCauses(opportunity);
    result.updatedAt = new Date();

    // 第二步：提出解决方案
    onProgress?.(2, '正在生成策略建议...');
    result.step2 = await generateStrategySolutions(opportunity, result.step1);
    result.updatedAt = new Date();

    // 第三步：与用户的交互校准
    onProgress?.(3, '等待用户反馈...');
    const feedbackInfo = await requestUserFeedback(opportunity, result.step1, result.step2);
    result.step3 = {
      needsClarification: true,
      clarificationQuestions: feedbackInfo.clarificationQuestions,
    };
    result.status = 'waiting_feedback';
    result.updatedAt = new Date();

    return result;
  } catch (error) {
    console.error('策略分析流程失败:', error);
    result.status = 'analyzing';
    return result;
  }
}

/**
 * 处理用户反馈并继续流程
 */
export async function handleUserFeedback(
  result: StrategyAnalysisResult,
  opportunity: Opportunity,
  userFeedback: UserFeedback,
  onProgress?: (step: number, message: string) => void
): Promise<StrategyAnalysisResult> {
  result.step3.userFeedback = userFeedback;
  result.updatedAt = new Date();

  // 如果用户选择A（基本符合），直接进入第五步
  if (userFeedback.feedbackType === 'A') {
    onProgress?.(5, '正在生成最终总结...');
    const summary = await generateFinalStrategySummary(
      opportunity,
      result.step1,
      result.step2
    );
    result.step5 = {
      finalSummary: summary.finalSummary,
      allStrategies: result.step2,
      strategyGoals: summary.strategyGoals,
    };
    result.status = 'completed';
    result.updatedAt = new Date();
    return result;
  }

  // 如果用户选择B或C，进入第四步：修改策略
  onProgress?.(4, '正在根据反馈调整分析...');
  const iterationCount = result.step4?.iterationCount || 0;
  const revised = await reviseAnalysisBasedOnFeedback(
    opportunity,
    result.step1,
    result.step2,
    userFeedback,
    iterationCount + 1
  );

  result.step4 = {
    revisedAnalysis: revised.revisedAnalysis,
    revisedStrategies: revised.revisedStrategies,
    iterationCount: iterationCount + 1,
  };

  // 更新当前使用的分析和策略
  result.step1 = revised.revisedAnalysis;
  result.step2 = revised.revisedStrategies;

  // 再次请求用户反馈
  const feedbackInfo = await requestUserFeedback(opportunity, revised.revisedAnalysis, revised.revisedStrategies);
  result.step3 = {
    userFeedback: undefined, // 清空之前的反馈，等待新的反馈
    needsClarification: true,
    clarificationQuestions: feedbackInfo.clarificationQuestions,
  };
  result.status = 'waiting_feedback';
  result.updatedAt = new Date();

  return result;
}

/**
 * 完成分析流程（生成最终总结）
 */
export async function completeStrategyAnalysis(
  result: StrategyAnalysisResult,
  opportunity: Opportunity,
  onProgress?: (step: number, message: string) => void
): Promise<StrategyAnalysisResult> {
  onProgress?.(5, '正在生成最终总结...');
  
  const finalCauseAnalysis = result.step4?.revisedAnalysis || result.step1;
  const finalStrategies = result.step4?.revisedStrategies || result.step2;

  const summary = await generateFinalStrategySummary(
    opportunity,
    finalCauseAnalysis,
    finalStrategies
  );

  result.step5 = {
    finalSummary: summary.finalSummary,
    allStrategies: finalStrategies,
    strategyGoals: summary.strategyGoals,
  };
  result.status = 'completed';
  result.updatedAt = new Date();

  return result;
}

// 辅助函数：调用DeepSeek API
async function callDeepSeekAPI(messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    // 如果没有API Key，返回模拟数据
    return generateMockResponse(messages);
  }

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages,
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

    return response.data.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    return generateMockResponse(messages);
  }
}

// 生成模拟响应（当没有API Key时）
function generateMockResponse(messages: Array<{ role: string; content: string }>): string {
  const userMessage = messages.find(m => m.role === 'user')?.content || '';
  
  if (userMessage.includes('第一步') || userMessage.includes('原因再梳理')) {
    return JSON.stringify({
      coreFacts: [
        {
          content: '立普妥零售市场分子式份额为9%，低于可定的12%，差距3个百分点',
          dataSource: '市场数据',
          relevance: '直接反映问题现状',
        },
        {
          content: '立普妥10mg大包装WD为25.92，远低于可定10mg的46.85',
          dataSource: '分销数据',
          relevance: '说明渠道覆盖不足',
        },
      ],
      causeStatement: '立普妥在零售渠道表现不佳的主要原因包括：1）分子式内份额落后可定3个百分点；2）10mg大包装分销水平低，WD仅为25.92，远低于可定的46.85，说明渠道铺货不足限制了产品的可及性。',
    });
  }
  
  if (userMessage.includes('第二步') || userMessage.includes('解决方案')) {
    return JSON.stringify({
      strategies: [
        {
          title: '提升10mg大包装分销率',
          category: 'channel',
          description: '基于10mg中标省份中立普妥WD明显低于可定，且大包装WD更低这一事实，建议将"提升10mg大包装分销率"设为优先级最高的渠道目标。',
          specificActions: [
            '在仅10mg中标省份，对核心连锁药房设定WD提升至45%的阶段性KPI',
            '通过进货返利、陈列资源和店员培训，确保大包装上架率显著改善',
          ],
          strategicLevel: '渠道覆盖优先策略',
          expectedOutcome: '10mg大包装WD从25.92提升至45%以上',
          basedOnFacts: ['fact-1'],
        },
        {
          title: '推出长疗程大包装',
          category: 'product',
          description: '由于立普妥零售端包装规格小、长疗程使用不便，而竞品可定在大包装规格上更具优势，建议在院外推出或重点推广立普妥长疗程大包装。',
          specificActions: [
            '在院外推出或重点推广立普妥长疗程大包装',
            '配套"长期用药更省心"的患者教育话术和短期促销',
            '提升分子式内大包装占比',
          ],
          strategicLevel: '产品组合优化策略',
          expectedOutcome: '大包装占比提升，改善整体份额',
          basedOnFacts: ['fact-2'],
        },
      ],
    });
  }
  
  if (userMessage.includes('第五步') || userMessage.includes('最终总结')) {
    return JSON.stringify({
      finalSummary: '针对立普妥-零售问题，我们完成了原因分析和策略制定。核心问题是10mg大包装分销水平低，导致零售市场分子式份额落后可定。我们提出了两条核心策略：1）提升10mg大包装分销率；2）推出长疗程大包装。',
      strategyGoals: [
        {
          strategyId: 'strategy-1',
          goal: '提升10mg大包装分销率',
          implementation: '通过对零售端进行进货返利、陈列资源和店员培训，对患者端进行患者教育话术和短期促销实现',
        },
        {
          strategyId: 'strategy-2',
          goal: '推出长疗程大包装',
          implementation: '在院外推出或重点推广立普妥长疗程大包装，并配套患者教育话术和短期促销',
        },
      ],
    });
  }
  
  return JSON.stringify({ message: '模拟响应' });
}
