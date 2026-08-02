"""AlphaDesk API — one streaming chat endpoint, plus resume for HITL.

The SSE event vocabulary grows one session at a time (see README,
"Streaming protocol"). S01: token/done/error · S02: + node/interrupt.
"""

from dotenv import load_dotenv
from pathlib import Path

load_dotenv()  # backend/.env — secrets stay out of code and out of git

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import StreamingResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
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
    # Vite increments the port when 5173 is already occupied. Keep local
    # development working on that fallback port (and when opened via
    # 127.0.0.1) without allowing non-local origins.
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):517\d+$",
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
    config = {"configurable": {"thread_id": thread_id}}

    try:
        async for mode, chunk in graph.astream(
            graph_input,
            config,
            stream_mode=["custom", "updates"]
        ):

            if mode == "custom":
                yield event(**chunk)

            elif mode == "updates":

                # HITL interrupt
                if "__interrupt__" in chunk:
                    yield event(
                        "interrupt",
                        question=chunk["__interrupt__"][0].value["question"]
                    )

                # Final approved answer
                elif "output_guardrail" in chunk:
                    update = chunk["output_guardrail"]

                    messages = update.get("messages", [])

                    if messages:
                        reply = messages[-1]

                        yield event(
                            "token",
                            text=reply.content
                        )

        yield event("done")

    except Exception as exc:
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


# The Docker image places Vite's production output here. Keep the mount
# conditional so local development continues to use the Vite dev server.
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
