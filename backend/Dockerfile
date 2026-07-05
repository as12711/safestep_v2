# SafeStep Routing Backend
# Python FastAPI with OSMnx/GeoPandas for safe route calculation

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies required by OSMnx, GeoPandas, Shapely
# These libraries need GDAL, GEOS, and PROJ C libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    libspatialindex-dev \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set GDAL environment variables
ENV GDAL_CONFIG=/usr/bin/gdal-config
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY routing/ ./routing/

# Durable cache root (mount a volume here in compose/host to persist the graph
# and OSMnx downloads across container recreation). Read by routing/config.py.
RUN mkdir -p /app/cache
ENV SAFESTEP_CACHE_DIR=/app/cache

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the API server
CMD ["uvicorn", "routing.api:app", "--host", "0.0.0.0", "--port", "8000"]
