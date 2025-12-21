"""
Voice Processing API Router for ReliefLink
===========================================
REST endpoints for multilingual voice-to-help-request processing.

Endpoints:
- POST /api/voice/process - Process voice/text to structured request
- POST /api/voice/upload - Upload audio file for processing
- POST /api/voice/transcribe - Convert speech to text only
- POST /api/voice/extract - Extract structured data from text
- GET /api/voice/languages - Get supported languages
"""

import base64
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

from ..database import get_db
from ..services.voice_service import (
    process_voice_request,
    process_audio_to_text,
    detect_language,
    translate_to_english,
    extract_help_request,
    result_to_dict,
    LANGUAGE_NAMES,
)

router = APIRouter(prefix="/voice", tags=["Voice Processing"])


# ============================================================
# PYDANTIC MODELS
# ============================================================

class VoiceProcessRequest(BaseModel):
    """Request body for voice processing with browser-transcribed text"""
    transcribed_text: Optional[str] = Field(None, description="Text transcribed by browser's Web Speech API")
    audio_base64: Optional[str] = Field(None, description="Base64 encoded audio data")
    audio_format: str = Field("wav", description="Audio format (wav, webm, ogg, mp3)")
    detected_language: Optional[str] = Field(None, description="Language detected by browser")
    preferred_language: Optional[str] = Field(None, description="User's preferred language hint")


class TextExtractRequest(BaseModel):
    """Request body for extracting structured data from text"""
    text: str = Field(..., description="Text to extract help request from")
    source_language: Optional[str] = Field(None, description="Source language code")


class TranscribeRequest(BaseModel):
    """Request body for transcription only"""
    audio_base64: str = Field(..., description="Base64 encoded audio data")
    audio_format: str = Field("wav", description="Audio format")
    preferred_language: Optional[str] = Field(None, description="Language hint")


class SpeechToTextResponse(BaseModel):
    """Response for speech-to-text operation"""
    success: bool
    text: str
    detected_language: str
    confidence: float
    error_message: Optional[str] = None
    processing_time_ms: float


class LanguageDetectionResponse(BaseModel):
    """Response for language detection"""
    detected_language: str
    language_name: str
    confidence: float
    is_mixed: bool


class TranslationResponse(BaseModel):
    """Response for translation"""
    original_text: str
    translated_text: str
    source_language: str
    confidence: float
    cached: bool


class ExtractedRequestResponse(BaseModel):
    """Response for extracted help request"""
    description: str
    help_type: str
    urgency: str
    location_mentioned: Optional[str]
    contact_name: Optional[str]
    vulnerable_groups: List[str]
    resource_needs: List[str]
    keywords_detected: List[str]
    overall_confidence: float
    help_type_confidence: float
    urgency_confidence: float
    urgency_reasons: List[str]
    help_type_reasons: List[str]
    needs_confirmation: bool


class VoiceProcessResponse(BaseModel):
    """Full response for voice processing pipeline"""
    success: bool
    speech_to_text: Optional[Dict[str, Any]] = None
    language_detection: Optional[Dict[str, Any]] = None
    translation: Optional[Dict[str, Any]] = None
    extracted_request: Optional[Dict[str, Any]] = None
    total_processing_time_ms: float
    pipeline_stages_completed: List[str]
    errors: List[str]
    warnings: List[str]
    used_fallback: bool
    fallback_reason: Optional[str]


class SupportedLanguage(BaseModel):
    """Supported language info"""
    code: str
    name: str
    native_name: str


class SupportedLanguagesResponse(BaseModel):
    """Response for supported languages"""
    languages: List[SupportedLanguage]
    default_language: str


# ============================================================
# API ENDPOINTS
# ============================================================

