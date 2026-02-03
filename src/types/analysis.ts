// 分析相关的扩展类型
import { ProvincePerformance } from './index';

// 医院类型
export type HospitalType = 'core' | 'highPotential' | 'regular';

// 医院表现数据
export interface HospitalPerformance {
  hospitalId: string;
  hospitalName: string;
  province: string;
  type: HospitalType;
  // 核心指标
  salesVolume: number; // 销量
  salesVolumeChange: number; // 销量变化
  marketShare: number; // 市场份额
  marketShareChange: number; // 市场份额变化
  deLimitStatus: boolean; // 是否解限
  penetrationRate: number; // 渗透率
  penetrationRateChange: number; // 渗透率变化
  period: string;
}

// 省份详细表现（包含医院数据）
export interface ProvinceDetailPerformance extends ProvincePerformance {
  hospitals: HospitalPerformance[];
  coreHospitalCount: number;
  highPotentialHospitalCount: number;
  coreHospitalAvgPenetration: number;
  highPotentialHospitalAvgPenetration: number;
  deLimitRateChange?: number; // 解限率变化（可选，用于计算）
  marketShareChange?: number; // 市场份额变化（可选，用于计算）
}

// 异常值发现
export interface AnomalyFinding {
  id: string;
  type: 'province' | 'hospital' | 'indicator';
  category: 'national' | 'province'; // 全国共性或部分省份预警
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  dataPoint: {
    label: string;
    value: string | number;
    change?: number;
    unit?: string;
  };
  location: {
    province?: string;
    hospital?: string;
    hospitalType?: HospitalType;
  };
  relatedData: {
    type: string;
    source: string;
    value: string | number;
  }[];
  // 合并原因深挖的内容
  possibleCauses?: {
    cause: string;
    evidence: {
      type: 'data' | 'external' | 'internal';
      source: string;
      description: string;
      dataPoint?: string;
    }[];
    confidence: 'high' | 'medium' | 'low';
  }[];
  // 合并风险点提炼的内容
  riskImplications?: {
    riskLevel: 'high' | 'medium' | 'low';
    riskDescription: string;
    suggestedActions: {
      shortTerm: string[];
      longTerm: string[];
    };
  };
}

// 原因深挖
export interface RootCauseAnalysis {
  id: string;
  anomalyId: string;
  cause: string;
  evidence: {
    type: 'data' | 'external' | 'internal';
    source: string;
    description: string;
    dataPoint?: string;
  }[];
  confidence: 'high' | 'medium' | 'low';
}

// 风险点
export interface RiskPoint {
  id: string;
  title: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  relatedAnomalies: string[]; // 关联的异常值ID
  possibleCauses: {
    cause: string;
    evidence: string[];
    confidence: 'high' | 'medium' | 'low';
  }[];
  solutions: {
    shortTerm: string[];
    longTerm: string[];
  };
}

// 宏观建议
export interface MacroRecommendation {
  id: string;
  category: 'strategy' | 'operation' | 'resource' | 'organization';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  relatedRiskPoints: string[];
}

