import type { AssistantEvent, Message } from '@/features/assistant/types';

/**
 * Low-level SSE fetch hook.
 *
 * POSTs to /api/assistant with the conversation history and reads a
 * newline-delimited JSON stream. Each line is parsed as an AssistantEvent
 * and forwarded to the provided callback.
 *
 * Returns a function that starts the stream and an AbortController so the
 * caller can cancel mid-stream.
 */
export function createAssistantStream(
  messages: Message[],
  onEvent: (event: AssistantEvent) => void,
  signal: AbortSignal
): Promise<void> {
  return (async () => {
    const payload = messages
      .filter((m) => !m.isStreaming)
      .slice(-50)
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: payload }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      onEvent({ type: 'error', message: `HTTP ${response.status}: ${text}` });
      onEvent({ type: 'message_stop' });
      return;
    }

    if (!response.body) {
      onEvent({ type: 'error', message: 'No response body received' });
      onEvent({ type: 'message_stop' });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let receivedStop = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete newline-delimited JSON lines
        const lines = buffer.split('\n');
        // Keep the last (potentially incomplete) chunk in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event = JSON.parse(trimmed) as AssistantEvent;
            onEvent(event);
            if (event.type === 'message_stop' || event.type === 'error') {
              receivedStop = true;
            }
          } catch {
            // Malformed JSON line — skip silently
          }
        }
      }

      // Process any remaining data in the buffer after the stream ends
      if (buffer.trim()) {
        try {
          const event = JSON.parse(buffer.trim()) as AssistantEvent;
          onEvent(event);
          if (event.type === 'message_stop' || event.type === 'error') {
            receivedStop = true;
          }
        } catch {
          // Malformed residual — ignore
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Guarantee isStreaming always resets — emit synthetic stop if not received
    if (!receivedStop) {
      onEvent({ type: 'message_stop' });
    }
  })();
}
