import React, { useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { DEBATE_MODES } from '../../../../constants';
import { DebateMode, ModelName, BudgetMode } from '../../../../types';

const ConfigPanel: React.FC = () => {
  const {
    apiKey,
    setApiKey,
    model,
    setModel,
    debateMode,
    setDebateMode,
    budget,
    setBudget,
    availableModels,
    isModelsLoading,
    fetchModels,
  } = useAppStore();

  useEffect(() => {
    if (apiKey) {
      fetchModels(apiKey);
    }
  }, [apiKey, fetchModels]);

  const handleBudgetChange = () => {
    setBudget(budget === 'premium' ? 'standard' : 'premium');
  };

  return (
    <div className="config-panel p-4 border rounded-lg shadow-lg bg-white">
      <h2 className="text-xl font-bold mb-4">配置</h2>

      {/* API Key Input */}
      <div className="mb-4">
        <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">
          API 密钥
        </label>
        <input
          type="password"
          id="api-key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="请输入您的 Gemini API 密钥"
        />
      </div>

      {/* Model Selection */}
      <div className="mb-4">
        <label htmlFor="model-select" className="block text-sm font-medium text-gray-700">
          选择模型
        </label>
        <select
          id="model-select"
          value={model}
          onChange={(e) => setModel(e.target.value as ModelName)}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          disabled={isModelsLoading || availableModels.length === 0}
        >
          {isModelsLoading ? (
            <option>正在加载模型...</option>
          ) : availableModels.length > 0 ? (
            availableModels.map((m) => (
              <option key={m.name} value={m.name}>
                {m.displayName}
              </option>
            ))
          ) : (
            <option>请输入有效的 API 密钥以加载模型</option>
          )}
        </select>
      </div>

      {/* Debate Mode Selection */}
      <div className="mb-4">
        <span className="block text-sm font-medium text-gray-700">讨论模式</span>
        <div className="mt-2 flex items-center">
          <input
            id="fixed-rounds"
            name="debate-mode"
            type="radio"
            value={DEBATE_MODES.FIXED_ROUNDS}
            checked={debateMode === DEBATE_MODES.FIXED_ROUNDS}
            onChange={(e) => setDebateMode(e.target.value as DebateMode)}
            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
          />
          <label htmlFor="fixed-rounds" className="ml-3 block text-sm font-medium text-gray-700">
            固定轮次
          </label>
        </div>
        <div className="mt-2 flex items-center">
          <input
            id="ai-driven"
            name="debate-mode"
            type="radio"
            value={DEBATE_MODES.AI_DRIVEN}
            checked={debateMode === DEBATE_MODES.AI_DRIVEN}
            onChange={(e) => setDebateMode(e.target.value as DebateMode)}
            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
          />
          <label htmlFor="ai-driven" className="ml-3 block text-sm font-medium text-gray-700">
            AI 驱动
          </label>
        </div>
      </div>

      {/* Budget Control Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">预算控制 (优质/标准)</span>
        <button
          onClick={handleBudgetChange}
          className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
            budget === 'premium' ? 'bg-indigo-600' : 'bg-gray-200'
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
              budget === 'premium' ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;