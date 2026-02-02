import BonusRatioSuggestion from '../components/bonus/BonusRatioSuggestion';

export default function BonusSetting() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">奖金设置</h1>
          <p className="text-gray-600">
            结合全国整体策略制定，AI模拟不同奖金权重对行为与销量的影响，优化全国品牌间激励分配方案。
            通过自然语言交互，输入策略性指令（如"发展Non-CV产品，结果指标给多一点"），系统将自动调整奖金包比例并保持总奖金包为100%。
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <BonusRatioSuggestion />
      </div>
    </div>
  );
}

