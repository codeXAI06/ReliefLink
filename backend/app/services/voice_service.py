"""
Voice Processing Service for ReliefLink
========================================
Provides multilingual voice-to-structured-request processing:
1. Speech-to-Text (STT) - Convert voice to text
2. Language Detection - Identify spoken language
3. Translation - Normalize to English
4. NLP Extraction - Extract structured help request data
5. Confidence Scoring - Rate AI inference quality

Design Principles:
- Fail-safe: Always fallback gracefully
- Low-latency: Fast processing for emergency use
- Multilingual: Support Indian languages (Hindi, Telugu, Tamil, etc.)
- Explainable: Clear reasons for AI decisions
- Mobile-first: Works on low-end devices
"""

import re
import io
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

# For audio processing
try:
    import speech_recognition as sr
    SPEECH_RECOGNITION_AVAILABLE = True
except ImportError:
    SPEECH_RECOGNITION_AVAILABLE = False
    sr = None

# For audio format conversion
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    AudioSegment = None

# For translation (using Google Translate via googletrans)
try:
    from googletrans import Translator
    TRANSLATION_AVAILABLE = True
    _translator = Translator()
except ImportError:
    TRANSLATION_AVAILABLE = False
    _translator = None


# ============================================================
# DATA CLASSES FOR RESULTS
# ============================================================

@dataclass
class SpeechToTextResult:
    """Result of speech-to-text conversion"""
    success: bool
    text: str
    detected_language: str
    confidence: float
    error_message: Optional[str] = None
    processing_time_ms: float = 0


@dataclass
class LanguageDetectionResult:
    """Result of language detection"""
    detected_language: str  # ISO code: en, hi, ta, te, etc.
    language_name: str  # Human-readable: English, Hindi, etc.
    confidence: float
    is_mixed: bool  # True if multiple languages detected (e.g., Hinglish)


@dataclass
class TranslationResult:
    """Result of translation to English"""
    original_text: str
    translated_text: str
    source_language: str
    confidence: float
    cached: bool  # True if result was cached


@dataclass
class ExtractedHelpRequest:
    """Structured help request extracted from voice/text"""
    # Core fields
    description: str  # Cleaned problem description
    help_type: str  # food, water, medical, shelter, rescue, other
    urgency: str  # critical, moderate, low
    
    # Optional extracted fields
    location_mentioned: Optional[str]  # Any location mentioned in speech
    contact_name: Optional[str]  # If name was mentioned
    
    # AI signals
    vulnerable_groups: List[str]  # elderly, child, pregnant, disabled
    resource_needs: List[str]  # Specific items needed
    keywords_detected: List[str]  # Important keywords found
    
    # Confidence scores
    overall_confidence: float
    help_type_confidence: float
    urgency_confidence: float
    
    # Explanation
    urgency_reasons: List[str]
    help_type_reasons: List[str]
    needs_confirmation: bool  # True if confidence is low


@dataclass
class VoiceProcessingResult:
    """Complete result of voice processing pipeline"""
    success: bool
    
    # Pipeline results
    speech_to_text: Optional[SpeechToTextResult]
    language_detection: Optional[LanguageDetectionResult]
    translation: Optional[TranslationResult]
    extracted_request: Optional[ExtractedHelpRequest]
    
    # Metadata
    total_processing_time_ms: float
    pipeline_stages_completed: List[str]
    errors: List[str]
    warnings: List[str]
    
    # Fallback info
    used_fallback: bool
    fallback_reason: Optional[str]


# ============================================================
# KEYWORD DICTIONARIES FOR EXTRACTION
# ============================================================

# Language codes mapping
LANGUAGE_NAMES = {
    'en': 'English',
    'hi': 'Hindi',
    'ta': 'Tamil',
    'te': 'Telugu',
    'bn': 'Bengali',
    'mr': 'Marathi',
    'gu': 'Gujarati',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'pa': 'Punjabi',
    'or': 'Odia',
    'as': 'Assamese',
    'ur': 'Urdu',
}

