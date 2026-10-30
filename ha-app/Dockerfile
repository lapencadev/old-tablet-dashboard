# Official Python image: works on Raspberry Pi and PCs. HA OS 2026 no longer passes BUILD_FROM by default.
FROM python:3.12-alpine
# Same dependency list the tests run with (deploy-app copies it here)
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY server /app/server
COPY panel /app/panel
ENV PANEL_DIR=/app/panel PORT=8000 PYTHONUNBUFFERED=1
CMD ["python3", "/app/server/serve.py"]
