"""
Help Requests API Router
Handles all CRUD operations for disaster help requests
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional, List
from datetime import datetime, timedelta

from ..database import get_db
from ..models import HelpRequest, Helper, StatusLog, AILog
from ..schemas import (
    HelpRequestCreate, HelpRequestUpdate, HelpRequestResponse,
    HelpRequestList, StatusLogResponse
)
from ..utils import mask_phone, format_time_ago, calculate_priority_score, haversine_distance
from ..services.ai_service import process_request_with_ai

router = APIRouter(prefix="/requests", tags=["Help Requests"])


def request_to_response(request: HelpRequest, include_phone: bool = False) -> HelpRequestResponse:
    """Convert database model to response schema"""
    response = HelpRequestResponse(
        id=request.id,
        help_type=request.help_type,
        description=request.description,
        urgency=request.urgency,
        latitude=request.latitude,
        longitude=request.longitude,
        address=request.address,
        phone_masked=mask_phone(request.phone) if request.phone else None,
        phone=request.phone if include_phone else None,  # Full phone only when authenticated
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
    
    # Add AI fields if available
    if hasattr(request, 'ai_priority_score') and request.ai_priority_score is not None:
        response.ai_priority_score = request.ai_priority_score
        response.ai_priority_label = request.ai_priority_label
        response.ai_priority_reason = request.ai_priority_reason
    
    if hasattr(request, 'ai_detected_type') and request.ai_detected_type:
        response.ai_detected_type = request.ai_detected_type
        response.ai_confidence = request.ai_confidence
        response.extracted_supplies = request.extracted_supplies
    
    if hasattr(request, 'detected_language') and request.detected_language:
        response.detected_language = request.detected_language
        response.translated_text = request.translated_text
        response.simplified_text = request.simplified_text
    
    if hasattr(request, 'is_flagged') and request.is_flagged:
        response.is_flagged = request.is_flagged
        response.flag_reason = request.flag_reason
    
    if hasattr(request, 'duplicate_of_id') and request.duplicate_of_id:
        response.duplicate_of_id = request.duplicate_of_id
        response.duplicate_similarity = request.duplicate_similarity
    
    return response


@router.post("/", response_model=HelpRequestResponse, status_code=201)
async def create_request(
    request_data: HelpRequestCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new help request with AI-powered analysis
    
    AI Features Applied:
    1. Priority scoring (0-100) based on keywords and urgency
    2. Auto-categorization of help type
    3. Language detection and translation
    4. Duplicate detection
    5. Spam/fake request flagging
    
    No login required - designed for emergency use
    """
    # Calculate basic priority score
    priority = calculate_priority_score(
        urgency=request_data.urgency.value,
        created_at=datetime.utcnow(),
        help_type=request_data.help_type.value
    )
    
    # Get existing requests for duplicate detection
    existing_requests = db.query(HelpRequest).filter(
        HelpRequest.status.notin_(['completed', 'cancelled']),
        HelpRequest.created_at >= datetime.utcnow() - timedelta(hours=24)
    ).all()
    
    existing_data = [{
        'id': r.id,
        'description': r.description,
        'latitude': r.latitude,
        'longitude': r.longitude,
        'phone': r.phone,
        'help_type': r.help_type,
        'status': r.status
    } for r in existing_requests]
    
    # Count recent requests from same phone
    recent_from_phone = 0
    if request_data.phone:
        recent_from_phone = db.query(HelpRequest).filter(
            HelpRequest.phone == request_data.phone,
            HelpRequest.created_at >= datetime.utcnow() - timedelta(hours=24)
        ).count()
    
    # Count recent requests from nearby location
    recent_from_location = db.query(HelpRequest).filter(
        func.abs(HelpRequest.latitude - request_data.latitude) < 0.01,
        func.abs(HelpRequest.longitude - request_data.longitude) < 0.01,
        HelpRequest.created_at >= datetime.utcnow() - timedelta(hours=24)
    ).count()
    
    # Run AI analysis
    ai_result = process_request_with_ai(
        request_data={
            'description': request_data.description,
            'urgency': request_data.urgency.value,
            'help_type': request_data.help_type.value,
            'latitude': request_data.latitude,
            'longitude': request_data.longitude,
            'phone': request_data.phone,
            'address': request_data.address,
            'created_at': datetime.utcnow()
        },
        existing_requests=existing_data,
        recent_from_phone=recent_from_phone,
        recent_from_location=recent_from_location
    )
    
    # Create request with AI-enhanced data
    db_request = HelpRequest(
        help_type=request_data.help_type.value,
        description=request_data.description,
        urgency=request_data.urgency.value,
        latitude=request_data.latitude,
        longitude=request_data.longitude,
        address=request_data.address,
        phone=request_data.phone,
        contact_name=request_data.contact_name,
        status="requested",
        priority_score=priority,
    )
    
    # Apply AI results
    if ai_result.get('priority'):
        ai_priority = ai_result['priority']
        db_request.ai_priority_score = ai_priority.get('score', priority)
        db_request.ai_priority_label = ai_priority.get('label', 'medium')
        db_request.ai_priority_reason = ', '.join(ai_priority.get('reasons', []))
        # Use AI priority as primary if higher
        db_request.priority_score = max(priority, ai_priority.get('score', 0))
    
    if ai_result.get('category'):
        ai_category = ai_result['category']
        db_request.ai_detected_type = ai_category.get('detected_type')
        db_request.ai_confidence = ai_category.get('confidence')
        db_request.extracted_supplies = ai_category.get('extracted_supplies', [])
        db_request.category_confirmed = not ai_category.get('needs_confirmation', False)
    
    if ai_result.get('translation'):
        ai_translation = ai_result['translation']
        db_request.detected_language = ai_translation.get('detected_language', 'en')
        db_request.translated_text = ai_translation.get('translated_text')
        db_request.simplified_text = ai_translation.get('simplified_text')
    
    if ai_result.get('duplicate'):
        ai_duplicate = ai_result['duplicate']
        if ai_duplicate.get('is_duplicate'):
            db_request.duplicate_of_id = ai_duplicate.get('duplicate_of_id')
            db_request.duplicate_similarity = ai_duplicate.get('similarity_score')
    
    if ai_result.get('flag'):
        ai_flag = ai_result['flag']
        if ai_flag.get('is_flagged'):
            db_request.is_flagged = True
            db_request.flag_reason = ', '.join(ai_flag.get('reasons', []))
            db_request.review_status = 'pending_review'
    
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    # Log AI decision
    ai_log = AILog(
        request_id=db_request.id,
        action_type='full_analysis',
        input_data={
            'description': request_data.description,
            'help_type': request_data.help_type.value,
            'urgency': request_data.urgency.value
        },
        output_data=ai_result,
        confidence=ai_result.get('category', {}).get('confidence'),
        explanation=f"AI processing completed in {ai_result.get('processing_time_ms', 0):.1f}ms",
        processing_time_ms=int(ai_result.get('processing_time_ms', 0))
    )
    db.add(ai_log)
    
    # Log initial status
    status_log = StatusLog(
        request_id=db_request.id,
        old_status=None,
        new_status="requested",
        notes=f"Request created (AI Priority: {db_request.ai_priority_label or 'N/A'})"
    )
    db.add(status_log)
    db.commit()
    
    return request_to_response(db_request)


