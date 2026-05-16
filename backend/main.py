import os
from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict
import uuid
import asyncio

from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="YT Segment Cutter API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOWNLOAD_DIR = os.getenv("DOWNLOAD_DIR", "./downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

@app.get("/api/files/download/{filename}")
async def download_file(filename: str):
    file_path = os.path.join(DOWNLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename="yt_segment.mp4",
        media_type='video/mp4'
    )

app.mount("/api/files", StaticFiles(directory=DOWNLOAD_DIR), name="files")

class DownloadRequest(BaseModel):
    url: str
    start_time: str
    end_time: str
    format: Optional[str] = "mp4"
    quality: Optional[str] = "720"

class DownloadResponse(BaseModel):
    task_id: str
    status: str

# Import celery task
from tasks import process_video_task
from celery.result import AsyncResult

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)

manager = ConnectionManager()

@app.get("/")
def read_root():
    return {"status": "ok", "message": "YT Segment Cutter API is running"}

@app.post("/api/download", response_model=DownloadResponse)
async def start_download(request: DownloadRequest):
    # Trigger Celery task
    task = process_video_task.delay(
        request.url,
        request.start_time,
        request.end_time,
        request.format,
        request.quality
    )
    return {"task_id": task.id, "status": "pending"}

@app.get("/api/status/{task_id}")
async def get_status(task_id: str):
    task_result = AsyncResult(task_id)
    result = {
        "task_id": task_id,
        "status": task_result.status,
    }
    if task_result.status == 'SUCCESS':
        result['result'] = task_result.result
    elif task_result.status == 'FAILURE':
        result['error'] = str(task_result.result)
    elif task_result.info:
        # Check if info is a dict (it contains our custom meta)
        if isinstance(task_result.info, dict):
            if 'status' in task_result.info:
                result['statusMessage'] = task_result.info['status']
            if 'progress' in task_result.info:
                result['progress'] = task_result.info['progress']
    return result

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming WebSocket messages if necessary
    except WebSocketDisconnect:
        manager.disconnect(client_id)
