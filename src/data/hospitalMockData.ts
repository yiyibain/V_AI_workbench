import { HospitalPerformance, ProvinceDetailPerformance } from '../types/analysis';
import { ProvincePerformance } from '../types';

// 生成医院mock数据
export function generateHospitalData(
  provinceId: string,
  provinceName: string,
  basePerformance: ProvincePerformance
): HospitalPerformance[] {
  const hospitals: HospitalPerformance[] = [];
  const hospitalNames = {
    core: ['北京协和医院', '北京医院', '中日友好医院', '北京大学第一医院', '首都医科大学附属北京天坛医院'],
    highPotential: ['北京朝阳医院', '北京友谊医院', '北京宣武医院', '北京安贞医院', '北京同仁医院'],
    regular: ['北京世纪坛医院', '北京地坛医院', '北京佑安医院', '北京胸科医院', '北京儿童医院'],
  };

  // 根据省份调整医院名称
  const getHospitalNames = (type: 'core' | 'highPotential' | 'regular') => {
    if (provinceName === '北京') return hospitalNames[type];
    if (provinceName === '上海') {
      return type === 'core'
        ? ['上海瑞金医院', '上海华山医院', '上海中山医院', '上海仁济医院', '上海第一人民医院']
        : type === 'highPotential'
        ? ['上海第九人民医院', '上海第六人民医院', '上海长海医院', '上海新华医院', '上海东方医院']
        : ['上海第十人民医院', '上海同济医院', '上海肺科医院', '上海肿瘤医院', '上海儿童医院'];
    }
    // 其他省份使用通用名称
    return hospitalNames[type].map((name) => name.replace('北京', provinceName));
  };

  // 核心医院
  const coreNames = getHospitalNames('core');
  coreNames.forEach((name, index) => {
    const basePenetration = basePerformance.penetrationRate;
    const baseDeLimit = basePerformance.deLimitRate;
    
    hospitals.push({
      hospitalId: `${provinceId}-core-${index}`,
      hospitalName: name,
      province: provinceName,
      type: 'core',
      salesVolume: 500 + Math.random() * 300,
      salesVolumeChange: (Math.random() - 0.5) * 20, // -10% 到 +10%
      marketShare: basePerformance.marketShare * (0.8 + Math.random() * 0.4),
      marketShareChange: (Math.random() - 0.6) * 10, // 更可能下降
      deLimitStatus: baseDeLimit > 70,
      penetrationRate: basePenetration * (0.85 + Math.random() * 0.3),
      penetrationRateChange: (Math.random() - 0.5) * 15,
      period: basePerformance.period,
    });
  });

  // 高潜医院
  const highPotentialNames = getHospitalNames('highPotential');
  highPotentialNames.forEach((name, index) => {
    const basePenetration = basePerformance.penetrationRate;
    const baseDeLimit = basePerformance.deLimitRate;
    
    hospitals.push({
      hospitalId: `${provinceId}-high-${index}`,
      hospitalName: name,
      province: provinceName,
      type: 'highPotential',
      salesVolume: 200 + Math.random() * 200,
      salesVolumeChange: (Math.random() - 0.4) * 25, // 更可能增长
      marketShare: basePerformance.marketShare * (0.6 + Math.random() * 0.4),
      marketShareChange: (Math.random() - 0.3) * 12,
      deLimitStatus: baseDeLimit > 60,
      penetrationRate: basePenetration * (0.5 + Math.random() * 0.4),
      penetrationRateChange: (Math.random() - 0.2) * 20,
      period: basePerformance.period,
    });
  });

  // 普通医院（少量）
  const regularNames = getHospitalNames('regular').slice(0, 3);
  regularNames.forEach((name, index) => {
    const basePenetration = basePerformance.penetrationRate;
    const baseDeLimit = basePerformance.deLimitRate;
    
    hospitals.push({
      hospitalId: `${provinceId}-reg-${index}`,
      hospitalName: name,
      province: provinceName,
      type: 'regular',
      salesVolume: 100 + Math.random() * 150,
      salesVolumeChange: (Math.random() - 0.5) * 15,
      marketShare: basePerformance.marketShare * (0.3 + Math.random() * 0.3),
      marketShareChange: (Math.random() - 0.5) * 10,
      deLimitStatus: baseDeLimit > 50,
      penetrationRate: basePenetration * (0.3 + Math.random() * 0.4),
      penetrationRateChange: (Math.random() - 0.5) * 10,
      period: basePerformance.period,
    });
  });

  return hospitals;
}

// 生成省份详细数据
export function generateProvinceDetailData(
  province: ProvincePerformance
): ProvinceDetailPerformance {
  const hospitals = generateHospitalData(
    province.provinceId,
    province.provinceName,
    province
  );

  const coreHospitals = hospitals.filter((h) => h.type === 'core');
  const highPotentialHospitals = hospitals.filter((h) => h.type === 'highPotential');

  // 计算解限率变化（模拟数据）
  const deLimitRateChange = (Math.random() - 0.6) * 10; // 更可能下降

  return {
    ...province,
    hospitals,
    coreHospitalCount: coreHospitals.length,
    highPotentialHospitalCount: highPotentialHospitals.length,
    coreHospitalAvgPenetration:
      coreHospitals.length > 0
        ? coreHospitals.reduce((sum, h) => sum + h.penetrationRate, 0) / coreHospitals.length
        : 0,
    highPotentialHospitalAvgPenetration:
      highPotentialHospitals.length > 0
        ? highPotentialHospitals.reduce((sum, h) => sum + h.penetrationRate, 0) /
          highPotentialHospitals.length
        : 0,
    deLimitRateChange,
  };
}

