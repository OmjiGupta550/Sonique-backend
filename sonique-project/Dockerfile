FROM python:3.12-slim

# Install system dependencies, including ffmpeg for merging HD video/audio streams
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application files
COPY music_api.py .
COPY recommendation_engine.py .
COPY album_covers_mapping.json .
COPY track_to_album_mapping.json .

# Copy recommendations database files if present
COPY sonique_recs.db* ./

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Expose default port
EXPOSE 5000

# Command to run gunicorn WSGI server. We read dynamic $PORT environment variable.
CMD gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 1 --threads 4 --timeout 120 music_api:app
