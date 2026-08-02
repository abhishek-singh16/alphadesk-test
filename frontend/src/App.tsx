// App.tsx — the frame: wordmark header, chat, disclaimer footer.
// Why: everything inside the frame changes each session; the frame itself
// never does — that stability is part of the product's story.
// Introduced in Session 01.
import ChatWindow from "./components/ChatWindow";

// Bumped each session as a new architectural layer lands.
const SESSION_LABEL = "Session 02";

export default function App() {
  return (
    <div className="flex h-dvh flex-col bg-obsidian font-sans text-bone antialiased">
      <header className="border-b border-hairline">
        <div className="mx-auto flex w-full max-w-3xl items-baseline justify-between px-4 py-4">
          <h1 className="inline-block text-sm font-semibold tracking-[0.35em] text-bone">
            ALPHADESK
            <span className="mt-1.5 block h-px w-full bg-gold" aria-hidden />
          </h1>
          <span className="text-[11px] uppercase tracking-[0.25em] text-muted">
            {SESSION_LABEL}
          </span>
        </div>
      </header>

      <ChatWindow />

      <footer className="border-t border-hairline py-3 text-center text-xs text-muted">
        Educational project — not investment advice.
      </footer>
    </div>
  );
}
