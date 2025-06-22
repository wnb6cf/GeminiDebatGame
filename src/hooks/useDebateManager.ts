import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import * as geminiService from '../services/geminiService';
import { Role, DiscussionTurn, AICharacter } from '../../types';

// A simple placeholder for the API key.
// In a real application, this should be handled securely.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

/**
 * Creates a specific prompt for the given role based on the debate context.
 * @param role The role for which to generate the prompt.
 * @param history The discussion history.
 * @param notepad The shared notepad content.
 * @returns The generated prompt string.
 */
const createPromptFor = (role: Role, history: DiscussionTurn[], notepad: string): string => {
    const userQuery = history.find(turn => turn.role === 'User')?.content || '';

    switch (role) {
        case 'Cognito':
            return `
        As Cognito, your role is to be logical, factual, and analytical.
        Your goal is to build a strong, evidence-based argument.
        Analyze the user's query: "${userQuery}".
        Review the discussion so far and the shared notepad.
        Provide your next argument, focusing on facts and data.
        Current Notepad:\n${notepad}
      `;
        case 'Muse':
            return `
        As Muse, your role is to be skeptical, creative, and to challenge assumptions.
        Your goal is to find weaknesses in Cognito's arguments and offer alternative perspectives.
        Analyze the user's query: "${userQuery}" and Cognito's points.
        Review the discussion so far and the shared notepad.
        Provide your counter-argument or a new, insightful perspective.
        Current Notepad:\n${notepad}
      `;
        case 'System':
            return `
        You are the Judge. Your task is to synthesize the arguments from both Cognito and Muse.
        Do not introduce new opinions.
        Based on the entire discussion log and the shared notepad, provide a balanced, neutral summary of the debate.
        Conclude with a final, synthesized answer to the user's original query: "${userQuery}".
        Discussion Log:\n${history.map(t => `${t.role}: ${t.content}`).join('\n')}\n
        Shared Notepad:\n${notepad}
      `;
        default:
            return '';
    }
};


/**
 * Custom hook to manage the debate logic and flow.
 */
export const useDebateManager = () => {
    const store = useAppStore();

    const executeTurn = useCallback(async (role: AICharacter | 'System') => {
        const { discussionLog, notepadContent, currentQuery, config, addTurn, updateTurnContent, updateNotepad, setError } = useAppStore.getState();
        
        if (useAppStore.getState().isStopped) return;

        useAppStore.getState().setStreaming(true);
        const turnId = addTurn({ role, content: "" });

        try {
            const prompt = createPromptFor(role, discussionLog, notepadContent);
            
            let imageParts: any[] = [];
            if (role === 'Cognito' && discussionLog.length <= 2 && currentQuery.imageBase64) {
                imageParts = [{ inline_data: { mime_type: "image/jpeg", data: currentQuery.imageBase64 } }];
            }

            const stream = geminiService.generateResponseStream(
                prompt,
                discussionLog,
                imageParts,
                API_KEY,
                config.model
            );

            let fullResponse = "";
            for await (const chunk of stream) {
                if (useAppStore.getState().isStopped) break;
                updateTurnContent(turnId, chunk);
                fullResponse += chunk;
            }

            if (!useAppStore.getState().isStopped) {
                updateNotepad(fullResponse);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setError({ message: `Error during ${role}'s turn: ${errorMessage}`, failedTurnId: turnId });
        } finally {
            useAppStore.getState().setStreaming(false);
        }
    }, []);

    const runDiscussionLoop = useCallback(async () => {
        const { config, isStopped, errorState } = useAppStore.getState();

        if (config.discussionMode === "fixed-turn") {
            for (let i = 0; i < config.maxTurns; i++) {
                if (useAppStore.getState().isStopped) break;
                await executeTurn("Cognito");
                if (useAppStore.getState().isStopped || useAppStore.getState().errorState.hasError) break;

                if (useAppStore.getState().isStopped) break;
                await executeTurn("Muse");
                if (useAppStore.getState().isStopped || useAppStore.getState().errorState.hasError) break;
            }
        }
        // AI-driven mode can be implemented here
        
        if (!useAppStore.getState().isStopped && !useAppStore.getState().errorState.hasError) {
            await generateFinalAnswer();
        }

    }, [executeTurn]);

    const generateFinalAnswer = useCallback(async () => {
        await executeTurn("System");
        useAppStore.getState().setLoading(false);
    }, [executeTurn]);


    const startDebate = useCallback(async (userQuery: string, imageBase64?: string) => {
        // Reset previous state before starting
        useAppStore.getState().startNewDiscussion(userQuery, imageBase64);
        
        // Use a short timeout to ensure the state update is processed before starting the loop
        setTimeout(() => {
            runDiscussionLoop().finally(() => {
                if (useAppStore.getState().isLoading) {
                   useAppStore.getState().setLoading(false);
                }
            });
        }, 100);

    }, [runDiscussionLoop]);

    const stopDebate = () => {
        geminiService.abortCurrentRequest();
        store.stopGeneration();
    };

    return { startDebate, stopDebate };
};