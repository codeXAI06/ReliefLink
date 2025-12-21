# AI Services Module
from .ai_service import (
    calculate_ai_priority,
    auto_categorize_request,
    translate_and_simplify,
    check_for_duplicates,
    check_for_spam,
    get_helper_recommendations,
    process_request_with_ai,
    detect_language,
    AIPriorityResult,
    AICategoryResult,
    AITranslationResult,
    AIDuplicateResult,
    AIFlagResult,
    AIHelperMatch,
)

__all__ = [
    'calculate_ai_priority',
    'auto_categorize_request',
    'translate_and_simplify',
    'check_for_duplicates',
    'check_for_spam',
    'get_helper_recommendations',
    'process_request_with_ai',
    'detect_language',
    'AIPriorityResult',
    'AICategoryResult',
    'AITranslationResult',
    'AIDuplicateResult',
    'AIFlagResult',
    'AIHelperMatch',
]
