import os
import time
from celery import Celery
from utils import download_video_segment
import urllib.request
import json
import logging

logger = logging.getLogger(__name__)

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "tasks",
    broker=redis_url,
    backend=redis_url
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task(bind=True)
def process_video_task(self, url: str, start_time: str, end_time: str, format_str: str, quality: str = "720"):
    """
    Celery task to download a video segment.
    We report progress through Celery state.
    """
    task_id = self.request.id
    
    last_progress = [0] # Use a list to allow modification in nested function
    
    def progress_hook(d):
        if d['status'] == 'downloading':
            try:
                total_bytes = d.get('total_bytes') or d.get('total_bytes_estimate')
                downloaded_bytes = d.get('downloaded_bytes', 0)
                if total_bytes:
                    progress = (downloaded_bytes / total_bytes) * 100
                    # Clip to 99 so it doesn't jump to 100 before we are done with processing
                    progress = min(progress, 99)
                    
                    # Only update if progress increased significantly (at least 1%)
                    if progress - last_progress[0] >= 1:
                        last_progress[0] = progress
                        self.update_state(state='PROCESSING', meta={'progress': progress, 'status': f'Downloading: {int(progress)}%'})
            except Exception:
                pass

    try:
        self.update_state(state='PROCESSING', meta={'progress': 10, 'status': 'Downloading segment'})
        
        output_path = download_video_segment(
            url=url,
            start_time=start_time,
            end_time=end_time,
            format_str=format_str,
            quality=quality,
            progress_hooks=[progress_hook]
        )
        
        self.update_state(state='PROCESSING', meta={'progress': 90, 'status': 'Finalizing...'})
        
        # After successful download, just return the result. 
        # Celery will automatically set the state to SUCCESS and store this return value as the result.
        
        # In a real app we would upload this to an S3 bucket or return a download link.
        # For this setup, we just return the local path.
        filename = os.path.basename(output_path)
        return {"status": "success", "file_url": f"/api/files/download/{filename}"}

    except Exception as e:
        logger.error(f"Task failed: {e}")
        self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
        raise e
