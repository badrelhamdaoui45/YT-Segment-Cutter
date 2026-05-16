import os
import yt_dlp
import ffmpeg
import uuid
import logging

logger = logging.getLogger(__name__)

DOWNLOAD_DIR = os.getenv("DOWNLOAD_DIR", "./downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

def get_video_info(url: str):
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
            return info
        except Exception as e:
            logger.error(f"Error extracting video info: {e}")
            raise

def parse_time_to_seconds(time_str):
    """Converts HH:MM:SS or MM:SS to seconds."""
    parts = time_str.split(':')
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    elif len(parts) == 2:
        return int(parts[0]) * 60 + int(parts[1])
    return int(parts[0])

def download_video_segment(url: str, start_time: str, end_time: str, format_str: str = "mp4", quality: str = "720", progress_hooks=None) -> str:
    """
    Downloads a specific segment of a YouTube video using ffmpeg as an external downloader for fast seeking.
    """
    filename = f"{uuid.uuid4()}.{format_str}"
    output_path = os.path.join(DOWNLOAD_DIR, filename)
    
    start_secs = parse_time_to_seconds(start_time)
    end_secs = parse_time_to_seconds(end_time)

    ydl_opts = {
        # Select best video with height limit and best audio
        'format': f'bestvideo[height<={quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<={quality}][ext=mp4]/best',
        'outtmpl': output_path,
        'quiet': False,
        'no_warnings': True,
        'noprogress': True,
        'noplaylist': True,
        # Performance optimizations
        'concurrent_fragments': 10,
        'hls_prefer_native': True,
        'socket_timeout': 10,
        'retries': 3,
        'fragment_retries': 5,
        'skip_unavailable_fragments': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['ios', 'android', 'web'],
                'skip': ['dash', 'hls']
            }
        },
        'download_sections': [{
            'start_time': start_secs,
            'end_time': end_secs,
            'title': 'segment'
        }],
        # This allows yt-dlp to cut without re-encoding the whole thing if possible
        'force_keyframes_at_cuts': True,
    }

    if progress_hooks:
        ydl_opts['progress_hooks'] = progress_hooks

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
            return output_path
    except Exception as e:
        logger.error(f"Error downloading video segment: {e}")
        if os.path.exists(output_path):
            os.remove(output_path)
        raise

