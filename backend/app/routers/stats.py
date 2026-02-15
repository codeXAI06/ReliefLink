"""
Statistics API Router
Provides overview stats, hazard zones, predictive analytics, and data export
"""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from math import radians, cos, sin, asin, sqrt
from typing import Optional
from datetime import datetime, timedelta, timezone
import csv
import io

from ..database import get_db
from ..models import HelpRequest, Helper
from ..schemas import StatsResponse
from ..logging_config import get_logger

logger = get_logger("stats")
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


def _haversine(lat1, lon1, lat2, lon2):
    """Distance in km between two lat/lon points."""
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 6371 * 2 * asin(sqrt(a))


@router.get("/hazard-zones")
async def get_hazard_zones(
    radius_km: float = Query(5.0, description="Clustering radius in km"),
    db: Session = Depends(get_db),
):
    """
    Compute hazard / disaster zones from active help requests.

    Algorithm: simple density-based clustering.
    1. Fetch all non-completed, non-cancelled requests.
    2. Greedily cluster nearby requests within `radius_km`.
    3. For each cluster compute centre, radius, severity, and counts.
    """
    requests = (
        db.query(HelpRequest)
        .filter(HelpRequest.status.notin_(["completed", "cancelled"]))
        .all()
    )

    if not requests:
        return {"hazard_zones": [], "total_zones": 0}

    # Convert to simple dicts for processing
    points = [
        {
            "id": r.id,
            "lat": r.latitude,
            "lon": r.longitude,
            "urgency": r.urgency or "moderate",
            "help_type": r.help_type,
            "priority": r.priority_score or 50,
        }
        for r in requests
    ]

    # Greedy clustering
    used = set()
    clusters = []

    for i, p in enumerate(points):
        if i in used:
            continue
        cluster = [p]
        used.add(i)
        for j, q in enumerate(points):
            if j in used:
                continue
            if _haversine(p["lat"], p["lon"], q["lat"], q["lon"]) <= radius_km:
                cluster.append(q)
                used.add(j)
        clusters.append(cluster)

    # Build hazard zone objects
    urgency_weight = {"critical": 3, "moderate": 2, "low": 1}
    zones = []
    for cluster in clusters:
        if len(cluster) < 1:
            continue
        center_lat = sum(p["lat"] for p in cluster) / len(cluster)
        center_lon = sum(p["lon"] for p in cluster) / len(cluster)

        # Radius = max distance from centre to any point, minimum 0.5 km
        max_dist = max(
            _haversine(center_lat, center_lon, p["lat"], p["lon"])
            for p in cluster
        )
        zone_radius = max(max_dist + 0.5, 0.5)  # pad a little

        # Severity score based on count and urgency mix
        severity_score = sum(urgency_weight.get(p["urgency"], 1) for p in cluster)
        critical_count = sum(1 for p in cluster if p["urgency"] == "critical")
        total = len(cluster)

        if critical_count >= total * 0.5 or severity_score >= total * 2.5:
            severity = "extreme"
        elif critical_count >= 1 or severity_score >= total * 1.8:
            severity = "high"
        elif severity_score >= total * 1.3:
            severity = "moderate"
        else:
            severity = "low"

        # Help type breakdown
        type_counts = {}
        for p in cluster:
            type_counts[p["help_type"]] = type_counts.get(p["help_type"], 0) + 1

        zones.append(
            {
                "center_lat": round(center_lat, 6),
                "center_lon": round(center_lon, 6),
                "radius_km": round(zone_radius, 2),
                "severity": severity,
                "severity_score": severity_score,
                "request_count": total,
                "critical_count": critical_count,
                "help_types": type_counts,
                "request_ids": [p["id"] for p in cluster],
            }
        )

    # Sort by severity score descending
    zones.sort(key=lambda z: z["severity_score"], reverse=True)

    return {"hazard_zones": zones, "total_zones": len(zones)}


