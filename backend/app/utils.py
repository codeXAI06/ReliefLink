"""
Utility functions for ReliefLink
Includes: distance calculation, phone masking, time formatting, priority scoring
"""
from datetime import datetime, timedelta
from math import radians, cos, sin, asin, sqrt
from typing import Optional


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points
    on the earth (specified in decimal degrees)
    Returns distance in kilometers
    """
    # Convert to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    # Earth's radius in kilometers
    r = 6371
    
    return c * r


def mask_phone(phone: Optional[str]) -> Optional[str]:
    """
    Mask phone number for privacy
    Example: +1234567890 -> +123****890
    """
    if not phone or len(phone) < 6:
        return phone
    
    # Keep first 3 and last 3 characters
    visible_start = phone[:4]
    visible_end = phone[-3:]
    masked_middle = '*' * (len(phone) - 7)
    
    return f"{visible_start}{masked_middle}{visible_end}"


def format_time_ago(dt: datetime) -> str:
    """
    Format datetime as human-readable time ago
    Example: "5 minutes ago", "2 hours ago"
    """
    if not dt:
        return "Unknown"
    
    now = datetime.utcnow()
    diff = now - dt
    
    seconds = diff.total_seconds()
    
    if seconds < 60:
        return "Just now"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        return f"{minutes} min{'s' if minutes > 1 else ''} ago"
    elif seconds < 86400:
        hours = int(seconds / 3600)
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    else:
        days = int(seconds / 86400)
        return f"{days} day{'s' if days > 1 else ''} ago"


def calculate_priority_score(
    urgency: str,
    created_at: datetime,
    help_type: str
) -> int:
    """
    AI-powered priority scoring for requests
    Score: 0-100, higher = more urgent
    
    Factors:
    - Urgency level (Critical=60, Moderate=40, Low=20)
    - Time pending (older requests get higher priority)
    - Help type (Rescue, Medical get slight boost)
    """
    score = 0
    
    # Base score from urgency
    urgency_scores = {
        'critical': 60,
        'moderate': 40,
        'low': 20
    }
    score += urgency_scores.get(urgency, 40)
    
    # Time factor (up to +30 points for older requests)
    if created_at:
        hours_pending = (datetime.utcnow() - created_at).total_seconds() / 3600
        time_score = min(30, int(hours_pending * 2))  # 2 points per hour, max 30
        score += time_score
    
    # Help type bonus
    high_priority_types = ['rescue', 'medical']
    if help_type in high_priority_types:
        score += 10
    
    return min(100, score)


def validate_coordinates(lat: float, lon: float) -> bool:
    """Validate latitude and longitude values"""
    return -90 <= lat <= 90 and -180 <= lon <= 180


def get_urgency_color(urgency: str) -> str:
    """Get color code for urgency level"""
    colors = {
        'critical': '#EF4444',  # Red
        'moderate': '#F59E0B',  # Orange
        'low': '#10B981'        # Green
    }
    return colors.get(urgency, '#6B7280')


def get_status_color(status: str) -> str:
    """Get color code for request status"""
    colors = {
        'requested': '#3B82F6',   # Blue
        'accepted': '#8B5CF6',    # Purple
        'in_progress': '#F59E0B', # Orange
        'completed': '#10B981',   # Green
        'cancelled': '#6B7280'    # Gray
    }
    return colors.get(status, '#6B7280')
