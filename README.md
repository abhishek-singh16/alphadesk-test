# AlphaDesk

An AI equity research copilot that shows its work — every answer renders the
pipeline that produced it: route → tools → evidence → text.

Built session by session across a 10-session agentic-AI bootcamp. Each session is
one git commit and one tag; `git switch -d session-01` (etc.) jumps to any
session's exact state. See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the full map and
[docs/sessions/](docs/sessions/) for per-session notes.

> Educational project — not investment advice.

## Quickstart

One terminal (Python 3.11+). The UI ships as one final commit at the end of the
course — until then, `curl` is the client.

```bash
cd backend
uv venv .venv && uv pip install -r requirements.txt
# or: python -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env       # then put your OpenAI API key in .env
.venv/bin/uvicorn app.main:app --reload --port 8000
```

```bash
curl -N localhost:8000/api/chat -H 'Content-Type: application/json' \
  -d '{"message":"What does the annual report say about AI risk?","thread_id":"t1"}'
```

## Streaming protocol

`POST /api/chat` with `{"message": "..."}` returns `text/event-stream`. Every
event is one JSON object on a `data:` line, with a `type` field the client
switches on:

```
data: {"type": "token", "text": "Apple"}\n\n
```

The vocabulary grows one session at a time — a client parses this envelope
once, and later sessions only add event types (the final-commit UI adds one
renderer per type):

| Event       | Since | Payload    | Meaning                                          |
| ----------- | ----- | ---------- | ------------------------------------------------ |
| `done`      | S01   | —          | The stream is complete.                          |
| `error`     | S01   | `message`  | Something failed; render it, stop.               |
| `node`      | S02   | `name`     | A graph node started — the pipeline, visible.    |
| `interrupt` | S02   | `question` | The graph paused for a human answer (see below). |
| `citations` | S03   | `items`    | The numbered evidence the answer cites as `[n]`: `[{id, source, page, snippet}]`. |
| `message`   | S03   | `text`     | The full, guardrail-approved reply, sent once the graph finishes — the client's only source of assistant text. |
| `blocked`   | guardrails | `stage`, `reason` | A guardrail (`input`, `execution`, or `output`) rejected something; `message` carries the safe text shown instead. |

Note: replies are no longer streamed token-by-token. The `respond` node's
draft answer is checked by an output guardrail (`app/guardrails.py`) before
anything is sent to the client, so `message` always carries the final,
approved text in one piece rather than tokens arriving live.

Since Session 02 every request also carries a client-generated `thread_id` —
the conversation state lives server-side in the graph checkpointer, keyed by
that id. When an `interrupt` event arrives, the graph is paused;
`POST /api/chat/resume` with `{"thread_id": "...", "answer": "..."}` resumes
it and returns a fresh SSE stream that continues the same reply.

## Filings ingest (Session 03)

Drop annual reports or 10-K PDFs into `data/filings/` (a synthetic sample is
included — see [data/filings/README.md](data/filings/README.md)), then:

```bash
cd backend
.venv/bin/python -m app.ingest ../data/filings
```

First run downloads Chroma's local embedding model (~80 MB, no API key).
Re-runs are idempotent. The index lives in `backend/chroma_db/` (gitignored).

## Session map

1. **LLM & Agent Foundations** — streaming chat on a raw model call
2. **LangChain & LangGraph** — StateGraph, thread state, HITL interrupt
3. **Retrieval & RAG** — filings ingest, Chroma retrieval, cited answers *(you are here)*
4. **Tool Use, Function Calling & MCP** — live market tools, inside and outside the graph
5. – 10. Roadmap: enterprise RAG, multi-agent, memory, guardrails, observability,
   deployment — see [PROJECT_PLAN.md](PROJECT_PLAN.md).
