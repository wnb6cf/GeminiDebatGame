# GeminiDebateGame 重构规范文档

## 1.0 项目概述

本文档旨在为 `GeminiDebateGame` 应用的重构提供详细的功能和技术规范。核心目标是创建一个由双 AI 辩论驱动、支持多模态输入、高度可配置且健壮的对话系统，旨在减少 AI 幻觉并为用户提供更深入、多角度的答案。

---

## 2.0 核心模块与功能规范

### 2.1 双 AI 辩论系统 (Dual AI Debate System)

**目标**: 通过两个不同 AI 角色的辩论来提炼用户查询，生成更全面、更可靠的答案。

#### 2.1.1 功能需求

*   **角色定义**:
    *   **Cognito (认知者)**: 逻辑严谨，负责提供基于事实和数据的初始分析和论证。
    *   **Muse (沉思者)**: 持怀疑和批判性思维，负责对 Cognito 的论点提出质疑、寻找漏洞和探索其他可能性。
*   **辩论流程**:
    1.  用户提交一个查询（文本或图文）。
    2.  Cognito 首先发言，提出核心论点。
    3.  Muse 接着发言，进行反驳或提出补充观点。
    4.  双方根据预设模式（固定轮次或 AI 驱动）进行数轮辩论。
    5.  辩论结束后，系统生成一个综合了双方观点的最终摘要，呈现给用户。
*   **UI/UX**:
    *   清晰地在界面上区分 Cognito 和 Muse 的发言，例如使用不同的头像和颜色。
    *   实时展示辩论过程。

#### 2.1.2 技术规范

*   **状态管理**:
    *   `debateHistory`: 一个数组，用于存储每一轮对话的角色和内容。
      ```typescript
      interface DebateTurn {
        role: 'Cognito' | 'Muse' | 'User' | 'System';
        content: string;
      }
      const debateHistory: DebateTurn[] = [];
      ```
*   **核心逻辑 (`DebateManager`)**:
    *   一个核心模块，用于编排整个辩论流程。
    *   负责根据当前配置（如辩论模式）决定下一位发言者。
    *   管理和传递共享记事本的内容。

*   **伪代码: 辩论循环**
    ```pseudocode
    function startDebate(userInput: string, userImage?: Image):
      // 1. 初始化
      clear(debateHistory)
      clear(sharedNotepad)
      addUserMessageToHistory(userInput, userImage)

      // 2. 辩论循环 (以固定轮次为例)
      for turn from 1 to MAX_TURNS:
        // Cognito's turn
        cognitoPrompt = createPrompt("Cognito", debateHistory, sharedNotepad)
        cognitoResponse = callGeminiAPI(cognitoPrompt)
        addMessageToHistory("Cognito", cognitoResponse)
        updateSharedNotepad(cognitoResponse)
        yield cognitoResponse // Stream to UI

        // Muse's turn
        musePrompt = createPrompt("Muse", debateHistory, sharedNotepad)
        museResponse = callGeminiAPI(musePrompt)
        addMessageToHistory("Muse", museResponse)
        updateSharedNotepad(museResponse)
        yield museResponse // Stream to UI

      // 3. 生成最终摘要
      summaryPrompt = createSummaryPrompt(debateHistory, sharedNotepad)
      finalAnswer = callGeminiAPI(summaryPrompt)
      addMessageToHistory("System", finalAnswer)
      yield finalAnswer
    ```

#### 2.1.3 TDD 锚点 (Test-Driven Development Anchors)

*   `test_cognito_provides_logical_initial_response`: 验证 Cognito 的首次发言是否符合其角色设定。
*   `test_muse_provides_skeptical_counter_response`: 验证 Muse 的发言是否对 Cognito 构成有效的挑战或补充。
*   `test_debate_completes_within_fixed_turn_limit`: 验证在“固定轮次”模式下，辩论在达到指定轮次后能正确结束。
*   `test_final_answer_synthesizes_both_perspectives`: 验证最终摘要是否公平地融合了双方的观点。

---

### 2.2 共享记事本 (Shared Notepad)

**目标**: 为两个 AI 提供一个协作空间，以记录关键上下文，确保对话的连贯性。

#### 2.2.1 功能需求