# Critical urgency keywords (multi-language)
CRITICAL_URGENCY_KEYWORDS = {
    # English
    'trapped', 'drowning', 'unconscious', 'bleeding', 'dying', 'critical',
    'emergency', 'urgent', 'immediately', 'asap', 'sos', 'help me',
    'heart attack', 'stroke', 'not breathing', 'suffocating', 'collapsed',
    'fire', 'burning', 'electrocution', 'severe', 'serious',
    # Hindi
    'फंसा', 'फंसे', 'बेहोश', 'खून', 'मर रहा', 'गंभीर', 'तुरंत', 'जल्दी',
    'आपातकाल', 'इमरजेंसी', 'बचाओ', 'मदद', 'दुर्घटना',
    # Tamil
    'சிக்கி', 'மயக்கம்', 'இரத்தம்', 'அவசரம்', 'உதவி',
    # Telugu
    'చిక్కుకున్న', 'స్పృహ', 'రక్తస్రావం', 'అత్యవసరం', 'సహాయం',
    # Hinglish (mixed)
    'jaldi', 'bahut urgent', 'please help', 'bahut serious', 'khatarnak',
}

# Vulnerable population keywords
VULNERABLE_KEYWORDS = {
    # English
    'child': 'child', 'children': 'child', 'baby': 'child', 'infant': 'child', 'kid': 'child', 'kids': 'child',
    'elderly': 'elderly', 'old': 'elderly', 'senior': 'elderly', 'aged': 'elderly',
    'pregnant': 'pregnant', 'expecting': 'pregnant', 'pregnancy': 'pregnant',
    'disabled': 'disabled', 'wheelchair': 'disabled', 'blind': 'disabled', 'deaf': 'disabled',
    'sick': 'sick', 'ill': 'sick', 'patient': 'sick',
    # Hindi
    'बच्चा': 'child', 'बच्चे': 'child', 'शिशु': 'child',
    'बुजुर्ग': 'elderly', 'बूढ़े': 'elderly',
    'गर्भवती': 'pregnant',
    'विकलांग': 'disabled',
    # Hinglish
    'bachcha': 'child', 'bachche': 'child',
    'buddha': 'elderly', 'budhe': 'elderly',
}

# Help type keywords (extended for voice)
HELP_TYPE_KEYWORDS = {
    'food': {
        'en': ['food', 'hungry', 'eat', 'meal', 'rice', 'bread', 'starving', 'haven\'t eaten', 
               'no food', 'feed', 'ration', 'grocery', 'cooking'],
        'hi': ['खाना', 'भोजन', 'भूख', 'खाने', 'चावल', 'रोटी', 'राशन'],
        'hinglish': ['khana', 'bhookh', 'khaana chahiye', 'roti'],
        'ta': ['உணவு', 'பசி', 'சாப்பாடு'],
        'te': ['ఆహారం', 'ఆకలి', 'భోజనం'],
    },
    'water': {
        'en': ['water', 'drink', 'thirsty', 'dehydrated', 'drinking water', 'clean water', 
               'no water', 'water supply', 'water bottle'],
        'hi': ['पानी', 'प्यास', 'पीने', 'जल'],
        'hinglish': ['paani', 'pyaas', 'paani chahiye'],
        'ta': ['தண்ணீர்', 'தாகம்'],
        'te': ['నీరు', 'దాహం'],
    },
    'medical': {
        'en': ['medical', 'medicine', 'doctor', 'hospital', 'injured', 'sick', 'health',
               'ambulance', 'first aid', 'bleeding', 'pain', 'fever', 'illness', 'treatment',
               'insulin', 'oxygen', 'dialysis', 'heart', 'diabetes', 'bp', 'blood pressure'],
        'hi': ['दवाई', 'डॉक्टर', 'अस्पताल', 'चोट', 'बीमार', 'इलाज', 'दर्द', 'बुखार'],
        'hinglish': ['dawai', 'doctor chahiye', 'hospital', 'dard', 'bukhar'],
        'ta': ['மருந்து', 'மருத்துவர்', 'மருத்துவமனை', 'காயம்'],
        'te': ['మందు', 'వైద్యుడు', 'ఆసుపత్రి', 'గాయం'],
    },
    'shelter': {
        'en': ['shelter', 'roof', 'house', 'home', 'tent', 'stay', 'homeless', 'accommodation',
               'place to sleep', 'no home', 'destroyed house', 'collapsed', 'room'],
        'hi': ['आश्रय', 'घर', 'छत', 'रहने', 'कमरा', 'टेंट'],
        'hinglish': ['ghar chahiye', 'rehne ki jagah', 'tent', 'roof'],
        'ta': ['தங்குமிடம்', 'வீடு', 'கூரை'],
        'te': ['ఆశ్రయం', 'ఇల్లు', 'పైకప్పు'],
    },
    'rescue': {
        'en': ['rescue', 'trapped', 'stuck', 'save', 'flood', 'stranded', 'marooned',
               'can\'t move', 'surrounded', 'water rising', 'building collapsed', 'debris'],
        'hi': ['बचाव', 'फंसा', 'बचाओ', 'बाढ़', 'फंसे', 'निकालो'],
        'hinglish': ['bacha lo', 'phansi', 'rescue', 'flood mein phas gaye'],
        'ta': ['மீட்பு', 'சிக்கி', 'வெள்ளம்'],
        'te': ['రక్షణ', 'చిక్కుకున్న', 'వరదలు'],
    },
    'other': {
        'en': ['clothes', 'blanket', 'electricity', 'phone', 'charge', 'transport', 
               'information', 'money', 'documents', 'sanitary', 'hygiene'],
        'hi': ['कपड़े', 'कंबल', 'बिजली', 'फोन', 'गाड़ी'],
        'hinglish': ['kapde', 'blanket', 'gaadi', 'transport'],
        'ta': ['துணி', 'போர்வை'],
        'te': ['బట్టలు', 'దుప్పటి'],
    }
}

