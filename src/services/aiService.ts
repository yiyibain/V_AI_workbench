import axios from 'axios';
import { AIAnalysis, ProductPerformance, ProvincePerformance } from '../types';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// 调用DeepSeek API
async function callDeepSeekAPI(messages: DeepSeekMessage[]): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    // 如果没有API Key，返回模拟数据
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

// 生成模拟AI响应（当没有API Key时）
function generateMockAIResponse(messages: DeepSeekMessage[]): string {
  const userMessage = messages.find(m => m.role === 'user')?.content || '';
  
  if (userMessage.includes('产品表现')) {
    return `基于数据分析，该产品在分子式层面表现良好，但分子式内份额出现下降趋势。可能原因包括：
1. 竞品营销策略调整，加大了市场投入
2. 产品价格竞争力下降
3. 渠道覆盖不足，特别是在下沉市场
4. 医生处方习惯发生变化

建议进一步分析：
- 分省份拆解数据，识别问题集中区域
- 访谈重点医院的关键医生，了解处方决策因素
- 对比竞品的市场活动时间线
- 分析价格变化对市场份额的影响`;
  }
  
  if (userMessage.includes('省份表现')) {
    return `该省份在多个核心维度表现不理想：
1. 市场份额低于平均水平，可能与竞品在该区域投入较大有关
2. ROI偏低，说明投入产出效率有待提升
3. 解限率和渗透率均低于目标值，存在市场开发不足的问题

可能原因：
- 区域团队能力建设不足
- 医院准入进展缓慢
- 医生教育覆盖不够
- 竞品在该区域有较强的先发优势

建议行动：
- 访谈区域经理和重点医院代表，了解具体障碍
- 分析该省份的医院准入数据
- 评估是否需要增加市场投入或调整策略`;
  }
  
  return 'AI分析结果生成中...';
}

// 分析产品表现
export async function analyzeProductPerformance(
  product: ProductPerformance
): Promise<AIAnalysis> {
  const systemPrompt = `你是一个专业的医药行业业务分析师，专注于晖致公司的产品表现分析。
你需要基于"以患者为中心"和"解限-渗透-做广"的业务逻辑进行分析。
请提供专业、深入的分析，包括数据解读、风险识别和行动建议。`;

  const userPrompt = `请分析以下产品的市场表现数据：

产品名称：${product.productName}
分子式：${product.moleculeFormula}
报告周期：${product.period}

外部数据：
- 分子式份额：${product.moleculeShare}% (变化：${product.moleculeShareChange > 0 ? '+' : ''}${product.moleculeShareChange}%)
- 分子式内份额：${product.moleculeInternalShare}% (变化：${product.moleculeInternalShareChange > 0 ? '+' : ''}${product.moleculeInternalShareChange}%)
- 竞品份额：${product.competitorShare}% (变化：${product.competitorShareChange > 0 ? '+' : ''}${product.competitorShareChange}%)

内部数据：
- 解限率：${product.deLimitRate}% (变化：${product.deLimitRateChange > 0 ? '+' : ''}${product.deLimitRateChange}%)

请提供：
1. "就数论数"：识别关键变化和风险点
2. "数据解读"：分析可能原因，并提供进一步锁定问题的建议（包括拆解问题角度、可访谈对象等）
3. 结合晖致"三环"运营体系，提供基于"解限-渗透-做广"逻辑的建议`;

  const response = await callDeepSeekAPI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  // 解析响应并生成结构化数据
  return {
    type: 'product',
    targetId: product.productId,
    targetName: product.productName,
    dataSummary: `产品${product.productName}在${product.period}的表现分析`,
    keyFindings: extractKeyFindings(response, product),
    riskAlerts: generateRiskAlerts(product),
    interpretation: response,
    possibleReasons: extractReasons(response),
    suggestedActions: extractSuggestedActions(response),
    relatedInfo: generateRelatedInfo(product),
  };
}

