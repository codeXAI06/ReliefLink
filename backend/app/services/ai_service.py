"""
AI Service Layer for ReliefLink
================================
Provides lightweight AI features for disaster response:
1. Priority Scoring - Rank requests by urgency
2. Auto Categorization - Extract help type from text
3. Language Detection & Translation - Multi-language support
4. Duplicate Detection - Find similar requests
5. Spam/Fake Flagging - Identify suspicious requests
6. Smart Helper Matching - Recommend best helpers

Design Principles:
- Fast inference (< 100ms per request)
- Graceful degradation (app works even if AI fails)
- Interpretable decisions (explain every score)
- No heavy ML models (rule-based + simple classifiers)
"""
import re
import time
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from functools import lru_cache
import json

# Translation cache to reduce API calls
_translation_cache: Dict[str, str] = {}


# ============================================================
# KEYWORD DICTIONARIES FOR PRIORITY SCORING
# ============================================================

# Life-threatening keywords (highest boost)
CRITICAL_KEYWORDS = {
    # English
    'trapped', 'drowning', 'unconscious', 'bleeding', 'dying', 'critical',
    'emergency', 'urgent', 'immediately', 'asap', 'sos', 'help',
    'heart attack', 'stroke', 'not breathing', 'suffocating',
    # Vulnerable populations
    'child', 'children', 'baby', 'infant', 'elderly', 'pregnant',
    'disabled', 'wheelchair', 'blind', 'deaf',
    # Hindi
    'फंसा', 'बेहोश', 'खून', 'मर रहा', 'गंभीर', 'तुरंत', 'बच्चा', 'बुजुर्ग', 'गर्भवती',
    # Tamil
    'சிக்கி', 'மயக்கம்', 'இரத்தம்', 'குழந்தை', 'முதியவர்',
    # Telugu
    'చిక్కుకున్న', 'స్పృహ', 'రక్తస్రావం', 'పిల్లలు', 'వృద్ధులు',
}

# High urgency keywords (moderate boost)
HIGH_URGENCY_KEYWORDS = {
    'injured', 'injury', 'wound', 'broken', 'fracture', 'pain',
    'medicine', 'medication', 'insulin', 'oxygen', 'dialysis',
    'stranded', 'stuck', 'no food', 'no water', 'hungry', 'thirsty',
    'flood', 'fire', 'collapse', 'earthquake', 'cyclone',
    'roof', 'wall', 'damage', 'destroyed',
    # Hindi
    'घायल', 'दर्द', 'दवाई', 'भूखा', 'प्यासा', 'बाढ़', 'आग',
}

# Medical supply keywords
MEDICAL_SUPPLIES = {
    'insulin', 'oxygen', 'inhaler', 'nebulizer', 'dialysis',
    'blood pressure', 'bp medicine', 'heart medicine', 'epilepsy',
    'diabetes', 'asthma', 'cancer', 'chemotherapy',
    'wheelchair', 'walker', 'crutches', 'bandage', 'first aid',
    'painkiller', 'antibiotic', 'fever', 'thermometer',
}

# Food/supply keywords
FOOD_SUPPLIES = {
    'rice', 'dal', 'flour', 'atta', 'bread', 'milk', 'baby food',
    'formula', 'water bottle', 'drinking water', 'biscuits',
    'canned food', 'dry food', 'vegetables', 'fruits',
}

# Category keywords for auto-detection
CATEGORY_KEYWORDS = {
    'food': ['food', 'hungry', 'eat', 'meal', 'rice', 'dal', 'bread', 'starving', 'खाना', 'भोजन', 'भूख'],
    'water': ['water', 'drink', 'thirsty', 'dehydrated', 'पानी', 'प्यास', 'தண்ணீர்'],
    'medical': ['medical', 'medicine', 'doctor', 'hospital', 'injured', 'sick', 'health', 'दवाई', 'डॉक्टर', 'अस्पताल'],
    'shelter': ['shelter', 'roof', 'house', 'home', 'tent', 'stay', 'homeless', 'आश्रय', 'घर', 'छत'],
    'rescue': ['rescue', 'trapped', 'stuck', 'save', 'flood', 'stranded', 'बचाव', 'फंसा'],
    'other': ['clothes', 'blanket', 'electricity', 'phone', 'charge', 'transport'],
}

