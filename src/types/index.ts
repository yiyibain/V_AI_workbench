// 产品相关类型
export interface Product {
  id: string;
  name: string;
  moleculeFormula: string; // 分子式
  category: string;
}

// 产品表现数据
export interface ProductPerformance {
  productId: string;
  productName: string;
  moleculeFormula: string;
  // 外部数据
  moleculeShare: number; // 分子式份额 (%)
  moleculeShareChange: number; // 分子式份额变化 (%)
  moleculeInternalShare: number; // 分子式内份额 (%)
  moleculeInternalShareChange: number; // 分子式内份额变化 (%)
  competitorShare: number; // 竞品份额 (%)
  competitorShareChange: number; // 竞品份额变化 (%)
  // 内部数据
  deLimitRate: number; // 解限率 (%)
  deLimitRateChange: number; // 解限率变化 (%)
  // 时间维度
  period: string; // 季度，如 "2024-Q1"
  previousPeriod: string; // 上一季度
}

// 风险预警
export interface RiskAlert {
  productId: string;
  productName: string;
  riskLevel: 'high' | 'medium' | 'low';
  riskType: string; // 风险类型
  description: string;
  indicators: string[]; // 相关指标
  changeMagnitude: number; // 变化幅度
}

// 省份数据
export interface Province {
  id: string;
  name: string;
  region: string; // 区域
}

// 省份表现数据
export interface ProvincePerformance {
  provinceId: string;
  provinceName: string;
  // 核心维度
  marketShare: number; // 市场份额 (%)
  roi: number; // ROI
  nonLiluRatio: number; // 非立络占比 (%)
  // 核心指标
  deLimitRate: number; // 解限率 (%)
  penetrationRate: number; // 渗透率 (%)
  // 健康度评分
  healthScore: number; // 0-100
  healthLevel: 'excellent' | 'good' | 'average' | 'poor';
  // 时间维度
  period: string;
}

// 引用信息
export interface Citation {
  id: string;
  type: 'internal' | 'external' | 'data';
  source: string;
  content: string;
  relevance: string;
  dataPoint?: string; // 关联的数据点，如"分子式内份额下降2.5%"
}

// 报告段落与原因的关联
export interface ReasonConnection {
  reasonId: string;
  reasonText: string;
  relatedSegments: {
    segmentId: string;
    segmentText: string;
    explanation: string; // 解释为什么这段报告内容得出这个原因
  }[];
}

// AI分析结果
export interface AIAnalysis {
  type: 'product' | 'province';
  targetId: string;
  targetName: string;
  // 就数论数
  dataSummary: string;
  keyFindings: string[];
  riskAlerts: RiskAlert[];
  // 数据解读
  interpretation: string; // Markdown格式
  interpretationSegments?: {
    id: string;
    text: string;
    citations?: string[]; // 引用ID数组
  }[];
  possibleReasons: string[];
  reasonConnections?: ReasonConnection[]; // 报告内容与原因的关联
  suggestedActions: {
    problemBreakdown: string[];
    interviewTargets: string[];
    dataAnalysis: string[];
  };
  relatedInfo: {
    source: string;
    content: string;
    relevance: string;
  }[];
  citations?: Citation[]; // 所有引用信息
}

// 健康度评分维度
export interface HealthScoreDimension {
  name: string;
  weight: number;
  score: number;
  status: 'excellent' | 'good' | 'average' | 'poor';
}
