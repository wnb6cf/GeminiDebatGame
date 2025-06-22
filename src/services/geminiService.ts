import { DiscussionTurn, ModelInfo } from '../../types';

// --- 全局 AbortController ---
let abortController = new AbortController();

/**
 * 获取当前的 AbortController 实例。
 * @returns {AbortController}
 */
export function getAbortController(): AbortController {
  return abortController;
}

/**
 * 中断当前正在进行的 API 请求。
 */
export function abortCurrentRequest(): void {
  abortController.abort();
}

// --- 自定义错误类型 ---
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(`API Error: ${status} - ${message}`);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}


/**
 * 调用 Gemini API 并以流式方式返回响应。
 * @param prompt - 发送给模型的提示。
 * @param history - 之前的对话历史。
 * @param imageParts - 格式化后的图片数据 (如果存在)。
 * @param apiKey - 你的 Gemini API 密钥。
 * @param model - 要使用的模型名称。
 * @param retryCount - 失败后的重试次数。
 * @returns {AsyncGenerator<string, void, unknown>} - 一个异步生成器，逐块产生响应文本。
 */
export async function* generateResponseStream(
  prompt: string,
  history: DiscussionTurn[],
  imageParts: any[], // 具体的图片部分类型待定义
  apiKey: string,
  model: string,
  retryCount = 3
): AsyncGenerator<string, void, unknown> {
  
  abortController = new AbortController();
  
  // 1. 构建请求体 (此处为示例，具体结构需根据 API 文档调整)
  const requestBody = {
    contents: [
      ...formatHistoryForApi(history),
      {
        role: "user",
        parts: [{ text: prompt }, ...imageParts]
      }
    ],
    // generationConfig 和 safetySettings 可以从 store 或配置文件中获取
    // generationConfig: { ... }, 
    // safetySettings: { ... }
  };

  // 2. 实现带重试的 Fetch
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new ApiError(response.status, await response.text());
      }

      // 3. 处理流式响应
      for await (const chunk of decodeStream(response.body!)) {
        yield chunk;
      }
      
      return; // 成功，退出重试循环

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Request aborted by user.");
        return; // 正常终止，不抛出错误
      }
      
      if (attempt >= retryCount) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new NetworkError(`API call failed after ${retryCount} attempts: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // 指数退避等待
      await new Promise(resolve => setTimeout(resolve, 2 ** attempt * 100));
    }
  }
}

// --- 辅助函数 ---

/**
 * 将应用的对话历史格式化为 Gemini API 需要的 content[] 格式。
 * @param history - DebateTurn[] 格式的对话历史。
 * @returns {any[]} - API 兼容的格式。
 */
function formatHistoryForApi(history: DiscussionTurn[]): any[] {
  // 过滤掉用户最新一次的输入，因为它会作为当前 prompt 的一部分
  const processedHistory = history.slice(0, history.length - 1);
  
  return processedHistory.map(turn => ({
    role: turn.role === 'User' ? 'user' : 'model',
    parts: [{ text: turn.content }]
  }));
}

/**
 * 解码 SSE (Server-Sent Events) 流并提取文本内容。
 * @param stream - ReadableStream 实例。
 * @returns {AsyncGenerator<string, void, unknown>} - 一个异步生成器，产生解码后的文本块。
 */
async function* decodeStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<string, void, unknown> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        buffer += decoder.decode(value, { stream: true });
        
        // 简单的基于换行的块处理，实际的 SSE 解析可能更复杂
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留不完整的行

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const jsonStr = line.substring(6);
                try {
                    const data = JSON.parse(jsonStr);
                    if (data.candidates && data.candidates[0].content.parts[0].text) {
                        yield data.candidates[0].content.parts[0].text;
                    }
                } catch (e) {
                    console.error("Failed to parse stream chunk:", jsonStr);
                }
            }
        }
    }
}
/**
 * 从 API 获取可用的 Gemini 模型列表。
 * @param apiKey - 你的 Gemini API 密钥。
 * @returns {Promise&lt;ModelInfo[]&gt;} - 一个解析为模型信息数组的 Promise。
 */
export async function fetchAvailableModels(apiKey: string): Promise&lt;ModelInfo[]&gt; {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }
    const data = await response.json();
    // 过滤出支持 'generateContent' 的模型
    return data.models
      .filter((model: any) => 
        model.supportedGenerationMethods.includes('generateContent')
      )
      .map((model: any) => ({
        name: model.name, // e.g., "models/gemini-1.5-pro-latest"
        displayName: model.displayName,
        description: model.description,
      }));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new NetworkError(`Failed to fetch models: ${error instanceof Error ? error.message : String(error)}`);
  }
}