# Spam indicators
SPAM_INDICATORS = {
    'patterns': [
        r'(?i)(click here|visit now|free money|lottery|winner)',
        r'(?i)(test|testing|check|ignore)',
        r'(.)\1{5,}',  # Repeated characters (aaaaaaa)
    ],
    'min_length': 5,  # Too short descriptions
}


@dataclass
class AIPriorityResult:
    """Result of AI priority scoring"""
    score: int  # 0-100
    label: str  # critical, high, medium, low
    reasons: List[str]  # Explanations
    keywords_found: List[str]  # Detected important keywords
    confidence: float  # 0-1


@dataclass
class AICategoryResult:
    """Result of auto-categorization"""
    detected_type: str  # food, water, medical, etc.
    confidence: float  # 0-1
    extracted_supplies: List[str]  # Specific items mentioned
    needs_confirmation: bool  # True if confidence < threshold


@dataclass
class AITranslationResult:
    """Result of language detection and translation"""
    detected_language: str  # Language code
    original_text: str
    translated_text: str  # English translation
    simplified_text: str  # Action-oriented summary
    confidence: float


@dataclass
class AIDuplicateResult:
    """Result of duplicate detection"""
    is_duplicate: bool
    duplicate_of_id: Optional[int]
    similarity_score: float  # 0-1
    reasons: List[str]


@dataclass
class AIFlagResult:
    """Result of spam/fake detection"""
    is_flagged: bool
    flag_reason: Optional[str]
    confidence: float


@dataclass
class AIHelperMatch:
    """A recommended helper match"""
    helper_id: int
    helper_name: str
    distance_km: float
    match_score: float  # 0-100
    match_reasons: List[str]


# ============================================================
# 1. AI PRIORITY SCORING
# ============================================================

def calculate_ai_priority(
    description: str,
    urgency: str,
    help_type: str,
    created_at: datetime,
    has_phone: bool = False,
    has_address: bool = False,
) -> AIPriorityResult:
    """
    Calculate AI-enhanced priority score for a help request.
    
    Scoring factors:
    - User-selected urgency (base score)
    - Critical keywords in description (+20-40 points)
    - Vulnerable population mentions (+15 points)
    - Time pending (+5-15 points)
    - Request type weight (+5-10 points)
    - Contact info provided (+5 points)
    
    Returns score 0-100 with explanation.
    """
    start_time = time.time()
    
    text = (description or '').lower()
    reasons = []
    keywords_found = []
    
    # Base score from user-selected urgency
    base_scores = {'critical': 70, 'moderate': 45, 'low': 25}
    score = base_scores.get(urgency, 45)
    reasons.append(f"Base urgency '{urgency}': {score} points")
    
    # Critical keyword boost (+20-40)
    critical_found = [kw for kw in CRITICAL_KEYWORDS if kw in text]
    if critical_found:
        boost = min(40, len(critical_found) * 10)
        score += boost
        keywords_found.extend(critical_found[:5])  # Top 5
        reasons.append(f"Critical keywords ({', '.join(critical_found[:3])}): +{boost}")
    
    # High urgency keyword boost (+10-20)
    high_found = [kw for kw in HIGH_URGENCY_KEYWORDS if kw in text]
    if high_found:
        boost = min(20, len(high_found) * 5)
        score += boost
        keywords_found.extend(high_found[:3])
        reasons.append(f"Urgency keywords ({', '.join(high_found[:3])}): +{boost}")
    
    # Help type weight
    type_weights = {'rescue': 15, 'medical': 12, 'water': 8, 'food': 6, 'shelter': 5, 'other': 3}
    type_boost = type_weights.get(help_type, 3)
    score += type_boost
    reasons.append(f"Help type '{help_type}': +{type_boost}")
    
    # Time pending bonus (older requests get slight boost)
    if created_at:
        hours_pending = (datetime.utcnow() - created_at).total_seconds() / 3600
        if hours_pending > 24:
            time_boost = 15
            reasons.append(f"Pending >24 hours: +{time_boost}")
        elif hours_pending > 6:
            time_boost = 10
            reasons.append(f"Pending >6 hours: +{time_boost}")
        elif hours_pending > 2:
            time_boost = 5
            reasons.append(f"Pending >2 hours: +{time_boost}")
        else:
            time_boost = 0
        score += time_boost
    
    # Contact info bonus (verifiable requests)
    if has_phone:
        score += 3
        reasons.append("Phone provided: +3")
    if has_address:
        score += 2
        reasons.append("Address provided: +2")
    
    # Cap score at 100
    score = min(100, max(0, score))
    
    # Determine label
    if score >= 80:
        label = "critical"
    elif score >= 60:
        label = "high"
    elif score >= 40:
        label = "medium"
    else:
        label = "low"
    
    # Confidence based on keyword matches
    confidence = min(1.0, 0.5 + (len(keywords_found) * 0.1))
    
    processing_time = (time.time() - start_time) * 1000
    
    return AIPriorityResult(
        score=score,
        label=label,
        reasons=reasons,
        keywords_found=keywords_found,
        confidence=confidence
    )


