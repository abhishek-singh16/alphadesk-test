// ApprovalCard — the human-in-the-loop moment: the paused graph's one
// question, answered inline. Why: HITL is only honest if the graph truly
// stops — this card is the UI of a checkpointed interrupt(), not a modal.
// Introduced in Session 02.
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CornerDownRight } from "lucide-react";

interface ApprovalCardProps {
  question: string; // asked by the paused graph, answered by the human
  onResume: (answer: string) => void;
}

export default function ApprovalCard({ question, onResume }: ApprovalCardProps) {
  const [answer, setAnswer] = useState("");
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18 }}
      className="mb-2 rounded-xl border border-gold/40 bg-surface p-4"
    >
      <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-gold">
        The desk needs one answer
      </p>
      <p className="mb-3 text-[15px] leading-7">{question}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!answer.trim()) return;
          onResume(answer.trim());
        }}
        className="flex items-center gap-2"
      >
        <CornerDownRight size={14} className="shrink-0 text-muted" aria-hidden />
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Reply to continue…"
          aria-label="Answer the desk's question"
          autoFocus
          className="min-w-0 flex-1 rounded-lg border border-hairline bg-obsidian px-3 py-1.5 text-sm text-bone placeholder:text-muted focus:border-gold/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!answer.trim()}
          className="rounded-lg border border-hairline px-3 py-1.5 text-sm text-gold transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-40"
        >
          Answer
        </button>
      </form>
    </motion.div>
  );
}
