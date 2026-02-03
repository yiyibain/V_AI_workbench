import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Lightbulb, CheckCircle2 } from 'lucide-react';
import { BonusDesignMessage, BonusDesignSuggestion } from '../../types/bonus';
import { getBonusDesignSuggestion } from '../../services/bonusService';
import { clsx } from 'clsx';

export default function BonusMethodology() {
  const [messages, setMessages] = useState<BonusDesignMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: '你好！我是奖金方案设计顾问。我可以帮助你设计科学、公平、有效的奖金方案。\n\n请告诉我你的需求，比如：\n- 如何激励各省份进行科学规划？\n- 如何平衡激励效果与公平性？\n- 存量 vs. 增量比例应该如何设计？\n- 结果指标 vs. 过程指标的比例如何分配？',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState<BonusDesignSuggestion | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 自动聚焦输入框
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: BonusDesignMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const suggestion = await getBonusDesignSuggestion(userMessage.content);

      const assistantMessage: BonusDesignMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: formatSuggestionAsText(suggestion),
        timestamp: new Date(),
        suggestions: suggestion,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setCurrentSuggestion(suggestion);
    } catch (error) {
      console.error('Failed to get suggestion:', error);
      const errorMessage: BonusDesignMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，生成建议时出现错误。请稍后重试。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatSuggestionAsText = (suggestion: BonusDesignSuggestion): string => {
    let text = `# ${suggestion.title}\n\n${suggestion.description}\n\n`;

    if (suggestion.principles.length > 0) {
      text += `## 核心原则\n\n`;
      suggestion.principles.forEach((principle, index) => {
        text += `${index + 1}. ${principle}\n`;
      });
      text += '\n';
    }

    if (suggestion.recommendations.length > 0) {
      text += `## 具体建议\n\n`;
      suggestion.recommendations.forEach((rec) => {
        text += `### ${rec.category}\n`;
        text += `**建议：** ${rec.suggestion}\n`;
        text += `**理由：** ${rec.rationale}\n\n`;
      });
    }

    if (suggestion.fairnessConsiderations.length > 0) {
      text += `## 公平性考虑\n\n`;
      suggestion.fairnessConsiderations.forEach((consideration, index) => {
        text += `${index + 1}. ${consideration}\n`;
      });
      text += '\n';
    }

    if (suggestion.scientificBasis.length > 0) {
      text += `## 科学依据\n\n`;
      suggestion.scientificBasis.forEach((basis, index) => {
        text += `${index + 1}. ${basis}\n`;
      });
    }

    return text;
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

  return (
    <div className="space-y-6">
      {/* 功能说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">功能说明</h3>
            <p className="text-sm text-blue-800">
              通过交互式对话，AI将基于"最大化激励"、"公平性"和"科学性"三个核心原则，
              输出符合整体策略方向的奖金方案设计建议（如存量 vs. 增量比例、结果指标 vs. 过程指标比例等）。
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 对话区域 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col" style={{ height: '600px' }}>
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">交互式对话</h3>
            <p className="text-sm text-gray-600 mt-1">与AI讨论奖金方案设计需求</p>
          </div>

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
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-end space-x-2">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入你的需求... (Shift+Enter换行)"
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
          </div>
        </div>

        {/* 建议展示区域 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col" style={{ height: '600px' }}>
          <div className="p-4 border-b border-gray-200 bg-primary-50">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-bold text-gray-900">AI设计建议</h3>
            </div>
            <p className="text-sm text-gray-600 mt-1">基于对话内容生成的奖金方案设计建议</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {currentSuggestion ? (
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">{currentSuggestion.title}</h4>
                  <p className="text-sm text-gray-600">{currentSuggestion.description}</p>
                </div>

                {currentSuggestion.principles.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">核心原则</h5>
                    <ul className="space-y-2">
                      {currentSuggestion.principles.map((principle, index) => (
                        <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                          <span className="text-primary-600 font-semibold">{index + 1}.</span>
                          <span>{principle}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentSuggestion.recommendations.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">具体建议</h5>
                    <div className="space-y-4">
                      {currentSuggestion.recommendations.map((rec, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <h6 className="font-medium text-gray-900 mb-1">{rec.category}</h6>
                          <p className="text-sm text-gray-700 mb-1">
                            <span className="font-medium">建议：</span>
                            {rec.suggestion}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">理由：</span>
                            {rec.rationale}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {currentSuggestion.fairnessConsiderations.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">公平性考虑</h5>
                    <ul className="space-y-2">
                      {currentSuggestion.fairnessConsiderations.map((consideration, index) => (
                        <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                          <span className="text-primary-600 font-semibold">{index + 1}.</span>
                          <span>{consideration}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {currentSuggestion.scientificBasis.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2">科学依据</h5>
                    <ul className="space-y-2">
                      {currentSuggestion.scientificBasis.map((basis, index) => (
                        <li key={index} className="flex items-start space-x-2 text-sm text-gray-700">
                          <span className="text-primary-600 font-semibold">{index + 1}.</span>
                          <span>{basis}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">开始对话后，AI建议将显示在这里</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