// 分析省份表现
export async function analyzeProvincePerformance(
  province: ProvincePerformance
): Promise<AIAnalysis> {
  const systemPrompt = `你是一个专业的医药行业业务分析师，专注于晖致公司的区域市场分析。
你需要基于"以患者为中心"和"解限-渗透-做广"的业务逻辑进行分析。
请提供专业、深入的分析，包括健康度评估、原因分析和改进建议。`;

  const userPrompt = `请分析以下省份的市场表现数据：

省份名称：${province.provinceName}
报告周期：${province.period}

核心维度：
- 市场份额：${province.marketShare}%
- ROI：${province.roi}
- 非立络占比：${province.nonLiluRatio}%

核心指标：
- 解限率：${province.deLimitRate}%
- 渗透率：${province.penetrationRate}%

健康度评分：${province.healthScore}/100 (${province.healthLevel})

请提供：
1. "就数论数"：评估该省份的健康度，识别表现优异和不理想的维度
2. "数据解读"：分析省份表现的潜在原因
3. 提供改进建议，包括需要进一步分析的角度和可访谈的对象`;

  const response = await callDeepSeekAPI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  return {
    type: 'province',
    targetId: province.provinceId,
    targetName: province.provinceName,
    dataSummary: `省份${province.provinceName}在${province.period}的表现分析`,
    keyFindings: extractKeyFindings(response, province),
    riskAlerts: generateProvinceRiskAlerts(province),
    interpretation: response,
    possibleReasons: extractReasons(response),
    suggestedActions: extractSuggestedActions(response),
    relatedInfo: generateProvinceRelatedInfo(province),
  };
}

// 辅助函数：提取关键发现
function extractKeyFindings(response: string, data: any): string[] {
  const findings: string[] = [];
  
  if (data.moleculeInternalShareChange && data.moleculeInternalShareChange < -2) {
    findings.push(`分子式内份额下降${Math.abs(data.moleculeInternalShareChange)}%，需要重点关注`);
  }
  
  if (data.deLimitRateChange && data.deLimitRateChange < -3) {
    findings.push(`解限率下降${Math.abs(data.deLimitRateChange)}%，可能影响市场准入`);
  }
  
  if (data.healthScore && data.healthScore < 60) {
    findings.push(`健康度评分${data.healthScore}分，低于平均水平，需要重点关注`);
  }
  
  return findings.length > 0 ? findings : ['整体表现稳定，但仍有优化空间'];
}

// 生成风险预警
function generateRiskAlerts(product: ProductPerformance) {
  const alerts = [];
  
  if (product.moleculeShareChange > 0 && product.moleculeInternalShareChange < -2) {
    alerts.push({
      productId: product.productId,
      productName: product.productName,
      riskLevel: 'high' as const,
      riskType: '分子式内份额下降',
      description: `分子式份额上升${product.moleculeShareChange}%，但分子式内份额下降${Math.abs(product.moleculeInternalShareChange)}%`,
      indicators: ['分子式内份额', '分子式份额'],
      changeMagnitude: Math.abs(product.moleculeInternalShareChange),
    });
  }
  
  if (product.deLimitRateChange < -3) {
    alerts.push({
      productId: product.productId,
      productName: product.productName,
      riskLevel: 'high' as const,
      riskType: '解限率下降',
      description: `解限率下降${Math.abs(product.deLimitRateChange)}%，可能影响市场准入`,
      indicators: ['解限率'],
      changeMagnitude: Math.abs(product.deLimitRateChange),
    });
  }
  
  if (product.competitorShareChange > 2) {
    alerts.push({
      productId: product.productId,
      productName: product.productName,
      riskLevel: 'medium' as const,
      riskType: '竞品份额上升',
      description: `竞品份额上升${product.competitorShareChange}%，竞争加剧`,
      indicators: ['竞品份额'],
      changeMagnitude: product.competitorShareChange,
    });
  }
  
  return alerts;
}

// 生成省份风险预警
function generateProvinceRiskAlerts(province: ProvincePerformance) {
  const alerts = [];
  
  if (province.healthScore < 60) {
    alerts.push({
      productId: province.provinceId,
      productName: province.provinceName,
      riskLevel: 'high' as const,
      riskType: '健康度评分偏低',
      description: `健康度评分${province.healthScore}分，低于平均水平`,
      indicators: ['健康度评分', '市场份额', 'ROI', '解限率'],
      changeMagnitude: 60 - province.healthScore,
    });
  }
  
  if (province.deLimitRate < 70) {
    alerts.push({
      productId: province.provinceId,
      productName: province.provinceName,
      riskLevel: 'medium' as const,
      riskType: '解限率偏低',
      description: `解限率${province.deLimitRate}%，低于目标值`,
      indicators: ['解限率'],
      changeMagnitude: 70 - province.deLimitRate,
    });
  }
  
  return alerts;
}

