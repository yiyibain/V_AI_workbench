import { useState } from 'react';
import { Opportunity, StrategyAnalysisResult, UserFeedback } from '../../types/strategy';
import {
  performFullStrategyAnalysis,
  handleUserFeedback,
  completeStrategyAnalysis,
} from '../../services/strategyAnalysisService';
import { useIndicator } from '../../contexts/IndicatorContext';
import { Loader2, CheckCircle2, AlertCircle, MessageSquare, Send, X, Download } from 'lucide-react';
import { clsx } from 'clsx';

interface StrategyAnalysisFlowProps {
  opportunity: Opportunity;
  onComplete?: (result: StrategyAnalysisResult) => void;
}

export default function StrategyAnalysisFlow({ opportunity, onComplete }: StrategyAnalysisFlowProps) {
  const [analysisResult, setAnalysisResult] = useState<StrategyAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [userFeedbackInput, setUserFeedbackInput] = useState<string>('');
  const [feedbackType, setFeedbackType] = useState<'A' | 'B' | 'C' | 'custom' | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const { addStrategy, setSelectedStrategyTab1 } = useIndicator();

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
    setProgressMessage('正在根据反馈调整分析...');

    try {
      const updatedResult = await handleUserFeedback(
        analysisResult,
        opportunity,
        feedback,
        (_step, message) => {
          setProgressMessage(message);
        }
      );

      setAnalysisResult(updatedResult);
      setIsAnalyzing(false);

      // 如果用户选择A，直接完成
      if (feedbackType === 'A') {
        await handleCompleteAnalysis(updatedResult);
      } else {
        // 否则显示新的反馈表单
        setUserFeedbackInput('');
        setFeedbackType(null);
        setShowFeedbackForm(true);
      }
    } catch (error) {
      console.error('处理反馈失败:', error);
      setIsAnalyzing(false);
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
    if (step === 1) return analysisResult.step1 ? 'completed' : 'pending';
    if (step === 2) return analysisResult.step2.length > 0 ? 'completed' : 'pending';
    if (step === 3) return analysisResult.step3.userFeedback ? 'completed' : analysisResult.status === 'waiting_feedback' ? 'active' : 'pending';
    if (step === 4) return analysisResult.step4 ? 'completed' : 'pending';
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

  // 导入策略到指标规划
  const handleImportStrategy = () => {
    if (!analysisResult || !analysisResult.step5) return;

    const strategyTitle = generateStrategyTitle(analysisResult);
    
    // 生成策略描述
    let strategyDescription = analysisResult.step5.finalSummary;
    if (strategyDescription.length > 200) {
      strategyDescription = strategyDescription.substring(0, 200) + '...';
    }

    // 提取重点领域和目标结果
    const focusAreas: string[] = [];
    const targetOutcomes: string[] = [];

    // 从策略目标中提取信息
    analysisResult.step5.strategyGoals.forEach((goal) => {
      if (goal.goal.includes('零售') || goal.goal.includes('渠道')) {
        focusAreas.push('零售渠道');
      }
      if (goal.goal.includes('医院') || goal.goal.includes('渗透')) {
        focusAreas.push('医院渠道');
      }
      if (goal.goal.includes('份额') || goal.goal.includes('市场')) {
        targetOutcomes.push('市场份额提升');
      }
    });

    // 如果没有提取到，使用默认值
    if (focusAreas.length === 0) {
      focusAreas.push('市场拓展');
    }
    if (targetOutcomes.length === 0) {
      targetOutcomes.push('业务增长');
    }

    // 创建策略对象
    const newStrategy = {
      id: `strategy-${Date.now()}`,
      name: strategyTitle,
      description: strategyDescription,
      focusAreas: [...new Set(focusAreas)], // 去重
      targetOutcomes: [...new Set(targetOutcomes)], // 去重
    };

    // 添加到指标规划
    addStrategy(newStrategy);
    setSelectedStrategyTab1(newStrategy);
    
    // 显示导入成功弹窗
    setShowImportDialog(true);
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
            { step: 4, title: '基于用户输入修改策略', description: '根据用户反馈调整分析和策略' },
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-bold text-gray-900">第一步：问题对应原因再梳理</h3>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">核心问题</h4>
            <p className="text-gray-700 mb-3">{analysisResult.step1.problemTitle}</p>
            <p className="text-sm text-gray-600 italic">{analysisResult.step1.causeStatement}</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">关键事实依据</h4>
            <div className="space-y-3">
              {analysisResult.step1.coreFacts.map((fact) => (
                <div key={fact.id} className="border-l-4 border-primary-500 pl-4">
                  <p className="text-sm text-gray-700 mb-1">{fact.content}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-bold text-gray-900">第二步：提出解决方案</h3>
          </div>

          <div className="space-y-4">
            {analysisResult.step2.map((strategy, idx) => (
              <div key={strategy.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-gray-900">策略建议 {idx + 1}：{strategy.title}</span>
                      <span className="text-xs px-2 py-1 rounded bg-primary-100 text-primary-700">
                        {strategy.category === 'channel' ? '渠道/覆盖' :
                         strategy.category === 'product' ? '产品/包装/价格' :
                         strategy.category === 'resource' ? '资源/推广模式' : '推广'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{strategy.description}</p>
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">策略级表达：</span>
                      {strategy.strategicLevel}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">具体实施建议：</div>
                  <ul className="space-y-1">
                    {strategy.specificActions.map((action, i) => (
                      <li key={i} className="flex items-start text-sm text-gray-600">
                        <span className="text-primary-600 mr-2">→</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                  {strategy.expectedOutcome && (
                    <div className="mt-2 text-sm text-gray-600">
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
        <div className="bg-white rounded-lg shadow-sm border-2 border-primary-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-bold text-gray-900">第三步：与用户的交互校准</h3>
            </div>
            <button
              onClick={() => setShowFeedbackForm(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 whitespace-pre-line">
              {analysisResult.step3.clarificationQuestions?.[0] || '请提供您的反馈意见'}
            </p>
          </div>

          <div className="space-y-3 mb-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="feedbackType"
                value="A"
                checked={feedbackType === 'A'}
                onChange={() => setFeedbackType('A')}
                className="text-primary-600"
              />
              <span className="text-sm text-gray-700">
                <strong>A</strong>：整体方向与逻辑基本符合，只需在少数问题上做补充/精炼
              </span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="feedbackType"
                value="B"
                checked={feedbackType === 'B'}
                onChange={() => setFeedbackType('B')}
                className="text-primary-600"
              />
              <span className="text-sm text-gray-700">
                <strong>B</strong>：部分策略不合理，希望你围绕某一类问题（请说明）做更深入分析
              </span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="feedbackType"
                value="C"
                checked={feedbackType === 'C'}
                onChange={() => setFeedbackType('C')}
                className="text-primary-600"
              />
              <span className="text-sm text-gray-700">
                <strong>C</strong>：与我真实判断差距较大，我希望指定正确的结论，再让你帮我完善推理过程
              </span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="feedbackType"
                value="custom"
                checked={feedbackType === 'custom'}
                onChange={() => setFeedbackType('custom')}
                className="text-primary-600"
              />
              <span className="text-sm text-gray-700">
                <strong>自定义反馈</strong>：直接输入你的具体反馈意见
              </span>
            </label>
          </div>

          {(feedbackType === 'B' || feedbackType === 'C' || feedbackType === 'custom') && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
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

      {/* 第四步：修订后的分析（如果有） */}
      {analysisResult?.step4 && (
        <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-bold text-gray-900">
              第四步：基于用户修正后的更新（第{analysisResult.step4.iterationCount}次迭代）
            </h3>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">修订后的原因分析</h4>
            <p className="text-sm text-gray-700 italic">{analysisResult.step4.revisedAnalysis?.causeStatement || '暂无修订'}</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">修订后的策略建议</h4>
            <div className="space-y-3">
              {analysisResult.step4.revisedStrategies?.map((strategy, idx) => (
                <div key={strategy.id} className="border-l-4 border-yellow-500 pl-4">
                  <div className="font-medium text-gray-900 mb-1">
                    策略建议 {idx + 1}：{strategy.title}
                  </div>
                  <p className="text-sm text-gray-700">{strategy.description}</p>
                </div>
              )) || <p className="text-sm text-gray-500">暂无修订策略</p>}
            </div>
          </div>
        </div>
      )}

      {/* 第五步：最终总结 */}
      {analysisResult?.step5 && (
        <div className="bg-white rounded-lg shadow-sm border-2 border-green-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-bold text-gray-900">第五步：最终总结</h3>
            </div>
            <button
              onClick={handleImportStrategy}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>导入到指标规划</span>
            </button>
          </div>

          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-2">总结</h4>
            <p className="text-gray-700 whitespace-pre-line">{analysisResult.step5.finalSummary}</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-4">所有策略目标及实现方式</h4>
            <div className="space-y-4">
              {analysisResult.step5.strategyGoals.map((goal, idx) => (
                <div key={goal.strategyId} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="font-semibold text-gray-900 mb-2">
                    策略建议 {idx + 1}：{goal.goal}
                  </div>
                  <div className="text-sm text-gray-700">
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
              当前策略已导入指标规划。策略标题：<strong>{analysisResult?.step5 ? generateStrategyTitle(analysisResult) : ''}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-4">
              您可以在"指标规划"页面的"可用指标列表"中选择该策略，查看相关的潜在指标。
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowImportDialog(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
