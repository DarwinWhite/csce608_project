FROM python:3.11-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

# Copy dependency file first for layer caching (build context = repo root)
COPY backend/pyproject.toml .

# Install dependencies into the system Python (no venv needed inside container)
RUN uv pip install --system .

# Copy backend application code
COPY backend/ .

# Copy schema so the app can apply it programmatically on startup
# (required when using an external managed DB such as Render PostgreSQL)
COPY database/schema.sql ./schema.sql

EXPOSE 8000

# Render injects $PORT; fall back to 8000 for local Docker usage
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
