# Multi-stage production Dockerfile for MAXLITH V2 FastAPI Market Data Service
FROM python:3.12-slim AS builder

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Final production stage
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=4100 \
    HOST=0.0.0.0

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application source code and compiled protobufs
COPY proto ./proto
COPY src ./src
COPY README.md .

# Create non-privileged user for security
RUN groupadd -r maxlith && useradd -r -g maxlith maxlith \
    && chown -R maxlith:maxlith /app
USER maxlith

EXPOSE 4100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:' + str(os.environ.get('PORT', 4100)) + '/health')" || exit 1

CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "4100"]