# Resource/supply keywords for extraction
RESOURCE_KEYWORDS = {
    'insulin', 'oxygen', 'cylinder', 'inhaler', 'nebulizer', 'dialysis',
    'wheelchair', 'walker', 'crutches', 'stretcher',
    'bandage', 'first aid', 'medicine', 'tablets', 'injection',
    'milk', 'baby food', 'formula', 'diaper',
    'blanket', 'mattress', 'tent', 'tarpaulin',
    'boat', 'raft', 'rope', 'torch', 'flashlight',
    # Hindi
    'दवाई', 'इन्सुलिन', 'ऑक्सीजन', 'व्हीलचेयर', 'पट्टी',
}


# Translation cache
_translation_cache: Dict[str, TranslationResult] = {}


# ============================================================
# SPEECH-TO-TEXT PROCESSING
# ============================================================

def process_audio_to_text(
    audio_data: bytes,
    audio_format: str = 'wav',
    preferred_language: Optional[str] = None
) -> SpeechToTextResult:
    """
    Convert audio to text using speech recognition.
    
    Supports:
    - WAV, WEBM, OGG, MP3 formats
    - Multiple languages (auto-detect or specified)
    - Graceful fallback on errors
    
    Args:
        audio_data: Raw audio bytes
        audio_format: Audio format (wav, webm, ogg, mp3)
        preferred_language: Optional language hint (e.g., 'hi-IN', 'ta-IN')
    
    Returns:
        SpeechToTextResult with transcribed text
    """
    start_time = time.time()
    
    if not SPEECH_RECOGNITION_AVAILABLE:
        return SpeechToTextResult(
            success=False,
            text="",
            detected_language="unknown",
            confidence=0,
            error_message="Speech recognition library not available. Please install SpeechRecognition.",
            processing_time_ms=(time.time() - start_time) * 1000
        )
    
    try:
        recognizer = sr.Recognizer()
        
        # Convert non-WAV formats to WAV for speech recognition
        audio_file = io.BytesIO(audio_data)
        
        if audio_format.lower() in ['webm', 'ogg', 'mp3', 'm4a']:
            if not PYDUB_AVAILABLE:
                return SpeechToTextResult(
                    success=False,
                    text="",
                    detected_language="unknown",
                    confidence=0,
                    error_message=f"Cannot convert {audio_format} audio. Please install pydub and ffmpeg.",
                    processing_time_ms=(time.time() - start_time) * 1000
                )
            
            try:
                # Convert to WAV using pydub
                audio_segment = AudioSegment.from_file(audio_file, format=audio_format.lower())
                # Export to WAV in memory
                wav_buffer = io.BytesIO()
                audio_segment.export(wav_buffer, format='wav')
                wav_buffer.seek(0)
                audio_file = wav_buffer
            except Exception as conv_err:
                return SpeechToTextResult(
                    success=False,
                    text="",
                    detected_language="unknown",
                    confidence=0,
                    error_message=f"Audio conversion failed: {str(conv_err)}. Make sure ffmpeg is installed.",
                    processing_time_ms=(time.time() - start_time) * 1000
                )
        
        with sr.AudioFile(audio_file) as source:
            audio = recognizer.record(source)
        
        # Try Google Speech Recognition (free tier)
        # Set language for better accuracy
        language_code = preferred_language or "en-IN"  # Default to Indian English
        
        try:
            # First try with specified language
            text = recognizer.recognize_google(audio, language=language_code)
            detected_lang = language_code.split('-')[0]
            confidence = 0.85
        except sr.UnknownValueError:
            # Try alternative languages if primary fails
            alternative_languages = ['hi-IN', 'ta-IN', 'te-IN', 'en-US']
            text = None
            detected_lang = 'unknown'
            
            for alt_lang in alternative_languages:
                if alt_lang == language_code:
                    continue
                try:
                    text = recognizer.recognize_google(audio, language=alt_lang)
                    detected_lang = alt_lang.split('-')[0]
                    confidence = 0.7
                    break
                except Exception:
                    continue
            
            if not text:
                return SpeechToTextResult(
                    success=False,
                    text="",
                    detected_language="unknown",
                    confidence=0,
                    error_message="Could not understand audio. Please speak clearly or try text input.",
                    processing_time_ms=(time.time() - start_time) * 1000
                )
        
        processing_time = (time.time() - start_time) * 1000
        
        return SpeechToTextResult(
            success=True,
            text=text,
            detected_language=detected_lang,
            confidence=confidence,
            processing_time_ms=processing_time
        )
        
    except sr.RequestError as e:
        return SpeechToTextResult(
            success=False,
            text="",
            detected_language="unknown",
            confidence=0,
            error_message=f"Speech service unavailable: {str(e)}. Try again later.",
            processing_time_ms=(time.time() - start_time) * 1000
        )
    except Exception as e:
        return SpeechToTextResult(
            success=False,
            text="",
            detected_language="unknown",
            confidence=0,
            error_message=f"Audio processing error: {str(e)}",
            processing_time_ms=(time.time() - start_time) * 1000
        )


