"""AlphaDesk API — one streaming chat endpoint, plus resume for HITL.

The SSE event vocabulary grows one session at a time (see README,
"Streaming protocol"). S01: token/done/error · S02: + node/interrupt.
"""

from dotenv import load_dotenv

load_dotenv()  # backend/.env — secrets stay out of code and out of git

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import StreamingResponse  # noqa: E402
from langgraph.types import Command  # noqa: E402
from pydantic import BaseModel  # noqa: E402

from .graph import graph  # noqa: E402  (imported after the env is loaded)
from .sse import event  # noqa: E402

app = FastAPI(title="AlphaDesk")

# The Vite dev server is a different origin, so the browser preflights our
# POST; without these headers the stream never starts.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    thread_id: str  # client-generated; names this conversation's checkpoint


class ResumeRequest(BaseModel):
    thread_id: str
    answer: str


async def stream_graph(graph_input, thread_id: str):
    # thread_id selects which checkpointed conversation this run extends —
    # state lives server-side in the checkpointer, not in the request.
    config = {"configurable": {"thread_id": thread_id}}
    final_text: str | None = None
    try:
        # LangGraph's current streaming API: astream with multiple modes.
        #   "custom"  → whatever nodes write via get_stream_writer()
        #   "updates" → node results; also where an interrupt surfaces
        #
        # No "messages" mode here: the model's tokens are generated inside
        # the respond node, before output_guardrail has had a chance to
        # check (and possibly rewrite) the reply. Forwarding those tokens
        # live would let an unsafe draft reach the client before the
        # guardrail ever runs. So we wait for input_guardrail/output_guardrail
        # to hand back the approved text, then send it in one piece — a
        # deliberate trade of live token-by-token typing for a guarantee that
        # nothing unapproved is ever streamed out.
        async for mode, chunk in graph.astream(
            graph_input, config, stream_mode=["custom", "updates"]
        ):
            if mode == "custom":
                yield event(**chunk)
            elif mode == "updates":
                if "__interrupt__" in chunk:
                    yield event("interrupt", question=chunk["__interrupt__"][0].value["question"])
                    continue
                node_update = chunk.get("output_guardrail") or chunk.get("input_guardrail")
                if node_update and node_update.get("messages"):
                    final_text = node_update["messages"][-1].content
        if final_text is not None:
            yield event("message", text=final_text)
        yield event("done")
    except Exception as exc:
        # A failure mid-stream must be an event, not a dead socket.
        yield event("error", message=str(exc))


@app.post("/api/chat")
def chat(req: ChatRequest) -> StreamingResponse:
    return StreamingResponse(
        stream_graph({"messages": [("user", req.message)]}, req.thread_id),
        media_type="text/event-stream",
    )


@app.post("/api/chat/resume")
def resume(req: ResumeRequest) -> StreamingResponse:
    # Command(resume=...) hands the human's answer to the interrupt() call
    # that paused this thread; the graph picks up exactly where it stopped.
    return StreamingResponse(
        stream_graph(Command(resume=req.answer), req.thread_id),
        media_type="text/event-stream",
    )
