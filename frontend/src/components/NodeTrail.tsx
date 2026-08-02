import { motion, useReducedMotion } from "motion/react";

// The signature element: the graph path that produced each reply, rendered
// as it happens. Chips slide in sequentially as `node` events arrive.
// Introduced in Session 02.
export default function NodeTrail({ nodes }: { nodes: string[] }) {
  const reduced = useReducedMotion();
  if (nodes.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {nodes.map((name, i) => (
        <motion.span
          key={`${name}-${i}`}
          initial={reduced ? false : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.18, delay: reduced ? 0 : i * 0.06 }}
          className="flex items-center gap-2"
        >
          {i > 0 && <span className="text-xs text-muted/60">→</span>}
          <span className="rounded-full border border-hairline bg-surface px-2.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-muted">
            {name}
          </span>
        </motion.span>
      ))}
    </div>
  );
}
