"""
ReliefLink - Disaster Help Matching API
Main FastAPI application entry point
"""
import asyncio
from datetime import datetime, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .database import init_db, SessionLocal
from .models import HelpRequest
from .routers import requests, helpers, stats, ai, voice


async def cleanup_completed_requests():
    """Background task to delete completed requests after 5 minutes"""
    while True:
        try:
            db = SessionLocal()
            # Find completed requests older than 5 minutes
            cutoff_time = datetime.utcnow() - timedelta(minutes=5)
            deleted = db.query(HelpRequest).filter(
                HelpRequest.status == 'completed',
                HelpRequest.completed_at < cutoff_time
            ).delete()
            db.commit()
            if deleted > 0:
                print(f"🗑️ Auto-deleted {deleted} completed request(s) older than 5 minutes")
            db.close()
        except Exception as e:
            print(f"Error in cleanup task: {e}")
        
        # Check every 60 seconds
        await asyncio.sleep(60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup and start background tasks"""
    init_db()
    # Start background cleanup task
    cleanup_task = asyncio.create_task(cleanup_completed_requests())
    print("🚀 Started background cleanup task for completed requests")
    yield
    # Cancel task on shutdown
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass


# Create FastAPI app
app = FastAPI(
    title="ReliefLink API",
    description="Disaster Help Matching Platform - Connect people in need with nearby helpers",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        "name": "ReliefLink API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "requests": "/api/requests",
            "helpers": "/api/helpers",
            "stats": "/api/stats",
            "ai": "/api/ai",
            "voice": "/api/voice"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
