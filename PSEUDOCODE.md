# GeminiDebateGame 核心逻辑伪代码

本文档基于 `SPECIFICATION.md` 和 `ARCHITECTURE.md`，为 `GeminiDebateGame` 应用的核心功能提供详细的伪代码。

---

## 1.0 状态管理 (`store.ts` / `useAppStore.ts`)

基于 `Zustand` 的状态管理，这是整个应用的数据和逻辑中枢。

```pseudocode
// FILE: src/store/useAppStore.ts

// --- 类型定义 ---
// TDD: test_type_definitions_are_correct
type Role = "Cognito" | "Muse" | "User" | "System";
type DebateTurn = {
  id: string; // 用于 React key
  role: Role;
  content: string;
  isError?: boolean; // 标记此条消息是否为错误消息
};

type AppConfig = {
  model: "gemini-1.5-pro" | "gemini-1.5-flash";
  discussionMode: "fixed-turn" | "ai-driven";
  maxTurns: number; // 仅在 fixed-turn 模式下使用
};

type AppState = {
  // --- 核心状态 ---
  debateHistory: DebateTurn[];
  sharedNotepadContent: string;
  currentQuery: { text: string; imageBase64?: string };
  appConfig: AppConfig;
  
  // --- UI/流程控制状态 ---
  isLoading: boolean; // 全局加载状态，用于控制 UI
  isStreaming: boolean; // 标记 AI 是否正在流式输出
  isStopped: boolean; // 标记用户是否手动停止
  errorState: { hasError: boolean; message: string; failedTurnId?: string };
  
  // --- Action/Setter 函数 ---
  
  // 初始化/重置
  startNewDebate: (queryText: string, imageBase64?: string) => void;
  
  // 辩论过程更新
  addTurnToHistory: (turn: Omit<DebateTurn, "id">) => string; // 返回新回合的 ID
  updateTurnContent: (turnId: string, chunk: string) => void; // 用于流式更新
  updateNotepad: (newContent: string) => void;
  
  // 状态控制
  setLoading: (status: boolean) => void;
  setStreaming: (status: boolean) => void;
  stopGeneration: () => void;
  
  // 错误处理
  setError: (error: { message: string; failedTurnId?: string }) => void;
  clearError: () => void;
  
  // 配置
  updateConfig: (newConfig: Partial<AppConfig>) => void;
};

// --- Zustand Store 实现 ---
function createStore():
  // TDD: test_initial_state_is_set_correctly
  initialState = {
    debateHistory: [],
    sharedNotepadContent: "",
    currentQuery: { text: "" },
    appConfig: { model: "gemini-1.5-pro", discussionMode: "fixed-turn", maxTurns: 3 },
    isLoading: false,
    isStreaming: false,
    isStopped: false,
    errorState: { hasError: false, message: "" },
  }

  // --- Action 实现 ---
  
  function startNewDebate(queryText, imageBase64):
    // TDD: test_startNewDebate_resets_state_and_sets_query
    set_state({
      debateHistory: [{ id: generateId(), role: "User", content: queryText }],
      sharedNotepadContent: "",
      currentQuery: { text: queryText, imageBase64: imageBase64 },
      isLoading: true,
      isStopped: false,
      errorState: { hasError: false, message: "" }
    })
    // 触发 DebateManager 开始辩论
    // (在 App.tsx 中通过 useEffect 监听 currentQuery 的变化来触发)

  function addTurnToHistory(turnData):
    // TDD: test_addTurnToHistory_adds_new_turn_with_unique_id
    newTurn = { ...turnData, id: generateId() }
    set_state(state => ({
      debateHistory: [...state.debateHistory, newTurn]
    }))
    return newTurn.id

  function updateTurnContent(turnId, chunk):
    // TDD: test_updateTurnContent_appends_content_to_correct_turn
    set_state(state => ({
      debateHistory: state.debateHistory.map(turn => 
        turn.id === turnId ? { ...turn, content: turn.content + chunk } : turn
      )
    }))

  function updateNotepad(newContent):
    // TDD: test_updateNotepad_appends_content
    set_state(state => ({
      sharedNotepadContent: state.sharedNotepadContent + "\n\n---\n\n" + newContent
    }))

  function stopGeneration():
    // TDD: test_stopGeneration_sets_isStopped_flag
    set_state({ isStopped: true, isStreaming: false })
    // AbortController 的调用在 ApiService 中处理

  function setError(error):
    // TDD: test_setError_updates_errorState_correctly
    set_state({
      errorState: { hasError: true, message: error.message, failedTurnId: error.failedTurnId },
      isLoading: false,
      isStreaming: false
    })

  // ... 其他 setter 函数的简单实现
end function
```