def process_browser_speech_text(
    transcribed_text: str,
    detected_language: Optional[str] = None
) -> SpeechToTextResult:
    """
    Process text that was already transcribed by browser's Web Speech API.
    
    This is used when the frontend uses navigator.mediaDevices and Web Speech API
    for real-time transcription, then sends the text to backend.
    
    Args:
        transcribed_text: Text transcribed by browser
        detected_language: Language detected by browser (if available)
    
    Returns:
        SpeechToTextResult
    """
    if not transcribed_text or not transcribed_text.strip():
        return SpeechToTextResult(
            success=False,
            text="",
            detected_language="unknown",
            confidence=0,
            error_message="No speech detected. Please try again."
        )
    
    # Clean the text
    cleaned_text = transcribed_text.strip()
    
    # Detect language if not provided
    if not detected_language:
        lang_result = detect_language(cleaned_text)
        detected_language = lang_result.detected_language
    
    return SpeechToTextResult(
        success=True,
        text=cleaned_text,
        detected_language=detected_language,
        confidence=0.8,  # Browser STT is generally reliable
        processing_time_ms=0
    )


# ============================================================
# LANGUAGE DETECTION
# ============================================================

def detect_language(text: str) -> LanguageDetectionResult:
    """
    Detect the language of the given text.
    
    Uses character pattern matching for Indian languages
    and falls back to translation library detection.
    
    Returns language code and confidence.
    """
    if not text or not text.strip():
        return LanguageDetectionResult(
            detected_language='en',
            language_name='English',
            confidence=0.5,
            is_mixed=False
        )
    
    text = text.strip()
    
    # Character-based detection for Indian scripts
    # Devanagari (Hindi, Marathi, Sanskrit)
    devanagari_pattern = re.compile(r'[\u0900-\u097F]')
    # Tamil
    tamil_pattern = re.compile(r'[\u0B80-\u0BFF]')
    # Telugu
    telugu_pattern = re.compile(r'[\u0C00-\u0C7F]')
    # Bengali
    bengali_pattern = re.compile(r'[\u0980-\u09FF]')
    # Gujarati
    gujarati_pattern = re.compile(r'[\u0A80-\u0AFF]')
    # Kannada
    kannada_pattern = re.compile(r'[\u0C80-\u0CFF]')
    # Malayalam
    malayalam_pattern = re.compile(r'[\u0D00-\u0D7F]')
    
    # Count script characters
    devanagari_count = len(devanagari_pattern.findall(text))
    tamil_count = len(tamil_pattern.findall(text))
    telugu_count = len(telugu_pattern.findall(text))
    bengali_count = len(bengali_pattern.findall(text))
    gujarati_count = len(gujarati_pattern.findall(text))
    kannada_count = len(kannada_pattern.findall(text))
    malayalam_count = len(malayalam_pattern.findall(text))
    
    # Check for Latin characters (English/Hinglish)
    latin_pattern = re.compile(r'[a-zA-Z]')
    latin_count = len(latin_pattern.findall(text))
    
    total_chars = len(text.replace(' ', ''))
    
    # Determine primary language
    script_counts = {
        'hi': devanagari_count,
        'ta': tamil_count,
        'te': telugu_count,
        'bn': bengali_count,
        'gu': gujarati_count,
        'kn': kannada_count,
        'ml': malayalam_count,
        'en': latin_count,
    }
    
    max_script = max(script_counts, key=script_counts.get)
    max_count = script_counts[max_script]
    
    # Calculate confidence
    if total_chars > 0:
        confidence = min(0.95, max_count / total_chars + 0.3)
    else:
        confidence = 0.5
    
    # Check for mixed language (Hinglish, Tanglish, etc.)
    is_mixed = False
    if latin_count > 0 and (devanagari_count > 0 or tamil_count > 0 or telugu_count > 0):
        is_mixed = True
        confidence = min(confidence, 0.7)  # Lower confidence for mixed
    
    # If mostly Latin but has Indian language words (Hinglish)
    if max_script == 'en' and is_mixed:
        # Check for common Hinglish patterns
        hinglish_words = ['hai', 'hain', 'mein', 'ko', 'ka', 'ki', 'ke', 'nahi', 'bahut', 
                         'chahiye', 'kya', 'kaise', 'kahan', 'kaun', 'kab', 'abhi']
        text_lower = text.lower()
        hinglish_found = sum(1 for word in hinglish_words if word in text_lower)
        if hinglish_found >= 2:
            max_script = 'hi'
            is_mixed = True
    
    language_name = LANGUAGE_NAMES.get(max_script, 'Unknown')
    
    return LanguageDetectionResult(
        detected_language=max_script,
        language_name=language_name,
        confidence=confidence,
        is_mixed=is_mixed
    )


