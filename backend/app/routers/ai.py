"""
AI API Router for ReliefLink
============================
Provides REST endpoints for AI-powered features.

Endpoints:
- POST /api/ai/analyze - Full AI analysis of a request
- POST /api/ai/priority - Calculate priority score
- POST /api/ai/categorize - Auto-categorize request
- POST /api/ai/translate - Translate and simplify text
- POST /api/ai/check-duplicate - Check for duplicates
- GET /api/ai/helper-matches/{request_id} - Get helper recommendations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from ..database import get_db
from ..models import HelpRequest, Helper, AILog
from ..services.ai_service import (
    calculate_ai_priority,
    auto_categorize_request,
    translate_and_simplify,
    check_for_duplicates,
    check_for_spam,
    get_helper_recommendations,
    process_request_with_ai,
    detect_language,
)

router = APIRouter(prefix="/ai", tags=["AI Features"])


# ============================================================
# PYDANTIC MODELS FOR API
# ============================================================

class AIAnalyzeRequest(BaseModel):
    """Request body for full AI analysis"""
    description: Optional[str] = None
    urgency: str = "moderate"
    help_type: str = "other"
    latitude: float
    longitude: float
    phone: Optional[str] = None
    address: Optional[str] = None


class AIPriorityRequest(BaseModel):
    """Request body for priority calculation"""
    description: Optional[str] = None
    urgency: str = "moderate"
    help_type: str = "other"
    has_phone: bool = False
    has_address: bool = False


class AIPriorityResponse(BaseModel):
    """Response for priority calculation"""
    score: int
    label: str
    reasons: List[str]
    keywords_found: List[str]
    confidence: float


class AICategoryRequest(BaseModel):
    """Request body for auto-categorization"""
    description: str
    user_selected_type: Optional[str] = None


class AICategoryResponse(BaseModel):
    """Response for auto-categorization"""
    detected_type: str
    confidence: float
    extracted_supplies: List[str]
    needs_confirmation: bool


class AITranslateRequest(BaseModel):
    """Request body for translation"""
    text: str
    source_language: Optional[str] = None


class AITranslateResponse(BaseModel):
    """Response for translation"""
    detected_language: str
    original_text: str
    translated_text: str
    simplified_text: str
    confidence: float


class AIDuplicateRequest(BaseModel):
    """Request body for duplicate check"""
    description: Optional[str] = None
    latitude: float
    longitude: float
    phone: Optional[str] = None
    help_type: str = "other"


class AIDuplicateResponse(BaseModel):
    """Response for duplicate check"""
    is_duplicate: bool
    duplicate_of_id: Optional[int]
    similarity_score: float
    reasons: List[str]


class AIHelperMatchResponse(BaseModel):
    """Response for helper matching"""
    helper_id: int
    helper_name: str
    distance_km: float
    match_score: float
    match_reasons: List[str]


class AIFullAnalysisResponse(BaseModel):
    """Response for full AI analysis"""
    success: bool
    processing_time_ms: float
    priority: Optional[Dict[str, Any]]
    category: Optional[Dict[str, Any]]
    translation: Optional[Dict[str, Any]]
    duplicate: Optional[Dict[str, Any]]
    flag: Optional[Dict[str, Any]]
    errors: List[str]


# ============================================================
# API ENDPOINTS
# ============================================================

@router.post("/analyze", response_model=AIFullAnalysisResponse)
async def analyze_request(
    request: AIAnalyzeRequest,
    db: Session = Depends(get_db)
):
    """
    Run full AI analysis on a help request.
    
    This endpoint:
    1. Calculates AI priority score
    2. Auto-categorizes the request
    3. Detects language and translates
    4. Checks for duplicate requests
    5. Checks for spam/fake indicators
    
    Use this before creating a new request to get AI insights.
    """
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
    if request.phone:
        recent_from_phone = db.query(HelpRequest).filter(
            HelpRequest.phone == request.phone,
            HelpRequest.created_at >= datetime.utcnow() - timedelta(hours=24)
        ).count()
    
    # Count recent requests from nearby location
    # Simple approximation: within ~1km (0.01 degrees)
    recent_from_location = db.query(HelpRequest).filter(
        func.abs(HelpRequest.latitude - request.latitude) < 0.01,
        func.abs(HelpRequest.longitude - request.longitude) < 0.01,
        HelpRequest.created_at >= datetime.utcnow() - timedelta(hours=24)
    ).count()
    
    # Run AI analysis
    result = process_request_with_ai(
        request_data={
            'description': request.description,
            'urgency': request.urgency,
            'help_type': request.help_type,
            'latitude': request.latitude,
            'longitude': request.longitude,
            'phone': request.phone,
            'address': request.address,
            'created_at': datetime.utcnow()
        },
        existing_requests=existing_data,
        recent_from_phone=recent_from_phone,
        recent_from_location=recent_from_location
    )
    
    return AIFullAnalysisResponse(**result)


@router.post("/priority", response_model=AIPriorityResponse)
async def calculate_priority(request: AIPriorityRequest):
    """
    Calculate AI priority score for a request.
    
    Returns:
    - score: 0-100 (higher = more urgent)
    - label: critical/high/medium/low
    - reasons: Why this score was assigned
    - keywords_found: Critical keywords detected
    """
    result = calculate_ai_priority(
        description=request.description,
        urgency=request.urgency,
        help_type=request.help_type,
        created_at=datetime.utcnow(),
        has_phone=request.has_phone,
        has_address=request.has_address
    )
    
    return AIPriorityResponse(
        score=result.score,
        label=result.label,
        reasons=result.reasons,
        keywords_found=result.keywords_found,
        confidence=result.confidence
    )


@router.post("/categorize", response_model=AICategoryResponse)
async def categorize_request(request: AICategoryRequest):
    """
    Auto-categorize a request based on description text.
    
    Returns:
    - detected_type: AI-detected help type
    - confidence: How confident the AI is (0-1)
    - extracted_supplies: Specific items mentioned
    - needs_confirmation: Whether user should confirm
    """
    result = auto_categorize_request(
        description=request.description,
        user_selected_type=request.user_selected_type
    )
    
    return AICategoryResponse(
        detected_type=result.detected_type,
        confidence=result.confidence,
        extracted_supplies=result.extracted_supplies,
        needs_confirmation=result.needs_confirmation
    )


@router.post("/translate", response_model=AITranslateResponse)
async def translate_text(request: AITranslateRequest):
    """
    Detect language and translate/simplify text.
    
    Returns:
    - detected_language: Language code (en, hi, ta, etc.)
    - translated_text: English translation
    - simplified_text: Clear action-oriented summary
    """
    result = translate_and_simplify(
        text=request.text,
        source_lang=request.source_language
    )
    
    return AITranslateResponse(
        detected_language=result.detected_language,
        original_text=result.original_text,
        translated_text=result.translated_text,
        simplified_text=result.simplified_text,
        confidence=result.confidence
    )


@router.post("/check-duplicate", response_model=AIDuplicateResponse)
async def check_duplicate(
    request: AIDuplicateRequest,
    db: Session = Depends(get_db)
):
    """
    Check if a request appears to be a duplicate.
    
    Checks:
    - Location proximity (within 500m)
    - Text similarity
    - Same phone number
    - Time window (24 hours)
    """
    # Get recent requests for comparison
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
    
    result = check_for_duplicates(
        new_request={
            'description': request.description,
            'latitude': request.latitude,
            'longitude': request.longitude,
            'phone': request.phone,
            'help_type': request.help_type
        },
        existing_requests=existing_data
    )
    
    return AIDuplicateResponse(
        is_duplicate=result.is_duplicate,
        duplicate_of_id=result.duplicate_of_id,
        similarity_score=result.similarity_score,
        reasons=result.reasons
    )


@router.get("/helper-matches/{request_id}", response_model=List[AIHelperMatchResponse])
async def get_helper_matches(
    request_id: int,
    top_n: int = Query(default=3, ge=1, le=10),
    db: Session = Depends(get_db)
):
    """
    Get recommended helpers for a specific request.
    
    Returns top N helpers ranked by:
    - Distance to request
    - Skill match
    - Past performance
    - Availability
    """
    # Get the request
    request = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Get active helpers
    helpers = db.query(Helper).filter(
        Helper.is_active == 1,
        Helper.latitude.isnot(None),
        Helper.longitude.isnot(None)
    ).all()
    
    helper_data = [{
        'id': h.id,
        'name': h.name,
        'latitude': h.latitude,
        'longitude': h.longitude,
        'can_help_with': h.can_help_with,
        'skills': h.skills,
        'has_vehicle': h.has_vehicle,
        'max_distance_km': h.max_distance_km,
        'requests_completed': h.requests_completed,
        'rating': h.rating,
        'is_active': h.is_active
    } for h in helpers]
    
    request_data = {
        'latitude': request.latitude,
        'longitude': request.longitude,
        'help_type': request.help_type,
        'urgency': request.urgency
    }
    
    matches = get_helper_recommendations(
        request=request_data,
        available_helpers=helper_data,
        top_n=top_n
    )
    
    return [AIHelperMatchResponse(
        helper_id=m.helper_id,
        helper_name=m.helper_name,
        distance_km=m.distance_km,
        match_score=m.match_score,
        match_reasons=m.match_reasons
    ) for m in matches]


@router.get("/smart-recommendations/{helper_id}")
async def get_smart_recommendations_for_helper(
    helper_id: int,
    top_n: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db)
):
    """
    Get recommended requests for a specific helper.
    
    This is the inverse of helper-matches - shows helpers
    which requests they should prioritize based on:
    - Distance
    - Their skills
    - Request priority
    """
    # Get the helper
    helper = db.query(Helper).filter(Helper.id == helper_id).first()
    if not helper:
        raise HTTPException(status_code=404, detail="Helper not found")
    
    if not helper.latitude or not helper.longitude:
        raise HTTPException(status_code=400, detail="Helper location not available")
    
    # Get active requests
    requests = db.query(HelpRequest).filter(
        HelpRequest.status.in_(['requested']),
        HelpRequest.helper_id.is_(None)
    ).order_by(HelpRequest.ai_priority_score.desc()).all()
    
    recommendations = []
    
    from ..services.ai_service import haversine_distance
    
    for req in requests:
        # Calculate distance
        distance = haversine_distance(
            helper.latitude, helper.longitude,
            req.latitude, req.longitude
        )
        
        # Skip if too far
        max_dist = helper.max_distance_km or 10
        if distance > max_dist:
            continue
        
        # Calculate match score
        score = 0
        reasons = []
        
        # Priority boost
        priority_boost = (req.ai_priority_score or 50) * 0.4
        score += priority_boost
        reasons.append(f"🔥 Priority: {req.ai_priority_score or 50}")
        
        # Distance score (closer = better)
        distance_score = (1 - distance / max_dist) * 30
        score += distance_score
        reasons.append(f"📍 {distance:.1f}km away")
        
        # Skill match
        can_help = (helper.can_help_with or '').lower()
        if req.help_type in can_help:
            score += 20
            reasons.append(f"✓ Matches your skills")
        
        # Critical urgency boost
        if req.urgency == 'critical':
            score += 10
            reasons.append("🚨 Critical urgency")
        
        recommendations.append({
            'request_id': req.id,
            'help_type': req.help_type,
            'urgency': req.urgency,
            'description': req.description[:100] + '...' if req.description and len(req.description) > 100 else req.description,
            'distance_km': round(distance, 2),
            'priority_score': req.ai_priority_score or req.priority_score,
            'priority_label': req.ai_priority_label or 'medium',
            'match_score': round(min(100, score), 1),
            'match_reasons': reasons,
            'address': req.address,
            'contact_name': req.contact_name,
            'created_at': req.created_at.isoformat() if req.created_at else None
        })
    
    # Sort by match score
    recommendations.sort(key=lambda x: x['match_score'], reverse=True)
    
    return {
        'helper_id': helper_id,
        'helper_name': helper.name,
        'location': {'lat': helper.latitude, 'lon': helper.longitude},
        'total_requests': len(recommendations),
        'recommendations': recommendations[:top_n]
    }


@router.post("/log-decision")
async def log_ai_decision(
    request_id: int,
    action_type: str,
    output_data: Dict[str, Any],
    explanation: str,
    confidence: float = None,
    was_overridden: bool = False,
    override_reason: str = None,
    db: Session = Depends(get_db)
):
    """
    Log an AI decision for transparency and audit.
    
    Call this after any AI decision to maintain a clear audit trail.
    """
    log = AILog(
        request_id=request_id,
        action_type=action_type,
        output_data=output_data,
        confidence=confidence,
        explanation=explanation,
        was_overridden=was_overridden,
        override_reason=override_reason
    )
    
    db.add(log)
    db.commit()
    
    return {"status": "logged", "log_id": log.id}


@router.get("/logs/{request_id}")
async def get_ai_logs(
    request_id: int,
    db: Session = Depends(get_db)
):
    """
    Get all AI decision logs for a specific request.
    
    Useful for understanding why certain decisions were made.
    """
    logs = db.query(AILog).filter(
        AILog.request_id == request_id
    ).order_by(AILog.created_at.desc()).all()
    
    return [{
        'id': log.id,
        'action_type': log.action_type,
        'output_data': log.output_data,
        'confidence': log.confidence,
        'explanation': log.explanation,
        'was_overridden': log.was_overridden,
        'override_reason': log.override_reason,
        'created_at': log.created_at.isoformat()
    } for log in logs]
