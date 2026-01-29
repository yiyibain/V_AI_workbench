#!/bin/bash

# 部署脚本 - 将main分支的更改合并到deploy分支并推送

echo "🚀 开始部署流程..."

# 检查当前分支
current_branch=$(git branch --show-current)
echo "当前分支: $current_branch"

# 确保在main分支
if [ "$current_branch" != "main" ]; then
    echo "⚠️  当前不在main分支，切换到main分支..."
    git checkout main
fi

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  检测到未提交的更改，请先提交或暂存"
    echo "使用: git add . && git commit -m 'your message'"
    exit 1
fi

# 确保main分支是最新的
echo "📥 拉取main分支最新更改..."
git pull origin main

# 切换到deploy分支
echo "🔄 切换到deploy分支..."
git checkout deploy

# 合并main分支的更改
echo "🔀 合并main分支的更改到deploy分支..."
git merge main --no-edit

# 推送到远程，触发Vercel部署
echo "📤 推送到远程仓库，触发Vercel自动部署..."
git push origin deploy

# 切换回main分支
echo "↩️  切换回main分支继续开发..."
git checkout main

echo "✅ 部署完成！Vercel将自动开始部署。"
echo "📊 查看部署状态: https://vercel.com/dashboard"