---

## 2.0 API 服务 (`geminiService.ts`)

封装所有与 Gemini API 的交互，包括请求构建、流式处理、错误处理和中断逻辑。

```pseudocode
// FILE: src/services/geminiService.ts

// --- 全局 AbortController ---
let abortController = new AbortController();

function getAbortController():
  return abortController

function abortCurrentRequest():
  // TDD: test_abortCurrentRequest_calls_abort_on_controller
  abortController.abort()

// --- 主 API 调用函数 ---
async function* generateResponseStream(
  prompt: string,
  history: DebateTurn[],
  imageParts: any[], // 格式化后的图片数据
  apiKey: string,
  model: string,
  retryCount = 3
): AsyncGenerator<string, void, unknown>

  // TDD: test_generateResponseStream_creates_new_abort_controller
  abortController = new AbortController();
  
  // 1. 构建请求体
  // TDD: test_request_body_is_formatted_correctly_for_multimodal_input
  requestBody = {
    contents: [
      ...formatHistoryForApi(history),
      {
        role: "user",
        parts: [{ text: prompt }, ...imageParts]
      }
    ],
    generationConfig: { ... },
    safetySettings: { ... }
  }

  // 2. 实现带重试的 Fetch
  for attempt from 1 to retryCount:
    try:
      // TDD: test_fetch_includes_abort_signal
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: abortController.signal
      })

      if not response.ok:
        // TDD: test_non_ok_response_throws_api_error
        throw new ApiError(response.status, await response.text())

      // 3. 处理流式响应
      // TDD: test_stream_is_decoded_and_yielded_correctly
      for await (chunk of decodeStream(response.body)):
        yield chunk
      
      return // 成功，退出重试循环

    catch error:
      if error.name is 'AbortError':
        // TDD: test_abort_error_is_handled_gracefully
        console.log("Request aborted by user.")
        return // 正常终止，不抛出错误
      
      if attempt >= retryCount:
        // TDD: test_error_is_thrown_after_all_retries_fail
        throw new NetworkError(`API call failed after ${retryCount} attempts: ${error.message}`)
      
      // TDD: test_retry_logic_waits_with_exponential_backoff
      await wait(2 ** attempt * 100) // 指数退避

end function

// --- 辅助函数 ---
function formatHistoryForApi(history):
  // 将我们的 DebateTurn[] 格式化为 Gemini API 需要的 content[] 格式
  // TDD: test_history_is_formatted_correctly_for_api
  // ...
  return formattedHistory

function decodeStream(stream):
  // 解码 SSE (Server-Sent Events) 流并提取文本内容
  // TDD: test_sse_stream_is_parsed_correctly
  // ...
  return decodedContentGenerator
```

---

## 3.0 辩论管理器 (`DebateManager.ts` / hook)

这是编排整个辩论流程的核心逻辑。它可以是一个 hook (`useDebateManager`)，在 `App.tsx` 中被调用。

