"""
Pydantic Schemas for API validation
Separate from SQLAlchemy models for clean API contracts
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# Enums for validation
class HelpType(str, Enum):
    FOOD = "food"
    WATER = "water"
    MEDICAL = "medical"
    SHELTER = "shelter"
    RESCUE = "rescue"
    OTHER = "other"


class UrgencyLevel(str, Enum):
    CRITICAL = "critical"
    MODERATE = "moderate"
    LOW = "low"


class RequestStatus(str, Enum):
    REQUESTED = "requested"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ============ Help Request Schemas ============

class HelpRequestCreate(BaseModel):
    """Schema for creating a new help request"""
    help_type: HelpType
    description: Optional[str] = None
    urgency: UrgencyLevel = UrgencyLevel.MODERATE
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None
    phone: Optional[str] = None
    contact_name: Optional[str] = None


class HelpRequestUpdate(BaseModel):
    """Schema for updating a help request"""
    status: Optional[RequestStatus] = None
    helper_id: Optional[int] = None
    notes: Optional[str] = None


class HelpRequestResponse(BaseModel):
    """Schema for help request responses"""
    id: int
    help_type: str
    description: Optional[str]
    urgency: str
    latitude: float
    longitude: float
    address: Optional[str]
    phone_masked: Optional[str]  # Masked phone for privacy
    phone: Optional[str] = None  # Full phone for authenticated helpers
    contact_name: Optional[str]
    status: str
    helper_id: Optional[int]
    helper_name: Optional[str] = None
    priority_score: int
    created_at: datetime
    updated_at: datetime
    accepted_at: Optional[datetime]
    completed_at: Optional[datetime]
    time_ago: Optional[str] = None  # Human-readable time
    distance_km: Optional[float] = None  # Distance from helper
    
    # AI-powered fields
    ai_priority_score: Optional[int] = None  # AI-calculated priority (0-100)
    ai_priority_label: Optional[str] = None  # critical/high/medium/low
    ai_priority_reason: Optional[str] = None  # Why this priority was assigned
    ai_detected_type: Optional[str] = None  # AI-detected help type
    ai_confidence: Optional[float] = None  # AI confidence score (0-1)
    extracted_supplies: Optional[List[str]] = None  # Specific items mentioned
    detected_language: Optional[str] = None  # Detected language code
    translated_text: Optional[str] = None  # English translation
    simplified_text: Optional[str] = None  # Clear action summary
    duplicate_of_id: Optional[int] = None  # ID of potential duplicate
    duplicate_similarity: Optional[float] = None  # Similarity score
    is_flagged: Optional[bool] = None  # Whether request is flagged
    flag_reason: Optional[str] = None  # Why it was flagged

    class Config:
        from_attributes = True


class HelpRequestList(BaseModel):
    """Paginated list of help requests"""
    requests: List[HelpRequestResponse]
    total: int
    page: int
    per_page: int


# ============ Helper Schemas ============

class HelperCreate(BaseModel):
    """Schema for registering a helper"""
    name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = None
    organization: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    can_help_with: Optional[str] = None  # Comma-separated help types


class HelperResponse(BaseModel):
    """Schema for helper responses"""
    id: int
    name: str
    organization: Optional[str]
    can_help_with: Optional[str]
    requests_completed: int
    is_active: int
    created_at: datetime
    last_active: datetime

    class Config:
        from_attributes = True


class HelperDashboard(BaseModel):
    """Dashboard data for helpers"""
    helper: HelperResponse
    active_requests: List[HelpRequestResponse]
    completed_count: int
    nearby_requests: List[HelpRequestResponse]


# ============ Status Log Schemas ============

class StatusLogResponse(BaseModel):
    """Schema for status log entries"""
    id: int
    request_id: int
    old_status: Optional[str]
    new_status: str
    changed_by: Optional[int]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Stats Schemas ============

class StatsResponse(BaseModel):
    """Overall statistics"""
    total_requests: int
    active_requests: int
    completed_requests: int
    total_helpers: int
    active_helpers: int
    requests_by_type: dict
    requests_by_urgency: dict