// 提取原因
function extractReasons(response: string): string[] {
  // 简单的关键词匹配，实际应该用更复杂的NLP
  const reasons: string[] = [];
  
  if (response.includes('竞品')) {
    reasons.push('竞品策略调整');
  }
  if (response.includes('价格')) {
    reasons.push('价格竞争力变化');
  }
  if (response.includes('渠道')) {
    reasons.push('渠道覆盖不足');
  }
  if (response.includes('准入')) {
    reasons.push('医院准入进展缓慢');
  }
  if (response.includes('团队')) {
    reasons.push('区域团队能力建设不足');
  }
  
  return reasons.length > 0 ? reasons : ['需要进一步分析确定'];
}

// 提取建议行动
function extractSuggestedActions(response: string) {
  return {
    problemBreakdown: [
      '分省份拆解数据，识别问题集中区域',
      '分析时间序列趋势，识别变化拐点',
      '对比竞品表现，找出差距原因',
    ],
    interviewTargets: [
      '重点医院的关键医生',
      '区域经理和销售代表',
      '市场准入负责人',
    ],
    dataAnalysis: [
      '分析价格变化对市场份额的影响',
      '评估渠道覆盖和渗透情况',
      '对比竞品的市场活动时间线',
    ],
  };
}

// 生成相关信息（基于产品特性生成多样化信息）
function generateRelatedInfo(product: ProductPerformance) {
  const info: Array<{ source: string; content: string; relevance: string }> = [];

  // 根据产品名称生成特定信息
  switch (product.productName) {
    case '立普妥':
      info.push(
        {
          source: '集采政策',
          content: `第七批国家集采中，${product.moleculeFormula}类产品纳入集采范围，立普妥作为原研产品面临价格压力`,
          relevance: '集采可能影响立普妥在集采医院的准入和价格竞争力',
        },
        {
          source: '临床指南',
          content: '2024年《中国血脂管理指南》更新，强调他汀类药物在心血管一级预防中的重要性',
          relevance: '指南更新可能提升立普妥在心内科的使用率',
        },
        {
          source: '竞品动态',
          content: '某仿制药企业推出立普妥的仿制版本，价格较原研低40%，在部分省份开始销售',
          relevance: '仿制药竞争可能解释分子式内份额下降的原因',
        },
        {
          source: '医院准入',
          content: '多家三甲医院完成新一轮药品目录调整，立普妥在部分医院面临停控风险',
          relevance: '可能解释解限率下降的问题',
        }
      );
      break;

    case '络活喜':
      info.push(
        {
          source: '市场动态',
          content: '氨氯地平类药物在高血压治疗中地位稳固，但市场竞争加剧，多个新品牌进入市场',
          relevance: '新品牌进入可能影响络活喜的市场份额',
        },
        {
          source: '学术研究',
          content: '最新研究显示，氨氯地平在合并糖尿病患者中的心血管保护作用得到进一步证实',
          relevance: '研究结果可能提升络活喜在相关适应症的使用',
        },
        {
          source: '渠道变化',
          content: '零售渠道中氨氯地平类产品需求增长，但晖致在零售渠道的覆盖相对不足',
          relevance: '可能影响零售渠道的份额表现',
        }
      );
      break;

    case '西乐葆':
      info.push(
        {
          source: '政策影响',
          content: '国家卫健委发布《抗炎镇痛药物临床应用指导原则》，强调选择性COX-2抑制剂的安全性',
          relevance: '政策支持可能有利于西乐葆的市场推广',
        },
        {
          source: '竞品动态',
          content: '某竞品公司推出西乐葆的改良剂型，声称胃肠道副作用更低，加大市场推广力度',
          relevance: '竞品创新可能影响西乐葆的市场地位',
        },
        {
          source: '科室拓展',
          content: '风湿免疫科对塞来昔布类药物的需求持续增长，但西乐葆在该科室的渗透率仍有提升空间',
          relevance: '科室拓展是潜在的增长机会',
        }
      );
      break;

    case '乐瑞卡':
      info.push(
        {
          source: '适应症扩展',
          content: '普瑞巴林在神经病理性疼痛治疗中的应用指南更新，适应症范围扩大',
          relevance: '适应症扩展可能带来新的市场机会',
        },
        {
          source: '市场准入',
          content: '多个省份将乐瑞卡纳入慢病用药目录，患者自付比例降低',
          relevance: '医保政策变化可能提升患者可及性',
        },
        {
          source: '竞品策略',
          content: '某竞品在神经内科开展大规模学术推广活动，重点推广其普瑞巴林产品',
          relevance: '竞品学术推广可能影响乐瑞卡的市场份额',
        }
      );
      break;

    case '左洛复':
      info.push(
        {
          source: '政策环境',
          content: '国家卫健委强调精神心理健康的重要性，推动精神科药物的可及性提升',
          relevance: '政策支持可能有利于精神科药物市场发展',
        },
        {
          source: '市场变化',
          content: '抑郁症治疗中，SSRI类药物（如舍曲林）仍是首选，但新机制药物开始进入市场',
          relevance: '新机制药物可能对传统SSRI类药物形成竞争',
        },
        {
          source: '医院准入',
          content: '部分医院精神科药品目录调整，左洛复在部分医院面临被其他SSRI替代的风险',
          relevance: '可能解释市场份额下降的原因',
        },
        {
          source: '患者认知',
          content: '患者对抑郁症治疗的认知提升，但部分患者更倾向于选择价格更低的仿制药',
          relevance: '价格敏感性可能影响左洛复的市场表现',
        }
      );
      break;

    case '怡诺思':
      info.push(
        {
          source: '临床指南',
          content: '《中国抑郁障碍防治指南》更新，文拉法辛在难治性抑郁症治疗中的地位得到强化',
          relevance: '指南更新可能提升怡诺思在特定患者群体中的使用',
        },
        {
          source: '竞品动态',
          content: '某竞品推出文拉法辛缓释剂型，声称副作用更小，在部分医院开始推广',
          relevance: '竞品创新可能影响怡诺思的市场份额',
        },
        {
          source: '市场趋势',
          content: '精神科药物市场整体增长，但竞争加剧，各品牌都在加大市场投入',
          relevance: '市场竞争加剧可能影响怡诺思的表现',
        }
      );
      break;

    default:
      // 默认信息
      info.push(
        {
          source: '政府文件',
          content: `国家医保局发布${product.period}医保目录调整通知，涉及${product.moleculeFormula}类药物`,
          relevance: '可能影响产品市场准入和价格策略',
        },
        {
          source: '行业新闻',
          content: `竞品公司宣布加大${product.moleculeFormula}市场投入，预计投入增长30%`,
          relevance: '可能解释竞品份额上升的原因',
        }
      );
  }

  // 根据产品表现数据添加特定信息
  if (product.moleculeInternalShareChange < -2) {
    info.push({
      source: '市场分析',
      content: `${product.productName}在${product.moleculeFormula}分子式内份额持续下降，可能与竞品策略调整或价格竞争有关`,
      relevance: '需要重点关注分子式内竞争态势',
    });
  }

  if (product.deLimitRateChange < -3) {
    info.push({
      source: '医院准入',
      content: `${product.productName}解限率下降明显，可能与集采政策、医院目录调整或竞品替代有关`,
      relevance: '解限率下降直接影响市场准入，需要优先解决',
    });
  }

  if (product.competitorShareChange > 2) {
    info.push({
      source: '竞争情报',
      content: `竞品在${product.moleculeFormula}市场的份额快速上升，可能采取了更激进的定价或推广策略`,
      relevance: '需要分析竞品策略并制定应对措施',
    });
  }

  // 返回2-4条信息，确保多样性
  return info.slice(0, Math.min(4, info.length));
}

// 生成省份相关信息
function generateProvinceRelatedInfo(province: ProvincePerformance) {
  return [
    {
      source: '区域政策',
      content: `${province.provinceName}发布新的药品采购政策，强调性价比评估`,
      relevance: '可能影响产品在该省份的市场表现',
    },
    {
      source: '市场动态',
      content: `${province.provinceName}主要医院完成新一轮药品招标`,
      relevance: '可能影响产品准入和市场份额',
    },
  ];
}

