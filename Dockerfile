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

# Application code, prebuilt Chroma index, and bundled UI. The API mounts this
# UI at / in production.
COPY backend/ ./backend/
COPY data/ ./data/
COPY --from=frontend /web/dist ./backend/frontend/dist

# Run as a non-root user.
RUN useradd --create-home --uid 10001 appuser
USER appuser

WORKDIR /app/backend
EXPOSE 8000

# Railway injects $PORT at runtime; 8000 is the local default.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
