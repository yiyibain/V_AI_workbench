// 奖金设置相关类型定义

// 奖金方案设计建议
export interface BonusDesignSuggestion {
  id: string;
  title: string;
  description: string;
  principles: string[]; // 设计原则
  recommendations: {
    category: string; // 如"存量 vs. 增量比例"
    suggestion: string;
    rationale: string; // 理由
  }[];
  fairnessConsiderations: string[]; // 公平性考虑
  scientificBasis: string[]; // 科学依据
  createdAt: Date;
}

// 品牌指标
export interface BrandIndicator {
  id: string;
  brandName: string;
  category: 'CV' | 'Non-CV'; // 心血管 vs 非心血管
  indicatorType: 'result' | 'process'; // 结果指标 vs 过程指标
  indicatorName: string; // 指标名称，如"解限率"、"渗透率"、"销量增长率"
  currentValue?: number; // 当前值
  targetValue?: number; // 目标值
  unit?: string; // 单位，如"%", "万元"
  hospitalType?: 'core' | 'target' | 'service'; // 医院类型：核心影响型、目标影响型、服务型终端
  subCategory?: string; // 子分类，如"份额/片数增长"、"ROI"等
}

// 奖金包配置
export interface BonusPackage {
  brandId: string;
  brandName: string;
  totalRatio: number; // 总奖金包占比（%）
  resultIndicators: {
    indicatorId: string;
    indicatorName: string;
    ratio: number; // 该指标在总奖金包中的占比
    subCategory: string; // 子分类，如"份额/片数增长"、"ROI"
  }[];
  processIndicators: {
    indicatorId: string;
    indicatorName: string;
    ratio: number; // 该指标在总奖金包中的占比
    hospitalType?: 'core' | 'target' | 'service';
  }[];
}

// 可用的指标池（用于拖拽添加）
export interface AvailableIndicator {
  id: string;
  name: string;
  type: 'result' | 'process';
  category: string; // 分类，如"份额/片数增长"、"渗透率"等
  hospitalType?: 'core' | 'target' | 'service';
  applicableBrands?: string[]; // 适用的品牌，如果为空则适用于所有品牌
}

// 奖金比例建议
export interface BonusRatioSuggestion {
  id: string;
  brandId: string;
  brandName: string;
  indicatorId: string;
  indicatorName: string;
  suggestedRatio: number; // 建议的奖金系数（0-1）
  rationale: string; // 建议理由
  confidence: 'high' | 'medium' | 'low'; // 置信度
  factors: {
    factor: string; // 考虑因素
    impact: 'positive' | 'negative' | 'neutral'; // 影响方向
    weight: number; // 权重
  }[];
}

// 公司策略
export interface CompanyStrategy {
  id: string;
  strategyType: 'brand' | 'province' | 'growth' | 'other'; // 策略类型
  description: string; // 策略描述，如"重点发展Non-CV"、"某省份重点推进解限"、"全国通盘计划增长10%"
  priority: number; // 优先级
  effectivePeriod: string; // 生效周期，如"2024-Q1"
  createdAt: Date;
}

// 奖金方案
export interface BonusScheme {
  id: string;
  name: string;
  description: string;
  bonusPackages: BonusPackage[]; // 各品牌的奖金包配置
  totalBudget?: number; // 总预算
  status: 'draft' | 'review' | 'approved' | 'active';
  createdAt: Date;
  updatedAt: Date;
}

// 奖金方案设计对话消息
export interface BonusDesignMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: BonusDesignSuggestion; // 如果消息包含建议，关联建议对象
}

