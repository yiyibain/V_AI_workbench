// 指标规划相关类型定义

// 指标分类
export type IndicatorCategory = 
  | 'result' // 结果指标
  | 'process' // 过程指标
  | 'input' // 投入指标
  | 'efficiency'; // 效率指标

// 指标定义
export interface Indicator {
  id: string;
  name: string; // 指标名称
  category: IndicatorCategory;
  description: string; // 指标描述
  calculationMethod: string; // 计算方法
  dataSource: string; // 数据来源
  dataLogic: string; // 取数逻辑
  unit: string; // 单位
  isCore: boolean; // 是否为核心指标
  tags: string[]; // 标签（用于筛选）
  createdAt: Date;
  updatedAt: Date;
}

// 指标历史数据（多年/多季度，分省）
export interface IndicatorHistoryData {
  indicatorId: string;
  period: string; // 时间周期，如 "2024-Q1"
  province: string; // 省份
  value: number; // 指标值
  target?: number; // 目标值（如果有）
  actual?: number; // 实际值（如果有）
}

// 指标效果分析（基于历史数据）
export interface IndicatorEffectAnalysis {
  indicatorId: string;
  indicatorName: string;
  // 影响力分析
  impactScore: number; // 影响力得分 (0-100)
  impactLevel: 'high' | 'medium' | 'low'; // 影响力等级
  correlationWithResult: number; // 与结果指标的相关性 (-1 to 1)
  // 历史表现
  historicalTrend: {
    period: string;
    avgValue: number;
    variance: number; // 方差
    provinces: {
      province: string;
      value: number;
      change: number;
    }[];
  }[];
  // 影响因素
  influencingFactors: {
    factor: string;
    impact: number; // 影响程度 (0-1)
    evidence: string; // 证据
  }[];
  // 建议
  recommendation: string;
}

// 考核指标建议
export interface IndicatorRecommendation {
  indicatorId: string;
  indicatorName: string;
  category: IndicatorCategory;
  // 优势
  advantages: string[];
  // 劣势
  disadvantages: string[];
  // 适用场景
  applicableScenarios: string[];
  // 优先级评分
  priorityScore: number; // 0-100
  // 与策略的关联
  strategyAlignment: {
    strategyId?: string;
    strategyName?: string;
    alignmentScore: number; // 0-100
    reasoning: string;
  };
}

// 指标基线
export interface IndicatorBaseline {
  indicatorId: string;
  indicatorName: string;
  // 全国基线
  nationalBaseline: {
    current: number; // 当前值
    historicalAvg: number; // 历史平均值
    historicalMedian: number; // 历史中位数
    trend: 'up' | 'down' | 'stable'; // 趋势
  };
  // 省份基线
  provinceBaselines: {
    province: string;
    current: number;
    historicalAvg: number;
    variance: number; // 方差
    trend: 'up' | 'down' | 'stable';
  }[];
  // 环境因素
  environmentalFactors: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }[];
}

// 指标目标值规划
export interface IndicatorTargetPlan {
  indicatorId: string;
  indicatorName: string;
  // 规划目标值
  targetValue: {
    national: number; // 全国目标
    provinces: {
      province: string;
      target: number;
      baseline: number;
      growthRate: number; // 增长率
      reasoning: string; // 规划理由
    }[];
  };
  // 规划依据
  planningBasis: {
    historicalTrend: string; // 历史趋势分析
    provinceVariance: string; // 省份方差分析
    environmentalChange: string; // 环境变化
    salesGrowthImpact?: string; // 销售增速影响（如果提供）
  };
  // 置信度
  confidence: 'high' | 'medium' | 'low';
  // 风险提示
  riskWarnings: string[];
  // 是否需要人工调整
  needsManualAdjustment: boolean;
  adjustmentReason?: string;
}

// 策略关联（用于筛选指标）
export interface Strategy {
  id: string;
  name: string;
  description: string;
  focusAreas: string[]; // 重点领域
  targetOutcomes: string[]; // 目标结果
}

// 指标筛选条件
export interface IndicatorFilter {
  strategyId?: string; // 关联的策略ID
  category?: IndicatorCategory[];
  tags?: string[];
  isCore?: boolean;
  searchText?: string; // 搜索关键词
}

