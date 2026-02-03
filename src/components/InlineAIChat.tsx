import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { sendChatMessage } from '../services/chatService';
import { useAnalysis } from '../contexts/AnalysisContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface InlineAIChatProps {
  selectedText: string;
  position: { top: number; left: number } | null;
  context?: any; // 保留用于未来扩展
  onClose: () => void;
}

export default function InlineAIChat({
  selectedText,
  position,
  context: _context, // 保留用于未来扩展
  onClose,
}: InlineAIChatProps) {
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const { currentAnalysis } = useAnalysis();

  // 自动滚动到底部
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // 定位对话面板
  useEffect(() => {
    if (chatRef.current && position) {
      chatRef.current.style.top = `${position.top}px`;
      chatRef.current.style.left = `${position.left}px`;
    }
  }, [position]);

  // 发送初始消息
  useEffect(() => {
    if (selectedText && chatMessages.length === 0) {
      const initialMessage = {
        id: Date.now().toString(),
        role: 'user' as const,
        content: `关于这段内容："${selectedText}"，请帮我更深入地分析原因。`,
        timestamp: new Date(),
      };
      setChatMessages([initialMessage]);
      
      // 发送初始消息
      const sendInitial = async () => {
        setIsSending(true);
        try {
          const response = await sendChatMessage(
            [{
              id: initialMessage.id,
              role: 'user',
              content: initialMessage.content,
              timestamp: initialMessage.timestamp,
            }],
            {
              currentPage: '产品分析',
              analysisData: currentAnalysis || undefined,
            }
          );

          const assistantMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant' as const,
            content: response,
            timestamp: new Date(),
          };
          setChatMessages([initialMessage, assistantMessage]);
        } catch (error) {
          console.error('Failed to send initial message:', error);
          const errorMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant' as const,
            content: '抱歉，发送消息时出现错误，请稍后重试。',
            timestamp: new Date(),
          };
          setChatMessages([initialMessage, errorMessage]);
        } finally {
          setIsSending(false);
        }
      };
      
      sendInitial();
    }
  }, [selectedText]);

  // 发送消息
  const handleSendMessage = async (message?: string) => {
    const messageToSend = message || chatInput;
    if (!messageToSend.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: messageToSend,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');

    setIsSending(true);
    try {
      const response = await sendChatMessage(
        [...chatMessages, userMessage].map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        })),
        {
          currentPage: '产品分析',
          analysisData: currentAnalysis || undefined,
        }
      );

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: response,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: '抱歉，发送消息时出现错误，请稍后重试。',
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  if (!selectedText || !position) return null;

  // 阻止对话框内的事件冒泡
  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handlePanelMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={chatRef}
      className="fixed z-50 w-96 bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col max-h-[500px]"
      data-ai-chat-panel="true"
      onClick={handlePanelClick}
      onMouseDown={handlePanelMouseDown}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-primary-50">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary-600" />
          <span className="font-semibold text-gray-900 text-sm">AI对话</span>
          <span className="text-xs text-gray-500">关于选中内容</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {chatMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 text-sm ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-blue-600 prose-pre:bg-gray-100">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI思考中...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="border-t border-gray-200 p-3 bg-white">
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
            placeholder="继续提问..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            disabled={isSending}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isSending || !chatInput.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

