"""
Database Models for ReliefLink

Schema Design:
- help_requests: Main table for disaster help requests
- helpers: Registered volunteers/NGOs
- status_logs: Track status changes with timestamps
- ai_logs: Track AI decisions for transparency
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from .database import Base


class HelpType(str, enum.Enum):
    """Types of help that can be requested"""
    FOOD = "food"
    WATER = "water"
    MEDICAL = "medical"
    SHELTER = "shelter"
    RESCUE = "rescue"
    OTHER = "other"


class UrgencyLevel(str, enum.Enum):
    """Urgency levels for requests"""
    CRITICAL = "critical"
    MODERATE = "moderate"
    LOW = "low"


class RequestStatus(str, enum.Enum):
    """Status states for help requests"""
    REQUESTED = "requested"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class HelpRequest(Base):
    """
    Main help request table
    Stores all disaster help requests from affected people
    """
    __tablename__ = "help_requests"

    id = Column(Integer, primary_key=True, index=True)
    
    # Request details
    help_type = Column(String(20), nullable=False)
    description = Column(Text, nullable=True)
    urgency = Column(String(20), default="moderate")
    
    # Location (GPS coordinates + manual address)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=True)
    
    # Contact (optional, masked for privacy)
    phone = Column(String(20), nullable=True)
    contact_name = Column(String(100), nullable=True)
    
    # Status tracking
    status = Column(String(20), default="requested")
    helper_id = Column(Integer, ForeignKey("helpers.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    accepted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # === AI PRIORITY SCORING ===
    # Base priority score (0-100, higher = more urgent)
    priority_score = Column(Integer, default=50)
    # AI-enhanced priority score with keyword analysis
    ai_priority_score = Column(Integer, default=50)
    # Priority label: critical, high, medium, low
    ai_priority_label = Column(String(20), default="medium")
    # Explanation of why this priority was assigned
    ai_priority_reason = Column(Text, nullable=True)
    
    # === AUTO CATEGORIZATION ===
    # AI-detected help type (may differ from user selection)
    ai_detected_type = Column(String(20), nullable=True)
    # Confidence score for auto-categorization (0-1)
    ai_confidence = Column(Float, default=0.0)
    # Extracted supplies/needs from description
    extracted_supplies = Column(JSON, nullable=True)  # ["insulin", "oxygen", etc.]
    # Whether user confirmed AI suggestion
    category_confirmed = Column(Boolean, default=False)
    
    # === MULTI-LANGUAGE SUPPORT ===
    # Detected language of original text
    detected_language = Column(String(10), nullable=True)  # "en", "hi", "ta", etc.
    # Translated description (to English)
    translated_text = Column(Text, nullable=True)
    # Simplified action steps
    simplified_text = Column(Text, nullable=True)
    
    # === DUPLICATE DETECTION ===
    # ID of original request if this is a duplicate
    duplicate_of_id = Column(Integer, ForeignKey("help_requests.id"), nullable=True)
    # Similarity score with potential duplicate (0-1)
    duplicate_similarity = Column(Float, nullable=True)
    
    # === SPAM/FAKE FLAGGING ===
    # Whether request is flagged for review
    is_flagged = Column(Boolean, default=False)
    # Reason for flagging
    flag_reason = Column(String(200), nullable=True)
    # Human review status: pending, approved, rejected
    review_status = Column(String(20), nullable=True)
    
    # Relationships
    helper = relationship("Helper", back_populates="accepted_requests")
    status_logs = relationship("StatusLog", back_populates="request")


class Helper(Base):
    """
    Helper/Volunteer table
    Simple registration for volunteers and NGOs
    """
    __tablename__ = "helpers"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic info
    name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    organization = Column(String(200), nullable=True)  # NGO name if applicable
    
    # Current location (for distance-based matching)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Helper capabilities (for smart matching)
    can_help_with = Column(String(200), nullable=True)  # Comma-separated help types
    skills = Column(JSON, nullable=True)  # ["medical", "transport", "supplies", "rescue"]
    has_vehicle = Column(Boolean, default=False)
    max_distance_km = Column(Float, default=10.0)  # Max distance willing to travel
    
    # Stats
    requests_completed = Column(Integer, default=0)
    is_active = Column(Integer, default=1)  # 1 = active, 0 = inactive
    rating = Column(Float, default=5.0)  # Average rating from requesters
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    accepted_requests = relationship("HelpRequest", back_populates="helper")


class StatusLog(Base):
    """
    Status change log for audit trail
    Tracks every status change with timestamp
    """
    __tablename__ = "status_logs"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("help_requests.id"), nullable=False)
    
    old_status = Column(String(20), nullable=True)
    new_status = Column(String(20), nullable=False)
    changed_by = Column(Integer, nullable=True)  # Helper ID if applicable
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    request = relationship("HelpRequest", back_populates="status_logs")


class AILog(Base):
    """
    AI Decision Log for transparency and audit
    Logs every AI decision with explanation
    """
    __tablename__ = "ai_logs"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("help_requests.id"), nullable=False)
    
    # What AI action was taken
    action_type = Column(String(50), nullable=False)  # priority, categorize, translate, duplicate, flag
    
    # AI decision details
    input_data = Column(JSON, nullable=True)  # What was analyzed
    output_data = Column(JSON, nullable=True)  # AI result
    confidence = Column(Float, nullable=True)  # Confidence score
    explanation = Column(Text, nullable=True)  # Human-readable explanation
    
    # Whether human overrode the decision
    was_overridden = Column(Boolean, default=False)
    override_reason = Column(Text, nullable=True)
    
    # Processing time (for performance monitoring)
    processing_time_ms = Column(Integer, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
