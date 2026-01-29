# 部署指南

## 部署到Vercel（不影响本地开发）

### 方案：使用独立的部署分支

这个方案允许你在本地继续开发，而Vercel从独立的部署分支自动部署。

### 首次设置

#### 1. 初始化Git仓库并首次提交

```bash
# 初始化git仓库
git init

# 添加所有文件
git add .

# 首次提交
git commit -m "Initial commit: 策略规划工具"

# 添加远程仓库
git remote add origin git@github.com:yiyibain/V_AI_workbench.git

# 创建main分支并推送
git branch -M main
git push -u origin main
```

#### 2. 创建部署分支

```bash
# 创建并切换到deploy分支
git checkout -b deploy

# 推送到远程
git push -u origin deploy

# 切换回main分支继续开发
git checkout main
```

#### 3. 在Vercel中配置

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New Project"
3. 导入你的GitHub仓库：`yiyibain/V_AI_workbench`
4. **重要**：在 "Production Branch" 设置中选择 `deploy` 分支
5. 项目设置：
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. 环境变量设置（可选）：
   - 添加 `VITE_DEEPSEEK_API_KEY`（如果不设置会使用模拟数据）
7. 点击 "Deploy"

### 日常使用

#### 方式一：使用部署脚本（推荐）

```bash
# 1. 确保代码已提交到main分支
git add .
git commit -m "Your commit message"
git push origin main

# 2. 运行部署脚本
./deploy.sh
```

脚本会自动：
- 检查当前分支
- 合并main到deploy分支
- 推送到远程触发Vercel部署
- 切换回main分支

#### 方式二：手动部署

```bash
# 1. 确保本地代码已提交到main分支
git checkout main
git add .
git commit -m "Your commit message"
git push origin main

# 2. 切换到deploy分支
git checkout deploy

# 3. 合并main分支的更改
git merge main --no-edit

# 4. 推送到远程，触发Vercel自动部署
git push origin deploy

# 5. 切换回main分支继续开发
git checkout main
```

### 工作流程

```
本地开发 (main分支)
    ↓
提交并推送到 main
    ↓
运行 ./deploy.sh 或手动合并到 deploy
    ↓
推送到 deploy 分支
    ↓
Vercel 自动部署
```

### 环境变量配置

在Vercel Dashboard中设置环境变量：
- `VITE_DEEPSEEK_API_KEY`: 你的DeepSeek API Key（可选）

### 注意事项

- ✅ 本地开发在 `main` 分支
- ✅ Vercel部署从 `deploy` 分支
- ✅ 需要部署时，将 `main` 的更改合并到 `deploy` 分支
- ✅ `.env` 文件不会被提交到Git（已在.gitignore中）
- ✅ 本地可以继续在main分支开发，不影响部署

