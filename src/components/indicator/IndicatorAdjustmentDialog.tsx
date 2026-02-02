import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { sendChatMessage, ChatMessage } from '../../services/chatService';
import { adjustIndicatorData } from '../../services/indicatorService';

interface IndicatorAdjustmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  currentData: any; // 当前的数据（指标列表、分析结果、规划等）
  dataType: 'potentialIndicators' | 'effectAnalysis' | 'recommendations' | 'baseline' | 'targetPlan';
  onApply: (adjustedData: any) => void; // 应用调整后的数据
  context?: {
    strategyId?: string;
    indicatorId?: string;
    salesGrowth?: number;
  };
}

export default function IndicatorAdjustmentDialog({
  isOpen,
  onClose,
  title,
  currentData,
  dataType,
  onApply,
  context,
}: IndicatorAdjustmentDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 初始化对话
  useEffect(() => {
    if (isOpen) {
      const initialMessage: ChatMessage = {
        id: '1',
        role: 'assistant',
        content: getInitialPrompt(),
        timestamp: new Date(),
      };
      setMessages([initialMessage]);
      setInputValue('');
      // 聚焦输入框
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // 滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const getInitialPrompt = () => {
    const prompts: Record<string, string> = {
      potentialIndicators: `你好！我可以帮你调整潜在指标列表的筛选结果。

当前已筛选出 ${Array.isArray(currentData) ? currentData.length : 0} 个潜在指标。

你可以告诉我你的调整需求，比如：
- "更保守一点，只保留最核心的指标"
- "增加一些过程指标"
- "去掉投入指标，只关注结果和过程指标"
- "筛选更严格一些，只保留10个最重要的"

请告诉我你希望如何调整？`,
      effectAnalysis: `你好！我可以帮你调整指标效果分析的结果。

当前已分析了 ${Array.isArray(currentData) ? currentData.length : 0} 个指标的效果。

你可以告诉我你的调整需求，比如：
- "更保守一点，调低影响力得分"
- "重点关注相关性高的指标"
- "增加一些历史趋势分析"

请告诉我你希望如何调整？`,
      recommendations: `你好！我可以帮你调整考核指标建议。

当前已推荐 ${Array.isArray(currentData) ? currentData.length : 0} 个指标。

你可以告诉我你的调整需求，比如：
- "更保守一点，只推荐3个最核心的指标"
- "增加一些过程指标的权重"
- "优先考虑容易实现的指标"

请告诉我你希望如何调整？`,
      baseline: `你好！我可以帮你调整指标基线的分析。

你可以告诉我你的调整需求，比如：
- "更保守一点，调低基线预期"
- "考虑更悲观的市场环境"
- "增加一些风险因素的权重"

请告诉我你希望如何调整？`,
      targetPlan: `你好！我可以帮你调整指标目标值规划。

当前规划了全国目标值：${currentData?.targetValue?.national || 'N/A'}

你可以告诉我你的调整需求，比如：
- "更保守一点，调低目标值10%"
- "考虑更悲观的市场环境，目标值下调5%"
- "更激进一点，目标值提升15%"
- "各省份目标值都调低一些"

请告诉我你希望如何调整？`,
    };
    return prompts[dataType] || '你好！我可以帮你调整指标规划结果。请告诉我你希望如何调整？';
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      // 构建上下文信息（用于对话，不用于调整数据）
      const contextInfo = {
        currentPage: '指标规划',
      };

      const response = await sendChatMessage([...messages, userMessage], contextInfo);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // 检查AI是否提供了调整后的数据（JSON格式）
      // 这里需要解析AI响应，提取调整后的数据
      // 如果AI返回了JSON格式的调整数据，可以自动应用
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          const adjustedData = JSON.parse(jsonMatch[1]);
          // 可以询问用户是否应用
          setTimeout(() => {
            const confirmMessage: ChatMessage = {
              id: (Date.now() + 2).toString(),
              role: 'assistant',
              content: '我已经根据你的要求调整了数据。点击"应用调整"按钮来应用这些更改。',
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, confirmMessage]);
          }, 500);
        } catch (e) {
          // JSON解析失败，忽略
        }
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

  const handleApply = async () => {
    if (!messages.length || isLoading) return;

    setIsApplying(true);
    try {
      // 调用服务函数，根据对话内容调整数据
      const conversationMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

      const adjustedData = await adjustIndicatorData(
        currentData,
        dataType,
        conversationMessages,
        context
      );
      onApply(adjustedData);
      onClose();
    } catch (error) {
      console.error('Failed to apply adjustment:', error);
      alert('应用调整失败，请稍后重试');
    } finally {
      setIsApplying(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">与AI对话，调整指标规划结果</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                    : 'bg-gray-100 text-gray-600'
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
                  'flex-1 rounded-lg p-3 max-w-[80%]',
                  message.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs mt-1 opacity-70">{formatTime(message.timestamp)}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1 rounded-lg p-3 bg-gray-100">
                <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-end space-x-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入你的调整需求，比如：更保守一点、调低目标值10%..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleApply}
              disabled={isApplying || messages.length <= 1}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>应用中...</span>
                </>
              ) : (
                <span>应用调整</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