# ============================================================
# 2. AUTO CATEGORIZATION
# ============================================================

def auto_categorize_request(description: str, user_selected_type: str = None) -> AICategoryResult:
    """
    Automatically detect help type and extract supplies from description.
    
    Uses keyword matching with confidence scoring.
    If confidence < 0.6, suggests user confirmation.
    """
    text = (description or '').lower()
    
    if not text:
        return AICategoryResult(
            detected_type=user_selected_type or 'other',
            confidence=0.5,
            extracted_supplies=[],
            needs_confirmation=True
        )
    
    # Count keyword matches per category
    category_scores = {}
    for category, keywords in CATEGORY_KEYWORDS.items():
        matches = sum(1 for kw in keywords if kw in text)
        if matches > 0:
            category_scores[category] = matches
    
    # Determine best category
    if category_scores:
        best_category = max(category_scores, key=category_scores.get)
        max_matches = category_scores[best_category]
        # Confidence based on number of matches
        confidence = min(0.95, 0.4 + (max_matches * 0.15))
    else:
        best_category = user_selected_type or 'other'
        confidence = 0.3
    
    # Extract specific supplies mentioned
    supplies_found = []
    
    # Check medical supplies
    for supply in MEDICAL_SUPPLIES:
        if supply in text:
            supplies_found.append(supply)
    
    # Check food supplies
    for supply in FOOD_SUPPLIES:
        if supply in text:
            supplies_found.append(supply)
    
    # Needs confirmation if low confidence or differs from user selection
    needs_confirmation = confidence < 0.6 or (
        user_selected_type and 
        best_category != user_selected_type and 
        confidence < 0.8
    )
    
    return AICategoryResult(
        detected_type=best_category,
        confidence=confidence,
        extracted_supplies=supplies_found[:10],  # Limit to 10
        needs_confirmation=needs_confirmation
    )


# ============================================================
# 3. LANGUAGE DETECTION & TRANSLATION
# ============================================================

# Simple language detection based on script/character ranges
LANGUAGE_PATTERNS = {
    'hi': r'[\u0900-\u097F]',  # Devanagari (Hindi)
    'ta': r'[\u0B80-\u0BFF]',  # Tamil
    'te': r'[\u0C00-\u0C7F]',  # Telugu
    'bn': r'[\u0980-\u09FF]',  # Bengali
    'kn': r'[\u0C80-\u0CFF]',  # Kannada
    'ml': r'[\u0D00-\u0D7F]',  # Malayalam
    'gu': r'[\u0A80-\u0AFF]',  # Gujarati
    'pa': r'[\u0A00-\u0A7F]',  # Punjabi
    'mr': r'[\u0900-\u097F]',  # Marathi (also Devanagari)
}


def detect_language(text: str) -> Tuple[str, float]:
    """
    Detect language of text based on character scripts.
    Returns (language_code, confidence).
    """
    if not text:
        return ('en', 0.5)
    
    # Check for non-Latin scripts
    for lang_code, pattern in LANGUAGE_PATTERNS.items():
        if re.search(pattern, text):
            # Count characters matching pattern
            matches = len(re.findall(pattern, text))
            confidence = min(0.95, 0.5 + (matches / len(text)))
            return (lang_code, confidence)
    
    # Default to English for Latin script
    return ('en', 0.8)


