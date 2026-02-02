import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, BarChart3, Settings, Sparkles, Target, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';
import Chatbot from './Chatbot';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '首页', icon: LayoutDashboard },
    { path: '/product-analysis', label: '产品表现分析', icon: FileText },
    { path: '/province-analysis', label: '省份表现对比', icon: BarChart3 },
    { path: '/strategy-planning', label: '策略辅助', icon: Settings },
    { path: '/indicator-planning', label: '指标规划', icon: Target },
    { path: '/bonus-setting', label: '奖金设置', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-8 h-8 text-primary-600" />
                <span className="text-xl font-bold text-gray-900">策略规划工具</span>
              </div>
              <div className="hidden md:flex items-center space-x-1 ml-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={clsx(
                        'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
                <span>AI业务大脑</span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 移动端导航 */}
      <div className="md:hidden bg-white border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center space-x-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 主内容区 */}
      <main>{children}</main>

      {/* 全局AI聊天机器人 */}
      <Chatbot />
    </div>
  );
}

