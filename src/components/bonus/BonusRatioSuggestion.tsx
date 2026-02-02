import { useState, useEffect, useRef } from 'react';
import { Sparkles, Edit2, Save, X, GripVertical, Trash2, MessageSquare } from 'lucide-react';
import { BonusPackage } from '../../types/bonus';
import { TEN_BRANDS, initialBonusPackages, availableIndicators, mockBrandIndicators } from '../../data/bonusMockData';
import { understandStrategyAndAdjust } from '../../services/bonusService';
import { clsx } from 'clsx';

// 扩展BonusPackage以支持子品牌
interface ExtendedBonusPackage extends BonusPackage {
  subBrandPackages?: {
    subBrandName: string;
    totalRatio: number;
    resultIndicators: BonusPackage['resultIndicators'];
    processIndicators: BonusPackage['processIndicators'];
  }[];
}

export default function BonusRatioSuggestion() {
  const [bonusPackages, setBonusPackages] = useState<ExtendedBonusPackage[]>(() => {
    // 初始化时，为有子品牌的品牌创建子品牌包
    return initialBonusPackages.map((pkg) => {
      const brand = TEN_BRANDS.find((b) => b.id === pkg.brandId);
      if (brand?.subBrands && brand.subBrands.length > 0) {
        // 根据图片和用户确认，子品牌的值是独立的：
        // 疼痛: 西乐葆12%, 乐瑞卡6%
        // 精神: 左洛复8%, 怡诺思4%
        // 利加隆/维固力/迪敏思: 利加隆8%, 维固力2%, 迪敏思2%
        let subBrandRatios: number[] = [];
        if (pkg.brandId === 'brand-3') {
          // 疼痛: 西乐葆12%, 乐瑞卡6%
          subBrandRatios = [12, 6];
        } else if (pkg.brandId === 'brand-4') {
          // 精神: 左洛复8%, 怡诺思4%
          subBrandRatios = [8, 4];
        } else if (pkg.brandId === 'brand-7') {
          // 利加隆/维固力/迪敏思: 利加隆8%, 维固力2%, 迪敏思2%
          subBrandRatios = [8, 2, 2];
        } else {
          // 默认平均分配
          const ratioPerSubBrand = pkg.totalRatio / brand.subBrands.length;
          subBrandRatios = brand.subBrands.map(() => ratioPerSubBrand);
        }
        
        return {
          ...pkg,
          subBrandPackages: brand.subBrands.map((subBrand, index) => {
            const subRatio = subBrandRatios[index] || (pkg.totalRatio / brand.subBrands.length);
            // 根据子品牌的比例，按比例分配指标值
            const totalSubRatio = subBrandRatios.reduce((sum, r) => sum + r, 0);
            return {
              subBrandName: subBrand,
              totalRatio: subRatio,
              resultIndicators: pkg.resultIndicators.map((ind) => ({
                ...ind,
                ratio: (ind.ratio * subRatio) / (pkg.totalRatio || totalSubRatio),
              })),
              processIndicators: pkg.processIndicators.map((ind) => ({
                ...ind,
                ratio: (ind.ratio * subRatio) / (pkg.totalRatio || totalSubRatio),
              })),
            };
          }),
        };
      }
      return pkg;
    });
  });
  const [isEditing, setIsEditing] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ type: 'indicator' | 'available'; id: string; brandId?: string; subBrandName?: string } | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 计算总奖金包
  const totalRatio = bonusPackages.reduce((sum, pkg) => {
    if (pkg.subBrandPackages) {
      return sum + pkg.subBrandPackages.reduce((subSum, sub) => subSum + sub.totalRatio, 0);
    }
    return sum + pkg.totalRatio;
  }, 0);

  // 获取所有列（包括子品牌列）
  const getAllColumns = () => {
    const columns: Array<{ brandId: string; brandName: string; subBrandName?: string; colspan?: number }> = [];
    
    TEN_BRANDS.forEach((brand) => {
      if (brand.subBrands && brand.subBrands.length > 0) {
        // 有子品牌，添加主品牌（用于表头合并）和子品牌列
        columns.push({
          brandId: brand.id,
          brandName: brand.name,
          colspan: brand.subBrands.length,
        });
        brand.subBrands.forEach((subBrand) => {
          columns.push({
            brandId: brand.id,
            brandName: brand.name,
            subBrandName: subBrand,
          });
        });
      } else {
        // 没有子品牌，直接添加
        columns.push({
          brandId: brand.id,
          brandName: brand.name,
        });
      }
    });
    
    return columns;
  };

  const allColumns = getAllColumns();

  // 处理拖拽开始
  const handleDragStart = (e: React.DragEvent, type: 'indicator' | 'available', id: string, brandId?: string, subBrandName?: string) => {
    setDraggedItem({ type, id, brandId, subBrandName });
    e.dataTransfer.effectAllowed = 'move';
  };

  // 处理拖拽结束
  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // 处理拖拽放置
  const handleDrop = (e: React.DragEvent, targetBrandId: string, targetSubBrandName: string | undefined, indicatorType: 'result' | 'process') => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.type === 'available') {
      // 从可用指标池拖拽添加
      const indicator = availableIndicators.find((a) => a.id === draggedItem.id);
      if (!indicator) return;

      const brand = TEN_BRANDS.find((b) => b.id === targetBrandId);
      if (indicator.applicableBrands && brand && !indicator.applicableBrands.includes(brand.name)) {
        alert('该指标不适用于此品牌');
        return;
      }

      const brandIndicator = mockBrandIndicators.find(
        (bi) => bi.brandName === (targetSubBrandName || brand?.name) && bi.indicatorName === indicator.name
      );

      if (!brandIndicator) {
        alert('未找到对应的品牌指标数据');
        return;
      }

      setBonusPackages((packages) =>
        packages.map((pkg) => {
          if (pkg.brandId === targetBrandId) {
            if (targetSubBrandName && pkg.subBrandPackages) {
              // 更新子品牌包
              return {
                ...pkg,
                subBrandPackages: pkg.subBrandPackages.map((subPkg) => {
                  if (subPkg.subBrandName === targetSubBrandName) {
                    if (indicatorType === 'result') {
                      return {
                        ...subPkg,
                        resultIndicators: [
                          ...subPkg.resultIndicators,
                          {
                            indicatorId: brandIndicator.id,
                            indicatorName: indicator.name,
                            ratio: 0,
                            subCategory: indicator.category,
                          },
                        ],
                      };
                    } else {
                      return {
                        ...subPkg,
                        processIndicators: [
                          ...subPkg.processIndicators,
                          {
                            indicatorId: brandIndicator.id,
                            indicatorName: indicator.name,
                            ratio: 0,
                            hospitalType: indicator.hospitalType,
                          },
                        ],
                      };
                    }
                  }
                  return subPkg;
                }),
              };
            } else if (!targetSubBrandName && !pkg.subBrandPackages) {
              // 更新主品牌包
              if (indicatorType === 'result') {
                return {
                  ...pkg,
                  resultIndicators: [
                    ...pkg.resultIndicators,
                    {
                      indicatorId: brandIndicator.id,
                      indicatorName: indicator.name,
                      ratio: 0,
                      subCategory: indicator.category,
                    },
                  ],
                };
              } else {
                return {
                  ...pkg,
                  processIndicators: [
                    ...pkg.processIndicators,
                    {
                      indicatorId: brandIndicator.id,
                      indicatorName: indicator.name,
                      ratio: 0,
                      hospitalType: indicator.hospitalType,
                    },
                  ],
                };
              }
            }
          }
          return pkg;
        })
      );
    }

    setDraggedItem(null);
  };

  // 处理删除指标
  const handleDeleteIndicator = (brandId: string, indicatorId: string, type: 'result' | 'process', subBrandName?: string) => {
    setBonusPackages((packages) =>
      packages.map((pkg) => {
        if (pkg.brandId === brandId) {
          if (subBrandName && pkg.subBrandPackages) {
            return {
              ...pkg,
              subBrandPackages: pkg.subBrandPackages.map((subPkg) => {
                if (subPkg.subBrandName === subBrandName) {
                  if (type === 'result') {
                    return {
                      ...subPkg,
                      resultIndicators: subPkg.resultIndicators.filter((i) => i.indicatorId !== indicatorId),
                    };
                  } else {
                    return {
                      ...subPkg,
                      processIndicators: subPkg.processIndicators.filter((i) => i.indicatorId !== indicatorId),
                    };
                  }
                }
                return subPkg;
              }),
            };
          } else if (!subBrandName && !pkg.subBrandPackages) {
            if (type === 'result') {
              return {
                ...pkg,
                resultIndicators: pkg.resultIndicators.filter((i) => i.indicatorId !== indicatorId),
              };
            } else {
              return {
                ...pkg,
                processIndicators: pkg.processIndicators.filter((i) => i.indicatorId !== indicatorId),
              };
            }
          }
        }
        return pkg;
      })
    );
  };

  // 处理比例修改
  const handleRatioChange = (brandId: string, indicatorId: string, type: 'result' | 'process', value: number, subBrandName?: string) => {
    setBonusPackages((packages) =>
      packages.map((pkg) => {
        if (pkg.brandId === brandId) {
          if (subBrandName && pkg.subBrandPackages) {
            return {
              ...pkg,
              subBrandPackages: pkg.subBrandPackages.map((subPkg) => {
                if (subPkg.subBrandName === subBrandName) {
                  if (type === 'result') {
                    return {
                      ...subPkg,
                      resultIndicators: subPkg.resultIndicators.map((i) =>
                        i.indicatorId === indicatorId ? { ...i, ratio: Math.max(0, value) } : i
                      ),
                    };
                  } else {
                    return {
                      ...subPkg,
                      processIndicators: subPkg.processIndicators.map((i) =>
                        i.indicatorId === indicatorId ? { ...i, ratio: Math.max(0, value) } : i
                      ),
                    };
                  }
                }
                return subPkg;
              }),
            };
          } else if (!subBrandName && !pkg.subBrandPackages) {
            if (type === 'result') {
              return {
                ...pkg,
                resultIndicators: pkg.resultIndicators.map((i) =>
                  i.indicatorId === indicatorId ? { ...i, ratio: Math.max(0, value) } : i
                ),
              };
            } else {
              return {
                ...pkg,
                processIndicators: pkg.processIndicators.map((i) =>
                  i.indicatorId === indicatorId ? { ...i, ratio: Math.max(0, value) } : i
                ),
              };
            }
          }
        }
        return pkg;
      })
    );
  };

  // 处理总奖金包比例修改
  const handleTotalRatioChange = (brandId: string, value: number, subBrandName?: string) => {
    setBonusPackages((packages) =>
      packages.map((pkg) => {
        if (pkg.brandId === brandId) {
          if (subBrandName && pkg.subBrandPackages) {
            return {
              ...pkg,
              subBrandPackages: pkg.subBrandPackages.map((subPkg) =>
                subPkg.subBrandName === subBrandName ? { ...subPkg, totalRatio: Math.max(0, value) } : subPkg
              ),
            };
          } else if (!subBrandName && !pkg.subBrandPackages) {
            return { ...pkg, totalRatio: Math.max(0, value) };
          }
        }
        return pkg;
      })
    );
  };

  // 获取品牌包数据
  const getBrandPackage = (brandId: string, subBrandName?: string) => {
    const pkg = bonusPackages.find((p) => p.brandId === brandId);
    if (!pkg) return null;
    
    if (subBrandName && pkg.subBrandPackages) {
      return pkg.subBrandPackages.find((sub) => sub.subBrandName === subBrandName) || null;
    } else if (!subBrandName && !pkg.subBrandPackages) {
      return pkg;
    }
    
    return null;
  };

  // 处理自然语言交互
  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');

    // 显示加载消息
    setChatMessages((prev) => [...prev, { role: 'assistant', content: '正在分析您的策略指令并生成调整方案...' }]);

    try {
      // 使用AI服务理解策略指令并生成调整方案
      const adjustmentPlan = await understandStrategyAndAdjust(userMessage, bonusPackages);

      // 应用调整方案
      let updatedPackages = bonusPackages.map((pkg) => {
        const adjustment = adjustmentPlan.adjustments.find(
          (adj) => adj.brandId === pkg.brandId && !adj.subBrandName
        );

        if (adjustment) {
          // 调整主品牌
          if (pkg.subBrandPackages) {
            return {
              ...pkg,
              subBrandPackages: pkg.subBrandPackages.map((sub) => {
                const subAdjustment = adjustmentPlan.adjustments.find(
                  (adj) => adj.brandId === pkg.brandId && adj.subBrandName === sub.subBrandName
                );
                if (subAdjustment) {
                  let updatedSub = {
                    ...sub,
                    totalRatio: Math.max(0, sub.totalRatio + (subAdjustment.totalRatioChange || 0)),
                  };

                  // 调整指标
                  if (subAdjustment.indicatorAdjustments) {
                    subAdjustment.indicatorAdjustments.forEach((indAdj) => {
                      if (indAdj.type === 'result') {
                        updatedSub = {
                          ...updatedSub,
                          resultIndicators: updatedSub.resultIndicators.map((ind) =>
                            ind.indicatorId === indAdj.indicatorId
                              ? { ...ind, ratio: Math.max(0, ind.ratio + indAdj.ratioChange) }
                              : ind
                          ),
                        };
                      } else {
                        updatedSub = {
                          ...updatedSub,
                          processIndicators: updatedSub.processIndicators.map((ind) =>
                            ind.indicatorId === indAdj.indicatorId
                              ? { ...ind, ratio: Math.max(0, ind.ratio + indAdj.ratioChange) }
                              : ind
                          ),
                        };
                      }
                    });
                  }

                  return updatedSub;
                }
                return sub;
              }),
            };
          } else {
            let updatedPkg = {
              ...pkg,
              totalRatio: Math.max(0, pkg.totalRatio + (adjustment.totalRatioChange || 0)),
            };

            // 调整指标
            if (adjustment.indicatorAdjustments) {
              adjustment.indicatorAdjustments.forEach((indAdj) => {
                if (indAdj.type === 'result') {
                  updatedPkg = {
                    ...updatedPkg,
                    resultIndicators: updatedPkg.resultIndicators.map((ind) =>
                      ind.indicatorId === indAdj.indicatorId
                        ? { ...ind, ratio: Math.max(0, ind.ratio + indAdj.ratioChange) }
                        : ind
                    ),
                  };
                } else {
                  updatedPkg = {
                    ...updatedPkg,
                    processIndicators: updatedPkg.processIndicators.map((ind) =>
                      ind.indicatorId === indAdj.indicatorId
                        ? { ...ind, ratio: Math.max(0, ind.ratio + indAdj.ratioChange) }
                        : ind
                    ),
                  };
                }
              });
            }

            return updatedPkg;
          }
        }

        // 处理子品牌调整
        const subAdjustments = adjustmentPlan.adjustments.filter(
          (adj) => adj.brandId === pkg.brandId && adj.subBrandName
        );
        if (subAdjustments.length > 0 && pkg.subBrandPackages) {
          return {
            ...pkg,
            subBrandPackages: pkg.subBrandPackages.map((sub) => {
              const subAdjustment = subAdjustments.find((adj) => adj.subBrandName === sub.subBrandName);
              if (subAdjustment) {
                let updatedSub = {
                  ...sub,
                  totalRatio: Math.max(0, sub.totalRatio + (subAdjustment.totalRatioChange || 0)),
                };

                // 调整指标
                if (subAdjustment.indicatorAdjustments) {
                  subAdjustment.indicatorAdjustments.forEach((indAdj) => {
                    if (indAdj.type === 'result') {
                      updatedSub = {
                        ...updatedSub,
                        resultIndicators: updatedSub.resultIndicators.map((ind) =>
                          ind.indicatorId === indAdj.indicatorId
                            ? { ...ind, ratio: Math.max(0, ind.ratio + indAdj.ratioChange) }
                            : ind
                        ),
                      };
                    } else {
                      updatedSub = {
                        ...updatedSub,
                        processIndicators: updatedSub.processIndicators.map((ind) =>
                          ind.indicatorId === indAdj.indicatorId
                            ? { ...ind, ratio: Math.max(0, ind.ratio + indAdj.ratioChange) }
                            : ind
                        ),
                      };
                    }
                  });
                }

                return updatedSub;
              }
              return sub;
            }),
          };
        }

        return pkg;
      });

      // 确保总奖金包为100%（按比例缩放）
      const currentTotal = updatedPackages.reduce((sum, pkg) => {
        if (pkg.subBrandPackages) {
          return sum + pkg.subBrandPackages.reduce((s, sub) => s + sub.totalRatio, 0);
        }
        return sum + pkg.totalRatio;
      }, 0);

      if (currentTotal !== 100 && currentTotal > 0) {
        const scaleFactor = 100 / currentTotal;
        updatedPackages = updatedPackages.map((pkg) => {
          if (pkg.subBrandPackages) {
            return {
              ...pkg,
              subBrandPackages: pkg.subBrandPackages.map((sub) => ({
                ...sub,
                totalRatio: sub.totalRatio * scaleFactor,
                resultIndicators: sub.resultIndicators.map((ind) => ({
                  ...ind,
                  ratio: ind.ratio * scaleFactor,
                })),
                processIndicators: sub.processIndicators.map((ind) => ({
                  ...ind,
                  ratio: ind.ratio * scaleFactor,
                })),
              })),
            };
          } else {
            return {
              ...pkg,
              totalRatio: pkg.totalRatio * scaleFactor,
              resultIndicators: pkg.resultIndicators.map((ind) => ({
                ...ind,
                ratio: ind.ratio * scaleFactor,
              })),
              processIndicators: pkg.processIndicators.map((ind) => ({
                ...ind,
                ratio: ind.ratio * scaleFactor,
              })),
            };
          }
        });
      }

      setBonusPackages(updatedPackages);

      // 生成响应消息
      const response = `${adjustmentPlan.explanation}\n\n调整后总奖金包：${adjustmentPlan.totalRatioAfter.toFixed(1)}%`;
      setChatMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'assistant', content: response };
        return newMessages;
      });
    } catch (error) {
      console.error('Failed to process instruction:', error);
      setChatMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: '抱歉，处理您的指令时出现错误。请尝试更具体的指令，如"发展Non-CV产品，结果指标给多一点"。',
        };
        return newMessages;
      });
    }

    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);

  return (
    <div className="space-y-6">
      {/* 功能说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">功能说明</h3>
              <p className="text-sm text-blue-800 mb-2">
                基于指标规划板块确定的考核指标，通过拖拽添加/更换指标，通过自然语言交互调节不同奖金包的比重。
                对于包含子品牌的品牌，表头合并显示，数据行按子品牌分列。
                支持策略性指令，如"发展Non-CV产品，结果指标给多一点"，系统将自动调整比例并保持总奖金包为100%。
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-700 font-medium">总奖金包：</span>
                  <span className="text-blue-600 font-bold">{totalRatio.toFixed(1)}%</span>
                </div>
                <button
                  onClick={() => setShowChat(!showChat)}
                  className={clsx(
                    'flex items-center space-x-2 px-3 py-1 rounded-lg text-sm',
                    showChat
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-blue-600 border border-blue-300 hover:bg-blue-50'
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{showChat ? '隐藏对话' : '自然语言调节'}</span>
                </button>
              </div>
            </div>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Edit2 className="w-4 h-4" />
              <span>编辑</span>
            </button>
          )}
          {isEditing && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                <span>保存</span>
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                <X className="w-4 h-4" />
                <span>取消</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 自然语言交互面板 */}
      {showChat && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-3">自然语言调节奖金包</h4>
          <div className="bg-gray-50 rounded-lg p-3 mb-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {chatMessages.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                请输入策略性指令，例如：
                <br />
                "发展Non-CV产品，结果指标给多一点"
                <br />
                "重点支持疼痛品牌，提高过程指标权重"
                <br />
                "将立普妥的总奖金包比例增加5%"
              </p>
            ) : (
              <div className="space-y-2">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={clsx(
                      'p-2 rounded text-sm',
                      msg.role === 'user' ? 'bg-primary-100 text-primary-900 ml-8' : 'bg-white text-gray-700 mr-8'
                    )}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
              placeholder="输入指令..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
            <button
              onClick={handleChatSubmit}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              发送
            </button>
          </div>
        </div>
      )}

      {/* 可用指标池（可拖拽） */}
      {isEditing && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h4 className="font-semibold text-gray-900 mb-3">可用指标池（拖拽到表格中添加）</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {availableIndicators.map((indicator) => (
              <div
                key={indicator.id}
                draggable
                onDragStart={(e) => handleDragStart(e, 'available', indicator.id)}
                onDragEnd={handleDragEnd}
                className="p-2 bg-gray-50 border border-gray-200 rounded cursor-move hover:bg-gray-100 text-sm"
              >
                <div className="flex items-center space-x-1">
                  <GripVertical className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-700">{indicator.name}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {indicator.type === 'result' ? '结果指标' : '过程指标'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 奖金包表格 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className="bg-gray-50 border-b border-gray-200">
            {/* 第一行：品牌名称（合并单元格） */}
            <tr>
              <th rowSpan={2} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 sticky left-0 bg-gray-50 z-20 border-r-2 border-gray-300 shadow-sm">
                指标类型
              </th>
              {TEN_BRANDS.map((brand) => {
                if (brand.subBrands && brand.subBrands.length > 0) {
                  return (
                    <th
                      key={brand.id}
                      colSpan={brand.subBrands.length}
                      className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-r border-gray-200 last:border-r-0 bg-primary-50"
                    >
                      <div>{brand.name}</div>
                      <div className="text-xs text-gray-500 mt-1">({brand.subBrands.join('/')})</div>
                    </th>
                  );
                } else {
                  return (
                    <th
                      key={brand.id}
                      rowSpan={2}
                      className="px-4 py-3 text-center text-sm font-semibold text-gray-900 min-w-[120px] border-r border-gray-200 last:border-r-0"
                    >
                      {brand.name}
                    </th>
                  );
                }
              })}
            </tr>
            {/* 第二行：子品牌名称 */}
            <tr>
              {TEN_BRANDS.map((brand) => {
                if (brand.subBrands && brand.subBrands.length > 0) {
                  return brand.subBrands.map((subBrand) => (
                    <th
                      key={`${brand.id}-${subBrand}`}
                      className="px-4 py-2 text-center text-xs font-medium text-gray-700 border-r border-gray-200 last:border-r-0 bg-primary-50"
                    >
                      {subBrand}
                    </th>
                  ));
                }
                return null;
              })}
            </tr>
          </thead>
          <tbody>
            {/* 总奖金包 */}
            <tr className="border-b border-gray-200 bg-primary-50">
              <td className="px-4 py-3 text-sm font-semibold text-gray-900 sticky left-0 bg-primary-50 z-20 border-r-2 border-gray-300 shadow-sm">
                总奖金包
              </td>
              {allColumns
                .filter((col) => !col.colspan) // 只显示数据列，不显示合并的表头列
                .map((col) => {
                  const pkg = getBrandPackage(col.brandId, col.subBrandName);
                  return (
                    <td
                      key={`${col.brandId}-${col.subBrandName || 'main'}`}
                      className="px-4 py-3 text-center border-r border-gray-200 last:border-r-0"
                    >
                      {isEditing ? (
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={pkg?.totalRatio || 0}
                          onChange={(e) => handleTotalRatioChange(col.brandId, parseFloat(e.target.value) || 0, col.subBrandName)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm font-semibold"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-primary-700">{(pkg?.totalRatio || 0).toFixed(1)}%</span>
                      )}
                    </td>
                  );
                })}
            </tr>

            {/* 结果指标 */}
            <tr className="border-b-2 border-gray-300 bg-green-50">
              <td className="px-4 py-2 text-sm font-semibold text-gray-900 sticky left-0 bg-green-50 z-20 border-r-2 border-gray-300 shadow-sm">
                结果指标
              </td>
              {allColumns
                .filter((col) => !col.colspan)
                .map((col) => {
                  const pkg = getBrandPackage(col.brandId, col.subBrandName);
                  return (
                    <td
                      key={`${col.brandId}-${col.subBrandName || 'main'}`}
                      className="px-4 py-2 border-r border-gray-200 last:border-r-0"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('bg-green-100');
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('bg-green-100');
                      }}
                      onDrop={(e) => {
                        e.currentTarget.classList.remove('bg-green-100');
                        handleDrop(e, col.brandId, col.subBrandName, 'result');
                      }}
                    >
                      <div className="min-h-[40px] space-y-1">
                        {pkg?.resultIndicators.map((indicator) => (
                          <div
                            key={indicator.indicatorId}
                            draggable={isEditing}
                            onDragStart={(e) => handleDragStart(e, 'indicator', indicator.indicatorId, col.brandId, col.subBrandName)}
                            onDragEnd={handleDragEnd}
                            className="flex items-center justify-between p-1 bg-white border border-gray-200 rounded text-xs group hover:border-primary-300"
                          >
                            <div className="flex items-center space-x-1 flex-1 min-w-0">
                              {isEditing && <GripVertical className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                              <span className="text-gray-700 truncate">{indicator.indicatorName}</span>
                            </div>
                            {isEditing ? (
                              <div className="flex items-center space-x-1 flex-shrink-0">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={indicator.ratio}
                                  onChange={(e) =>
                                    handleRatioChange(col.brandId, indicator.indicatorId, 'result', parseFloat(e.target.value) || 0, col.subBrandName)
                                  }
                                  className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                  onClick={() => handleDeleteIndicator(col.brandId, indicator.indicatorId, 'result', col.subBrandName)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-green-700 flex-shrink-0 ml-1">
                                {indicator.ratio.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        ))}
                        {isEditing && (
                          <div className="text-xs text-gray-400 text-center py-1 border-2 border-dashed border-gray-300 rounded">
                            拖拽指标到此处
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
            </tr>

            {/* 过程指标 */}
            <tr>
              <td className="px-4 py-2 text-sm font-semibold text-gray-900 sticky left-0 bg-blue-50 z-20 border-r-2 border-gray-300 shadow-sm">
                过程指标
              </td>
              {allColumns
                .filter((col) => !col.colspan)
                .map((col) => {
                  const pkg = getBrandPackage(col.brandId, col.subBrandName);
                  return (
                    <td
                      key={`${col.brandId}-${col.subBrandName || 'main'}`}
                      className="px-4 py-2 border-r border-gray-200 last:border-r-0"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('bg-blue-100');
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('bg-blue-100');
                      }}
                      onDrop={(e) => {
                        e.currentTarget.classList.remove('bg-blue-100');
                        handleDrop(e, col.brandId, col.subBrandName, 'process');
                      }}
                    >
                      <div className="min-h-[40px] space-y-1">
                        {pkg?.processIndicators.map((indicator) => (
                          <div
                            key={indicator.indicatorId}
                            draggable={isEditing}
                            onDragStart={(e) => handleDragStart(e, 'indicator', indicator.indicatorId, col.brandId, col.subBrandName)}
                            onDragEnd={handleDragEnd}
                            className="flex items-center justify-between p-1 bg-white border border-gray-200 rounded text-xs group hover:border-primary-300"
                          >
                            <div className="flex items-center space-x-1 flex-1 min-w-0">
                              {isEditing && <GripVertical className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                              <span className="text-gray-700 truncate">{indicator.indicatorName}</span>
                            </div>
                            {isEditing ? (
                              <div className="flex items-center space-x-1 flex-shrink-0">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={indicator.ratio}
                                  onChange={(e) =>
                                    handleRatioChange(col.brandId, indicator.indicatorId, 'process', parseFloat(e.target.value) || 0, col.subBrandName)
                                  }
                                  className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                  onClick={() => handleDeleteIndicator(col.brandId, indicator.indicatorId, 'process', col.subBrandName)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-semibold text-blue-700 flex-shrink-0 ml-1">
                                {indicator.ratio.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        ))}
                        {isEditing && (
                          <div className="text-xs text-gray-400 text-center py-1 border-2 border-dashed border-gray-300 rounded">
                            拖拽指标到此处
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
