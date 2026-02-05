// 策略制定相关类型定义

// 市场维度
export type MarketDimension = 'class' | 'molecule' | 'department' | 'priceBand' | 'brand' | 'channel' | 'province';

// 维度配置：定义哪些维度可以作为横纵轴
export interface DimensionConfig {
  key: string; // 维度标识（如 'dimension1', 'dimension2', 'dimension3' 等）
  label: string; // 维度显示名称
  type: MarketDimension; // 维度类型
  isAvailableForAxis: boolean; // 是否可作为横纵轴
}

// 市场数据点
export interface MarketDataPoint {
  id: string;
  dimension1?: string; // 横轴维度值
  dimension2?: string; // 纵轴维度值
  [key: string]: any; // 支持动态维度字段（dimension3, dimension4, ...）
  value: number; // 市场份额或销售额
  huiZhiShare?: number; // 晖致份额
  competitorShare?: number; // 竞品份额
  growthRate?: number; // 增长率
  province?: string; // 省份
}

// Mekko图表配置
export interface MekkoConfig {
  xAxis: MarketDimension;
  yAxis: MarketDimension;
  metric: 'share' | 'sales' | 'growth'; // 指标类型
  filter?: {
    province?: string[];
    product?: string[];
    [key: string]: any;
  };
}

// 机会点
export interface Opportunity {
  id: string;
  title: string;
  description: string;
  marketSegment: string; // 细分市场
  currentGap: string; // 当前缺口
  potential: 'high' | 'medium' | 'low'; // 潜力
  priority?: number; // 优先级（用于排序）
  createdAt: Date;
  updatedAt: Date;
}

// 原因维度
export interface ReasonDimension {
  id: string;
  name: string;
  category: 'product' | 'businessModel' | 'resource' | 'organization' | 'other';
  description?: string;
  isUserAdded?: boolean; // 是否用户添加
}

// 机会分析报告
export interface OpportunityAnalysis {
  opportunityId: string;
  reasons: {
    dimension: ReasonDimension;
    analysis: string;
    evidence: string[];
  }[];
  strategyDirections: StrategyDirection[];
  createdAt: Date;
}

// 策略方向
export interface StrategyDirection {
  id: string;
  title: string;
  description: string;
  actions: string[]; // 具体实施建议
  basedOnLogic: 'deLimit' | 'penetration' | 'expansion'; // 基于解限/渗透/做广
}

// 策略建议
export interface StrategyProposal {
  id: string;
  title: string;
  description: string;
  opportunityId?: string; // 关联的机会点
  priority: number; // 优先级（用于排序）
  status: 'draft' | 'approved' | 'inProgress' | 'completed';
  actions: string[]; // 具体行动
  expectedOutcome?: string; // 预期效果
  createdAt: Date;
  updatedAt: Date;
  isFromAI: boolean; // 是否来自AI生成
}

// 策略讨论
export interface StrategyDiscussion {
  id: string;
  strategyId: string;
  messages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }[];
  summary?: string; // AI总结
}

// 策略分析流程相关类型
export interface ProblemFact {
  id: string;
  content: string; // 事实描述，包含定量信息
  dataSource?: string; // 数据来源
  relevance: string; // 与问题的相关性
}

export interface ProblemCauseAnalysis {
  problemId: string;
  problemTitle: string;
  coreFacts: ProblemFact[]; // 1-3条关键事实依据
  causeStatement: string; // 原因总结陈述
  version: number; // 分析版本号
  updatedAt: Date;
}

export interface StrategySolution {
  id: string;
  problemId: string;
  title: string; // 策略标题
  category: 'channel' | 'product' | 'resource' | 'promotion'; // 策略类别
  description: string; // 策略描述
  specificActions: string[]; // 具体可执行动作
  strategicLevel: string; // 策略级表达
  expectedOutcome?: string; // 预期效果
  basedOnFacts: string[]; // 基于的事实依据ID
}

export interface UserFeedback {
  id: string;
  problemId: string;
  feedbackType: 'A' | 'B' | 'C' | 'custom'; // A: 基本符合, B: 部分不合理, C: 差距较大, custom: 自定义
  content: string; // 反馈内容
  clarification?: string; // 澄清的问题
  suggestedCorrection?: string; // 建议的正确结论
  timestamp: Date;
}

export interface StrategyAnalysisResult {
  problemId: string;
  problemTitle: string;
  step1: ProblemCauseAnalysis; // 第一步：原因梳理
  step2: StrategySolution[]; // 第二步：解决方案（2-3条）
  step3: {
    userFeedback?: UserFeedback;
    needsClarification: boolean;
    clarificationQuestions?: string[];
  }; // 第三步：用户交互校准
  step4?: {
    revisedAnalysis?: ProblemCauseAnalysis;
    revisedStrategies?: StrategySolution[];
    iterationCount: number;
  }; // 第四步：基于用户输入的修改
  step5?: {
    finalSummary: string;
    allStrategies: StrategySolution[];
    strategyGoals: Array<{
      strategyId: string;
      goal: string;
      implementation: string;
    }>;
  }; // 第五步：最终总结
  status: 'analyzing' | 'waiting_feedback' | 'revising' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}
