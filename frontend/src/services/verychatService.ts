import axios from 'axios';

// VeryChat API configuration
const VERYCHAT_API_URL = import.meta.env.VITE_VERYCHAT_API_URL || 'https://api.verychat.ai/v1';
const VERYCHAT_API_KEY = import.meta.env.VITE_VERYCHAT_API_KEY;


interface StreamingResponse {
  onMessage: (chunk: string) => void;
  onComplete: (fullMessage: string) => void;
  onError: (error: string) => void;
}

// Check if VeryChat API key is configured
export const isVeryChatConfigured = (): boolean => {
  return !!VERYCHAT_API_KEY;
};

// Send message to VeryChat API (non-streaming)
export const sendMessageToVeryChat = async (message: string): Promise<string> => {
  if (!VERYCHAT_API_KEY) {
    throw new Error('VeryChat API key not configured. Please add VITE_VERYCHAT_API_KEY to your environment variables.');
  }

  try {
    // Import VPay context enhancement
    const { enhanceMessageWithContext } = await import('./verychatPrompts');
    const enhancedMessage = enhanceMessageWithContext(message);

    const response = await axios.post(
      `${VERYCHAT_API_URL}/chat`,
      {
        message: enhancedMessage,
        context: 'VPay Web3 micro-economy platform',
        model: 'verychat-v1',
        stream: false,
      },
      {
        headers: {
          'Authorization': `Bearer ${VERYCHAT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    if (response.data.success) {
      return response.data.message || response.data.response || 'No response received';
    } else {
      throw new Error(response.data.error || 'Unknown error from VeryChat API');
    }
  } catch (error) {
    console.error('VeryChat API Error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        throw new Error('Invalid VeryChat API key. Please check your configuration.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please try again.');
      } else if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
    }
    
    throw new Error('Failed to connect to VeryChat. Please check your internet connection.');
  }
};

// Send message to VeryChat API with streaming support
export const sendMessageToVeryChatStream = async (
  message: string,
  callbacks: StreamingResponse
): Promise<void> => {
  if (!VERYCHAT_API_KEY) {
    callbacks.onError('VeryChat API key not configured. Please add VITE_VERYCHAT_API_KEY to your environment variables.');
    return;
  }

  try {
    const response = await fetch(`${VERYCHAT_API_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERYCHAT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        context: 'VPay Web3 micro-economy platform',
        model: 'verychat-v1',
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid VeryChat API key. Please check your configuration.');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Streaming not supported by browser');
    }

    const decoder = new TextDecoder();
    let fullMessage = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk) {
                fullMessage += data.chunk;
                callbacks.onMessage(data.chunk);
              } else if (data.done) {
                callbacks.onComplete(fullMessage);
                return;
              } else if (data.error) {
                throw new Error(data.error);
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              continue;
            }
          }
        }
      }
      
      callbacks.onComplete(fullMessage);
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('VeryChat Streaming Error:', error);
    callbacks.onError(error instanceof Error ? error.message : 'Unknown streaming error');
  }
};

// Main service function that handles both streaming and non-streaming
export const chatWithVeryChat = async (
  message: string,
  useStreaming: boolean = false,
  streamCallbacks?: StreamingResponse
): Promise<string> => {
  // Require VeryChat API key for production
  if (!isVeryChatConfigured()) {
    const errorMessage = 'VeryChat API key is required. Please configure VITE_VERYCHAT_API_KEY in your environment variables.';
    
    if (useStreaming && streamCallbacks) {
      streamCallbacks.onError(errorMessage);
      return '';
    }
    
    throw new Error(errorMessage);
  }

  if (useStreaming && streamCallbacks) {
    await sendMessageToVeryChatStream(message, streamCallbacks);
    return ''; // Streaming handles the response through callbacks
  } else {
    return await sendMessageToVeryChat(message);
  }
};

