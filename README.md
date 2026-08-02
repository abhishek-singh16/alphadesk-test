# AlphaDesk

An AI equity research copilot that shows its work — every answer renders the
pipeline that produced it: guardrails → route → tools/retrieval → evidence →
answer → guardrails.

Built session by session across a 10-session agentic-AI bootcamp. Each session is
one git commit and one tag; `git switch -d session-01` (etc.) jumps to any
session's exact state. See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the full map and
[docs/sessions/](docs/sessions/) for per-session notes.

> Educational project — not investment advice.

## Quickstart

**Backend** (Python 3.11+):

```bash
cd backend
uv venv .venv && uv pip install -r requirements.txt
# or: python -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env       # then put your OpenAI API key in .env
.venv/bin/uvicorn app.main:app --reload --port 8000
```

**Frontend** (separate terminal, Node 22+):

```bash
cd frontend
npm install
npm run dev                 # Vite dev server at http://localhost:5173
```

Or exercise the API directly without the UI:

```bash
curl -N localhost:8000/api/chat -H 'Content-Type: application/json' \
  -d '{"message":"What does the annual report say about AI risk?","thread_id":"t1"}'
```

**Docker** (backend + prebuilt frontend in one container):

```bash
docker build -t alphadesk .
docker run -p 8000:8000 --env-file backend/.env alphadesk
```

The image builds the React app and mounts it at `/`, served by the same FastAPI
process that answers `/api/chat` — one container, one port.

## Streaming protocol

`POST /api/chat` with `{"message": "...", "thread_id": "..."}` returns
`text/event-stream`. Every event is one JSON object on a `data:` line, with a
`type` field the client switches on:

```
data: {"type": "token", "text": "Apple"}\n\n
```

| Event        | Payload            | Meaning                                                                 |
| ------------ | ------------------ | ------------------------------------------------------------------------ |
| `token`      | `text`             | The approved reply text (input-guardrail refusal, or the final answer once the output guardrail has checked it — sent as one piece, not streamed live token-by-token from the model). |
| `done`       | —                  | The stream is complete.                                                  |
| `error`      | `message`          | Something failed; render it, stop.                                       |
| `node`       | `name`             | A graph node started — the pipeline, visible.                            |
| `interrupt`  | `question`         | The graph paused for a human answer (see below).                        |
| `citations`  | `items`            | Numbered evidence the answer cites as `[n]`: `[{id, source, page, snippet}]`. |
| `tool_call`  | `name`, `args`     | A market-data tool (`get_quotes`, `get_price_history`) was invoked.      |
| `blocked`    | `stage`, `reason`  | A guardrail (`input`, `execution`, or `output`) rejected something; the human-readable reason is also sent as the `token` text so it's always shown. |
| `evaluation` | `kind`, `metrics`  | Inline quality signal: `kind: "retrieval"` (recall@k) after a filings search, `kind: "answer_grounding"` (LLM-judge groundedness/hallucination score) after an answer. |

Every request carries a client-generated `thread_id` — the conversation state
lives server-side in the graph checkpointer (in-memory; reset on backend
restart), keyed by that id. When an `interrupt` event arrives, the graph is
paused; `POST /api/chat/resume` with `{"thread_id": "...", "answer": "..."}`
resumes it and returns a fresh SSE stream that continues the same reply.

## Guardrails

`backend/app/guardrails.py` checks the conversation at three points in the
graph (`backend/app/graph.py`):

- **Input** (`check_input`) — blocks oversized messages, prompt-injection
  attempts ("ignore previous instructions", "reveal your system prompt",
  jailbreak phrasing), and obvious PII (SSNs, card numbers) via regex, then
  falls back to an LLM classifier for anything the regexes miss.
- **Execution** (`check_tool_call`) — validates tool arguments before a market
  tool runs (ticker format, allowed price-history periods).
- **Output** (`check_output`) — regex + LLM check that rewrites replies which
  cross into direct investment advice ("you should buy...", "guaranteed
  returns") before they reach the client.

A block short-circuits the graph and returns a plain-language reason instead
of the original response — nothing is ever silently dropped.

## Inline evaluation

`backend/app/eval.py` scores answer quality as part of every filings request,
streamed to the client as `evaluation` events (see table above): retrieval
recall@k against known-relevant chunks, and an LLM-as-judge pass for
groundedness/hallucination on the final answer. This is a runtime quality
signal, not an offline eval suite — there's no standalone eval harness or
regression dataset in the repo yet.

## Filings ingest (Session 03)

Drop annual reports or 10-K PDFs into `data/filings/` (a synthetic sample is
included — see [data/filings/README.md](data/filings/README.md)), then:

```bash
cd backend
.venv/bin/python -m app.ingest ../data/filings
```

First run downloads Chroma's local embedding model (~80 MB, no API key).
Re-runs are idempotent. The index lives in `backend/chroma_db/` (gitignored).

## Market tools & MCP (Session 04)

`backend/app/tools.py` exposes live quotes and price history (via `yfinance`)
as LangChain tools bound into the graph for the `market` route, and the same
two tools are re-exposed over MCP in `backend/app/mcp_server.py` for external
MCP clients:

```bash
cd backend
.venv/bin/python -m app.mcp_server
```

## Session map

1. **LLM & Agent Foundations** — streaming chat on a raw model call
2. **LangChain & LangGraph** — StateGraph, thread state, HITL interrupt
3. **Retrieval & RAG** — filings ingest, Chroma retrieval, cited answers
4. **Tool Use, Function Calling & MCP** — live market tools, inside and outside the graph
5. – 10. Roadmap: enterprise RAG, multi-agent, memory, observability,
   full deployment polish — see [PROJECT_PLAN.md](PROJECT_PLAN.md). Guardrails,
   inline evaluation, a React/Vite frontend, and Docker packaging have already
   landed ahead of their planned sessions (see above).