@router.get("/", response_model=HelpRequestList)
async def get_requests(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    urgency: Optional[str] = None,
    help_type: Optional[str] = None,
    sort_by: str = Query("priority", regex="^(priority|time|urgency)$"),
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """
    Get paginated list of help requests
    Supports filtering and sorting
    """
    query = db.query(HelpRequest)
    
    # Apply filters
    if status and status != 'all':
        query = query.filter(HelpRequest.status == status)
    if urgency:
        query = query.filter(HelpRequest.urgency == urgency)
    if help_type:
        query = query.filter(HelpRequest.help_type == help_type)
    
    # Default: exclude completed/cancelled (unless 'all' requested)
    if not status:
        query = query.filter(HelpRequest.status.notin_(['completed', 'cancelled']))
    
    # Apply sorting
    if sort_by == "priority":
        query = query.order_by(desc(HelpRequest.priority_score), HelpRequest.created_at)
    elif sort_by == "time":
        query = query.order_by(HelpRequest.created_at)
    elif sort_by == "urgency":
        # Custom ordering for urgency
        query = query.order_by(
            func.case(
                (HelpRequest.urgency == 'critical', 1),
                (HelpRequest.urgency == 'moderate', 2),
                else_=3
            ),
            HelpRequest.created_at
        )
    
    # Get total count
    total = query.count()
    
    # Paginate
    offset = (page - 1) * per_page
    requests = query.offset(offset).limit(per_page).all()
    
    # Convert to response format
    response_list = [request_to_response(r) for r in requests]
    
    # If coordinates provided, add distance and sort by distance
    if lat is not None and lon is not None:
        for req in response_list:
            req_distance = haversine_distance(lat, lon, req.latitude, req.longitude)
            req.distance_km = round(req_distance, 2)
        
        # Sort by distance if coordinates provided
        response_list.sort(key=lambda r: r.distance_km or 999999)
    
    return HelpRequestList(
        requests=response_list,
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/for-helper")
async def get_requests_for_helper(
    helper_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """
    Get requests with full phone numbers for authenticated helpers
    """
    # Verify helper exists
    helper = db.query(Helper).filter(Helper.id == helper_id).first()
    if not helper:
        raise HTTPException(status_code=404, detail="Helper not found")
    
    query = db.query(HelpRequest).filter(
        HelpRequest.status.notin_(['completed', 'cancelled'])
    ).order_by(desc(HelpRequest.priority_score), HelpRequest.created_at)
    
    total = query.count()
    offset = (page - 1) * per_page
    requests = query.offset(offset).limit(per_page).all()
    
    # Include full phone numbers for authenticated helpers
    response_list = [request_to_response(r, include_phone=True) for r in requests]
    
    # Add distance if coordinates provided
    if lat is not None and lon is not None:
        for req in response_list:
            req_distance = haversine_distance(lat, lon, req.latitude, req.longitude)
            req.distance_km = round(req_distance, 2)
        response_list.sort(key=lambda r: r.distance_km or 999999)
    
    return HelpRequestList(
        requests=response_list,
        total=total,
        page=page,
        per_page=per_page
    )


@router.get("/nearby")
async def get_nearby_requests(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get requests within a specified radius
    Used for helper matching
    """
    # Get all active requests
    requests = db.query(HelpRequest).filter(
        HelpRequest.status.notin_(['completed', 'cancelled'])
    ).all()
    
    # Filter by distance
    nearby = []
    for req in requests:
        distance = haversine_distance(lat, lon, req.latitude, req.longitude)
        if distance <= radius_km:
            resp = request_to_response(req)
            nearby.append({
                **resp.model_dump(),
                'distance_km': round(distance, 2)
            })
    
    # Sort by distance
    nearby.sort(key=lambda x: x['distance_km'])
    
    return nearby


@router.get("/{request_id}", response_model=HelpRequestResponse)
async def get_request(request_id: int, db: Session = Depends(get_db)):
    """Get a specific help request by ID"""
    request = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return request_to_response(request)


@router.patch("/{request_id}", response_model=HelpRequestResponse)
async def update_request(
    request_id: int,
    update_data: HelpRequestUpdate,
    db: Session = Depends(get_db)
):
    """
    Update a help request status
    Used when helper accepts or completes a request
    """
    request = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    old_status = request.status
    
    # Update fields
    if update_data.status:
        request.status = update_data.status.value
        
        # Set timestamps based on status
        if update_data.status.value == "accepted":
            request.accepted_at = datetime.utcnow()
        elif update_data.status.value == "completed":
            request.completed_at = datetime.utcnow()
    
    if update_data.helper_id is not None:
        # Verify helper exists
        helper = db.query(Helper).filter(Helper.id == update_data.helper_id).first()
        if not helper:
            raise HTTPException(status_code=400, detail="Helper not found")
        request.helper_id = update_data.helper_id
    
    request.updated_at = datetime.utcnow()
    
    # Recalculate priority
    request.priority_score = calculate_priority_score(
        urgency=request.urgency,
        created_at=request.created_at,
        help_type=request.help_type
    )
    
    # Log status change
    if update_data.status and old_status != update_data.status.value:
        status_log = StatusLog(
            request_id=request.id,
            old_status=old_status,
            new_status=update_data.status.value,
            changed_by=update_data.helper_id,
            notes=update_data.notes
        )
        db.add(status_log)
    
    db.commit()
    db.refresh(request)
    
    return request_to_response(request)


@router.get("/{request_id}/history", response_model=List[StatusLogResponse])
async def get_request_history(request_id: int, db: Session = Depends(get_db)):
    """Get status change history for a request"""
    request = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    logs = db.query(StatusLog).filter(
        StatusLog.request_id == request_id
    ).order_by(StatusLog.created_at).all()
    
    return logs


@router.post("/{request_id}/accept")
async def accept_request(
    request_id: int,
    helper_id: int,
    db: Session = Depends(get_db)
):
    """
    Helper accepts a request
    Prevents duplicate handling
    """
    request = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Check if already accepted
    if request.status not in ['requested']:
        raise HTTPException(
            status_code=400, 
            detail=f"Request cannot be accepted. Current status: {request.status}"
        )
    
    # Verify helper
    helper = db.query(Helper).filter(Helper.id == helper_id).first()
    if not helper:
        raise HTTPException(status_code=400, detail="Helper not found")
    
    # Update request
    old_status = request.status
    request.status = "accepted"
    request.helper_id = helper_id
    request.accepted_at = datetime.utcnow()
    request.updated_at = datetime.utcnow()
    
    # Update helper last active
    helper.last_active = datetime.utcnow()
    
    # Log status change
    status_log = StatusLog(
        request_id=request.id,
        old_status=old_status,
        new_status="accepted",
        changed_by=helper_id,
        notes=f"Accepted by {helper.name}"
    )
    db.add(status_log)
    
    db.commit()
    db.refresh(request)
    
    return request_to_response(request)


@router.post("/{request_id}/complete")
async def complete_request(
    request_id: int,
    helper_id: int,
    notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Mark a request as completed"""
    request = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Verify helper owns this request
    if request.helper_id != helper_id:
        raise HTTPException(status_code=403, detail="Only assigned helper can complete")
    
    # Check valid status transition
    if request.status not in ['accepted', 'in_progress']:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot complete request with status: {request.status}"
        )
    
    # Update request
    old_status = request.status
    request.status = "completed"
    request.completed_at = datetime.utcnow()
    request.updated_at = datetime.utcnow()
    
    # Update helper stats
    helper = db.query(Helper).filter(Helper.id == helper_id).first()
    if helper:
        helper.requests_completed += 1
        helper.last_active = datetime.utcnow()
    
    # Log status change
    status_log = StatusLog(
        request_id=request.id,
        old_status=old_status,
        new_status="completed",
        changed_by=helper_id,
        notes=notes or "Request completed"
    )
    db.add(status_log)
    
    db.commit()
    db.refresh(request)
    
    return request_to_response(request)
