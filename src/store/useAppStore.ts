import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { StoreState, AppState, DiscussionTurn, ModelInfo } from '../../types';
import * as geminiService from '../services/geminiService';

// --- Zustand Store 实现 ---
export const useAppStore = create<StoreState>((set, get) => ({
  // --- 初始状态 (扁平化) ---
  // 配置状态
  apiKey: "",
  model: "gemini-1.5-pro",
  debateMode: "fixed-turn",
  budget: "premium",
  maxTurns: 3,
  availableModels: [],
  isModelsLoading: false,

  // 运行状态
  discussionLog: [],
  notepadContent: "",
  currentQuery: { text: "" },
  isLoading: false,
  isStreaming: false,
  isStopped: false,
  errorState: { hasError: false, message: "" },

  // --- Action 实现 ---
  // 配置操作
  setApiKey: (key) => set({ apiKey: key }),
  setModel: (model) => set({ model: model }),
  setDebateMode: (mode) => set({ debateMode: mode }),
  setBudget: (budget) => set({ budget: budget }),
  fetchModels: async (apiKey) => {
    if (!apiKey) return;
    set({ isModelsLoading: true });
    try {
      const models = await geminiService.fetchAvailableModels(apiKey);
      set({ availableModels: models, isModelsLoading: false });
    } catch (error) {
      console.error("Failed to fetch models:", error);
      set({ isModelsLoading: false, availableModels: [] });
      // Optionally, set an error state in the store
    }
  },

  // 运行操作
  startNewDiscussion: (queryText: string, imageBase64?: string) => {
    set({
      discussionLog: [{ id: uuidv4(), role: "User", content: queryText }],
      notepadContent: "",
      currentQuery: { text: queryText, imageBase64: imageBase64 },
      isLoading: true,
      isStopped: false,
      errorState: { hasError: false, message: "" }
    });
  },

  addTurn: (turnData: Omit<DiscussionTurn, "id">) => {
    const newTurn = { ...turnData, id: uuidv4() };
    set((state: AppState) => ({
      discussionLog: [...state.discussionLog, newTurn]
    }));
    return newTurn.id;
  },

  updateTurnContent: (turnId: string, chunk: string) => {
    set((state: AppState) => ({
      discussionLog: state.discussionLog.map((turn: DiscussionTurn) =>
        turn.id === turnId ? { ...turn, content: turn.content + chunk } : turn
      )
    }));
  },

  updateNotepad: (newContent: string) => {
    set((state: AppState) => ({
      notepadContent: state.notepadContent + "\n\n---\n\n" + newContent
    }));
  },

  setLoading: (status: boolean) => set({ isLoading: status }),

  setStreaming: (status: boolean) => set({ isStreaming: status }),

  stopGeneration: () => {
    set({ isStopped: true, isStreaming: false });
  },

  setError: (error: { message: string; failedTurnId?: string }) => {
    set({
      errorState: { hasError: true, message: error.message, failedTurnId: error.failedTurnId },
      isLoading: false,
      isStreaming: false
    });
  },

  clearError: () => {
    set({ errorState: { hasError: false, message: "", failedTurnId: undefined } });
  },

  // (此处省略了其他未改变的 actions)
}));