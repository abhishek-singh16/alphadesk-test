// useChat — all conversation state in one hook (no state library, on
// purpose): the interesting state lives server-side in the graph
// checkpoint; the client only mirrors the stream into render state.
// Introduced in Session 01.
import { useCallback, useMemo, useState } from "react";
import { readSSE, type StreamEvent } from "../lib/stream";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  streaming: boolean;
  error?: string;
  nodes: string[]; // the graph path that produced this reply — the NodeTrail
  interrupt?: string; // a pending human-in-the-loop question
}

// Override with VITE_API_BASE if your backend runs on another port.
const API = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  // One conversation thread per browser tab. The id is the only thing the
  // client holds — the conversation itself lives in the server checkpointer.
  const threadId = useMemo(() => crypto.randomUUID(), []);

  // Every stream event mutates the last message — the assistant reply
  // currently being streamed.
  const patchLast = (fn: (m: ChatMessage) => ChatMessage) =>
    setMessages((ms) => ms.map((m, i) => (i === ms.length - 1 ? fn(m) : m)));

  const handleEvent = (ev: StreamEvent) => {
    if (ev.type === "token") {
      patchLast((m) => ({ ...m, text: m.text + ev.text }));
    } else if (ev.type === "node") {
      // A resumed node re-announces itself; skip consecutive duplicates.
      patchLast((m) => ({
        ...m,
        nodes: m.nodes.at(-1) === ev.name ? m.nodes : [...m.nodes, ev.name],
      }));
    } else if (ev.type === "interrupt") {
      patchLast((m) => ({ ...m, streaming: false, interrupt: ev.question }));
    } else if (ev.type === "error") {
      patchLast((m) => ({ ...m, streaming: false, error: `The model call failed: ${ev.message}` }));
    } else if (ev.type === "done") {
      patchLast((m) => ({ ...m, streaming: false }));
    }
  };

  const stream = useCallback(
    async (path: string, body: Record<string, string>) => {
      setBusy(true);
      try {
        await readSSE(`${API}${path}`, { ...body, thread_id: threadId }, handleEvent);
      } catch (error) {
        const detail = error instanceof Error ? ` (${error.message})` : "";
        patchLast((m) => ({
          ...m,
          streaming: false,
          error: `The AlphaDesk backend request to ${API} failed${detail}. Check that this project's backend is running and that VITE_API_BASE points to it.`,
        }));
      } finally {
        setBusy(false);
      }
    },
    [threadId],
  );

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busy) return;
      setMessages((ms) => [
        ...ms,
        { role: "user", text: message, streaming: false, nodes: [] },
        { role: "assistant", text: "", streaming: true, nodes: [] },
      ]);
      await stream("/api/chat", { message });
    },
    [busy, stream],
  );

  // Answer a pending interrupt: the reply continues inside the same
  // assistant message — same thread, same graph run, resumed.
  const resume = useCallback(
    async (answer: string) => {
      if (busy) return;
      patchLast((m) => ({ ...m, interrupt: undefined, streaming: true }));
      await stream("/api/chat/resume", { answer });
    },
    [busy, stream],
  );

  return { messages, busy, send, resume };
}
