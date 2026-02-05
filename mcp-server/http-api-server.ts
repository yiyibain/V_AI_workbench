/**
 * HTTP API 服务器 - 提供 RESTful 接口包装 MCP 服务器功能
 * 这个服务器可以作为独立服务运行，前端通过 HTTP 调用
 */

import express from 'express';
import cors from 'cors';
import {
  analyzeScissorsGaps,
  analyzeProblemsAndStrategies,
  executeDataQuery
} from '../src/services/problemAnalysisService.js';
import { MarketDataPoint, DimensionConfig } from '../src/types/strategy.js';

const app = express();
const PORT = process.env.MCP_HTTP_PORT ? parseInt(process.env.MCP_HTTP_PORT) : 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 支持大数据传输

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'problem-analysis-api' });
});

// 获取可用工具列表
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'analyze_scissors_gaps',
        description: '分析市场数据中的剪刀差现象，识别品牌表现中的关键问题',
      },
      {
        name: 'analyze_problem_causes',
        description: '深入分析剪刀差背后的原因，包括四个维度的分析',
      },
      {
        name: 'query_market_data',
        description: '查询市场数据，支持按剂量、品牌、分销率等维度筛选',
      }
    ]
  });
});

// 分析剪刀差
app.post('/tools/analyze_scissors_gaps', async (req, res) => {
  try {
    const {
      marketData,
      mekkoData,
      selectedXAxisKey,
      selectedYAxisKey,
      availableDimensions,
      selectedBrand,
      maxItems = 5
    } = req.body;

    if (!marketData || !mekkoData || !selectedBrand) {
      return res.status(400).json({
        error: 'Missing required parameters: marketData, mekkoData, selectedBrand'
      });
    }

    const result = await analyzeScissorsGaps(
      marketData as MarketDataPoint[],
      mekkoData as any[],
      selectedXAxisKey as string,
      selectedYAxisKey as string,
      availableDimensions as DimensionConfig[],
      selectedBrand as string,
      maxItems as number
    );

    res.json(result);
  } catch (error) {
    console.error('Error in analyze_scissors_gaps:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// 分析问题原因
app.post('/tools/analyze_problem_causes', async (req, res) => {
  try {
    const {
      scissorsGaps,
      selectedBrand,
      marketData,
      availableDimensions,
      maxProblems = 10
    } = req.body;

    if (!scissorsGaps || !selectedBrand) {
      return res.status(400).json({
        error: 'Missing required parameters: scissorsGaps, selectedBrand'
      });
    }

    const result = await analyzeProblemsAndStrategies(
      scissorsGaps as any[],
      selectedBrand as string,
      marketData as MarketDataPoint[],
      availableDimensions as DimensionConfig[],
      undefined, // userFeedback
      maxProblems as number
    );

    res.json(result);
  } catch (error) {
    console.error('Error in analyze_problem_causes:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// 查询市场数据
app.post('/tools/query_market_data', async (req, res) => {
  try {
    const {
      functionName,
      args,
      selectedBrand,
      marketData,
      availableDimensions
    } = req.body;

    if (!functionName || !args) {
      return res.status(400).json({
        error: 'Missing required parameters: functionName, args'
      });
    }

    const result = await executeDataQuery(
      functionName as string,
      args as any,
      (marketData || []) as MarketDataPoint[],
      (availableDimensions || []) as DimensionConfig[],
      selectedBrand as string || ''
    );

    res.json({ result });
  } catch (error) {
    console.error('Error in query_market_data:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`✅ Problem Analysis HTTP API Server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   GET  /tools`);
  console.log(`   POST /tools/analyze_scissors_gaps`);
  console.log(`   POST /tools/analyze_problem_causes`);
  console.log(`   POST /tools/query_market_data`);
});
