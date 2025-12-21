/**
 * AI Feature Badges and Indicators
 * Displays AI-powered insights on help requests
 */
import { useState } from 'react';

/**
 * AI Priority Badge - Shows AI-calculated priority with explanation
 */
export function AIPriorityBadge({ score, label, reason }) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  if (!score && score !== 0) return null;
  
  const colors = {
    critical: 'bg-red-600 text-white animate-pulse',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-gray-900',
    low: 'bg-green-500 text-white'
  };
  
  const icons = {
    critical: '🚨',
    high: '⚠️',
    medium: '📋',
    low: '✓'
  };
  
  return (
    <div className="relative inline-block">
      <div
        className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 cursor-help ${colors[label] || 'bg-gray-500 text-white'}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <span>🤖</span>
        <span>{icons[label]} {score}</span>
      </div>
      
      {showTooltip && reason && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
          <div className="font-bold mb-1">AI Priority Analysis</div>
          <div className="text-gray-300">{reason}</div>
          <div className="absolute bottom-0 left-4 transform translate-y-full">
            <div className="border-8 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Duplicate Warning - Shows if request may be a duplicate
 */
export function DuplicateWarning({ duplicateOfId, similarity, onViewOriginal }) {
  if (!duplicateOfId) return null;
  
  const similarityPercent = Math.round(similarity * 100);
  
  return (
    <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-yellow-600">⚠️</span>
        <span className="text-sm text-yellow-800">
          Possible duplicate ({similarityPercent}% similar to #{duplicateOfId})
        </span>
      </div>
      {onViewOriginal && (
        <button
          onClick={() => onViewOriginal(duplicateOfId)}
          className="text-xs text-yellow-700 underline hover:text-yellow-900"
        >
          View Original
        </button>
      )}
    </div>
  );
}

/**
 * Flag Warning - Shows if request has been flagged by AI
 */
export function FlagWarning({ reason }) {
  if (!reason) return null;
  
  return (
    <div className="bg-red-100 border border-red-300 rounded-lg p-2 flex items-center gap-2">
      <span className="text-red-600">🚩</span>
      <span className="text-sm text-red-800">
        <strong>Flagged for review:</strong> {reason}
      </span>
    </div>
  );
}

/**
 * Language Badge - Shows detected language with translation option
 */
export function LanguageBadge({ language, translatedText, simplifiedText, originalText }) {
  const [showTranslation, setShowTranslation] = useState(false);
  
  if (!language || language === 'en') return null;
  
  const languageNames = {
    hi: '🇮🇳 Hindi',
    ta: '🇮🇳 Tamil',
    te: '🇮🇳 Telugu',
    bn: '🇮🇳 Bengali',
    mr: '🇮🇳 Marathi',
    gu: '🇮🇳 Gujarati',
    kn: '🇮🇳 Kannada',
    ml: '🇮🇳 Malayalam',
    pa: '🇮🇳 Punjabi',
    or: '🇮🇳 Odia'
  };
  
  return (
    <div className="mt-2">
      <button
        onClick={() => setShowTranslation(!showTranslation)}
        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200"
      >
        <span>🌐</span>
        <span>{languageNames[language] || language}</span>
        <span>{showTranslation ? '▲' : '▼'}</span>
      </button>
      
      {showTranslation && translatedText && (
        <div className="mt-2 p-2 bg-blue-50 rounded-lg text-sm">
          {simplifiedText && (
            <div className="mb-2">
              <span className="font-semibold text-blue-700">📝 Summary: </span>
              <span className="text-gray-700">{simplifiedText}</span>
            </div>
          )}
          <div>
            <span className="font-semibold text-blue-700">🔄 Translation: </span>
            <span className="text-gray-700">{translatedText}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Category Badge - Shows AI-detected category with confidence
 */
export function CategoryBadge({ detectedType, confidence, userType, extractedSupplies }) {
  const [showDetails, setShowDetails] = useState(false);
  
  if (!detectedType) return null;
  
  const mismatch = userType && detectedType !== userType;
  const confidencePercent = Math.round((confidence || 0) * 100);
  
  const categoryIcons = {
    food: '🍲',
    water: '💧',
    medical: '🏥',
    shelter: '🏠',
    rescue: '🚑',
    other: '📦'
  };
  
  return (
    <div className="relative">
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs cursor-pointer ${
          mismatch ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
        }`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <span>🤖</span>
        <span>{categoryIcons[detectedType]} {detectedType}</span>
        <span className="text-gray-500">({confidencePercent}%)</span>
        {mismatch && <span className="text-amber-600">⚠️</span>}
      </div>
      
      {showDetails && (
        <div className="absolute z-40 top-full left-0 mt-1 w-64 p-2 bg-white border border-gray-200 rounded-lg shadow-lg text-xs">
          <div className="font-bold text-gray-700 mb-1">AI Detection Details</div>
          <div className="text-gray-600">
            <p>Detected: <strong className="capitalize">{detectedType}</strong></p>
            <p>User selected: <strong className="capitalize">{userType || 'N/A'}</strong></p>
            <p>Confidence: <strong>{confidencePercent}%</strong></p>
          </div>
          
          {extractedSupplies && extractedSupplies.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="font-semibold text-gray-700">Items Mentioned:</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {extractedSupplies.map((item, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * AI Insights Card - Full AI analysis summary for detail view
 */
export function AIInsightsCard({ request }) {
  const hasAIData = request.ai_priority_score || request.ai_detected_type || 
                    request.detected_language || request.is_flagged || 
                    request.duplicate_of_id;
  
  if (!hasAIData) return null;
  
  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤖</span>
        <h3 className="font-semibold text-gray-800">AI Insights</h3>
      </div>
      
      <div className="space-y-3">
        {/* Priority Analysis */}
        {request.ai_priority_score !== undefined && (
          <div className="flex items-start gap-2">
            <span className="text-gray-500">📊</span>
            <div>
              <div className="text-sm font-medium text-gray-700">
                Priority Score: 
                <span className={`ml-1 px-2 py-0.5 rounded ${
                  request.ai_priority_label === 'critical' ? 'bg-red-500 text-white' :
                  request.ai_priority_label === 'high' ? 'bg-orange-500 text-white' :
                  request.ai_priority_label === 'medium' ? 'bg-yellow-500' :
                  'bg-green-500 text-white'
                }`}>
                  {request.ai_priority_score} ({request.ai_priority_label})
                </span>
              </div>
              {request.ai_priority_reason && (
                <p className="text-xs text-gray-500 mt-1">{request.ai_priority_reason}</p>
              )}
            </div>
          </div>
        )}
        
        {/* Category Detection */}
        {request.ai_detected_type && (
          <div className="flex items-start gap-2">
            <span className="text-gray-500">🏷️</span>
            <div>
              <div className="text-sm font-medium text-gray-700">
                Detected Type: <span className="capitalize">{request.ai_detected_type}</span>
                {request.ai_confidence && (
                  <span className="text-gray-500 ml-1">
                    ({Math.round(request.ai_confidence * 100)}% confident)
                  </span>
                )}
              </div>
              {request.extracted_supplies && request.extracted_supplies.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {request.extracted_supplies.map((item, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-white rounded text-xs text-gray-600">
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Language Detection */}
        {request.detected_language && request.detected_language !== 'en' && (
          <div className="flex items-start gap-2">
            <span className="text-gray-500">🌐</span>
            <div className="text-sm">
              <span className="font-medium text-gray-700">
                Language Detected: {request.detected_language.toUpperCase()}
              </span>
              {request.simplified_text && (
                <p className="text-gray-600 mt-1 italic">"{request.simplified_text}"</p>
              )}
            </div>
          </div>
        )}
        
        {/* Flags */}
        {request.is_flagged && (
          <div className="flex items-start gap-2 text-red-600">
            <span>🚩</span>
            <div className="text-sm">
              <span className="font-medium">Flagged: </span>
              <span>{request.flag_reason}</span>
            </div>
          </div>
        )}
        
        {/* Duplicate Warning */}
        {request.duplicate_of_id && (
          <div className="flex items-start gap-2 text-amber-600">
            <span>⚠️</span>
            <div className="text-sm">
              <span className="font-medium">Potential duplicate of request #{request.duplicate_of_id}</span>
              {request.duplicate_similarity && (
                <span className="text-gray-500 ml-1">
                  ({Math.round(request.duplicate_similarity * 100)}% similar)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default {
  AIPriorityBadge,
  DuplicateWarning,
  FlagWarning,
  LanguageBadge,
  CategoryBadge,
  AIInsightsCard
};