def translate_and_simplify(
    text: str,
    source_lang: str = None
) -> AITranslationResult:
    """
    Translate text to English and create simplified action steps.
    
    Note: In production, this would call a translation API.
    For now, uses a simple rule-based approach.
    """
    if not text:
        return AITranslationResult(
            detected_language='en',
            original_text='',
            translated_text='',
            simplified_text='',
            confidence=0.0
        )
    
    # Detect language if not provided
    if not source_lang:
        source_lang, lang_confidence = detect_language(text)
    else:
        lang_confidence = 0.9
    
    # Check cache first
    cache_key = f"{source_lang}:{text[:100]}"
    if cache_key in _translation_cache:
        cached = _translation_cache[cache_key]
        return AITranslationResult(
            detected_language=source_lang,
            original_text=text,
            translated_text=cached,
            simplified_text=cached,
            confidence=lang_confidence
        )
    
    # For English, just simplify
    if source_lang == 'en':
        simplified = simplify_text(text)
        return AITranslationResult(
            detected_language='en',
            original_text=text,
            translated_text=text,
            simplified_text=simplified,
            confidence=0.95
        )
    
    # For other languages, in production we'd call translation API
    # For now, return original with note
    simplified = f"[{source_lang.upper()}] {text[:200]}"
    
    # Cache the result
    _translation_cache[cache_key] = simplified
    
    return AITranslationResult(
        detected_language=source_lang,
        original_text=text,
        translated_text=text,  # Would be translated in production
        simplified_text=simplified,
        confidence=lang_confidence
    )


def simplify_text(text: str) -> str:
    """
    Simplify emotional/long text into clear action steps.
    """
    # Remove excessive punctuation and emotional expressions
    text = re.sub(r'[!]{2,}', '!', text)
    text = re.sub(r'[.]{2,}', '.', text)
    text = re.sub(r'please+', 'please', text, flags=re.IGNORECASE)
    
    # Extract key information
    # Look for numbers (could be quantities, ages, phone numbers)
    numbers = re.findall(r'\d+', text)
    
    # Truncate if too long
    if len(text) > 200:
        # Find sentence boundary
        sentences = re.split(r'[.!?]', text)
        text = '. '.join(sentences[:3]) + '...'
    
    return text.strip()


# ============================================================
# 4. DUPLICATE DETECTION
# ============================================================

def check_for_duplicates(
    new_request: Dict,
    existing_requests: List[Dict],
    location_radius_km: float = 0.5,
    time_window_hours: int = 24,
    text_similarity_threshold: float = 0.7
) -> AIDuplicateResult:
    """
    Check if a new request is a potential duplicate.
    
    Criteria:
    - Location within radius_km
    - Created within time_window_hours
    - Text similarity above threshold
    """
    if not existing_requests:
        return AIDuplicateResult(
            is_duplicate=False,
            duplicate_of_id=None,
            similarity_score=0.0,
            reasons=[]
        )
    
    new_lat = new_request.get('latitude', 0)
    new_lon = new_request.get('longitude', 0)
    new_text = (new_request.get('description', '') or '').lower()
    new_phone = new_request.get('phone', '')
    
    best_match_id = None
    best_similarity = 0.0
    match_reasons = []
    
    for req in existing_requests:
        similarity = 0.0
        reasons = []
        
        # Skip completed/cancelled requests
        if req.get('status') in ['completed', 'cancelled']:
            continue
        
        # Check phone match (strong indicator)
        if new_phone and req.get('phone') == new_phone:
            similarity += 0.5
            reasons.append("Same phone number")
        
        # Check location proximity
        req_lat = req.get('latitude', 0)
        req_lon = req.get('longitude', 0)
        distance = haversine_distance(new_lat, new_lon, req_lat, req_lon)
        
        if distance < location_radius_km:
            proximity_score = 1 - (distance / location_radius_km)
            similarity += proximity_score * 0.3
            reasons.append(f"Location {distance:.2f}km away")
        
        # Check text similarity (simple Jaccard)
        req_text = (req.get('description', '') or '').lower()
        if new_text and req_text:
            text_sim = jaccard_similarity(new_text, req_text)
            if text_sim > 0.3:
                similarity += text_sim * 0.3
                reasons.append(f"Text {text_sim*100:.0f}% similar")
        
        # Check help type match
        if req.get('help_type') == new_request.get('help_type'):
            similarity += 0.1
            reasons.append("Same help type")
        
        # Update best match
        if similarity > best_similarity:
            best_similarity = similarity
            best_match_id = req.get('id')
            match_reasons = reasons
    
    is_duplicate = best_similarity >= text_similarity_threshold
    
    return AIDuplicateResult(
        is_duplicate=is_duplicate,
        duplicate_of_id=best_match_id if is_duplicate else None,
        similarity_score=best_similarity,
        reasons=match_reasons
    )