*   **内容记录**: AI 在辩论中识别出的关键事实、假设或待办事项会自动记录到记事本中。
*   **上下文保持**: 记事本的全部内容会作为上下文信息，包含在后续每一次 AI 的提示 (Prompt) 中。
*   **UI/UX**:
    *   界面上有一个可见的区域实时展示记事本内容。
    *   支持 Markdown 格式的预览，以清晰地展示列表、粗体等。

#### 2.2.2 技术规范

*   **状态管理**:
    *   `sharedNotepadContent: string`: 一个字符串，用于存储记事本的全部内容。
*   **提示构建**:
    *   在每次调用 Gemini API 之前，将记事本内容整合到系统提示中。
    ```typescript
    function createPrompt(role: string, history: DebateTurn[], notepad: string): string {
      const systemPrompt = `
        You are ${role}.
        Here is the shared notepad for context:
        <notepad>
        ${notepad}
        </notepad>
        
        Continue the debate based on the history.
      `;
      // ... combine with history and user query
      return fullPrompt;
    }
    ```
*   **UI 实现**:
    *   使用 `react-markdown` 或类似库来渲染 `sharedNotepadContent`。

#### 2.2.3 TDD 锚点

*   `test_notepad_is_updated_with_key_points`: 验证 AI 发言后，记事本内容是否被正确更新。
*   `test_notepad_content_is_included_in_subsequent_prompts`: 验证 API 请求的提示中确实包含了当前的记事本内容。
*   `test_markdown_in_notepad_is_rendered_correctly`: 验证 UI 是否能正确解析和显示 Markdown 语法。

---

### 2.3 多模态输入 (Multimodal Input)

**目标**: 允许用户上传图片，让 AI 能够理解和讨论视觉内容。

#### 2.3.1 功能需求

*   用户可以通过点击按钮或拖拽来上传一张图片。
*   上传的图片会和文本查询一起作为输入。
*   AI 角色（Cognito 和 Muse）能够在辩论中引用和分析图片内容。

#### 2.3.2 技术规范

*   **模型要求**: 必须使用支持视觉理解的 Gemini 模型 (例如 `gemini-1.5-pro` 或 `gemini-pro-vision`)。
*   **图片处理**:
    *   在前端，将用户上传的图片文件转换为 Base64 编码的字符串。
    *   限制图片大小和格式（如 JPEG, PNG）。
*   **API 请求格式**:
    *   API 请求体需要遵循 Gemini 多模态输入的格式，将文本和图片数据一同发送。
    ```typescript
    // Example part for Gemini API call
    const parts = [
      { text: "Describe this image." },
      { inline_data: { mime_type: "image/jpeg", data: "BASE64_ENCODED_IMAGE_STRING" } }
    ];
    ```

#### 2.3.3 TDD 锚点

*   `test_image_can_be_uploaded_and_converted_to_base64`: 验证图片上传和前端处理流程。
*   `test_ai_response_correctly_references_image_content`: 提交一张包含特定物体的图片，验证 AI 的回复是否提及该物体。
*   `test_system_handles_unsupported_image_formats_gracefully`: 验证上传无效格式图片时，系统能向用户显示友好的错误提示。

---

### 2.4 停止生成 (Stop Generation)

**目标**: 赋予用户随时中断 AI 输出的能力。

#### 2.4.1 功能需求

*   当 AI 正在生成（流式输出）内容时，界面上显示一个“停止生成”按钮。
*   用户点击该按钮后，内容生成应立即停止。
*   按钮在生成结束后自动隐藏或禁用。

#### 2.4.2 技术规范

*   **API 请求控制**:
    *   使用 `AbortController` 来管理 `fetch` 请求。
    *   `AbortController.signal` 会被传递到 `fetch` 的选项中。
*   **伪代码: 实现停止功能**
    ```typescript
    // In component state
    let abortController = new AbortController();

    async function callApi() {
      abortController = new AbortController(); // Create new controller for each call
      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          signal: abortController.signal,
          // ... other options
        });
        // ... handle stream
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted by user.');
        } else {
          // Handle other errors
        }
      }
    }

    function handleStopButtonClick() {
      abortController.abort();
    }
    ```

#### 2.4.3 TDD 锚点

*   `test_stop_button_is_visible_only_during_generation`: 验证“停止”按钮的可见性与 AI 生成状态同步。
*   `test_clicking_stop_button_triggers_abort_controller`: 验证点击按钮确实调用了 `abort()` 方法。
*   `test_api_stream_terminates_immediately_on_abort`: 验证流式输出在调用 `abort()` 后立即停止。

