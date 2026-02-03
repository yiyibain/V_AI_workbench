import { MarketDataPoint, Opportunity, ReasonDimension, StrategyProposal } from '../types/strategy';

// 模拟市场数据（Mekko图表用）- 立普妥数据
// 渠道：影响型医院、非影响型医院、零售、电商
// 科室：心内科、神经内科、内分泌科、肾内科、其他科室
export const mockMarketData: MarketDataPoint[] = [
  // 影响型医院 × 各科室
  { id: '1', dimension1: '影响型医院', dimension2: '心内科', value: 35.2, huiZhiShare: 28.5, competitorShare: 45.8, growthRate: 2.1, province: '北京' },
  { id: '2', dimension1: '影响型医院', dimension2: '神经内科', value: 12.5, huiZhiShare: 8.2, competitorShare: 68.5, growthRate: 0.8, province: '北京' },
  { id: '3', dimension1: '影响型医院', dimension2: '内分泌科', value: 8.5, huiZhiShare: 5.2, competitorShare: 72.3, growthRate: -0.5, province: '北京' },
  { id: '4', dimension1: '影响型医院', dimension2: '肾内科', value: 6.8, huiZhiShare: 4.5, competitorShare: 75.2, growthRate: 0.3, province: '北京' },
  { id: '5', dimension1: '影响型医院', dimension2: '其他科室', value: 15.2, huiZhiShare: 10.5, competitorShare: 65.8, growthRate: 1.2, province: '北京' },
  
  // 非影响型医院 × 各科室
  { id: '6', dimension1: '非影响型医院', dimension2: '心内科', value: 22.3, huiZhiShare: 18.5, competitorShare: 52.3, growthRate: 1.5, province: '北京' },
  { id: '7', dimension1: '非影响型医院', dimension2: '神经内科', value: 8.2, huiZhiShare: 5.8, competitorShare: 72.5, growthRate: 0.5, province: '北京' },
  { id: '8', dimension1: '非影响型医院', dimension2: '内分泌科', value: 5.5, huiZhiShare: 3.2, competitorShare: 78.5, growthRate: -0.8, province: '北京' },
  { id: '9', dimension1: '非影响型医院', dimension2: '肾内科', value: 4.2, huiZhiShare: 2.8, competitorShare: 80.2, growthRate: 0.2, province: '北京' },
  { id: '10', dimension1: '非影响型医院', dimension2: '其他科室', value: 9.8, huiZhiShare: 6.5, competitorShare: 70.5, growthRate: 0.8, province: '北京' },
  
  // 零售 × 各科室（零售通常不分科室，但为了数据结构统一，可以标记为"其他科室"或按主要适应症分类）
  { id: '11', dimension1: '零售', dimension2: '心内科', value: 18.5, huiZhiShare: 12.3, competitorShare: 68.2, growthRate: 1.2, province: '北京' },
  { id: '12', dimension1: '零售', dimension2: '神经内科', value: 5.2, huiZhiShare: 3.5, competitorShare: 75.8, growthRate: 0.5, province: '北京' },
  { id: '13', dimension1: '零售', dimension2: '内分泌科', value: 3.8, huiZhiShare: 2.2, competitorShare: 82.5, growthRate: -0.3, province: '北京' },
  { id: '14', dimension1: '零售', dimension2: '肾内科', value: 2.5, huiZhiShare: 1.5, competitorShare: 85.2, growthRate: 0.1, province: '北京' },
  { id: '15', dimension1: '零售', dimension2: '其他科室', value: 8.2, huiZhiShare: 5.8, competitorShare: 72.5, growthRate: 0.6, province: '北京' },
  
  // 电商 × 各科室
  { id: '16', dimension1: '电商', dimension2: '心内科', value: 12.3, huiZhiShare: 8.5, competitorShare: 72.2, growthRate: 2.5, province: '北京' },
  { id: '17', dimension1: '电商', dimension2: '神经内科', value: 3.5, huiZhiShare: 2.2, competitorShare: 78.5, growthRate: 1.8, province: '北京' },
  { id: '18', dimension1: '电商', dimension2: '内分泌科', value: 2.8, huiZhiShare: 1.5, competitorShare: 82.8, growthRate: 1.2, province: '北京' },
  { id: '19', dimension1: '电商', dimension2: '肾内科', value: 1.8, huiZhiShare: 1.0, competitorShare: 88.5, growthRate: 0.8, province: '北京' },
  { id: '20', dimension1: '电商', dimension2: '其他科室', value: 5.5, huiZhiShare: 3.8, competitorShare: 75.2, growthRate: 1.5, province: '北京' },
  
  // 上海数据（示例）
  { id: '21', dimension1: '影响型医院', dimension2: '心内科', value: 32.5, huiZhiShare: 26.2, competitorShare: 48.5, growthRate: 1.5, province: '上海' },
  { id: '22', dimension1: '影响型医院', dimension2: '神经内科', value: 11.2, huiZhiShare: 7.5, competitorShare: 70.2, growthRate: 0.6, province: '上海' },
  { id: '23', dimension1: '非影响型医院', dimension2: '心内科', value: 20.8, huiZhiShare: 17.2, competitorShare: 55.5, growthRate: 1.2, province: '上海' },
  { id: '24', dimension1: '零售', dimension2: '心内科', value: 16.5, huiZhiShare: 11.2, competitorShare: 70.8, growthRate: 1.0, province: '上海' },
  { id: '25', dimension1: '电商', dimension2: '心内科', value: 10.8, huiZhiShare: 7.5, competitorShare: 75.2, growthRate: 2.2, province: '上海' },
];