# ============================================================
# TRANSLATION SERVICE
# ============================================================

def translate_to_english(
    text: str,
    source_language: Optional[str] = None
) -> TranslationResult:
    """
    Translate text to English for processing.
    
    Uses caching to improve performance for repeated requests.
    Falls back to original text if translation fails.
    
    Args:
        text: Text to translate
        source_language: Optional source language code
    
    Returns:
        TranslationResult with English translation
    """
    if not text or not text.strip():
        return TranslationResult(
            original_text=text,
            translated_text=text,
            source_language='en',
            confidence=0.5,
            cached=False
        )
    
    text = text.strip()
    
    # Check cache
    cache_key = f"{text}:{source_language or 'auto'}"
    if cache_key in _translation_cache:
        cached = _translation_cache[cache_key]
        return TranslationResult(
            original_text=cached.original_text,
            translated_text=cached.translated_text,
            source_language=cached.source_language,
            confidence=cached.confidence,
            cached=True
        )
    
    # Detect language if not provided
    if not source_language:
        lang_result = detect_language(text)
        source_language = lang_result.detected_language
    
    # If already English, return as-is
    if source_language == 'en':
        result = TranslationResult(
            original_text=text,
            translated_text=text,
            source_language='en',
            confidence=0.95,
            cached=False
        )
        _translation_cache[cache_key] = result
        return result
    
    # Try translation
    if TRANSLATION_AVAILABLE and _translator:
        try:
            translation = _translator.translate(text, src=source_language, dest='en')
            translated_text = translation.text
            confidence = 0.85
        except Exception:
            # Fallback to original text
            translated_text = text
            confidence = 0.3
    else:
        # No translation library - return original
        translated_text = text
        confidence = 0.3
    
    result = TranslationResult(
        original_text=text,
        translated_text=translated_text,
        source_language=source_language,
        confidence=confidence,
        cached=False
    )
    
    # Cache the result
    _translation_cache[cache_key] = result
    
    return result