```pseudocode
// FILE: src/hooks/useDebateManager.ts

function useDebateManager():
  // 从 Zustand store 获取状态和 actions
  store = useAppStore()

  // --- 主辩论循环 ---
  async function runDebate():
    if not store.isLoading or store.isStreaming:
      return

    try:
      // 固定轮次模式
      if store.appConfig.discussionMode is "fixed-turn":
        // TDD: test_fixed_turn_loop_runs_for_maxTurns
        for turnNumber from 1 to store.appConfig.maxTurns:
          // 如果用户中途停止，则退出循环
          if store.isStopped: break

          // Cognito's Turn
          await executeTurn("Cognito")
          if store.isStopped or store.errorState.hasError: break

          // Muse's Turn
          await executeTurn("Muse")
          if store.isStopped or store.errorState.hasError: break
      
      // AI 驱动模式 (未来扩展)
      else if store.appConfig.discussionMode is "ai-driven":
        // TDD: test_ai_driven_mode_terminates_on_end_condition
        // ... 逻辑待定 ...
        // 可能需要检查 AI 的输出是否包含 <DEBATE_END> 标志

      // --- 生成最终摘要 ---
      if not store.isStopped and not store.errorState.hasError:
        // TDD: test_final_summary_is_generated_after_debate
        await executeTurn("System") // "System" 角色用于生成摘要

    catch error:
      // TDD: test_debate_manager_handles_errors_from_api_service
      store.setError({ message: error.message })
    
    finally:
      // TDD: test_loading_and_streaming_flags_are_reset_at_end
      store.setLoading(false)
      store.setStreaming(false)

  // --- 单个回合的执行逻辑 ---
  async function executeTurn(role: Role):
    store.setStreaming(true)
    
    // 1. 添加一个空的回合到历史记录中，获取其 ID
    // TDD: test_empty_turn_is_added_before_api_call
    turnId = store.addTurnToHistory({ role: role, content: "" })

    try:
      // 2. 构建提示
      // TDD: test_prompt_includes_history_and_notepad
      prompt = createPromptFor(role, store.debateHistory, store.sharedNotepadContent)
      
      // 3. 准备多模态输入 (仅在第一轮给 Cognito 时使用)
      imageParts = []
      if role is "Cognito" and store.debateHistory.length <= 2 and store.currentQuery.imageBase64:
        // TDD: test_image_is_included_only_in_first_cognito_turn
        imageParts = [{ inline_data: { mime_type: "image/jpeg", data: store.currentQuery.imageBase64 } }]

      // 4. 调用 API 服务
      stream = geminiService.generateResponseStream(prompt, store.debateHistory, imageParts, ...)
      
      // 5. 处理流式响应
      fullResponse = ""
      for await (chunk of stream):
        if store.isStopped: break // 检查用户是否已停止
        store.updateTurnContent(turnId, chunk)
        fullResponse += chunk
      
      // 6. 如果辩论没有被中途停止，则更新记事本
      if not store.isStopped:
        // TDD: test_notepad_is_updated_after_successful_turn
        store.updateNotepad(fullResponse)

    catch error:
      // TDD: test_error_in_turn_is_caught_and_set_in_store
      store.setError({ message: `Error during ${role}'s turn: ${error.message}`, failedTurnId: turnId })
      // 在 UI 上，可以将 failedTurnId 对应的消息渲染为错误状态
    
    finally:
      store.setStreaming(false)

  // --- 返回触发器 ---
  return { runDebate }

end function

// --- 提示构建辅助函数 ---
function createPromptFor(role, history, notepad):
  // 根据角色、历史和记事本内容生成特定的提示
  // TDD: test_cognito_prompt_is_logical_and_factual
  // TDD: test_muse_prompt_is_skeptical_and_critical
  // TDD: test_summary_prompt_requests_synthesis
  // ...
  return prompt
```

---

## 4.0 主应用流程 (`App.tsx`)

作为根组件，负责协调 UI 和业务逻辑。

```pseudocode
// FILE: src/App.tsx

function App():
  // --- Hooks ---
  // 从 store 获取所需的状态和 actions
  // TDD: test_app_subscribes_to_zustand_store
  const { 
    debateHistory, 
    sharedNotepadContent, 
    isLoading, 
    isStreaming,
    errorState,
    startNewDebate,
    // ... 其他需要的 state 和 actions
  } = useAppStore(selector)

  // 获取辩论管理器的触发器
  const { runDebate } = useDebateManager()

  // --- Effects ---
  // 监听查询变化以启动辩论
  // TDD: test_useEffect_triggers_runDebate_on_query_change
  useEffect(() => {
    if (isLoading and debateHistory.length === 1) { // 仅在辩论开始时触发
      runDebate()
    }
  }, [isLoading, debateHistory.length])

  // --- 事件处理函数 ---
  function handleUserSubmit(queryText, imageFile):
    // TDD: test_handleUserSubmit_converts_image_and_calls_startNewDebate
    let imageBase64 = null
    if imageFile:
      imageBase64 = await convertFileToBase64(imageFile)
    
    startNewDebate(queryText, imageBase64)

  function handleStopGeneration():
    // TDD: test_handleStopGeneration_calls_abort_and_updates_store
    geminiService.abortCurrentRequest()
    useAppStore.getState().stopGeneration()

  function handleManualRetry():
    // TDD: test_handleManualRetry_re_runs_debate_logic
    // 简单实现：重新运行整个辩论
    // 复杂实现：从失败点恢复（需要更多状态快照逻辑）
    useAppStore.getState().clearError()
    runDebate()

  // --- 渲染逻辑 ---
  return (
    <Layout>
      <ConfigPanel />
      <MainContent>
        <ChatInterface 
          history={debateHistory} 
          isLoading={isLoading}
          isStreaming={isStreaming}
        />
        <UserInput 
          onSubmit={handleUserSubmit} 
          disabled={isLoading} 
        />
        <ControlBar
          onStop={handleStopGeneration}
          onRetry={handleManualRetry}
          showStopButton={isStreaming}
          showRetryButton={errorState.hasError}
        />
      </MainContent>
      <Notepad content={sharedNotepadContent} />
    </Layout>
  )
end function