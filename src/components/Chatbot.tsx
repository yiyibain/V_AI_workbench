import { useState, useRef, useEffect } from 'react';
import { Send, X, Minimize2, Maximize2, Bot, User } from 'lucide-react';
import { sendChatMessage, ChatMessage } from '../services/chatService';
import { useLocation } from 'react-router-dom';
import { useAnalysis } from '../contexts/AnalysisContext';
import { clsx } from 'clsx';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是晖致公司的AI业务顾问。我可以帮助你改进分析报告、回答业务问题、提供策略建议。有什么我可以帮助你的吗？',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const location = useLocation();
  const { currentAnalysis, markNeedsRefresh } = useAnalysis();

  // 获取当前页面名称
  const getCurrentPageName = () => {
    if (location.pathname === '/product-analysis') return '产品表现分析';
    if (location.pathname === '/province-analysis') return '省份表现对比';
    return '首页';
  };

  // 滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 自动聚焦输入框
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await sendChatMessage([...messages, userMessage], {
        currentPage: getCurrentPageName(),
        analysisData: currentAnalysis,
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // 检查用户是否请求更新分析
      const userMessageLower = userMessage.content.toLowerCase();
      const refreshKeywords = ['刷新', '更新', '重新分析', '重新生成', '重新计算'];
      const shouldRefresh = refreshKeywords.some(keyword => userMessageLower.includes(keyword));

      if (shouldRefresh && currentAnalysis) {
        // 从dataSummary中提取周期信息，格式如"产品立普妥在2024-Q1的表现分析"
        const periodMatch = currentAnalysis.dataSummary.match(/(\d{4}-Q\d)/);
        const period = periodMatch ? periodMatch[1] : '';
        
        // 根据分析类型生成缓存键（与诊断组件保持一致）
        const cacheKey = currentAnalysis.type === 'product' 
          ? `product-${currentAnalysis.targetId}-${period}`
          : `province-${currentAnalysis.targetId}-${period}`;
        
        markNeedsRefresh(cacheKey);
        
        // 提示用户刷新
        setTimeout(() => {
          const refreshHint: ChatMessage = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: '已标记需要刷新分析。请点击分析报告右上角的"刷新分析"按钮，或切换产品/省份后会自动刷新。',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, refreshHint]);
        }, 500);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，发送消息时出现错误。请稍后重试。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all flex items-center justify-center z-50 group"
        aria-label="打开AI助手"
      >
        <Bot className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
      </button>
    );
  }

  return (
    <div
      className={clsx(
        'fixed bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col z-50 transition-all',
        isMinimized 
          ? 'right-4 bottom-4 w-72 h-16 md:w-80' 
          : 'right-4 bottom-4 w-[calc(100vw-2rem)] h-[calc(100vh-8rem)] md:w-96 md:h-[600px] max-w-md'
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-primary-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">AI业务顾问</div>
            <div className="text-xs text-gray-500">晖致策略规划助手</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            aria-label={isMinimized ? '展开' : '最小化'}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4 text-gray-600" />
            ) : (
              <Minimize2 className="w-4 h-4 text-gray-600" />
            )}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={clsx(
                  'flex items-start space-x-3',
                  message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                )}
              >
                <div
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>
                <div
                  className={clsx(
                    'flex-1 max-w-[80%]',
                    message.role === 'user' ? 'text-right' : ''
                  )}
                >
                  <div
                    className={clsx(
                      'inline-block px-4 py-2 rounded-lg',
                      message.role === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    )}
                  >
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    <div
                      className={clsx(
                        'text-xs mt-1',
                        message.role === 'user' ? 'text-primary-100' : 'text-gray-500'
                      )}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-gray-700" />
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
            <div className="flex items-end space-x-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息... (Shift+Enter换行)"
                rows={2}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
                className={clsx(
                  'p-2 rounded-lg transition-colors flex-shrink-0',
                  inputValue.trim() && !isLoading
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
                aria-label="发送消息"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              提示：可以询问业务问题、请求改进分析报告、获取策略建议
            </div>
          </div>
        </>
      )}
    </div>
  );
}

