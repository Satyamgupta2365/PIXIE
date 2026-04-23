FROM python:3.11-slim
# Rebuild trigger

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Create a non-root user for security (HF Spaces requirement)
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# HuggingFace Spaces uses port 7860
EXPOSE 7860

# Health check using curl instead of Python (lighter)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:7860/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