---

### 2.5 高度可配置 (Highly Configurable)

**目标**: 为用户提供灵活的选项来控制辩论的行为和成本。

#### 2.5.1 功能需求

*   **模型选择**: 用户可以从一个下拉列表中选择不同的 Gemini 模型（如 `gemini-1.5-pro`, `gemini-1.5-flash`）。
*   **讨论模式**:
    *   **固定轮次**: 辩论进行固定数量的来回（例如 3 轮）。
    *   **AI 驱动**: AI 自行判断何时辩论充分，可以结束并输出摘要。
*   **预算控制**:
    *   **优质模式**: 使用能力最强、成本最高的模型和设置。
    *   **标准模式**: 使用性价比更高、速度更快的模型和设置。

#### 2.5.2 技术规范

*   **配置状态管理**:
    *   使用一个全局状态对象（如 React Context 或 Zustand store）来管理所有配置。
    ```typescript
    interface AppConfig {
      model: 'gemini-1.5-pro' | 'gemini-1.5-flash';
      discussionMode: 'fixed-turn' | 'ai-driven';
      budgetMode: 'premium' | 'standard';
    }
    ```
*   **动态逻辑**:
    *   `DebateManager` 和 API 调用函数需要读取此 `AppConfig` 对象，并根据其值动态调整行为（如改变模型名称、修改循环逻辑）。
    *   更改配置应只影响下一次新的辩论，而不是当前正在进行的辩论。

#### 2.5.3 TDD 锚点

*   `test_changing_model_in_settings_updates_api_call_parameter`: 验证更改模型选项后，下一次 API 请求使用了新的模型名称。
*   `test_ai_driven_mode_can_terminate_early`: 验证在“AI 驱动”模式下，如果 AI 输出特定结束标志，辩论会提前终止。
*   `test_budget_control_switches_model_presets`: 验证切换预算模式会正确地映射到预设的模型和服务参数。

---

### 2.6 健壮的错误处理 (Robust Error Handling)

**目标**: 优雅地处理 API 调用失败，并允许用户从失败点恢复。

#### 2.6.1 功能需求

*   **自动重试**: 当 API 调用失败时（如网络问题或服务器 5xx 错误），系统应自动重试最多 3 次。
*   **手动重试**: 如果所有自动重试均失败，界面会显示一条错误信息和一个“手动重试”按钮。
*   **上下文恢复**: 点击“手动重试”按钮后，系统会使用与失败前完全相同的上下文（包括历史记录、记事本内容）重新发起请求，确保对话无缝衔接。

#### 2.6.2 技术规范

*   **重试逻辑**:
    *   在 API 调用函数外包裹一个重试层，可采用指数退避策略（Exponential Backoff）来避免短时间内频繁请求。
*   **状态快照**:
    *   在每次发起 API 请求 *之前*，保存当前的完整状态（`debateHistory`, `sharedNotepadContent` 等）。
    *   如果请求最终失败，这个“快照”状态将被保留。
*   **伪代码: 手动重试**
    ```typescript
    // State
    let lastRequestStateSnapshot = null;

    async function makeApiCallWithRetry() {
      // Snapshot the state needed for this specific call
      const currentState = {
        history: [...debateHistory],
        notepad: sharedNotepadContent,
        // ... other relevant state
      };
      lastRequestStateSnapshot = currentState;

      // ... implement fetch with auto-retry logic
      try {
        // ... fetch call
      } catch (error) {
        // If all retries fail
        showManualRetryButton();
        throw error;
      }
    }

    function onManualRetryClick() {
      // Restore state from snapshot and retry the call
      restoreStateFrom(lastRequestStateSnapshot);
      makeApiCallWithRetry();
    }
    ```

#### 2.6.3 TDD 锚点

*   `test_api_call_is_retried_on_5xx_error`: 模拟服务器返回 500 错误，验证 API 调用函数是否会自动重试。
*   `test_manual_retry_button_appears_after_all_retries_fail`: 验证重试全部失败后，UI 上出现重试按钮。
*   `test_manual_retry_uses_correct_historical_context`: 验证点击手动重试按钮后，发出的新请求包含了失败前的完整上下文。