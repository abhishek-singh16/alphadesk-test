// Composer — the message input bar.
// Why: deliberately stateless beyond the draft text; every conversation
// concern (busy, threads, resume) lives in useChat, not here.
// Introduced in Session 01.
import { useState } from "react";
import { ArrowUp } from "lucide-react";

interface ComposerProps {
  disabled: boolean;
  onSend: (text: string) => void;
}

export default function Composer({ disabled, onSend }: ComposerProps) {
  const [text, setText] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled || !text.trim()) return;
        onSend(text);
        setText("");
      }}
      className="flex items-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-2 transition-colors focus-within:border-gold/60"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask about a company, a price, a filing…"
        aria-label="Message the research desk"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-bone placeholder:text-muted focus:outline-none"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        aria-label="Send message"
        className="rounded-lg p-2 text-gold transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-40"
      >
        <ArrowUp size={18} strokeWidth={2} />
      </button>
    </form>
  );
}
