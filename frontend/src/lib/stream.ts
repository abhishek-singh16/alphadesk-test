// stream.ts — the single SSE parser for the whole course.
// Why: sessions only grow the StreamEvent union and the UI adds renderers;
// the parser itself is never rewritten. The wire format staying boring is
// what keeps every frontend diff small. Introduced in Session 01.
// The SSE event vocabulary. It grows one session at a time — see
// "Streaming protocol" in the README.
export type StreamEvent =
  | { type: "token"; text: string }
  | { type: "done" }
  | { type: "error"; message: string }
  // Session 02 — the graph made visible:
  | { type: "node"; name: string }
  | { type: "interrupt"; question: string };

// EventSource only speaks GET and we need to POST a JSON body, so we read
// the response body ourselves and split it on the SSE frame boundary.
// This parser is written once here; later sessions never touch it — they
// only add renderers for new event types.
export async function readSSE(
  url: string,
  body: unknown,
  onEvent: (e: StreamEvent) => void,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // A network chunk can hold several SSE frames or half of one, so we
    // buffer and only emit complete `data: ...\n\n` frames.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const data = frame.replace(/^data: /, "");
      if (data) onEvent(JSON.parse(data) as StreamEvent);
    }
  }
}