@router.post("/process", response_model=VoiceProcessResponse)
async def process_voice_input(
    request: VoiceProcessRequest,
    db: Session = Depends(get_db)
):
    """
    Process voice input to structured help request.
    
    This is the main endpoint for the voice-to-request pipeline.
    
    Accepts either:
    1. transcribed_text: Text already transcribed by browser's Web Speech API
    2. audio_base64: Base64 encoded audio for server-side processing
    
    Returns:
    - Extracted help request with type, urgency, description
    - Confidence scores for each extracted field
    - Language detection and translation info
    - Warnings if human confirmation is needed
    
    Pipeline stages:
    1. Speech-to-Text (if audio provided)
    2. Language Detection
    3. Translation to English
    4. NLP Extraction
    """
    try:
        # Decode audio if provided
        audio_data = None
        if request.audio_base64:
            try:
                audio_data = base64.b64decode(request.audio_base64)
            except Exception as e:
                return VoiceProcessResponse(
                    success=False,
                    total_processing_time_ms=0,
                    pipeline_stages_completed=[],
                    errors=[f"Invalid audio data: {str(e)}"],
                    warnings=[],
                    used_fallback=True,
                    fallback_reason="Could not decode audio - please try again or use text input"
                )
        
        # Process the voice request
        result = process_voice_request(
            audio_data=audio_data,
            audio_format=request.audio_format,
            transcribed_text=request.transcribed_text,
            detected_language=request.detected_language,
            preferred_language=request.preferred_language
        )
        
        # Convert to response
        return VoiceProcessResponse(**result_to_dict(result))
        
    except Exception as e:
        return VoiceProcessResponse(
            success=False,
            total_processing_time_ms=0,
            pipeline_stages_completed=[],
            errors=[f"Processing error: {str(e)}"],
            warnings=[],
            used_fallback=True,
            fallback_reason="An error occurred - please use manual text input"
        )


