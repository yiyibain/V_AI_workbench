import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AIAnalysis, Citation } from '../types';
import { MessageCircle, X, Send, Sparkles, ExternalLink, Database } from 'lucide-react';
import { sendChatMessage } from '../services/chatService';
import { useAnalysis } from '../contexts/AnalysisContext';

interface AIAnalysisDisplayProps {
  analysis: AIAnalysis;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  highlightedText?: string;
}

export default function AIAnalysisDisplay({ analysis }: AIAnalysisDisplayProps) {
  const [selectedText, setSelectedText] = useState<string>('');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hoveredCitation, setHoveredCitation] = useState<string | null>(null);
  const [expandedReasons, setExpandedReasons] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { currentAnalysis } = useAnalysis();

  // 自动滚动到底部
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // 处理文本选择
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        setSelectedText(selection.toString().trim());
      } else {
        setSelectedText('');
      }
    };

    document.addEventListener('selectionchange', handleSelection);
    return () => document.removeEventListener('selectionchange', handleSelection);
  }, []);

  // 处理高亮文本的对话
  const handleHighlightChat = () => {
    if (!selectedText) return;
    
    setShowChat(true);
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `关于这段内容："${selectedText}"，请帮我更深入地分析原因，或者如果AI的判断有误，请纠正。`,
      timestamp: new Date(),
      highlightedText: selectedText,
    };
    
    setChatMessages([userMessage]);
    handleSendMessage(userMessage.content, true);
  };

  // 发送消息
  const handleSendMessage = async (message?: string, skipAddUser = false) => {
    const messageToSend = message || chatInput;
    if (!messageToSend.trim()) return;

    if (!skipAddUser) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: messageToSend,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, userMessage]);
      setChatInput('');
    }

    setIsSending(true);
    try {
      const response = await sendChatMessage(
        chatMessages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        })),
        {
          currentPage: '产品分析',
          analysisData: currentAnalysis || analysis,
        }
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，发送消息时出现错误，请稍后重试。',
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  // 获取引用信息
  const getCitation = (citationId: string): Citation | undefined => {
    return analysis.citations?.find((c) => c.id === citationId);
  };

  // 渲染带引用的Markdown内容
  const renderMarkdownWithCitations = () => {
    if (!analysis.interpretationSegments) {
      // 如果没有分段，直接渲染原始markdown
      return (
        <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-blue-600 prose-pre:bg-gray-100">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {analysis.interpretation}
          </ReactMarkdown>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {analysis.interpretationSegments.map((segment) => (
          <div key={segment.id} className="relative">
            <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-blue-600 prose-pre:bg-gray-100">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {segment.text}
              </ReactMarkdown>
            </div>
            {segment.citations && segment.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {segment.citations.map((citationId) => {
                  const citation = getCitation(citationId);
                  if (!citation) return null;
                  return (
                    <button
                      key={citationId}
                      onMouseEnter={() => setHoveredCitation(citationId)}
                      onMouseLeave={() => setHoveredCitation(null)}
                      className="relative inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                    >
                      <span>
                        {citation.type === 'internal' ? (
                          <Database className="w-3 h-3" />
                        ) : (
                          <ExternalLink className="w-3 h-3" />
                        )}
                      </span>
                      <span>{citation.source}</span>
                      {hoveredCitation === citationId && (
                        <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-white border border-gray-200 rounded-lg shadow-lg z-50 text-left">
                          <div className="text-xs font-semibold text-gray-700 mb-1">
                            {citation.source}
                          </div>
                          <div className="text-xs text-gray-600 mb-2">{citation.content}</div>
                          {citation.dataPoint && (
                            <div className="text-xs text-blue-600 font-medium">
                              数据点: {citation.dataPoint}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 italic mt-2">
                            {citation.relevance}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // 切换原因展开
  const toggleReason = (reasonId: string) => {
    const newExpanded = new Set(expandedReasons);
    if (newExpanded.has(reasonId)) {
      newExpanded.delete(reasonId);
    } else {
      newExpanded.add(reasonId);
    }
    setExpandedReasons(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* AI智能分析内容 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 relative">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI智能分析
          </h4>
          {selectedText && (
            <button
              onClick={handleHighlightChat}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              询问选中内容
            </button>
          )}
        </div>
        
        <div className="text-gray-700">
          {renderMarkdownWithCitations()}
        </div>

        {/* 文本选择提示 */}
        {selectedText && !showChat && (
          <div className="mt-4 p-3 bg-white border border-blue-300 rounded-lg shadow-sm">
            <div className="text-xs text-gray-600 mb-1">已选中文本：</div>
            <div className="text-sm text-gray-800 font-medium mb-2 line-clamp-2">
              "{selectedText}"
            </div>
            <button
              onClick={handleHighlightChat}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              点击这里与AI对话 →
            </button>
          </div>
        )}
      </div>

      {/* 可能原因 - 带关联 */}
      {analysis.possibleReasons.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-3">可能原因</h4>
          <div className="space-y-3">
            {analysis.possibleReasons.map((reason, index) => {
              const reasonId = `reason-${index}`;
              const connection = analysis.reasonConnections?.find(
                (conn) => conn.reasonId === reasonId
              );
              const isExpanded = expandedReasons.has(reasonId);

              return (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between">
                      <span className="text-sm text-gray-700 flex-1">{reason}</span>
                      <button
                        onClick={() => toggleReason(reasonId)}
                        className="ml-2 text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        disabled={!connection || connection.relatedSegments.length === 0}
                      >
                        {isExpanded ? (
                          <>
                            <span>隐藏关联</span>
                          </>
                        ) : (
                          <>
                            <span>查看关联报告</span>
                            {connection && connection.relatedSegments.length > 0 && (
                              <span className="text-blue-400">({connection.relatedSegments.length})</span>
                            )}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {isExpanded && connection && connection.relatedSegments.length > 0 && (
                    <div className="border-t border-gray-200 bg-white p-4 space-y-3">
                      <div className="text-xs font-semibold text-gray-600 mb-2">
                        基于以下报告内容得出：
                      </div>
                      {connection.relatedSegments.map((segment, segIndex) => (
                        <div key={segIndex} className="pl-4 border-l-2 border-blue-200">
                          <div className="text-sm text-gray-800 mb-1 italic">
                            "{segment.segmentText}"
                          </div>
                          <div className="text-xs text-gray-600">
                            → {segment.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {isExpanded && (!connection || connection.relatedSegments.length === 0) && (
                    <div className="border-t border-gray-200 bg-white p-4">
                      <div className="text-xs text-gray-500 italic">
                        正在生成关联报告...
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 对话面板 */}
      {showChat && (
        <div className="fixed bottom-4 right-4 w-96 bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col max-h-[600px]">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-50">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">AI对话</span>
            </div>
            <button
              onClick={() => {
                setShowChat(false);
                setChatMessages([]);
                setChatInput('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.highlightedText && (
                    <div className="text-xs opacity-75 mb-2 italic">
                      关于: "{message.highlightedText}"
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap">
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none prose-headings:text-white prose-p:text-white prose-strong:text-white prose-code:text-blue-200 prose-pre:bg-gray-800">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    <span>AI思考中...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="输入问题..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSending}
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={isSending || !chatInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