# ============================================================
# NLP EXTRACTION - STRUCTURED DATA FROM TEXT
# ============================================================

def extract_help_request(
    text: str,
    original_language: str = 'en',
    translated_text: Optional[str] = None
) -> ExtractedHelpRequest:
    """
    Extract structured help request from text using NLP.
    
    Extracts:
    - Help type (food, water, medical, shelter, rescue, other)
    - Urgency level (critical, moderate, low)
    - Problem description (cleaned)
    - Vulnerable groups
    - Resource needs
    
    Uses keyword matching, pattern recognition, and confidence scoring.
    
    Args:
        text: Original text (may be in any language)
        original_language: Detected language of original text
        translated_text: English translation (if available)
    
    Returns:
        ExtractedHelpRequest with all extracted fields
    """
    # Use translated text for processing if available
    process_text = (translated_text or text).lower()
    original_text = text
    
    # Initialize result containers
    help_type_scores: Dict[str, float] = {k: 0 for k in HELP_TYPE_KEYWORDS.keys()}
    urgency_score = 0
    urgency_reasons = []
    help_type_reasons = []
    vulnerable_groups = set()
    resource_needs = set()
    keywords_detected = []
    
    # 1. Detect help type
    for category, lang_keywords in HELP_TYPE_KEYWORDS.items():
        for lang, keywords in lang_keywords.items():
            for keyword in keywords:
                if keyword.lower() in process_text or keyword.lower() in original_text.lower():
                    help_type_scores[category] += 1
                    if keyword not in keywords_detected:
                        keywords_detected.append(keyword)
                        help_type_reasons.append(f"Found '{keyword}' → {category}")
    
    # Determine best help type
    max_score = max(help_type_scores.values())
    if max_score > 0:
        help_type = max(help_type_scores, key=help_type_scores.get)
        help_type_confidence = min(0.95, 0.4 + (max_score * 0.15))
    else:
        help_type = 'other'
        help_type_confidence = 0.3
    
    # 2. Detect urgency
    critical_count = 0
    for keyword in CRITICAL_URGENCY_KEYWORDS:
        if keyword.lower() in process_text or keyword.lower() in original_text.lower():
            critical_count += 1
            urgency_score += 2
            urgency_reasons.append(f"Critical keyword: '{keyword}'")
            if keyword not in keywords_detected:
                keywords_detected.append(keyword)
    
    # Check for vulnerable populations (increases urgency)
    for keyword, group in VULNERABLE_KEYWORDS.items():
        if keyword.lower() in process_text or keyword.lower() in original_text.lower():
            vulnerable_groups.add(group)
            urgency_score += 1
            urgency_reasons.append(f"Vulnerable group: {group}")
            if keyword not in keywords_detected:
                keywords_detected.append(keyword)
    
    # Determine urgency level
    if urgency_score >= 4 or critical_count >= 2:
        urgency = 'critical'
        urgency_confidence = min(0.95, 0.6 + (urgency_score * 0.08))
    elif urgency_score >= 2 or critical_count >= 1:
        urgency = 'moderate'  
        urgency_confidence = min(0.85, 0.5 + (urgency_score * 0.1))
    else:
        urgency = 'moderate'  # Default to moderate for safety
        urgency_confidence = 0.5
        urgency_reasons.append("No specific urgency indicators - defaulting to moderate")
    
    # 3. Extract resource needs
    for resource in RESOURCE_KEYWORDS:
        if resource.lower() in process_text or resource.lower() in original_text.lower():
            resource_needs.add(resource)
    
    # 4. Try to extract location mentions
    location_mentioned = extract_location_mention(process_text)
    
    # 5. Create cleaned description
    description = create_cleaned_description(original_text, translated_text, help_type, urgency)
    
    # 6. Calculate overall confidence
    overall_confidence = (help_type_confidence + urgency_confidence) / 2
    
    # 7. Determine if confirmation needed
    needs_confirmation = overall_confidence < 0.6 or help_type_confidence < 0.5
    
    return ExtractedHelpRequest(
        description=description,
        help_type=help_type,
        urgency=urgency,
        location_mentioned=location_mentioned,
        contact_name=None,  # Could add name extraction later
        vulnerable_groups=list(vulnerable_groups),
        resource_needs=list(resource_needs),
        keywords_detected=keywords_detected[:10],  # Limit to top 10
        overall_confidence=round(overall_confidence, 2),
        help_type_confidence=round(help_type_confidence, 2),
        urgency_confidence=round(urgency_confidence, 2),
        urgency_reasons=urgency_reasons[:5],  # Limit reasons
        help_type_reasons=help_type_reasons[:5],
        needs_confirmation=needs_confirmation
    )


