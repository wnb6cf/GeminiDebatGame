/**
 * @file Centralized type definitions for the Gemini Debate Game application.
 */

// --- 核心角色与身份定义 ---

/**
 * 定义了辩论中可能出现的角色。
 */
export type Role = "Cognito" | "Muse" | "User" | "System";

/**
 * 定义了两个 AI 对手的具体身份。
 */
export type AICharacter = "Cognito" | "Muse";


// --- 配置与状态相关 ---

/**
 * 定义了可用的 Gemini 模型名称。
 */
export type ModelName = "gemini-1.5-pro" | "gemini-1.5-flash" | string;

/**
 * 定义了辩论的两种主要模式。
 */
export type DebateMode = "fixed-turn" | "ai-driven";

/**
 * 定义了游戏的两种模式。
 */
export enum GameMode {
  AI_VS_AI = 'AI_VS_AI',
  HUMAN_VS_AI = 'HUMAN_VS_AI',
}

/**
 * 定义了辩论中发言者的角色。
 */
export enum SpeakerRole {
  PRO = '正方',
  CON = '反方',
  SYSTEM = 'System',
}

// --- 评委与评分相关 ---

export interface ScoreDimensions {
  contentAndArgumentation: number;
  expressionAndTechnique: number;
  reactionAndAdaptability: number;
  presence: number;
}

export interface JudgeOutput {
  roundSummaries: { roundNumber: number; summary: string }[];
  overallSummary: string;
  proScores: {
    dimensions: ScoreDimensions;
    average: number;
  };
  conScores: {
    dimensions: ScoreDimensions;
    average: number;
  };
}

// --- 数据结构定义 ---

/**
 * 代表辩论中的一个论点。
 */
export interface Argument {
  id: string;
  speaker: SpeakerRole | 'System'; // Allow for system messages in the log
  content: string;
  timestamp: Date;
  isUserArgument?: boolean;
  judgeCommentData?: JudgeOutput;
}

/**
 * 代表一条完整的历史辩论记录。
 */
export interface HistoricalDebateEntry {
  id: string;
  topic: string;
  gameMode: GameMode;
  createdAt: string;
  lastSavedAt: string;
  debateLog: Argument[];
  humanSpeakerRole: SpeakerRole.PRO | null;
  finalTurnCount: number;
  finalPromptTokensUsed: number;
  finalCandidatesTokensUsed: number;
  finalTotalTokensUsed: number;
  judgeOutputSnapshot?: JudgeOutput;
  currentSpeakerNext: SpeakerRole;
}


// --- 状态管理 (React State) ---

/**
 * 定义了应用的核心状态。
 */
export interface DebateState {
  topic: string;
  isDebateActive: boolean;
  proChat: any; // Type from GoogleGenAI Chat
  conChat: any; // Type from GoogleGenAI Chat
  debateLog: Argument[];
  currentSpeakerToTalk: SpeakerRole;
  turnCount: number;
  isLoading: boolean;
  errorMessage: string | null;
  
  // Judge related state
  isJudgeModalOpen: boolean;
  judgeOutput: JudgeOutput | null;
  isJudgeLoading: boolean;
  judgeErrorMessage: string | null;

  // Game mode state
  gameMode: GameMode | null;
  humanSpeakerRole: SpeakerRole.PRO | null;
  isHumanTurn: boolean;
  humanInput: string;

  // API Key Settings
  userApiKey: string | null;
  apiKeyInput: string;
  apiProxyUrl: string | null;
  apiProxyUrlInput: string;
  showApiKeySettings: boolean;
  
  // Model Selection
  availableModels: { id: string, displayName: string }[];
  selectedModel: ModelName;
  isModelsLoading: boolean;

  // Token Usage
  promptTokensUsed: number;
  candidatesTokensUsed: number;
  totalTokensUsed: number;
  
  // Last API Call Token Usage
  lastCallPromptTokens: number;
  lastCallCandidatesTokens: number;
  lastCallTotalTokens: number;

  // History Feature
  historicalDebates: HistoricalDebateEntry[];
  showHistoryView: boolean;
  currentDebateId: string | null;
  viewingHistoricalDebateId: string | null;

  // Token Display UI
  isTokenDisplayMinimized: boolean;
}
