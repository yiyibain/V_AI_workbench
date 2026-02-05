# MCP 问题定位分析服务器

这个目录包含了问题定位分析功能的 MCP (Model Context Protocol) 服务器实现。

## 架构说明

提供了两种服务器实现方式：

1. **标准 MCP 服务器** (`problem-analysis-server.ts`)
   - 使用 stdio 传输，符合 MCP 标准协议
   - 适合作为子进程运行，被 MCP 客户端调用

2. **HTTP API 服务器** (`http-api-server.ts`)
   - 提供 RESTful HTTP 接口
   - 更适合 Web 前端直接调用
   - 推荐使用此方式

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动 HTTP API 服务器

开发模式（自动重新加载）：
```bash
npm run mcp:dev
```

生产模式：
```bash
npm run mcp:start
```

服务器将在 `http://localhost:3001` 启动。

### 3. 使用 Web 客户端

在前端代码中使用：

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

## API 接口

### 健康检查

```
GET /health
```

返回：
```json
{
  "status": "ok",
  "service": "problem-analysis-api"
}
```

### 获取工具列表

```
GET /tools
```

返回可用工具列表。

### 分析剪刀差

```
POST /tools/analyze_scissors_gaps
```

请求体：
```json
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
```

请求体：
```json
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
```

请求体：
```json
{
  "functionName": "queryByDosage",
  "args": {
    "dosage": "10mg",
    "brand": "立普妥"
  },
  "selectedBrand": "立普妥"
}
```

## 环境变量

- `MCP_HTTP_PORT`: HTTP API 服务器端口（默认：3001）
- `VITE_DEEPSEEK_API_KEY`: DeepSeek API 密钥（用于 AI 分析）

## 开发说明

### 编译服务器代码

```bash
npm run mcp:build
```

编译后的文件将输出到 `dist/mcp-server/` 目录。

### 代码结构

- `problem-analysis-server.ts`: 标准 MCP 服务器（stdio 传输）
- `http-api-server.ts`: HTTP API 服务器（推荐）
- `../src/services/mcpClient.ts`: Web 客户端
- `../src/hooks/useMCPClient.ts`: React Hook

## 注意事项

1. 确保 `VITE_DEEPSEEK_API_KEY` 环境变量已设置
2. 确保数据库文件（`/全国及分省分销.xlsx`）存在于 `public` 目录
3. HTTP API 服务器支持 CORS，可以从任何前端应用调用
4. 大数据传输时可能需要调整请求超时时间