def extract_location_mention(text: str) -> Optional[str]:
    """
    Try to extract any location mentioned in the text.
    
    Looks for:
    - City/place names
    - Landmark references
    - Address patterns
    """
    # Common location patterns
    location_patterns = [
        r'(?:at|in|near|from)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        r'(?:village|city|town|area|district|block)\s+([A-Z][a-z]+)',
        r'(\d+[\s,]+[A-Za-z\s,]+(?:road|street|lane|nagar|colony|apartments?|building))',
    ]
    
    for pattern in location_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    
    return None


def create_cleaned_description(
    original_text: str,
    translated_text: Optional[str],
    help_type: str,
    urgency: str
) -> str:
    """
    Create a clean, actionable description from the input.
    
    Prioritizes clarity and brevity for responders.
    """
    # Use the most informative text
    text = translated_text if translated_text and translated_text != original_text else original_text
    
    # Clean up the text
    text = text.strip()
    
    # Remove excessive punctuation
    text = re.sub(r'[!]{2,}', '!', text)
    text = re.sub(r'[?]{2,}', '?', text)
    
    # Capitalize first letter
    if text:
        text = text[0].upper() + text[1:]
    
    # Ensure it ends with proper punctuation
    if text and text[-1] not in '.!?':
        text += '.'
    
    # Limit length for display
    if len(text) > 500:
        text = text[:497] + '...'
    
    return text


# ============================================================
# MAIN PIPELINE FUNCTION
# ============================================================

