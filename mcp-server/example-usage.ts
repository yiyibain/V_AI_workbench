/**
 * MCP 客户端使用示例
 * 这个文件展示了如何在前端代码中使用 MCP 客户端
 */

import { WebMCPClient } from '../src/services/mcpClient';
import { useMCPClient } from '../src/hooks/useMCPClient';

// 示例 1: 直接使用 WebMCPClient
async function exampleDirectUsage() {
  const client = new WebMCPClient('http://localhost:3001');

  // 检查服务器健康状态
  const isHealthy = await client.healthCheck();
  console.log('服务器状态:', isHealthy ? '正常' : '异常');

  // 分析剪刀差
  const gapsResult = await client.analyzeScissorsGaps({
    marketData: [], // 实际使用时需要传入真实数据
    mekkoData: [],
    selectedBrand: '立普妥',
    selectedXAxisKey: 'province',
    selectedYAxisKey: 'brand',
    maxItems: 5,
  });

  console.log('剪刀差分析结果:', gapsResult);

  // 分析问题原因
  const causesResult = await client.analyzeProblemCauses({
    scissorsGaps: gapsResult.scissorsGaps,
    selectedBrand: '立普妥',
    maxProblems: 10,
  });

  console.log('原因分析结果:', causesResult);
}

// 示例 2: 在 React 组件中使用 Hook
function ExampleReactComponent() {
  const { analyzeProblem, loading, error, result } = useMCPClient({
    baseUrl: 'http://localhost:3001',
  });

  const handleAnalyze = async () => {
    try {
      const analysisResult = await analyzeProblem({
        marketData: [], // 实际使用时需要传入真实数据
        mekkoData: [],
        selectedBrand: '立普妥',
        selectedXAxisKey: 'province',
        selectedYAxisKey: 'brand',
        maxItems: 5,
        maxProblems: 10,
      });

      console.log('完整分析结果:', analysisResult);
    } catch (err) {
      console.error('分析失败:', err);
    }
  };

  return (
    <div>
      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? '分析中...' : '开始分析'}
      </button>
      {error && <div>错误: {error}</div>}
      {result && (
        <div>
          <h3>剪刀差 ({result.gaps.length} 条)</h3>
          {result.gaps.map((gap, i) => (
            <div key={i}>
              <h4>{gap.title}</h4>
              <p>{gap.phenomenon}</p>
            </div>
          ))}
          <h3>原因分析 ({result.causes.length} 条)</h3>
          {result.causes.map((cause, i) => (
            <div key={i}>
              <h4>{cause.problem}</h4>
              <p>{cause.statement}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 示例 3: 分步分析
function ExampleStepByStep() {
  const { analyzeGaps, analyzeCauses, loading } = useMCPClient();

  const handleStepByStep = async () => {
    // 第一步：分析剪刀差
    const gaps = await analyzeGaps({
      marketData: [],
      mekkoData: [],
      selectedBrand: '立普妥',
    });

    console.log('第一步完成，发现', gaps.length, '个剪刀差');

    // 用户确认后，进行第二步
    // 第二步：分析原因
    const causes = await analyzeCauses({
      scissorsGaps: gaps,
      selectedBrand: '立普妥',
    });

    console.log('第二步完成，分析了', causes.length, '个问题的原因');
  };

  return (
    <button onClick={handleStepByStep} disabled={loading}>
      分步分析
    </button>
  );
}

// 示例 4: 查询市场数据
async function exampleQueryData() {
  const client = new WebMCPClient();

  // 查询剂量数据
  const dosageResult = await client.queryMarketData({
    functionName: 'queryByDosage',
    args: {
      dosage: '10mg',
      brand: '立普妥',
    },
    selectedBrand: '立普妥',
  });

  console.log('剂量查询结果:', dosageResult);

  // 查询分销率
  const wdResult = await client.queryMarketData({
    functionName: 'queryWD',
    args: {
      brand: '立普妥',
      dosage: '20mg',
    },
    selectedBrand: '立普妥',
  });

  console.log('分销率查询结果:', wdResult);
}

export {
  exampleDirectUsage,
  ExampleReactComponent,
  ExampleStepByStep,
  exampleQueryData,
};