def jaccard_similarity(text1: str, text2: str) -> float:
    """Calculate Jaccard similarity between two texts."""
    words1 = set(text1.split())
    words2 = set(text2.split())
    
    if not words1 or not words2:
        return 0.0
    
    intersection = words1 & words2
    union = words1 | words2
    
    return len(intersection) / len(union)


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in km between two GPS coordinates."""
    R = 6371  # Earth's radius in km
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_lat/2)**2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c


# ============================================================
# 5. SPAM/FAKE DETECTION
# ============================================================

def check_for_spam(
    request: Dict,
    recent_requests_from_phone: int = 0,
    recent_requests_from_location: int = 0
) -> AIFlagResult:
    """
    Check if a request appears to be spam or fake.
    
    Does NOT auto-reject - just flags for review.
    
    Indicators:
    - Too many requests from same phone in short time
    - Suspicious patterns in text
    - Very short/empty descriptions
    - Repeated identical text
    """
    text = request.get('description', '') or ''
    phone = request.get('phone', '')
    
    flag_reasons = []
    confidence = 0.0
    
    # Check for too many recent requests from same phone
    if recent_requests_from_phone >= 5:
        flag_reasons.append(f"Multiple requests ({recent_requests_from_phone}) from same phone")
        confidence += 0.3
    
    # Check for too many requests from same location
    if recent_requests_from_location >= 10:
        flag_reasons.append(f"Many requests ({recent_requests_from_location}) from same location")
        confidence += 0.2
    
    # Check for spam patterns in text
    for pattern in SPAM_INDICATORS['patterns']:
        if re.search(pattern, text):
            flag_reasons.append("Suspicious text pattern detected")
            confidence += 0.3
            break
    
    # Check for very short descriptions
    if len(text) < SPAM_INDICATORS['min_length'] and text:
        flag_reasons.append("Description too short")
        confidence += 0.1
    
    # Check for no description at all (might be valid in emergency)
    if not text:
        flag_reasons.append("No description provided")
        confidence += 0.05  # Low penalty - might be genuine emergency
    
    is_flagged = confidence >= 0.5
    
    return AIFlagResult(
        is_flagged=is_flagged,
        flag_reason="; ".join(flag_reasons) if flag_reasons else None,
        confidence=confidence
    )


# ============================================================
# 6. SMART HELPER MATCHING
# ============================================================

def get_helper_recommendations(
    request: Dict,
    available_helpers: List[Dict],
    top_n: int = 3
) -> List[AIHelperMatch]:
    """
    Recommend best helpers for a request based on:
    - Distance
    - Skill match
    - Past performance
    - Availability
    
    Returns top N recommendations with explanations.
    """
    if not available_helpers:
        return []
    
    req_lat = request.get('latitude', 0)
    req_lon = request.get('longitude', 0)
    req_type = request.get('help_type', 'other')
    
    scored_helpers = []
    
    for helper in available_helpers:
        if not helper.get('is_active'):
            continue
        
        score = 0.0
        reasons = []
        
        # Distance score (closer = better)
        helper_lat = helper.get('latitude')
        helper_lon = helper.get('longitude')
        
        if helper_lat and helper_lon:
            distance = haversine_distance(req_lat, req_lon, helper_lat, helper_lon)
            max_distance = helper.get('max_distance_km', 10)
            
            if distance <= max_distance:
                distance_score = (1 - distance / max_distance) * 40
                score += distance_score
                reasons.append(f"📍 {distance:.1f}km away")
            else:
                continue  # Skip helpers too far away
        else:
            distance = 999
        
        # Skill match score
        can_help = helper.get('can_help_with', '') or ''
        skills = helper.get('skills', []) or []
        
        if req_type in can_help or req_type in skills:
            score += 30
            reasons.append(f"✓ Can help with {req_type}")
        
        # Medical bonus for medical requests
        if req_type == 'medical' and 'medical' in str(skills).lower():
            score += 15
            reasons.append("🏥 Has medical skills")
        
        # Vehicle bonus for rescue
        if req_type == 'rescue' and helper.get('has_vehicle'):
            score += 10
            reasons.append("🚗 Has vehicle")
        
        # Experience bonus
        completed = helper.get('requests_completed', 0)
        if completed >= 10:
            score += 10
            reasons.append(f"⭐ {completed} requests completed")
        elif completed >= 5:
            score += 5
            reasons.append(f"✓ {completed} requests completed")
        
        # Rating bonus
        rating = helper.get('rating', 5.0)
        if rating >= 4.5:
            score += 5
            reasons.append(f"⭐ {rating:.1f} rating")
        
        if score > 0:
            scored_helpers.append(AIHelperMatch(
                helper_id=helper['id'],
                helper_name=helper.get('name', 'Unknown'),
                distance_km=round(distance, 2),
                match_score=round(min(100, score), 1),
                match_reasons=reasons
            ))
    
    # Sort by score (descending) and return top N
    scored_helpers.sort(key=lambda x: x.match_score, reverse=True)
    return scored_helpers[:top_n]


# ============================================================
# MAIN AI PROCESSING FUNCTION
# ============================================================

# DISTRESS ANALYSIS KEYWORDS
DISTRESS_INDICATORS = {
    'panic': {'please help', 'someone help', 'anyone', 'god help', 'we are dying', 'please please', 'help help'},
    'crying': {'crying', 'tears', 'sobbing', 'screaming', 'scream', 'yelling'},
    'fear': {'scared', 'terrified', 'afraid', 'fear', 'panic', 'horror', 'darkness'},
    'desperation': {'last hope', 'no one', 'nobody', 'abandoned', 'alone', 'stranded', 'hopeless', 'desperate'},
    'physical_distress': {'pain', 'hurt', 'broken', 'bleeding', 'can\'t move', 'can\'t breathe', 'suffocating'},
    'time_pressure': {'running out', 'won\'t last', 'hurry', 'quickly', 'fast', 'immediately', 'asap', 'right now'},
}


def analyze_distress(description: str) -> dict:
    """
    Analyze emotional distress level from text.
    Returns distress score (0-1) and detected indicators.
    
    Patent claim: Emotional context analysis for disaster priority scoring.
    """
    text = (description or '').lower()
    
    detected = []
    category_scores = {}
    
    for category, keywords in DISTRESS_INDICATORS.items():
        found = [kw for kw in keywords if kw in text]
        if found:
            detected.extend([f"{category}: {kw}" for kw in found])
            category_scores[category] = min(1.0, len(found) * 0.3)
    
    # Check for repetition (e.g., "help help help")
    words = text.split()
    if len(words) > 2:
        repeated = sum(1 for i in range(len(words)-1) if words[i] == words[i+1])
        if repeated > 0:
            detected.append(f"word_repetition: {repeated} repeated words")
            category_scores['repetition'] = min(1.0, repeated * 0.25)
    
    # Check for ALL CAPS
    if description and len(description) > 10:
        caps_ratio = sum(1 for c in description if c.isupper()) / len(description)
        if caps_ratio > 0.5:
            detected.append(f"caps_intensity: {caps_ratio:.0%} uppercase")
            category_scores['caps'] = caps_ratio * 0.5
    
    # Check for excessive punctuation (!!!, ???)
    exclamation_count = description.count('!') if description else 0
    question_count = description.count('?') if description else 0
    if exclamation_count > 2:
        detected.append(f"exclamation_intensity: {exclamation_count} marks")
        category_scores['punctuation'] = min(1.0, exclamation_count * 0.1)
    
    # Aggregate score
    if category_scores:
        score = min(1.0, sum(category_scores.values()) / max(len(category_scores), 1))
        # Weight by number of categories detected
        score = min(1.0, score * (1 + len(category_scores) * 0.1))
    else:
        score = 0.0
    
    return {
        'distress_score': round(score, 3),
        'indicators': detected[:10],  # Top 10 indicators
        'categories_detected': list(category_scores.keys()),
        'severity': 'critical' if score > 0.7 else 'high' if score > 0.4 else 'moderate' if score > 0.15 else 'low'
    }


def process_request_with_ai(
    request_data: Dict,
    existing_requests: List[Dict] = None,
    recent_from_phone: int = 0,
    recent_from_location: int = 0
) -> Dict[str, Any]:
    """
    Process a new request through all AI features.
    
    Returns a dictionary with all AI analysis results.
    This is the main entry point for AI processing.
    """
    start_time = time.time()
    
    results = {
        'success': True,
        'processing_time_ms': 0,
        'priority': None,
        'category': None,
        'translation': None,
        'duplicate': None,
        'flag': None,
        'distress': None,
        'errors': []
    }
    
    description = request_data.get('description', '')
    urgency = request_data.get('urgency', 'moderate')
    help_type = request_data.get('help_type', 'other')
    created_at = request_data.get('created_at', datetime.utcnow())
    
    # 1. Priority scoring
    try:
        priority_result = calculate_ai_priority(
            description=description,
            urgency=urgency,
            help_type=help_type,
            created_at=created_at,
            has_phone=bool(request_data.get('phone')),
            has_address=bool(request_data.get('address'))
        )
        results['priority'] = {
            'score': priority_result.score,
            'label': priority_result.label,
            'reasons': priority_result.reasons,
            'keywords': priority_result.keywords_found,
            'confidence': priority_result.confidence
        }
    except Exception as e:
        results['errors'].append(f"Priority scoring failed: {str(e)}")
    
    # 2. Auto categorization
    try:
        category_result = auto_categorize_request(
            description=description,
            user_selected_type=help_type
        )
        results['category'] = {
            'detected_type': category_result.detected_type,
            'confidence': category_result.confidence,
            'supplies': category_result.extracted_supplies,
            'needs_confirmation': category_result.needs_confirmation
        }
    except Exception as e:
        results['errors'].append(f"Categorization failed: {str(e)}")
    
    # 3. Translation & simplification
    try:
        translation_result = translate_and_simplify(description)
        results['translation'] = {
            'detected_language': translation_result.detected_language,
            'translated_text': translation_result.translated_text,
            'simplified_text': translation_result.simplified_text,
            'confidence': translation_result.confidence
        }
    except Exception as e:
        results['errors'].append(f"Translation failed: {str(e)}")
    
    # 4. Duplicate detection
    try:
        if existing_requests:
            duplicate_result = check_for_duplicates(
                new_request=request_data,
                existing_requests=existing_requests
            )
            results['duplicate'] = {
                'is_duplicate': duplicate_result.is_duplicate,
                'duplicate_of_id': duplicate_result.duplicate_of_id,
                'similarity_score': duplicate_result.similarity_score,
                'reasons': duplicate_result.reasons
            }
    except Exception as e:
        results['errors'].append(f"Duplicate check failed: {str(e)}")
    
    # 5. Spam detection
    try:
        flag_result = check_for_spam(
            request=request_data,
            recent_requests_from_phone=recent_from_phone,
            recent_requests_from_location=recent_from_location
        )
        results['flag'] = {
            'is_flagged': flag_result.is_flagged,
            'reason': flag_result.flag_reason,
            'confidence': flag_result.confidence
        }
    except Exception as e:
        results['errors'].append(f"Spam check failed: {str(e)}")
    
    # 6. Distress analysis
    try:
        distress_result = analyze_distress(description)
        results['distress'] = distress_result
        # Boost priority if high distress detected
        if distress_result['distress_score'] > 0.5 and results.get('priority'):
            boost = int(distress_result['distress_score'] * 15)
            results['priority']['score'] = min(100, results['priority']['score'] + boost)
            results['priority']['reasons'].append(f"High emotional distress detected: +{boost}")
    except Exception as e:
        results['errors'].append(f"Distress analysis failed: {str(e)}")
    
    # Calculate total processing time
    results['processing_time_ms'] = round((time.time() - start_time) * 1000, 2)
    
    return results
