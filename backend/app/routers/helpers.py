"""
Helpers API Router
Handles volunteer/NGO registration and dashboard
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from datetime import datetime

from ..database import get_db
from ..models import Helper, HelpRequest
from ..schemas import HelperCreate, HelperResponse, HelperDashboard, HelpRequestResponse
from ..utils import mask_phone, format_time_ago, haversine_distance

router = APIRouter(prefix="/helpers", tags=["Helpers"])


def helper_to_response(helper: Helper) -> HelperResponse:
    """Convert database model to response schema"""
    return HelperResponse(
        id=helper.id,
        name=helper.name,
        organization=helper.organization,
        can_help_with=helper.can_help_with,
        requests_completed=helper.requests_completed,
        is_active=helper.is_active,
        created_at=helper.created_at,
        last_active=helper.last_active
    )


def request_to_response(request: HelpRequest) -> HelpRequestResponse:
    """Convert request model to response"""
    return HelpRequestResponse(
        id=request.id,
        help_type=request.help_type,
        description=request.description,
        urgency=request.urgency,
        latitude=request.latitude,
        longitude=request.longitude,
        address=request.address,
        phone_masked=mask_phone(request.phone) if request.phone else None,
        contact_name=request.contact_name,
        status=request.status,
        helper_id=request.helper_id,
        helper_name=request.helper.name if request.helper else None,
        priority_score=request.priority_score,
        created_at=request.created_at,
        updated_at=request.updated_at,
        accepted_at=request.accepted_at,
        completed_at=request.completed_at,
        time_ago=format_time_ago(request.created_at)
    )


@router.post("/", response_model=HelperResponse, status_code=201)
async def register_helper(
    helper_data: HelperCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new helper/volunteer
    Simple registration - minimal required info
    """
    # Check if phone already registered
    existing = db.query(Helper).filter(Helper.phone == helper_data.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    db_helper = Helper(
        name=helper_data.name,
        phone=helper_data.phone,
        organization=helper_data.organization,
        latitude=helper_data.latitude,
        longitude=helper_data.longitude,
        can_help_with=helper_data.can_help_with
    )
    
    db.add(db_helper)
    db.commit()
    db.refresh(db_helper)
    
    return helper_to_response(db_helper)


@router.post("/login")
async def login_helper(
    phone: str,
    db: Session = Depends(get_db)
):
    """
    Simple login for helpers using phone number
    Returns helper profile if found
    """
    helper = db.query(Helper).filter(Helper.phone == phone).first()
    
    if not helper:
        raise HTTPException(status_code=404, detail="Helper not found. Please register first.")
    
    # Update last active time
    helper.last_active = datetime.utcnow()
    db.commit()
    db.refresh(helper)
    
    return {
        "success": True,
        "helper": {
            "id": helper.id,
            "name": helper.name,
            "phone": helper.phone,
            "organization": helper.organization,
            "can_help_with": helper.can_help_with,
            "requests_completed": helper.requests_completed,
            "is_active": helper.is_active
        }
    }


@router.get("/", response_model=list[HelperResponse])
async def get_helpers(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get list of registered helpers"""
    query = db.query(Helper)
    if active_only:
        query = query.filter(Helper.is_active == 1)
    
    helpers = query.order_by(desc(Helper.requests_completed)).all()
    return [helper_to_response(h) for h in helpers]


@router.get("/{helper_id}", response_model=HelperResponse)
async def get_helper(helper_id: int, db: Session = Depends(get_db)):
    """Get helper by ID"""
    helper = db.query(Helper).filter(Helper.id == helper_id).first()
    if not helper:
        raise HTTPException(status_code=404, detail="Helper not found")
    return helper_to_response(helper)


@router.get("/{helper_id}/dashboard", response_model=HelperDashboard)
async def get_helper_dashboard(
    helper_id: int,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """
    Get helper dashboard with active requests and nearby requests
    Main view for helpers to manage their work
    """
    helper = db.query(Helper).filter(Helper.id == helper_id).first()
    if not helper:
        raise HTTPException(status_code=404, detail="Helper not found")
    
    # Get helper's active requests
    active_requests = db.query(HelpRequest).filter(
        HelpRequest.helper_id == helper_id,
        HelpRequest.status.in_(['accepted', 'in_progress'])
    ).all()
    
    # Get completed count
    completed_count = db.query(HelpRequest).filter(
        HelpRequest.helper_id == helper_id,
        HelpRequest.status == 'completed'
    ).count()
    
    # Get nearby available requests
    nearby_requests = []
    use_lat = lat or helper.latitude
    use_lon = lon or helper.longitude
    
    if use_lat and use_lon:
        # Get all available requests
        available = db.query(HelpRequest).filter(
            HelpRequest.status == 'requested'
        ).all()
        
        # Calculate distance and filter
        for req in available:
            distance = haversine_distance(use_lat, use_lon, req.latitude, req.longitude)
            if distance <= 50:  # Within 50km
                nearby_requests.append((req, distance))
        
        # Sort by priority then distance
        nearby_requests.sort(key=lambda x: (-x[0].priority_score, x[1]))
        nearby_requests = [r[0] for r in nearby_requests[:10]]  # Top 10
    else:
        # No location - just get highest priority
        nearby_requests = db.query(HelpRequest).filter(
            HelpRequest.status == 'requested'
        ).order_by(desc(HelpRequest.priority_score)).limit(10).all()
    
    return HelperDashboard(
        helper=helper_to_response(helper),
        active_requests=[request_to_response(r) for r in active_requests],
        completed_count=completed_count,
        nearby_requests=[request_to_response(r) for r in nearby_requests]
    )


@router.patch("/{helper_id}/location")
async def update_helper_location(
    helper_id: int,
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    db: Session = Depends(get_db)
):
    """Update helper's current location"""
    helper = db.query(Helper).filter(Helper.id == helper_id).first()
    if not helper:
        raise HTTPException(status_code=404, detail="Helper not found")
    
    helper.latitude = lat
    helper.longitude = lon
    helper.last_active = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Location updated", "latitude": lat, "longitude": lon}


@router.patch("/{helper_id}/status")
async def update_helper_status(
    helper_id: int,
    is_active: bool,
    db: Session = Depends(get_db)
):
    """Toggle helper active/inactive status"""
    helper = db.query(Helper).filter(Helper.id == helper_id).first()
    if not helper:
        raise HTTPException(status_code=404, detail="Helper not found")
    
    helper.is_active = 1 if is_active else 0
    helper.last_active = datetime.utcnow()
    
    db.commit()
    
    return {"message": f"Helper {'activated' if is_active else 'deactivated'}"}
