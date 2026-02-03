// 策略制定相关类型定义

// 市场维度
export type MarketDimension = 'class' | 'molecule' | 'department' | 'priceBand' | 'brand' | 'channel' | 'province';

// 市场数据点
export interface MarketDataPoint {
  id: string;
  dimension1: string; // 横轴维度值
  dimension2: string; // 纵轴维度值
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



