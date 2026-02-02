import axios from 'axios';
import { AIAnalysis } from '../types';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || '';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// 系统提示词 - 晖致业务背景
const SYSTEM_PROMPT = `你是晖致公司的AI业务顾问，专门为CEO和决策层提供策略规划支持。

## 公司背景
晖致是一家中国领先的医疗健康公司，覆盖血脂、血压、男科等多个疾病领域。公司的整体架构按照内环、中环、外环的"三环"运营体系组织：
- **内环**：负责制定各类战略决策
- **中环**：负责沉淀运营数据及建设数字化系统
- **外环**：负责产品销售

全渠道团队为外环的重要组成部分，以省为单位，负责面向医院、零售的销售，主要包括：
立普妥、络活喜、西乐葆、乐瑞卡、左洛复、怡诺思、可多华、爱宁达、利加隆、维固力十个产品

## 业务特点
1. **渠道侧重**：以医院（尤其是影响型医院）为核心工作重点，利用影响型医院对患者、医生的辐射影响作用，带动周边服务型终端、零售终端的销售

2. **管理方针**：
   - 排除销量为王的概念
   - 追求以患者为中心、以长期价值为导向的增长
   - 提升对Y=f(x)驱动因素的全面掌握
   - 考核方案：以结果指标（市场份额）为基石，纳入核心影响型医院内渗透、解限、稳定分销、列名等多项过程考核指标

3. **具体动作逻辑**：
   - **解限**：解限团队需要先对医院进行解限（集采背景下，医院允许开具晖致产品，不停控）
   - **渗透**：此后通过学术推广、医生关系等手段，做深医院内渗透
   - **做广**：对于未解限的医院，仍要持续保持稳定分销/列名（需保证一定门槛）

## 你的职责
1. **分析改进**：帮助用户改进预置的分析报告，提供更深入的业务洞察
2. **业务咨询**：回答关于晖致业务、产品、策略的问题
3. **策略建议**：基于"以患者为中心"和"解限-渗透-做广"的业务逻辑提供建议
4. **数据解读**：帮助理解数据背后的业务含义

## 回答风格
- 专业、深入、基于业务逻辑
- 始终围绕"以患者为中心"的核心价值观
- 结合"三环"运营体系和"解限-渗透-做广"的业务逻辑
- 提供可操作的建议和洞察`;

// 调用DeepSeek API进行对话
export async function sendChatMessage(
  messages: ChatMessage[],
  context?: {
    currentPage?: string;
    analysisData?: AIAnalysis;
  }
): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    // 如果没有API Key，返回模拟响应
    return generateMockResponse(messages[messages.length - 1]?.content || '');
  }

  try {
    // 构建消息列表，包含系统提示词和上下文
    const apiMessages: any[] = [
      {
        role: 'system',
        content: SYSTEM_PROMPT + (context ? `\n\n当前上下文：用户正在查看${context.currentPage || '未知页面'}。` : ''),
      },
    ];

    // 如果有分析数据，添加到上下文中
    if (context?.analysisData) {
      apiMessages.push({
        role: 'system',
        content: `当前分析数据：${context.analysisData.targetName}的${context.analysisData.type === 'product' ? '产品' : '省份'}分析报告。关键发现：${context.analysisData.keyFindings.join('; ')}`,
      });
    }

    // 添加用户消息历史
    messages.forEach((msg) => {
      if (msg.role !== 'system') {
        apiMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    });

    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: apiMessages,
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

    return response.data.choices[0]?.message?.content || '抱歉，我无法生成回复。';
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return generateMockResponse(messages[messages.length - 1]?.content || '');
  }
}

// 生成模拟响应（当没有API Key时）
function generateMockResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('解限') || lowerMessage.includes('渗透') || lowerMessage.includes('做广')) {
    return `基于晖致的"解限-渗透-做广"业务逻辑，我建议：

**解限阶段**：
- 重点关注影响型医院的集采准入情况
- 分析解限率变化的原因，可能是政策调整或竞品策略影响
- 建议访谈解限团队，了解具体障碍

**渗透阶段**：
- 评估学术推广活动的效果
- 分析医生关系维护情况
- 关注核心影响型医院内的处方转化率

**做广阶段**：
- 对于未解限医院，确保稳定分销和列名
- 保持与这些医院的长期关系，为未来解限做准备

需要我针对具体产品或省份提供更详细的分析吗？`;
  }

  if (lowerMessage.includes('产品') || lowerMessage.includes('市场份额')) {
    return `从产品表现来看，建议关注以下几个方面：

1. **分子式份额 vs 分子式内份额**：如果分子式份额上升但分子式内份额下降，说明市场整体增长但我们的产品竞争力在下降，需要分析竞品策略。

2. **解限率变化**：解限率下降可能影响市场准入，需要：
   - 分析哪些省份/医院解限率下降明显
   - 了解政策变化或集采影响
   - 制定针对性的解限策略

3. **以患者为中心**：评估产品是否真正解决了患者需求，是否符合长期价值导向。

需要我帮你深入分析某个具体产品吗？`;
  }

  if (lowerMessage.includes('省份') || lowerMessage.includes('区域')) {
    return `省份表现分析需要综合考虑多个维度：

1. **健康度评分**：综合市场份额、ROI、解限率、渗透率等指标
   - 优秀省份：总结成功经验，推广到其他省份
   - 较差省份：深入分析原因，制定改进计划

2. **核心维度分析**：
   - 市场份额：反映整体竞争力
   - ROI：评估投入产出效率
   - 非立络占比：反映产品结构健康度
   - 解限率：影响市场准入
   - 渗透率：反映市场深度

3. **改进建议**：
   - 访谈区域经理，了解具体障碍
   - 分析医院准入数据
   - 评估是否需要调整市场投入策略

需要我针对某个具体省份提供分析吗？`;
  }

  if (lowerMessage.includes('策略') || lowerMessage.includes('建议')) {
    return `基于晖致的"以患者为中心"和"解限-渗透-做广"业务逻辑，策略建议如下：

**短期策略**：
1. 优先解决解限率下降的问题，确保市场准入
2. 加强影响型医院的学术推广和医生关系维护
3. 对于表现较差的省份，制定针对性的改进计划

**中期策略**：
1. 优化产品组合，提升非立络占比
2. 建立更完善的Y=f(x)驱动因素监控体系
3. 加强中环的数据沉淀和数字化系统建设

**长期策略**：
1. 持续以患者为中心，追求长期价值
2. 完善"三环"运营体系，提升整体效率
3. 在目标疾病领域实现患者份额最大化

需要我针对具体问题提供更详细的策略建议吗？`;
  }

  return `我是晖致公司的AI业务顾问，可以帮助你：

1. **改进分析报告**：基于晖致的业务逻辑，提供更深入的洞察
2. **业务咨询**：回答关于产品、策略、运营的问题
3. **数据分析**：帮助理解数据背后的业务含义
4. **策略建议**：基于"解限-渗透-做广"逻辑提供建议

你可以问我：
- 如何改进当前的分析报告？
- 某个产品的表现如何解读？
- 某个省份的健康度如何提升？
- 基于业务逻辑的策略建议？

请告诉我你需要什么帮助？`;
}


