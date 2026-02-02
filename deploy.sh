#!/bin/bash

# 部署脚本 - 直接推送到deploy分支，触发Vercel自动部署

echo "🚀 开始部署流程..."

# 检查当前分支
current_branch=$(git branch --show-current)
echo "当前分支: $current_branch"

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  检测到未提交的更改，请先提交或暂存"
    echo "使用: git add . && git commit -m 'your message'"
    exit 1
fi

# 如果不在deploy分支，切换到deploy分支
if [ "$current_branch" != "deploy" ]; then
    echo "🔄 切换到deploy分支..."
    git checkout deploy
    
    # 如果有未提交的更改，先暂存
    if [ -n "$(git status --porcelain)" ]; then
        echo "📦 暂存当前更改..."
        git stash
        git checkout deploy
        git stash pop
    fi
fi

# 确保deploy分支是最新的
echo "📥 拉取deploy分支最新更改..."
git pull origin deploy

# 推送到远程，触发Vercel部署
echo "📤 推送到远程deploy分支，触发Vercel自动部署..."
git push origin deploy

echo "✅ 部署完成！Vercel将自动开始部署。"
echo "📊 查看部署状态: https://vercel.com/dashboard"


