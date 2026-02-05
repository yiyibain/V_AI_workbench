# MCP 问题定位分析实现总结

## ✅ 已完成的工作

在 `mcp` 分支上，我们成功实现了问题定位分析功能的 MCP (Model Context Protocol) 解决方案。

### 1. MCP 服务器实现

#### 标准 MCP 服务器 (`mcp-server/problem-analysis-server.ts`)
- 使用 stdio 传输，符合 MCP 标准协议
- 适合作为子进程运行，被 MCP 客户端调用

#### HTTP API 服务器 (`mcp-server/http-api-server.ts`) ⭐ 推荐
- 提供 RESTful HTTP 接口
- 更适合 Web 前端直接调用
- 支持 CORS，可以从任何前端应用调用

### 2. Web 客户端实现

#### MCP 客户端 (`src/services/mcpClient.ts`)
- 提供 `WebMCPClient` 类
- 封装所有 API 调用
- 支持健康检查、工具列表、分析功能

#### React Hook (`src/hooks/useMCPClient.ts`)
- 提供 `useMCPClient` Hook
- 简化在 React 组件中的使用
- 包含加载状态、错误处理

### 3. 功能特性

#### 三个核心工具：

1. **analyze_scissors_gaps** - 分析剪刀差
   - 全面扫描市场数据
   - 识别品牌表现中的关键问题
   - 输出 5 条左右最关键的剪刀差

2. **analyze_problem_causes** - 分析问题原因
   - 基于剪刀差结果进行深度分析
   - 包含四个维度：环境因素、商业推广因素、产品因素、资源分配因素

3. **query_market_data** - 查询市场数据
   - 支持按剂量查询 (`queryByDosage`)
   - 支持查询分销率 (`queryWD`)

## 🚀 使用方法

### 启动 HTTP API 服务器

开发模式（推荐，自动重新加载）：
```bash
npm run mcp:dev
```

生产模式：
```bash
npm run mcp:start
```

服务器将在 `http://localhost:3001` 启动。

### 在前端代码中使用

#### 方式 1: 使用 React Hook（推荐）

```typescript
import { useMCPClient } from '../hooks/useMCPClient';

function MyComponent() {
  const { analyzeProblem, loading, error, result } = useMCPClient({
    baseUrl: 'http://localhost:3001'
  });

  const handleAnalyze = async () => {
    try {
      const result = await analyzeProblem({
        marketData: [...],
        mekkoData: [...],
        selectedBrand: '立普妥',
        selectedXAxisKey: 'province',
        selectedYAxisKey: 'brand',
        availableDimensions: [...],
      });
      console.log('分析结果:', result);
    } catch (err) {
      console.error('分析失败:', err);
    }
  };

  return (
    <button onClick={handleAnalyze} disabled={loading}>
      {loading ? '分析中...' : '开始分析'}
    </button>
  );
}
```

#### 方式 2: 直接使用客户端

```typescript
import { WebMCPClient } from '../services/mcpClient';

const client = new WebMCPClient('http://localhost:3001');

// 分析剪刀差
const gaps = await client.analyzeScissorsGaps({...});

// 分析原因
const causes = await client.analyzeProblemCauses({...});
```

## 📁 文件结构

```
mcp-server/
├── problem-analysis-server.ts    # 标准 MCP 服务器（stdio）
├── http-api-server.ts            # HTTP API 服务器（推荐）
├── example-usage.ts              # 使用示例
└── README.md                     # 详细文档

src/
├── services/
│   └── mcpClient.ts             # Web MCP 客户端
└── hooks/
    └── useMCPClient.ts          # React Hook
```

## 🔧 配置

### 环境变量

- `MCP_HTTP_PORT`: HTTP API 服务器端口（默认：3001）
- `VITE_DEEPSEEK_API_KEY`: DeepSeek API 密钥（用于 AI 分析）

### NPM 脚本

- `npm run mcp:build` - 编译 MCP 服务器代码
- `npm run mcp:server` - 运行编译后的服务器
- `npm run mcp:dev` - 开发模式（使用 tsx，自动重新加载）
- `npm run mcp:start` - 生产模式（编译后运行）

## 📝 API 接口

### 健康检查
```
GET /health
```

### 获取工具列表
```
GET /tools
```

### 分析剪刀差
```
POST /tools/analyze_scissors_gaps
Content-Type: application/json

{
  "marketData": [...],
  "mekkoData": [...],
  "selectedBrand": "立普妥",
  "selectedXAxisKey": "province",
  "selectedYAxisKey": "brand",
  "availableDimensions": [...],
  "maxItems": 5
}
```

### 分析问题原因
```
POST /tools/analyze_problem_causes
Content-Type: application/json

{
  "scissorsGaps": [...],
  "selectedBrand": "立普妥",
  "marketData": [...],
  "availableDimensions": [...],
  "maxProblems": 10
}
```

### 查询市场数据
```
POST /tools/query_market_data
Content-Type: application/json

{
  "functionName": "queryByDosage",
  "args": {
    "dosage": "10mg",
    "brand": "立普妥"
  },
  "selectedBrand": "立普妥"
}
```

## ⚠️ 注意事项

1. **确保环境变量已设置**：`VITE_DEEPSEEK_API_KEY` 必须设置才能使用 AI 分析功能
2. **数据库文件位置**：确保 `/全国及分省分销.xlsx` 存在于 `public` 目录
3. **CORS 支持**：HTTP API 服务器已启用 CORS，可以从任何前端应用调用
4. **超时设置**：大数据传输时可能需要调整请求超时时间（默认 5 分钟）

## 🔄 下一步

1. 集成到现有的 `MarketOverview` 组件中，替换直接调用 `problemAnalysisService` 的方式
2. 添加错误处理和重试机制
3. 添加请求缓存，提高性能
4. 添加日志记录和监控

## 📚 参考文档

- [MCP 官方文档](https://modelcontextprotocol.info/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- 详细使用说明请查看 `mcp-server/README.md`
