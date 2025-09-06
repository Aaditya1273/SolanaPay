import { processAIQuery, processAIQueryStream } from './localAIService';

interface StreamingResponse {
  onMessage: (chunk: string) => void;
  onComplete: (fullMessage: string) => void;
  onError: (error: string) => void;
}

// Check if local AI is configured (replaces VeryChat check)
export const isVeryChatConfigured = (): boolean => {
  return true; // Local AI is always available
};

// Send message to Local AI (replaces VeryChat API)
export const sendMessageToVeryChat = async (message: string): Promise<string> => {
  try {
    const response = await processAIQuery(message);
    return response.message;
  } catch (error) {
    console.error('Local AI Error:', error);
    throw new Error('Failed to process your request. Please try again.');
  }
};

// Send message to Local AI with streaming support
export const sendMessageToVeryChatStream = async (
  message: string,
  callbacks: StreamingResponse
): Promise<void> => {
  try {
    await processAIQueryStream(message, callbacks);
  } catch (error) {
    console.error('Local AI Streaming Error:', error);
    callbacks.onError(error instanceof Error ? error.message : 'Unknown streaming error');
  }
};

// Main service function that handles both streaming and non-streaming
export const chatWithVeryChat = async (
  message: string,
  useStreaming: boolean = false,
  streamCallbacks?: StreamingResponse
): Promise<string> => {
  if (useStreaming && streamCallbacks) {
    await sendMessageToVeryChatStream(message, streamCallbacks);
    return ''; // Streaming handles the response through callbacks
  } else {
    return await sendMessageToVeryChat(message);
  }
};

