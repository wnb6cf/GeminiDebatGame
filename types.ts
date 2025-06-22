/**
 * @file Centralized type definitions for the Gemini Debate Game application.
 */

// --- 核心角色与身份定义 ---

/**
 * 定义了对话中可能出现的角色。
 * - `Cognito`: 代表逻辑与事实的 AI。
 * - `Muse`: 代表批判性与创造性思维的 AI。
 * - `User`: 代表人类用户。
 * - `System`: 代表系统消息，如摘要、错误信息等。
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
export type ModelName = "gemini-1.5-pro" | "gemini-1.5-flash";

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
 * 定义了预算控制的两种模式。
 */
export type BudgetMode = "premium" | "standard";

/**
 * 从 API 返回的单个模型的信息。
 */
export interface ModelInfo {
  name: string; // e.g., "models/gemini-1.5-pro-latest"
  displayName: string;
  description: string;
}


// --- 数据结构定义 ---

/**
 * 定义了辩论中发言者的角色。
 */
export enum SpeakerRole {
  PRO = '正方',
  CON = '反方',
}

/**
 * 代表辩论中的一个论点。
 */
export interface Argument {
  id: string;
  speaker: SpeakerRole;
  content: string;
  timestamp: number;
  isUserArgument?: boolean;
}

/**
 * 代表辩论中的一个独立回合或一条消息。
 */
export interface DiscussionTurn {
  id: string;          // 用于 React key 的唯一标识符
  role: Role;          // 发言者的角色
  content: string;     // 消息的具体内容
  isError?: boolean;   // 标记此消息是否为错误消息
}

/**
 * 应用的核心配置选项。
 */
export interface AppConfig {
  model: ModelName;
  discussionMode: DebateMode;
  maxTurns: number;
}


// --- 状态管理 (Zustand Store) 相关类型 ---

/**
 * 定义了应用的核心状态。
 */
export interface AppState {
  // 配置状态
  apiKey: string;
  model: ModelName;
  debateMode: DebateMode;
  budget: BudgetMode;
  maxTurns: number;
  availableModels: ModelInfo[];
  isModelsLoading: boolean;

  // 运行状态
  discussionLog: DiscussionTurn[];
  notepadContent: string;
  currentQuery: { text: string; imageBase64?: string };
  isLoading: boolean;
  isStreaming: boolean;
  isStopped: boolean;
  errorState: { hasError: boolean; message: string; failedTurnId?: string };
}

/**
 * 定义了可以对状态执行的所有操作。
 */
export interface AppActions {
  // 配置操作
  setApiKey: (key: string) => void;
  setModel: (model: ModelName) => void;
  setDebateMode: (mode: DebateMode) => void;
  setBudget: (budget: BudgetMode) => void;
  fetchModels: (apiKey: string) => Promise<void>;

  // 运行操作
  startNewDiscussion: (queryText: string, imageBase64?: string) => void;
  addTurn: (turn: Omit<DiscussionTurn, "id">) => string;
  updateTurnContent: (turnId: string, chunk: string) => void;
  updateNotepad: (newContent: string) => void;
  setLoading: (status: boolean) => void;
  setStreaming: (status: boolean) => void;
  stopGeneration: () => void;
  setError: (error: { message: string; failedTurnId?: string }) => void;
  clearError: () => void;
}

/**
 * 将状态和操作合并为完整的 Store 类型。
 */
export type StoreState = AppState & AppActions;