# 策略规划工具 - CEO决策平台

面向CEO和决策层的智能策略规划工具，内置晖致"三环"运营体系与产品矩阵知识库。

## 核心特性

- **全局 AI 业务大脑**: 内置晖致"三环"运营体系与产品矩阵知识库，所有 AI 建议均基于"以患者为中心"和"解限-渗透-做广"的业务逻辑生成。
- **实时 AI Copilot**: 贯穿全流程的智能助手，实时监控用户操作，提供诊断分析、风险预警和优化建议。

## 功能模块

### 1. 公司体检报告（已上线）

#### 功能一：全国层面各产品表现整体解读
- **分产品诊断报告**
  - **就数论数**：提取内外部数据中晖致产品表现，定位变化幅度较大的产品及指标，提供风险预警
  - **数据解读**：实时联网，链接与晖致产品相关的可靠信息源，从"蛛丝马迹"中获取对晖致产品表现的可能原因，并智能建议进一步可以锁定问题的解决方案

#### 功能二：省份间表现智能横向对比
- **各省表现诊断报告**
  - 基于核心维度（市场份额、ROI、非立络占比等）及核心指标表现（解限率、渗透率等），AI智能定位各省份中表现优异、表现不理想的省份，得出"健康度评分"
  - 结合相关信息与数据，总结省份表现的潜在原因
  - 类似于全国层面"就数论数"和"数据解读"

### 2. 策略制定（已上线）

#### 功能一：生意大盘观测
- **切分维度定义问答**：AI输出适合该产品商业特性的看市场/内部表现的维度
- **Mekko数据看板**：依照维度生成数据看板，AI帮助定位值得晖致明显未布局/份额明显低、具备提升潜力的细分市场

#### 功能二：机会点甄别与提炼
- **分析维度问答**：AI总结产生目前在该细分市场中存在缺口的原因维度列表
- **机会提炼报告**：AI基于数据分析方法，总结"为何当前没有赢得该市场"的原因，并制定相应的策略方向

#### 功能三：策略共创
- **策略建议生成**：AI对于发现的"机会点"脑暴数条初版"策略建议"
- **策略调整**：用户可在AI建议的基础上要求进行修改，也可以输入新的想法
- **优先级排序**：拖拽调整策略优先级，确保策略可落地

### 3. 指标规划（即将推出）
设定和追踪关键业务指标，确保策略落地

### 4. 奖金设置（即将推出）
基于指标完成情况，智能计算和分配奖金

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **UI框架**: Tailwind CSS
- **图表库**: Recharts
- **路由**: React Router
- **AI服务**: DeepSeek API
- **图标**: Lucide React

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env`，并填入你的 DeepSeek API Key：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API Key：

```
VITE_DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

> 如果没有 API Key，应用会使用模拟数据运行，AI分析功能会返回预设的示例结果。

### 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist` 目录。

## 部署

详见 [DEPLOY.md](./DEPLOY.md) 文件。

## 项目结构

```
├── src/
│   ├── components/          # 可复用组件
│   │   ├── Layout.tsx      # 布局组件
│   │   ├── ProductDiagnosis.tsx  # 产品诊断组件
│   │   ├── ProvinceDiagnosis.tsx  # 省份诊断组件
│   │   ├── Chatbot.tsx     # AI聊天机器人
│   │   └── strategy/       # 策略制定相关组件
│   ├── pages/              # 页面组件
│   │   ├── Home.tsx        # 首页
│   │   ├── ProductAnalysis.tsx  # 产品分析页面
│   │   ├── ProvinceAnalysis.tsx # 省份分析页面
│   │   └── StrategyPlanning.tsx # 策略制定页面
│   ├── services/           # 服务层
│   │   ├── aiService.ts    # AI服务（产品/省份分析）
│   │   └── chatService.ts  # AI聊天服务
│   ├── data/               # 数据
│   │   ├── mockData.ts     # 模拟数据（体检报告）
│   │   └── strategyMockData.ts  # 策略制定模拟数据
│   ├── types/              # TypeScript类型定义
│   │   ├── index.ts        # 基础类型
│   │   └── strategy.ts     # 策略制定类型
│   ├── contexts/           # React Context
│   │   └── AnalysisContext.tsx  # 分析结果上下文
│   ├── App.tsx             # 应用入口
│   ├── main.tsx            # 应用启动
│   └── index.css           # 全局样式
├── public/                 # 静态资源
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── vercel.json            # Vercel部署配置
```

## 开发计划

- [x] 项目基础架构
- [x] 公司体检报告 - 产品表现分析
- [x] 公司体检报告 - 省份表现对比
- [x] 策略制定模块
- [ ] 指标规划模块
- [ ] 奖金设置模块
- [ ] 数据源集成
- [ ] 用户权限管理

## 许可证

MIT
