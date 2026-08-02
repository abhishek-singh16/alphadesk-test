// ChatWindow — owns the scroll region, empty state, and composer wiring.
// Why: it is the only component that talks to useChat; message rendering
// stays dumb so each session adds a renderer, never new plumbing.
// Introduced in Session 01.
import { useEffect, useRef } from "react";
import { useChat } from "../hooks/useChat";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";

// The current session's demo script, lines 1–3. Updated each session.
const SUGGESTIONS = [
  "My name is Priya and I mostly track semiconductor stocks.",
  "What's my name and what do I track?",
  "What about the other one?",
];

export default function ChatWindow() {
  const { messages, busy, send, resume } = useChat();
  const endRef = useRef<HTMLDivElement>(null);
  const awaitingAnswer = messages.at(-1)?.interrupt !== undefined;
  // ^ composer locks while an ApprovalCard waits — one conversation,
  // one open question at a time.

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          {messages.length === 0 ? (
            <EmptyState onPick={send} />
          ) : (
            messages.map((m, i) => (
              <MessageBubble key={i} message={m} onResume={resume} />
            ))
          )}
          <div ref={endRef} />
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <Composer disabled={busy || awaitingAnswer} onSend={send} />
      </div>
    </main>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-6 pt-20 text-center sm:pt-28">
      <p className="text-[11px] uppercase tracking-[0.25em] text-muted">
        Ask the desk
      </p>
      <div className="flex w-full max-w-md flex-col gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-lg border border-hairline px-4 py-3 text-left text-sm text-muted transition-colors hover:border-gold/60 hover:text-bone focus-visible:outline-2 focus-visible:outline-gold"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
