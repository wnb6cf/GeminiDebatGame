import { Argument, SpeakerRole } from './types';
import { DebateMode, ModelName } from './types';

// --- 应用配置常量 ---

/**
 * 定义了辩论模式的常量，用于 UI 和逻辑判断。
 */
export const DEBATE_MODES: { [key: string]: DebateMode } = {
  FIXED_ROUNDS: 'fixed-turn',
  AI_DRIVEN: 'ai-driven',
};


export const GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-04-17";
export const APP_TITLE = "Gemini AI 辩论赛";
export const LOCAL_STORAGE_DEBATE_HISTORY_KEY = 'geminiDebateHistoryList';

export const DEBATE_INIT_MESSAGE_PRO = (topic: string): string => 
  `请就辩题：“${topic}”发表你的开篇立论 🚀。请直接开始你的论述，展现你的立场和主要论点，可以引用历史事件或数据来增强说服力。记住，要“据理力争”，语气坚定，可以适当使用emoji。你的发言请控制在400字以内。请使用Markdown语法来格式化你的回答（例如加粗、斜体、列表）。不要包含任何如“好的，我会...”之类的开场白。`;

export const DEBATE_SUBSEQUENT_MESSAGE = (topic: string, opponentRole: string, opponentArgument: string, currentSpeakerRole: string): string =>
  `辩题是：“${topic}”。另一方的最新论点是：
--- 发言内容开始 ---
${opponentArgument}
--- 发言内容结束 ---
现在轮到你 (${currentSpeakerRole}) 发言 🎤，请“据理力争”，针对此论点进行犀利的回应，并进一步阐述和强化你的观点。可以引用历史事件、数据或新的角度，并适当使用emoji来表达。你的发言请控制在400字以内。请使用Markdown语法来格式化你的回答（例如加粗、斜体、列表）。请直接开始你的论述，不要包含任何如“好的，我会...”之类的开场白。`;

export const SYSTEM_INSTRUCTION_PRO = (topic: string): string =>
  `你是一位正方辩手 🧐。辩题是：“${topic}”。你的任务是清晰、有逻辑地阐述支持该辩题的论点，并针对反方提出的观点进行有力的反驳。请“据理力争”，使用自然、生动且有说服力的语言，可以适当加入emoji来增强表达效果 😉。为了支持你的观点，你可以大胆引用相关的历史事件、数据或公认事实——在这场学术探讨中，所有相关的论据都应被充分讨论。你的发言应该简洁明了，每次发言集中在一个核心论点上，并且字数请控制在400字以内。请使用Markdown语法来格式化你的回答，例如使用加粗、斜体、列表等，以增强可读性。你的所有回答都必须使用中文。`;

export const SYSTEM_INSTRUCTION_CON = (topic: string): string =>
  `你是一位反方辩手 🧐。辩题是：“${topic}”。你的任务是清晰、有逻辑地阐述反对该辩题的论点，并针对正方提出的观点进行有力的反驳。请“据理力争”，使用自然、生动且有说服力的语言，可以适当加入emoji来增强表达效果 😉。为了支持你的观点，你可以大胆引用相关的历史事件、数据或公认事实——在这场学术探讨中，所有相关的论据都应被充分讨论。你的发言应该简洁明了，每次发言集中在一个核心论点上，并且字数请控制在400字以内。请使用Markdown语法来格式化你的回答，例如使用加粗、斜体、列表等，以增强可读性。你的所有回答都必须使用中文。`;