def process_voice_request(
    audio_data: Optional[bytes] = None,
    audio_format: str = 'wav',
    transcribed_text: Optional[str] = None,
    detected_language: Optional[str] = None,
    preferred_language: Optional[str] = None
) -> VoiceProcessingResult:
    """
    Main pipeline for processing voice input to structured help request.
    
    Supports two modes:
    1. Audio mode: Pass audio_data to process from audio file
    2. Text mode: Pass transcribed_text if browser already did STT
    
    Pipeline stages:
    1. Speech-to-Text (if audio provided)
    2. Language Detection
    3. Translation to English
    4. NLP Extraction
    
    Returns complete VoiceProcessingResult with all stages.
    """
    start_time = time.time()
    stages_completed = []
    errors = []
    warnings = []
    used_fallback = False
    fallback_reason = None
    
    # Stage 1: Speech-to-Text
    if audio_data:
        stt_result = process_audio_to_text(
            audio_data=audio_data,
            audio_format=audio_format,
            preferred_language=preferred_language
        )
        if stt_result.success:
            stages_completed.append("speech_to_text")
            transcribed_text = stt_result.text
        else:
            errors.append(f"STT failed: {stt_result.error_message}")
            used_fallback = True
            fallback_reason = "Speech recognition failed - please use text input"
            return VoiceProcessingResult(
                success=False,
                speech_to_text=stt_result,
                language_detection=None,
                translation=None,
                extracted_request=None,
                total_processing_time_ms=(time.time() - start_time) * 1000,
                pipeline_stages_completed=stages_completed,
                errors=errors,
                warnings=warnings,
                used_fallback=True,
                fallback_reason=fallback_reason
            )
    elif transcribed_text:
        stt_result = process_browser_speech_text(transcribed_text, detected_language)
        if stt_result.success:
            stages_completed.append("browser_stt")
        else:
            errors.append("No valid text provided")
            return VoiceProcessingResult(
                success=False,
                speech_to_text=stt_result,
                language_detection=None,
                translation=None,
                extracted_request=None,
                total_processing_time_ms=(time.time() - start_time) * 1000,
                pipeline_stages_completed=stages_completed,
                errors=errors,
                warnings=warnings,
                used_fallback=True,
                fallback_reason="No speech detected"
            )
    else:
        return VoiceProcessingResult(
            success=False,
            speech_to_text=None,
            language_detection=None,
            translation=None,
            extracted_request=None,
            total_processing_time_ms=(time.time() - start_time) * 1000,
            pipeline_stages_completed=[],
            errors=["No audio data or transcribed text provided"],
            warnings=[],
            used_fallback=True,
            fallback_reason="No input provided - please record audio or type text"
        )
    
    # Stage 2: Language Detection
    lang_result = detect_language(transcribed_text)
    stages_completed.append("language_detection")
    
    # Stage 3: Translation
    if lang_result.detected_language != 'en':
        translation_result = translate_to_english(
            transcribed_text,
            lang_result.detected_language
        )
        stages_completed.append("translation")
        translated_text = translation_result.translated_text
    else:
        translation_result = TranslationResult(
            original_text=transcribed_text,
            translated_text=transcribed_text,
            source_language='en',
            confidence=0.95,
            cached=False
        )
        translated_text = transcribed_text
    
    # Stage 4: NLP Extraction
    extracted = extract_help_request(
        text=transcribed_text,
        original_language=lang_result.detected_language,
        translated_text=translated_text
    )
    stages_completed.append("nlp_extraction")
    
    # Add warnings if confidence is low
    if extracted.needs_confirmation:
        warnings.append("Low confidence - please verify the extracted information")
    
    if lang_result.is_mixed:
        warnings.append(f"Mixed language detected ({lang_result.language_name})")
    
    total_time = (time.time() - start_time) * 1000
    
    return VoiceProcessingResult(
        success=True,
        speech_to_text=stt_result,
        language_detection=lang_result,
        translation=translation_result,
        extracted_request=extracted,
        total_processing_time_ms=round(total_time, 2),
        pipeline_stages_completed=stages_completed,
        errors=errors,
        warnings=warnings,
        used_fallback=used_fallback,
        fallback_reason=fallback_reason
    )


def result_to_dict(result: VoiceProcessingResult) -> Dict[str, Any]:
    """Convert VoiceProcessingResult to dictionary for JSON serialization."""
    def dataclass_to_dict(obj):
        if obj is None:
            return None
        if hasattr(obj, '__dataclass_fields__'):
            return asdict(obj)
        return obj
    
    return {
        'success': result.success,
        'speech_to_text': dataclass_to_dict(result.speech_to_text),
        'language_detection': dataclass_to_dict(result.language_detection),
        'translation': dataclass_to_dict(result.translation),
        'extracted_request': dataclass_to_dict(result.extracted_request),
        'total_processing_time_ms': result.total_processing_time_ms,
        'pipeline_stages_completed': result.pipeline_stages_completed,
        'errors': result.errors,
        'warnings': result.warnings,
        'used_fallback': result.used_fallback,
        'fallback_reason': result.fallback_reason
    }