@router.get("/predictive-zones")
async def get_predictive_zones(
    hours_back: int = Query(6, description="Hours of data to analyze"),
    db: Session = Depends(get_db),
):
    """
    Predict emerging disaster zones using request velocity analysis.
    
    Patent claim: Time-series analysis of help request patterns 
    to predict where disaster impact will spread next.
    
    Algorithm:
    1. Analyze request creation rate per geographic cluster over time windows
    2. Identify clusters with accelerating request rates
    3. Project growth trajectory to flag emerging hotspots
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours_back)
    
    requests = db.query(HelpRequest).filter(
        HelpRequest.created_at >= cutoff,
        HelpRequest.status.notin_(["completed", "cancelled"])
    ).all()
    
    if len(requests) < 2:
        return {"predicted_zones": [], "analysis_window_hours": hours_back}
    
    # Split into time windows (divide period into 3 windows)
    window_size = timedelta(hours=hours_back / 3)
    windows = []
    for i in range(3):
        start = cutoff + window_size * i
        end = start + window_size
        window_reqs = [r for r in requests 
                       if r.created_at and start <= r.created_at.replace(tzinfo=timezone.utc) < end]
        windows.append(window_reqs)
    
    # Cluster recent requests geographically
    points = [{"lat": r.latitude, "lon": r.longitude, "created": r.created_at, "urgency": r.urgency, "id": r.id} 
              for r in requests]
    
    used = set()
    clusters = []
    for i, p in enumerate(points):
        if i in used:
            continue
        cluster = [p]
        used.add(i)
        for j, q in enumerate(points):
            if j in used:
                continue
            if _haversine(p["lat"], p["lon"], q["lat"], q["lon"]) <= 3.0:  # 3km radius
                cluster.append(q)
                used.add(j)
        if len(cluster) >= 2:
            clusters.append(cluster)
    
    predicted = []
    for cluster in clusters:
        center_lat = sum(p["lat"] for p in cluster) / len(cluster)
        center_lon = sum(p["lon"] for p in cluster) / len(cluster)
        
        # Calculate request velocity (requests per hour in each window)
        velocities = []
        for window_reqs in windows:
            count = sum(1 for r in window_reqs 
                       for p in cluster 
                       if _haversine(r.latitude, r.longitude, center_lat, center_lon) <= 3.0)
            velocities.append(count)
        
        # Check if accelerating (each window has more than previous)
        is_accelerating = (len(velocities) >= 2 and velocities[-1] > velocities[0])
        growth_rate = (velocities[-1] - velocities[0]) / max(velocities[0], 1)
        
        # Predict severity
        critical_count = sum(1 for p in cluster if p["urgency"] == "critical")
        risk_score = growth_rate * 50 + len(cluster) * 5 + critical_count * 15
        
        if risk_score > 20 or is_accelerating:
            predicted.append({
                "center_lat": round(center_lat, 6),
                "center_lon": round(center_lon, 6),
                "radius_km": 3.0,
                "risk_score": round(min(100, risk_score), 1),
                "request_count": len(cluster),
                "growth_rate": round(growth_rate, 2),
                "is_accelerating": is_accelerating,
                "velocities": velocities,
                "prediction": "expanding" if is_accelerating else "stable",
                "predicted_severity": "critical" if risk_score > 60 else "high" if risk_score > 30 else "moderate"
            })
    
    predicted.sort(key=lambda z: z["risk_score"], reverse=True)
    
    return {
        "predicted_zones": predicted,
        "analysis_window_hours": hours_back,
        "total_predictions": len(predicted)
    }


@router.get("/analytics")
async def get_analytics(db: Session = Depends(get_db)):
    """
    Detailed analytics for admin dashboard.
    Returns time-series data, response times, and helper leaderboard.
    """
    # Requests by day (last 7 days)
    daily_counts = []
    for i in range(7):
        day_start = datetime.now(timezone.utc) - timedelta(days=i+1)
        day_end = datetime.now(timezone.utc) - timedelta(days=i)
        count = db.query(func.count(HelpRequest.id)).filter(
            HelpRequest.created_at >= day_start,
            HelpRequest.created_at < day_end
        ).scalar() or 0
        daily_counts.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "count": count
        })
    daily_counts.reverse()
    
    # Average response time (accepted_at - created_at)
    accepted = db.query(HelpRequest).filter(
        HelpRequest.accepted_at.isnot(None)
    ).limit(50).all()
    
    avg_response_mins = 0
    if accepted:
        response_times = []
        for r in accepted:
            if r.accepted_at and r.created_at:
                diff = (r.accepted_at - r.created_at).total_seconds() / 60
                if diff > 0:
                    response_times.append(diff)
        if response_times:
            avg_response_mins = round(sum(response_times) / len(response_times), 1)
    
    # Helper leaderboard
    top_helpers = db.query(Helper).order_by(
        Helper.requests_completed.desc()
    ).limit(10).all()
    
    leaderboard = [{
        "id": h.id,
        "name": h.name,
        "completed": h.requests_completed,
        "rating": h.rating,
        "organization": h.organization
    } for h in top_helpers]
    
    # Category breakdown
    type_counts = db.query(
        HelpRequest.help_type,
        func.count(HelpRequest.id)
    ).group_by(HelpRequest.help_type).all()
    
    # Escalated count
    escalated = db.query(func.count(HelpRequest.id)).filter(
        HelpRequest.escalation_level > 0,
        HelpRequest.status.notin_(["completed", "cancelled"])
    ).scalar() or 0
    
    # Flagged count
    flagged = db.query(func.count(HelpRequest.id)).filter(
        HelpRequest.is_flagged == True
    ).scalar() or 0
    
    return {
        "daily_requests": daily_counts,
        "avg_response_time_mins": avg_response_mins,
        "helper_leaderboard": leaderboard,
        "category_breakdown": {t: c for t, c in type_counts},
        "escalated_count": escalated,
        "flagged_count": flagged,
        "total_requests": db.query(func.count(HelpRequest.id)).scalar() or 0,
        "total_helpers": db.query(func.count(Helper.id)).scalar() or 0
    }


@router.get("/export")
async def export_data(db: Session = Depends(get_db)):
    """Export all request data as CSV for disaster coordination teams"""
    requests = db.query(HelpRequest).order_by(HelpRequest.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Help Type", "Urgency", "Status", "Description", 
        "Latitude", "Longitude", "Address", "Priority Score",
        "AI Priority Label", "Distress Score", "Escalation Level",
        "Created At", "Accepted At", "Completed At"
    ])
    
    for r in requests:
        writer.writerow([
            r.id, r.help_type, r.urgency, r.status, 
            (r.description or "")[:200], r.latitude, r.longitude,
            r.address, r.priority_score, r.ai_priority_label,
            r.distress_score, r.escalation_level,
            r.created_at, r.accepted_at, r.completed_at
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=relieflink_export.csv"}
    )