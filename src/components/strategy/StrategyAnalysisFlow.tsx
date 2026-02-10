import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Opportunity, StrategyAnalysisResult, UserFeedback, StrategyProposal } from '../../types/strategy';
import {
  performFullStrategyAnalysis,
  handleUserFeedback,
  completeStrategyAnalysis,
} from '../../services/strategyAnalysisService';
import { Loader2, CheckCircle2, MessageSquare, Send, X, Download } from 'lucide-react';
import { clsx } from 'clsx';

interface StrategyAnalysisFlowProps {
  opportunity: Opportunity;
  onComplete?: (result: StrategyAnalysisResult) => void;
}

export default function StrategyAnalysisFlow({ opportunity, onComplete }: StrategyAnalysisFlowProps) {
  const navigate = useNavigate();
  const [analysisResult, setAnalysisResult] = useState<StrategyAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [userFeedbackInput, setUserFeedbackInput] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<'A' | 'B' | 'C' | 'custom' | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // 开始分析
  const handleStartAnalysis = async () => {
    if (!opportunity) return;

    setIsAnalyzing(true);
    setProgressMessage('正在启动分析流程...');

    try {
      const result = await performFullStrategyAnalysis(
        opportunity,
        (_step, message) => {
          setProgressMessage(message);
        }
      );

      setAnalysisResult(result);
      setIsAnalyzing(false);
      setShowFeedbackForm(true);
    } catch (error) {
      console.error('分析失败:', error);
      setIsAnalyzing(false);
      setProgressMessage('分析失败，请重试');
    }
  };

  // 提交用户反馈
  const handleSubmitFeedback = async () => {
    if (!analysisResult || !feedbackType) return;

    const feedback: UserFeedback = {
      id: `feedback-${Date.now()}`,
      problemId: opportunity.id,
      feedbackType: feedbackType === 'custom' ? 'custom' : feedbackType,
      content: userFeedbackInput || (feedbackType === 'A' ? '整体方向与逻辑基本符合' : feedbackType === 'B' ? '部分策略不合理' : '差距较大'),
      timestamp: new Date(),
    };

    setIsAnalyzing(true);
    setProgressMessage('正在根据反馈重新分析...');

    try {
      const updatedResult = await handleUserFeedback(
        analysisResult,
        opportunity,
        feedback,
        (step, message) => {
          // 根据步骤显示具体的进度消息
          if (step === 1) {
            setProgressMessage('正在重新生成步骤1：问题对应原因再梳理...');
          } else if (step === 2) {
            setProgressMessage('正在重新生成步骤2：提出解决方案...');
          } else if (step === 3) {
            setProgressMessage('等待用户反馈...');
          } else {
            setProgressMessage(message);
          }
        }
      );

      setAnalysisResult(updatedResult);
      setIsAnalyzing(false);
      setProgressMessage(''); // 清除进度消息

      // 如果用户选择A，直接完成
      if (feedbackType === 'A') {
        await handleCompleteAnalysis(updatedResult);
      } else {
        // 否则显示新的反馈表单（步骤1和2已更新，现在等待新的反馈）
        setUserFeedbackInput('');
        setFeedbackType(null);
        setShowFeedbackForm(true);
        setProgressMessage(''); // 确保清除进度消息
      }
    } catch (error) {
      console.error('处理反馈失败:', error);
      setIsAnalyzing(false);
      setProgressMessage(`处理反馈失败：${error instanceof Error ? error.message : '未知错误'}，请重试`);
      // 保持反馈表单显示，让用户可以重试
      setShowFeedbackForm(true);
    }
  };

  // 完成分析
  const handleCompleteAnalysis = async (result?: StrategyAnalysisResult) => {
    const targetResult = result || analysisResult;
    if (!targetResult) return;

    setIsAnalyzing(true);
    setProgressMessage('正在生成最终总结...');

    try {
      const completedResult = await completeStrategyAnalysis(
        targetResult,
        opportunity,
        (_step, message) => {
          setProgressMessage(message);
        }
      );

      setAnalysisResult(completedResult);
      setIsAnalyzing(false);
      setShowFeedbackForm(false);
      onComplete?.(completedResult);
    } catch (error) {
      console.error('完成分析失败:', error);
      setIsAnalyzing(false);
    }
  };

  const getStepStatus = (step: number) => {
    if (!analysisResult) return 'pending';
    if (step === 1) {
      // 如果正在分析且是步骤1，显示为active
      if (isAnalyzing && progressMessage.includes('步骤1')) return 'active';
      return analysisResult.step1 ? 'completed' : 'pending';
    }
    if (step === 2) {
      // 如果正在分析且是步骤2，显示为active
      if (isAnalyzing && progressMessage.includes('步骤2')) return 'active';
      return analysisResult.step2.length > 0 ? 'completed' : 'pending';
    }
    if (step === 3) {
      // 如果正在分析且是步骤3，显示为active
      if (isAnalyzing && progressMessage.includes('等待用户反馈')) return 'active';
      return analysisResult.step3.userFeedback ? 'completed' : analysisResult.status === 'waiting_feedback' ? 'active' : 'pending';
    }
    if (step === 4) return 'pending'; // 步骤4不再单独显示，已整合到步骤1和2的重新执行中
    if (step === 5) return analysisResult.step5 ? 'completed' : 'pending';
    return 'pending';
  };

  // 生成策略标题（从策略分析结果中提取）
  const generateStrategyTitle = (result: StrategyAnalysisResult): string => {
    if (result.step5 && result.step5.strategyGoals.length > 0) {
      // 使用第一个策略目标作为标题
      const firstGoal = result.step5.strategyGoals[0].goal;
      // 简化标题，提取关键信息
      if (firstGoal.includes('立普妥')) {
        // 尝试提取更具体的描述
        if (firstGoal.includes('10mg') && firstGoal.includes('零售')) {
          return '提升立普妥10mg零售份额';
        } else if (firstGoal.includes('零售')) {
          return '提升立普妥零售份额';
        } else if (firstGoal.includes('医院')) {
          return '提升立普妥医院份额';
        }
      }
      // 如果包含其他关键词，提取前30个字符作为标题
      return firstGoal.length > 30 ? firstGoal.substring(0, 30) + '...' : firstGoal;
    }
    // 如果没有策略目标，使用问题标题
    return result.problemTitle.length > 30 ? result.problemTitle.substring(0, 30) + '...' : result.problemTitle;
  };

  // 导入策略到策略共创
  const handleImportStrategy = () => {
    if (!analysisResult || !analysisResult.step5) return;

    const step5 = analysisResult.step5;
    
    // 将第五步的输出转换为策略共创的格式（StrategyProposal）
    const strategyProposals: StrategyProposal[] = step5.strategyGoals.map((goal, index) => {
      // 从实现方式中提取具体行动
      const actions = goal.implementation
        .split(/[。；\n]/)
        .map((action) => action.trim())
        .filter((action) => action.length > 0);

      return {
        id: `sp-${Date.now()}-${index}`,
        title: goal.goal.length > 50 ? goal.goal.substring(0, 50) + '...' : goal.goal,
        description: goal.goal, // 使用策略目标作为描述
        opportunityId: opportunity.id, // 关联的机会点
        priority: index + 1,
        status: 'draft' as const,
        actions: actions.length > 0 ? actions : [goal.implementation], // 具体行动
        expectedOutcome: step5.finalSummary, // 使用最终总结作为预期效果
        createdAt: new Date(),
        updatedAt: new Date(),
        isFromAI: true, // 标记为AI生成
      };
    });

    // 如果只有一个策略目标，也可以创建一个综合的策略建议
    if (strategyProposals.length === 0 && step5.finalSummary) {
      const strategyTitle = generateStrategyTitle(analysisResult);
      strategyProposals.push({
        id: `sp-${Date.now()}`,
        title: strategyTitle,
        description: step5.finalSummary,
        opportunityId: opportunity.id,
        priority: 1,
        status: 'draft',
        actions: analysisResult.step2.map((s) => s.title), // 使用第二步的策略标题作为行动
        expectedOutcome: step5.finalSummary,
        createdAt: new Date(),
        updatedAt: new Date(),
        isFromAI: true,
      });
    }

    // 存储到localStorage，供策略共创页面读取
    try {
      const existingProposals = localStorage.getItem('strategyProposals');
      let allProposals: StrategyProposal[] = [];
      
      if (existingProposals) {
        try {
          const parsed = JSON.parse(existingProposals);
          // 转换日期字符串为Date对象
          allProposals = parsed.map((p: any) => ({
            ...p,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          }));
        } catch (e) {
          console.warn('解析已有策略建议失败，将创建新列表', e);
        }
      }

      // 添加新的策略建议，并更新优先级
      const maxPriority = allProposals.length > 0 
        ? Math.max(...allProposals.map((p) => p.priority))
        : 0;
      
      const newProposalsWithPriority = strategyProposals.map((p, idx) => ({
        ...p,
        priority: maxPriority + idx + 1,
      }));

      allProposals = [...allProposals, ...newProposalsWithPriority];
      
      // 保存到localStorage
      localStorage.setItem('strategyProposals', JSON.stringify(allProposals));
      
      // 设置标记，表示有新策略导入
      localStorage.setItem('hasNewStrategyProposals', 'true');
      
      // 显示导入成功弹窗
      setShowImportDialog(true);
    } catch (error) {
      console.error('导入策略到策略共创失败:', error);
      alert('导入失败，请重试');
    }
  };

  return (
    <div className="space-y-6">
      {/* 分析流程步骤指示器 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">策略分析流程</h3>
          {!analysisResult && (
            <button
              onClick={handleStartAnalysis}
              disabled={isAnalyzing}
              className={clsx(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                isAnalyzing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              )}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
                  分析中...
                </>
              ) : (
                '开始分析'
              )}
            </button>
          )}
        </div>

        {isAnalyzing && progressMessage && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-900">{progressMessage}</span>
            </div>
          </div>
        )}

        {/* 步骤列表 */}
        <div className="space-y-4">
          {[
            { step: 1, title: '问题对应原因再梳理', description: '整合信息，统一表述，列出关键事实依据' },
            { step: 2, title: '提出解决方案', description: '基于原因分析，提出2-3条具体可落地的策略建议' },
            { step: 3, title: '与用户的交互校准', description: '主动向用户确认分析是否满足需求' },
            { step: 4, title: '基于用户输入修改策略', description: '根据用户反馈重新执行步骤1和步骤2' },
            { step: 5, title: '输出并总结所有策略', description: '明确策略目标和实现方式' },
          ].map(({ step, title, description }) => {
            const status = getStepStatus(step);
            return (
              <div
                key={step}
                className={clsx(
                  'flex items-start space-x-4 p-4 rounded-lg border-2 transition-all',
                  status === 'completed'
                    ? 'border-green-200 bg-green-50'
                    : status === 'active'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-gray-50'
                )}
              >
                <div className="flex-shrink-0">
                  {status === 'completed' ? (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  ) : status === 'active' ? (
                    <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 bg-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-gray-900">步骤 {step}</span>
                    <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">
                      {status === 'completed' ? '已完成' : status === 'active' ? '进行中' : '待开始'}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">{title}</h4>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 第一步：原因分析结果 */}
      {analysisResult?.step1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-7">
          <div className="flex items-center space-x-3 mb-5">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <h3 className="text-xl font-bold text-gray-900">第一步：问题对应原因再梳理</h3>
          </div>

          <div className="mb-5">
            <h4 className="font-semibold text-base text-gray-900 mb-3">核心问题</h4>
            <p className="text-base text-gray-700 mb-4 leading-relaxed">{analysisResult.step1.problemTitle}</p>
            <p className="text-base text-gray-600 italic leading-relaxed">{analysisResult.step1.causeStatement}</p>
          </div>

          <div>
            <h4 className="font-semibold text-base text-gray-900 mb-3">关键事实依据</h4>
            <div className="space-y-4">
              {analysisResult.step1.coreFacts.map((fact) => (
                <div key={fact.id} className="border-l-4 border-primary-500 pl-5">
                  <p className="text-base text-gray-700 mb-2 leading-relaxed">{fact.content}</p>
                  <div className="flex items-center space-x-5 text-sm text-gray-500">
                    <span>来源：{fact.dataSource}</span>
                    <span>相关性：{fact.relevance}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 第二步：策略建议 */}
      {analysisResult?.step2 && analysisResult.step2.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-7">
          <div className="flex items-center space-x-3 mb-5">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            <h3 className="text-xl font-bold text-gray-900">第二步：提出解决方案</h3>
          </div>

          <div className="space-y-5">
            {analysisResult.step2.map((strategy, idx) => (
              <div key={strategy.id} className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-semibold text-base text-gray-900">策略建议 {idx + 1}：{strategy.title}</span>
                      <span className="text-sm px-2.5 py-1.5 rounded bg-primary-100 text-primary-700">
                        {strategy.category === 'channel' ? '渠道/覆盖' :
                         strategy.category === 'product' ? '产品/包装/价格' :
                         strategy.category === 'resource' ? '资源/推广模式' : '推广'}
                      </span>
                    </div>
                    <p className="text-base text-gray-700 mb-3 leading-relaxed">{strategy.description}</p>
                    <div className="text-base text-gray-600 mb-3">
                      <span className="font-medium">策略级表达：</span>
                      {strategy.strategicLevel}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-base font-medium text-gray-700 mb-3">具体实施建议：</div>
                  <ul className="space-y-2">
                    {strategy.specificActions.map((action, i) => (
                      <li key={i} className="flex items-start text-base text-gray-600 leading-relaxed">
                        <span className="text-primary-600 mr-2">→</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                  {strategy.expectedOutcome && (
                    <div className="mt-3 text-base text-gray-600 leading-relaxed">
                      <span className="font-medium">预期效果：</span>
                      {strategy.expectedOutcome}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 第三步：用户反馈表单 */}
      {showFeedbackForm && analysisResult && analysisResult.status === 'waiting_feedback' && (
        <div className="bg-white rounded-lg shadow-sm border-2 border-primary-200 p-7">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center space-x-3">
              <MessageSquare className="w-6 h-6 text-primary-600" />
              <h3 className="text-xl font-bold text-gray-900">第三步：与用户的交互校准</h3>
            </div>
            <button
              onClick={() => setShowFeedbackForm(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-5 p-5 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-base text-blue-900 whitespace-pre-line leading-relaxed">
              {analysisResult.step3.clarificationQuestions?.[0] || '请提供您的反馈意见'}
            </p>
          </div>

          <div className="space-y-4 mb-5">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="feedbackType"
                value="A"
                checked={feedbackType === 'A'}
                onChange={() => setFeedbackType('A')}
                className="text-primary-600"
              />
              <span className="text-base text-gray-700 leading-relaxed">
                <strong>A</strong>：整体方向与逻辑基本符合，只需在少数问题上做补充/精炼
              </span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="feedbackType"
                value="B"
                checked={feedbackType === 'B'}
                onChange={() => setFeedbackType('B')}
                className="text-primary-600"
              />
              <span className="text-base text-gray-700 leading-relaxed">
                <strong>B</strong>：部分策略不合理，希望你围绕某一类问题（请说明）做更深入分析
              </span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="feedbackType"
                value="C"
                checked={feedbackType === 'C'}
                onChange={() => setFeedbackType('C')}
                className="text-primary-600"
              />
              <span className="text-base text-gray-700 leading-relaxed">
                <strong>C</strong>：与我真实判断差距较大，我希望指定正确的结论，再让你帮我完善推理过程
              </span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="feedbackType"
                value="custom"
                checked={feedbackType === 'custom'}
                onChange={() => setFeedbackType('custom')}
                className="text-primary-600"
              />
              <span className="text-base text-gray-700 leading-relaxed">
                <strong>自定义反馈</strong>：直接输入你的具体反馈意见
              </span>
            </label>
          </div>

          {(feedbackType === 'B' || feedbackType === 'C' || feedbackType === 'custom') && (
            <div className="mb-5">
              <label className="block text-base font-medium text-gray-700 mb-3">
                {feedbackType === 'B' ? '请说明需要深入分析的问题类别' :
                 feedbackType === 'C' ? '请指定你认为正确的结论' :
                 '请输入你的具体反馈意见'}
              </label>
              <textarea
                value={userFeedbackInput}
                onChange={(e) => setUserFeedbackInput(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={feedbackType === 'B' ? '例如：渠道策略、产品定位等...' :
                             feedbackType === 'C' ? '例如：我认为主要原因是...' :
                             '请输入你的反馈...'}
              />
            </div>
          )}

          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={() => {
                setShowFeedbackForm(false);
                setFeedbackType(null);
                setUserFeedbackInput('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              取消
            </button>
            <button
              onClick={handleSubmitFeedback}
              disabled={!feedbackType || isAnalyzing}
              className={clsx(
                'px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2',
                !feedbackType || isAnalyzing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              )}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>处理中...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>提交反馈</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}


      {/* 第五步：最终总结 */}
      {analysisResult?.step5 && (
        <div className="bg-white rounded-lg shadow-sm border-2 border-green-200 p-7">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-bold text-gray-900">第五步：最终总结</h3>
            </div>
            <button
              onClick={handleImportStrategy}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-base"
            >
              <Download className="w-5 h-5" />
              <span>导入到策略共创</span>
            </button>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-base text-gray-900 mb-3">总结</h4>
            <p className="text-base text-gray-700 whitespace-pre-line leading-relaxed">{analysisResult.step5.finalSummary}</p>
          </div>

          <div>
            <h4 className="font-semibold text-base text-gray-900 mb-5">所有策略目标及实现方式</h4>
            <div className="space-y-5">
              {analysisResult.step5.strategyGoals.map((goal, idx) => (
                <div key={goal.strategyId} className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                  <div className="font-semibold text-base text-gray-900 mb-3">
                    策略建议 {idx + 1}：{goal.goal}
                  </div>
                  <div className="text-base text-gray-700 leading-relaxed">
                    <span className="font-medium">实现方式：</span>
                    {goal.implementation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 导入成功弹窗 */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">导入成功</h3>
              </div>
              <button
                onClick={() => setShowImportDialog(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-700 mb-4">
              策略已成功导入到策略共创。共导入 <strong>{analysisResult?.step5?.strategyGoals.length || 0}</strong> 条策略建议。
            </p>
            <p className="text-sm text-gray-500 mb-4">
              您可以在"策略辅助"页面的"策略共创"标签页中查看、编辑和调整这些策略建议的优先级。
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowImportDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                稍后查看
              </button>
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  // 跳转到策略规划页面，并设置标记以切换到策略共创标签
                  localStorage.setItem('switchToCoCreation', 'true');
                  navigate('/strategy-planning');
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                前往策略共创
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
