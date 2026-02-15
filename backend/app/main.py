"""
ReliefLink - Disaster Help Matching API
Main FastAPI application entry point
"""
import asyncio
import os
from datetime import datetime, timedelta, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from .config import get_settings
from .database import init_db, SessionLocal
from .models import HelpRequest
from .logging_config import setup_logging, get_logger
from .routers import requests, helpers, stats, ai, voice
from .events import event_bus

settings = get_settings()
setup_logging(debug=settings.DEBUG)
logger = get_logger("main")


async def cleanup_completed_requests():
    """Background task to delete completed requests after 5 minutes"""
    while True:
        try:
            db = SessionLocal()
            cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=5)
            deleted = db.query(HelpRequest).filter(
                HelpRequest.status == 'completed',
                HelpRequest.completed_at < cutoff_time
            ).delete()
            db.commit()
            if deleted > 0:
                logger.info(f"Auto-deleted {deleted} completed request(s) older than 5 minutes")
            db.close()
        except Exception as e:
            logger.error(f"Error in cleanup task: {e}")
        await asyncio.sleep(60)


async def escalation_task():
    """Auto-escalate stale requests that have no helper after 30 minutes"""
    while True:
        try:
            db = SessionLocal()
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
            stale = db.query(HelpRequest).filter(
                HelpRequest.status == 'requested',
                HelpRequest.helper_id.is_(None),
                HelpRequest.created_at < cutoff,
                HelpRequest.escalation_level < 2
            ).all()
            for req in stale:
                req.escalation_level = min(req.escalation_level + 1, 2)
                req.escalated_at = datetime.now(timezone.utc)
                # Boost priority for escalated requests
                if req.ai_priority_score:
                    req.ai_priority_score = min(req.ai_priority_score + 15, 100)
                logger.warning(f"Escalated request #{req.id} to level {req.escalation_level}")
            if stale:
                db.commit()
                logger.info(f"Escalated {len(stale)} stale request(s)")
            db.close()
        except Exception as e:
            logger.error(f"Error in escalation task: {e}")
        await asyncio.sleep(120)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup and start background tasks"""
    init_db()
    
    # Create uploads directory
    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    
    cleanup = asyncio.create_task(cleanup_completed_requests())
    escalation = asyncio.create_task(escalation_task())
    logger.info("ReliefLink API started — background tasks active")
    yield
    cleanup.cancel()
    escalation.cancel()
    try:
        await cleanup
        await escalation
    except asyncio.CancelledError:
        pass


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Multilingual Disaster Help Matching Platform",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images
uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Include routers
app.include_router(requests.router, prefix="/api")
app.include_router(helpers.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(voice.router, prefix="/api")


@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
        "features": [
            "Voice-to-Help-Request Pipeline",
            "AI Priority Scoring & Categorization",
            "Predictive Hazard Zone Detection",
            "Real-Time SSE Updates",
            "Multilingual Support (10+ Languages)",
            "Photo Evidence Upload",
            "Smart Helper-Request Matching",
            "Request Auto-Escalation"
        ]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": settings.APP_VERSION}
