# Build the React UI, then serve it and the FastAPI API from one container.

# ---------- stage 1: build the React frontend ----------
FROM node:22-slim AS frontend
WORKDIR /web

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---------- stage 2: Python runtime ----------
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8000

WORKDIR /app

# Install dependencies first so this layer is cached across code-only changes.
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install -r backend/requirements.txt

# Application code, bundled UI, and source filings. The API mounts the UI
# at / in production.
COPY backend/ ./backend/
COPY data/ ./data/
COPY --from=frontend /web/dist ./backend/frontend/dist

# Run as a non-root user.
RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser

# Build the Chroma index from the committed filings at image-build time —
# backend/chroma_db is gitignored (it's a generated artifact), so it has to
# be rebuilt here rather than copied in. Runs as appuser so the embedding
# model's download cache lands under /home/appuser and is reused at runtime
# instead of re-downloading on the container's first query.
WORKDIR /app/backend
RUN python -m app.ingest ../data/filings
EXPOSE 8000

# Railway injects $PORT at runtime; 8000 is the local default.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