// 模拟机会点
export const mockOpportunities: Opportunity[] = [
  {
    id: 'opp1',
    title: '零售渠道阿托伐他汀市场',
    description: '零售渠道中阿托伐他汀市场份额较低，但整体市场增长稳定',
    marketSegment: '零售渠道-阿托伐他汀',
    currentGap: '晖致份额仅12.3%，远低于医院渠道的28.5%',
    potential: 'high',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'opp2',
    title: '内分泌科立普妥渗透',
    description: '内分泌科中立普妥使用率较低，存在提升空间',
    marketSegment: '内分泌科-立普妥',
    currentGap: '晖致份额仅8.2%，低于心血管科的25.2%',
    potential: 'medium',
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
  },
  {
    id: 'opp3',
    title: '中端价格带络活喜扩张',
    description: '中端价格带络活喜表现良好，可进一步扩大优势',
    marketSegment: '中端价格带-络活喜',
    currentGap: '晖致份额25.5%，仍有提升空间',
    potential: 'medium',
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-17'),
  },
];

// 预置原因维度
export const defaultReasonDimensions: ReasonDimension[] = [
  {
    id: 'rd5',
    name: '环境因素',
    category: 'other',
    description: '医院准入、集采影响、政策变化等',
  },
  {
    id: 'rd1',
    name: '产品因素',
    category: 'product',
    description: '产品特性、适应症、价格竞争力等',
  },
  {
    id: 'rd2',
    name: '商业推广因素',
    category: 'businessModel',
    description: '渠道策略、定价策略、推广模式等',
  },
  {
    id: 'rd3',
    name: '资源分配因素',
    category: 'resource',
    description: '人力投入、市场投入、资源配置等',
  },
];

// 模拟策略建议
export const mockStrategyProposals: StrategyProposal[] = [
  {
    id: 'sp1',
    title: '提升零售渠道阿托伐他汀份额',
    description: '通过加强零售渠道合作、优化价格策略，提升零售渠道阿托伐他汀市场份额',
    opportunityId: 'opp1',
    priority: 1,
    status: 'draft',
    actions: [
      '与重点零售连锁建立战略合作关系',
      '优化零售渠道价格体系，提升竞争力',
      '加强零售渠道学术推广和患者教育',
    ],
    expectedOutcome: '零售渠道份额从12.3%提升至18%',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
    isFromAI: true,
  },
  {
    id: 'sp2',
    title: '拓展内分泌科立普妥应用',
    description: '通过学术推广和医生教育，提升内分泌科对立普妥的认知和使用',
    opportunityId: 'opp2',
    priority: 2,
    status: 'draft',
    actions: [
      '开展内分泌科专项学术活动',
      '建立内分泌科KOL关系网络',
      '提供内分泌科专用推广材料',
    ],
    expectedOutcome: '内分泌科份额从8.2%提升至15%',
    createdAt: new Date('2024-01-21'),
    updatedAt: new Date('2024-01-21'),
    isFromAI: true,
  },
];

// 维度选项
export const dimensionOptions = {
  channel: ['影响型医院', '非影响型医院', '零售', '电商'],
  department: ['心内科', '神经内科', '内分泌科', '肾内科', '其他科室'],
  brand: ['立普妥', '络活喜', '西乐葆', '乐瑞卡', '左洛复', '怡诺思'],
  province: ['北京', '上海', '广东', '浙江', '江苏', '山东', '河南', '湖北', '四川', '重庆'],
};

