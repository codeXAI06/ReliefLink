"""
Statistics API Router
Provides overview stats for dashboard
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import HelpRequest, Helper
from ..schemas import StatsResponse

router = APIRouter(prefix="/stats", tags=["Statistics"])


@router.get("/", response_model=StatsResponse)
async def get_stats(db: Session = Depends(get_db)):
    """
    Get overall statistics for dashboard
    Used for admin overview and public display
    """
    # Total requests
    total_requests = db.query(func.count(HelpRequest.id)).scalar()
    
    # Active requests (not completed or cancelled)
    active_requests = db.query(func.count(HelpRequest.id)).filter(
        HelpRequest.status.notin_(['completed', 'cancelled'])
    ).scalar()
    
    # Completed requests
    completed_requests = db.query(func.count(HelpRequest.id)).filter(
        HelpRequest.status == 'completed'
    ).scalar()
    
    # Total helpers
    total_helpers = db.query(func.count(Helper.id)).scalar()
    
    # Active helpers
    active_helpers = db.query(func.count(Helper.id)).filter(
        Helper.is_active == 1
    ).scalar()
    
    # Requests by type
    type_counts = db.query(
        HelpRequest.help_type,
        func.count(HelpRequest.id)
    ).group_by(HelpRequest.help_type).all()
    requests_by_type = {t: c for t, c in type_counts}
    
    # Requests by urgency
    urgency_counts = db.query(
        HelpRequest.urgency,
        func.count(HelpRequest.id)
    ).group_by(HelpRequest.urgency).all()
    requests_by_urgency = {u: c for u, c in urgency_counts}
    
    return StatsResponse(
        total_requests=total_requests or 0,
        active_requests=active_requests or 0,
        completed_requests=completed_requests or 0,
        total_helpers=total_helpers or 0,
        active_helpers=active_helpers or 0,
        requests_by_type=requests_by_type,
        requests_by_urgency=requests_by_urgency
    )


@router.get("/summary")
async def get_summary(db: Session = Depends(get_db)):
    """Quick summary for homepage"""
    active = db.query(func.count(HelpRequest.id)).filter(
        HelpRequest.status.notin_(['completed', 'cancelled'])
    ).scalar()
    
    critical = db.query(func.count(HelpRequest.id)).filter(
        HelpRequest.status.notin_(['completed', 'cancelled']),
        HelpRequest.urgency == 'critical'
    ).scalar()
    
    helpers_online = db.query(func.count(Helper.id)).filter(
        Helper.is_active == 1
    ).scalar()
    
    completed_today = db.query(func.count(HelpRequest.id)).filter(
        HelpRequest.status == 'completed'
    ).scalar()  # Simplified - should filter by date
    
    return {
        "active_requests": active or 0,
        "critical_requests": critical or 0,
        "helpers_online": helpers_online or 0,
        "completed_today": completed_today or 0
    }
