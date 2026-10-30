# Official Python image: works on Raspberry Pi and PCs. HA OS 2026 no longer passes BUILD_FROM by default.
FROM python:3.12-alpine
RUN pip install --no-cache-dir json5==0.9.25 websockets==13.1 cryptography==43.0.3
COPY server /app/server
COPY panel /app/panel
ENV PANEL_DIR=/app/panel PORT=8000 PYTHONUNBUFFERED=1
CMD ["python3", "/app/server/serve.py"]