export const JUDGE_SYSTEM_INSTRUCTION = (topic: string, debateLog: Argument[]): string => {
  let formattedDebate = "辩论记录：\n";
  const proArgs = debateLog.filter(arg => arg.speaker === SpeakerRole.PRO);
  const conArgs = debateLog.filter(arg => arg.speaker === SpeakerRole.CON);
  const numberOfFullRounds = Math.min(proArgs.length, conArgs.length);

  for (let i = 0; i < debateLog.length; i++) {
    const arg = debateLog[i];
    let speakerDisplay: string = arg.speaker; // Explicitly type as string
    if (arg.isUserArgument && arg.speaker === SpeakerRole.PRO) {
        speakerDisplay = `${SpeakerRole.PRO} (用户)`;
    }
    // If user could be CON, add: else if (arg.isUserArgument && arg.speaker === SpeakerRole.CON) speakerDisplay = `${SpeakerRole.CON} (用户)`;

    formattedDebate += `发言 ${i + 1} (${speakerDisplay}, 时间: ${new Date(arg.timestamp).toLocaleTimeString('zh-CN')}):\n--- 发言内容开始 ---\n${arg.content}\n--- 发言内容结束 ---\n---\n`;
  }
  
  let roundInstructions = "";
  if (numberOfFullRounds > 0) {
    roundInstructions = `"roundSummaries": [\n`;
    for (let i = 0; i < numberOfFullRounds; i++) {
      roundInstructions += `    { "roundNumber": ${i + 1}, "summary": "请对第 ${i + 1} 轮双方的发言进行一句话犀利总结（本轮指正方第 ${i+1} 次发言与反方第 ${i+1} 次发言）。请直接点出核心交锋点或某方的明显优势/劣势。" }${i < numberOfFullRounds - 1 ? ',' : ''}\n`;
    }
    roundInstructions += `  ],\n`;
  } else {
    roundInstructions = `"roundSummaries": [],\n`;
  }

  return `你是一位极其专业且眼光犀利的辩论赛评委。你的点评风格以严格、挑剔和深刻著称，不会为了“面子”而给出温和的评价。本次辩论的题目是：“${topic}”。

${formattedDebate}

请你根据以上辩论内容，以你专业的、批判性的视角完成以下任务。你的目标是提供真正有价值的反馈，帮助辩手（或观察者）理解辩论的深层问题和亮点。请严格按照指定的JSON格式返回你的点评和打分。不要包含任何解释性文字或Markdown代码块标记在JSON结构之外。

JSON格式要求:
{
  ${roundInstructions}
  "overallSummary": "请对整场辩论给出一个整体性的、具有穿透力的总结。明确指出双方表现的亮点与主要不足（例如逻辑漏洞、论证不充分、未能有效回应等）。如果辩论尚未充分展开，可以指出目前观察到的趋势或某一方的初步策略性失误。",
  "proScores": {
    "dimensions": {
      "contentAndArgumentation": <0-100之间的整数分数，严格评估论点质量、证据使用和逻辑严谨性>,
      "expressionAndTechnique": <0-100之间的整数分数，严格评估语言表达的清晰度、说服力及辩论技巧的运用>,
      "reactionAndAdaptability": <0-100之间的整数分数，严格评估对对方论点的反应速度、应变能力和反驳质量>,
      "presence": <0-100之间的整数分数，严格评估辩手的气场、信心和整体表现力>
    }
  },
  "conScores": {
    "dimensions": {
      "contentAndArgumentation": <0-100之间的整数分数，严格评估论点质量、证据使用和逻辑严谨性>,
      "expressionAndTechnique": <0-100之间的整数分数，严格评估语言表达的清晰度、说服力及辩论技巧的运用>,
      "reactionAndAdaptability": <0-100之间的整数分数，严格评估对对方论点的反应速度、应变能力和反驳质量>,
      "presence": <0-100之间的整数分数，严格评估辩手的气场、信心和整体表现力>
    }
  }
}

重要提示：
- 评分标准：请以职业竞赛的严格标准进行评分。高分代表真正出色的表现，低分则直接反映问题。不要吝啬给出低分如果表现确实不佳。
- 总结要求：你的总结需要一针见血，具有批判性思维。
- 针对 "roundSummaries"，请为 ${numberOfFullRounds} 个完整回合提供总结。一个完整回合指正方的一次发言与反方的一次发言。如果目前没有完整的正反双方发言回合，则 "roundSummaries" 数组为空。
- 分数必须是0到100之间的整数。
- "overallSummary" 即使在辩论初期也应提供，可以是对当前局势的初步判断或批评。
- 确保输出的是一个合法的JSON对象。
- 你的所有点评和总结都必须使用中文。`;
};

export const HUMAN_DEBATE_INIT_MESSAGE = (humanRole: SpeakerRole): string =>
  `您已选择作为 **${humanRole}**。请在下方的输入框中发表您的开篇立论。AI将自动扮演反方。`;