@router.post("/upload")
async def upload_audio_file(
    audio_file: UploadFile = File(...),
    preferred_language: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload audio file for voice processing.
    
    Accepts audio files directly (for devices that don't support Web Speech API).
    
    Supported formats:
    - WAV
    - WEBM
    - OGG
    - MP3
    
    Max file size: 10MB
    Recommended duration: 10-60 seconds
    """
    try:
        # Check file size (10MB limit)
        MAX_SIZE = 10 * 1024 * 1024  # 10MB
        audio_data = await audio_file.read()
        
        if len(audio_data) > MAX_SIZE:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "File too large. Maximum size is 10MB.",
                    "used_fallback": True,
                    "fallback_reason": "Audio file is too large - please record a shorter message"
                }
            )
        
        # Determine format from filename
        filename = audio_file.filename or "audio.wav"
        audio_format = filename.split('.')[-1].lower()
        if audio_format not in ['wav', 'webm', 'ogg', 'mp3']:
            audio_format = 'wav'
        
        # Process the audio
        result = process_voice_request(
            audio_data=audio_data,
            audio_format=audio_format,
            preferred_language=preferred_language
        )
        
        return result_to_dict(result)
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Error processing audio: {str(e)}",
                "used_fallback": True,
                "fallback_reason": "Audio processing failed - please use text input"
            }
        )


@router.post("/transcribe", response_model=SpeechToTextResponse)
async def transcribe_audio(request: TranscribeRequest):
    """
    Convert speech to text only (no extraction).
    
    Use this endpoint if you only need transcription without
    the full processing pipeline.
    """
    try:
        # Decode audio
        audio_data = base64.b64decode(request.audio_base64)
        
        # Process
        result = process_audio_to_text(
            audio_data=audio_data,
            audio_format=request.audio_format,
            preferred_language=request.preferred_language
        )
        
        return SpeechToTextResponse(
            success=result.success,
            text=result.text,
            detected_language=result.detected_language,
            confidence=result.confidence,
            error_message=result.error_message,
            processing_time_ms=result.processing_time_ms
        )
        
    except Exception as e:
        return SpeechToTextResponse(
            success=False,
            text="",
            detected_language="unknown",
            confidence=0,
            error_message=f"Transcription error: {str(e)}",
            processing_time_ms=0
        )


@router.post("/extract", response_model=ExtractedRequestResponse)
async def extract_from_text(request: TextExtractRequest):
    """
    Extract structured help request from text.
    
    Use this endpoint to process text directly without audio.
    Useful for:
    - Text input fallback
    - Processing text from external sources
    - Testing extraction logic
    """
    try:
        # Detect language
        lang_result = detect_language(request.text)
        
        # Translate if needed
        translated_text = request.text
        if lang_result.detected_language != 'en':
            translation = translate_to_english(
                request.text,
                lang_result.detected_language
            )
            translated_text = translation.translated_text
        
        # Extract structured data
        result = extract_help_request(
            text=request.text,
            original_language=lang_result.detected_language,
            translated_text=translated_text
        )
        
        return ExtractedRequestResponse(
            description=result.description,
            help_type=result.help_type,
            urgency=result.urgency,
            location_mentioned=result.location_mentioned,
            contact_name=result.contact_name,
            vulnerable_groups=result.vulnerable_groups,
            resource_needs=result.resource_needs,
            keywords_detected=result.keywords_detected,
            overall_confidence=result.overall_confidence,
            help_type_confidence=result.help_type_confidence,
            urgency_confidence=result.urgency_confidence,
            urgency_reasons=result.urgency_reasons,
            help_type_reasons=result.help_type_reasons,
            needs_confirmation=result.needs_confirmation
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Extraction error: {str(e)}"
        )


@router.post("/detect-language", response_model=LanguageDetectionResponse)
async def detect_text_language(request: TextExtractRequest):
    """
    Detect the language of input text.
    
    Returns:
    - Language code (en, hi, ta, te, etc.)
    - Human-readable name
    - Confidence score
    - Whether text is mixed language (Hinglish, etc.)
    """
    try:
        result = detect_language(request.text)
        
        return LanguageDetectionResponse(
            detected_language=result.detected_language,
            language_name=result.language_name,
            confidence=result.confidence,
            is_mixed=result.is_mixed
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Language detection error: {str(e)}"
        )


@router.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TextExtractRequest):
    """
    Translate text to English.
    
    Auto-detects source language if not provided.
    Results are cached for performance.
    """
    try:
        result = translate_to_english(
            request.text,
            request.source_language
        )
        
        return TranslationResponse(
            original_text=result.original_text,
            translated_text=result.translated_text,
            source_language=result.source_language,
            confidence=result.confidence,
            cached=result.cached
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Translation error: {str(e)}"
        )


@router.get("/languages", response_model=SupportedLanguagesResponse)
async def get_supported_languages():
    """
    Get list of supported languages for voice input.
    
    Returns language codes and names for UI display.
    """
    languages = [
        SupportedLanguage(code="en", name="English", native_name="English"),
        SupportedLanguage(code="hi", name="Hindi", native_name="हिन्दी"),
        SupportedLanguage(code="ta", name="Tamil", native_name="தமிழ்"),
        SupportedLanguage(code="te", name="Telugu", native_name="తెలుగు"),
        SupportedLanguage(code="bn", name="Bengali", native_name="বাংলা"),
        SupportedLanguage(code="mr", name="Marathi", native_name="मराठी"),
        SupportedLanguage(code="gu", name="Gujarati", native_name="ગુજરાતી"),
        SupportedLanguage(code="kn", name="Kannada", native_name="ಕನ್ನಡ"),
        SupportedLanguage(code="ml", name="Malayalam", native_name="മലയാളം"),
        SupportedLanguage(code="pa", name="Punjabi", native_name="ਪੰਜਾਬੀ"),
        SupportedLanguage(code="or", name="Odia", native_name="ଓଡ଼ିଆ"),
        SupportedLanguage(code="ur", name="Urdu", native_name="اردو"),
    ]
    
    return SupportedLanguagesResponse(
        languages=languages,
        default_language="en"
    )


@router.get("/health")
async def voice_service_health():
    """
    Health check for voice processing service.
    
    Returns status of required dependencies.
    """
    from ..services.voice_service import SPEECH_RECOGNITION_AVAILABLE, TRANSLATION_AVAILABLE
    
    return {
        "status": "healthy",
        "speech_recognition_available": SPEECH_RECOGNITION_AVAILABLE,
        "translation_available": TRANSLATION_AVAILABLE,
        "supported_languages_count": len(LANGUAGE_NAMES),
        "timestamp": datetime.utcnow().isoformat()
    }
