# DEPLOYMENT GUIDE — LABELGUARD (SIH26034)

## Production Deployment Options

### Option 1: Direct Python Deployment (Gunicorn / Waitress)
```bash
python -m pip install waitress
python -c "from waitress import serve; from app import create_app; serve(create_app(), host='0.0.0.0', port=5000)"
```

### Option 2: Docker Deployment
Create a `Dockerfile` at project root:
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "run.py"]
```

Build and run:
```bash
docker build -t labelguard:latest .
docker run -d -p 5000:5000 --name labelguard_app labelguard:latest
```
