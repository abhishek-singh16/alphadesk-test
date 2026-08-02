// MessageBubble — one message: user bubbles vs. the assistant's editorial
// column, plus the visible pipeline layers that mount around the answer.
// Why: the pipeline renders *inside* the message, not in a sidebar — an
// answer and how it was produced are one artifact. Introduced in Session 01.
import { motion, useReducedMotion } from "motion/react";
import type { ChatMessage } from "../hooks/useChat";
import NodeTrail from "./NodeTrail";
import ApprovalCard from "./ApprovalCard";

interface MessageBubbleProps {
  message: ChatMessage;
  onResume: (answer: string) => void;
}

export default function MessageBubble({ message, onResume }: MessageBubbleProps) {
  const reduced = useReducedMotion();
  const entrance = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 4 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.18 },
      };

  if (message.role === "user") {
    return (
      <motion.div {...entrance} className="mb-6 flex justify-end">
        <div className="max-w-[85%] rounded-xl bg-surface-2 px-4 py-2.5 text-[15px] leading-relaxed">
          {message.text}
        </div>
      </motion.div>
    );
  }

  // Assistant replies are set as full-width editorial text, not a bubble —
  // with the pipeline that produced them rendered above.
  return (
    <motion.div {...entrance} className="mb-8">
      <NodeTrail nodes={message.nodes} />
      {message.interrupt && (
        <ApprovalCard question={message.interrupt} onResume={onResume} />
      )}
      {message.error ? (
        <p className="text-[15px] leading-7 text-down">{message.error}</p>
      ) : (
        (message.text || message.streaming) && (
          <p className="text-[15px] leading-7 whitespace-pre-wrap">
            {message.text}
            {message.streaming && <span className="caret" aria-hidden />}
          </p>
        )
      )}
    </motion.div>
  );
}
