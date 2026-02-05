import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  analyzeScissorsGaps,
  analyzeProblemsAndStrategies,
  executeDataQuery
} from '../src/services/problemAnalysisService.js';
import { MarketDataPoint, DimensionConfig } from '../src/types/strategy.js';

// MCP工具定义
const tools = [
  {
    name: 'analyze_scissors_gaps',
    description: '分析市场数据中的剪刀差现象，识别品牌表现中的关键问题。这是问题定位的第一步，会全面扫描数据并识别5条左右最关键的剪刀差。',
    inputSchema: {
      type: 'object',
      properties: {
        marketData: { 
          type: 'array', 
          description: '市场数据点数组',
          items: { type: 'object' }
        },
        mekkoData: { 
          type: 'array', 
          description: 'Mekko图表数据',
          items: { type: 'object' }
        },
        selectedXAxisKey: { 
          type: 'string', 
          description: '横轴维度键（如"province"、"dosage"）' 
        },
        selectedYAxisKey: { 
          type: 'string', 
          description: '纵轴维度键（如"brand"、"product"）' 
        },
        availableDimensions: { 
          type: 'array', 
          description: '可用维度配置',
          items: { type: 'object' }
        },
        selectedBrand: { 
          type: 'string', 
          description: '要分析的品牌名称（如"立普妥"）' 
        },
        maxItems: { 
          type: 'number', 
          description: '最大输出项数', 
          default: 5 
        }
      },
      required: ['marketData', 'mekkoData', 'selectedBrand']
    }
  },
  {
    name: 'analyze_problem_causes',
    description: '深入分析剪刀差背后的原因，包括环境因素、商业推广因素、产品因素、资源分配因素四个维度。这是问题定位的第二步，会基于第一步的剪刀差结果进行深度分析。',
    inputSchema: {
      type: 'object',
      properties: {
        scissorsGaps: { 
          type: 'array', 
          description: '剪刀差列表（第一步的输出）',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              phenomenon: { type: 'string' },
              possibleReasons: { type: 'string' }
            }
          }
        },
        selectedBrand: { 
          type: 'string', 
          description: '分析品牌名称' 
        },
        marketData: { 
          type: 'array', 
          description: '市场数据点数组',
          items: { type: 'object' }
        },
        availableDimensions: { 
          type: 'array', 
          description: '可用维度配置',
          items: { type: 'object' }
        },
        maxProblems: { 
          type: 'number', 
          description: '最大分析问题数', 
          default: 10 
        }
      },
      required: ['scissorsGaps', 'selectedBrand']
    }
  },
  {
    name: 'query_market_data',
    description: '查询市场数据，支持按剂量、品牌、分销率等维度筛选。可用于深入分析特定维度的数据表现。',
    inputSchema: {
      type: 'object',
      properties: {
        functionName: { 
          type: 'string', 
          enum: ['queryByDosage', 'queryWD'],
          description: '查询函数名称：queryByDosage（按剂量查询）或 queryWD（查询分销率）'
        },
        args: { 
          type: 'object', 
          description: '查询参数，根据functionName不同而不同。例如：{dosage: "10mg", brand: "立普妥"} 或 {brand: "立普妥", dosage: "20mg"}'
        },
        selectedBrand: { 
          type: 'string', 
          description: '默认品牌名称' 
        },
        marketData: { 
          type: 'array', 
          description: '市场数据点数组（可选，如果不提供会从数据库加载）',
          items: { type: 'object' }
        },
        availableDimensions: { 
          type: 'array', 
          description: '可用维度配置（可选）',
          items: { type: 'object' }
        }
      },
      required: ['functionName', 'args']
    }
  }
];

// 创建MCP服务器
const server = new Server(
  {
    name: 'problem-analysis-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 注册工具列表处理器
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

// 注册工具调用处理器
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error('Missing arguments');
  }

  try {
    switch (name) {
      case 'analyze_scissors_gaps': {
        const gapsResult = await analyzeScissorsGaps(
          args.marketData as MarketDataPoint[],
          args.mekkoData as any[],
          args.selectedXAxisKey as string,
          args.selectedYAxisKey as string,
          args.availableDimensions as DimensionConfig[],
          args.selectedBrand as string,
          (args.maxItems as number) || 5
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(gapsResult, null, 2)
            }
          ]
        };
      }

      case 'analyze_problem_causes': {
        const causesResult = await analyzeProblemsAndStrategies(
          args.scissorsGaps as any[],
          args.selectedBrand as string,
          args.marketData as MarketDataPoint[],
          args.availableDimensions as DimensionConfig[],
          undefined, // userFeedback
          (args.maxProblems as number) || 10
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(causesResult, null, 2)
            }
          ]
        };
      }

      case 'query_market_data': {
        const queryResult = await executeDataQuery(
          args.functionName as string,
          args.args as any,
          (args.marketData || []) as MarketDataPoint[],
          (args.availableDimensions || []) as DimensionConfig[],
          args.selectedBrand as string || ''
        );
        
        return {
          content: [
            {
              type: 'text',
              text: queryResult
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

// 启动服务器（使用stdio传输，适合作为子进程运行）
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Problem Analysis MCP Server running on stdio');
}

main().catch(console.error);
