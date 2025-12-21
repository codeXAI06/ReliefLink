import { useState, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * AIAssistedForm Component
 * 
 * Displays AI-extracted fields with confidence indicators and allows user confirmation/editing.
 * 
 * Features:
 * - Shows confidence scores for each extracted field
 * - Highlights fields that need confirmation
 * - Allows users to edit AI suggestions
 * - Explains AI reasoning
 * - Mobile-friendly design
 */

// Help type options
const HELP_TYPES = [
  { value: 'food', icon: '🍚', color: 'orange' },
  { value: 'water', icon: '💧', color: 'blue' },
  { value: 'medical', icon: '🏥', color: 'red' },
  { value: 'shelter', icon: '🏠', color: 'purple' },
  { value: 'rescue', icon: '🚨', color: 'yellow' },
  { value: 'other', icon: '📦', color: 'gray' },
];

// Urgency level options
const URGENCY_LEVELS = [
  { value: 'critical', color: 'red', bgClass: 'bg-red-500', textClass: 'text-red-700' },
  { value: 'moderate', color: 'orange', bgClass: 'bg-orange-500', textClass: 'text-orange-700' },
  { value: 'low', color: 'green', bgClass: 'bg-green-500', textClass: 'text-green-700' },
];

// Confidence level helpers
const getConfidenceLevel = (confidence) => {
  if (confidence >= 0.8) return { label: 'High', color: 'green', icon: '✓' };
  if (confidence >= 0.6) return { label: 'Medium', color: 'yellow', icon: '~' };
  return { label: 'Low', color: 'red', icon: '?' };
};

const getConfidenceBarColor = (confidence) => {
  if (confidence >= 0.8) return 'bg-green-500';
  if (confidence >= 0.6) return 'bg-yellow-500';
  return 'bg-red-500';
};

function AIAssistedForm({
  extractedData,
  onConfirm,
  onEdit,
  isProcessing = false,
  showReasoning = true,
}) {
  const { t } = useLanguage();
  
  // Local state for edited values
  const [editedData, setEditedData] = useState({
    description: '',
    help_type: '',
    urgency: '',
  });
  
  // Track which fields have been manually edited
  const [editedFields, setEditedFields] = useState({});
  
  // Initialize with extracted data
  useEffect(() => {
    if (extractedData) {
      setEditedData({
        description: extractedData.description || '',
        help_type: extractedData.help_type || 'other',
        urgency: extractedData.urgency || 'moderate',
      });
      setEditedFields({});
    }
  }, [extractedData]);
  
  // Handle field changes
  const handleChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
    setEditedFields(prev => ({ ...prev, [field]: true }));
    if (onEdit) {
      onEdit({ ...editedData, [field]: value });
    }
  };
  
  // Handle confirm
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm(editedData);
    }
  };
  
  if (!extractedData) {
    return null;
  }
  
  const { 
    help_type_confidence = 0.5, 
    urgency_confidence = 0.5,
    overall_confidence = 0.5,
    needs_confirmation = true,
    urgency_reasons = [],
    help_type_reasons = [],
    vulnerable_groups = [],
    resource_needs = [],
    keywords_detected = [],
    location_mentioned = null,
  } = extractedData;
  
  return (
    <div className="ai-assisted-form space-y-4">
      {/* AI Analysis Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="mr-2">🤖</span>
            {t('aiAnalysis') || 'AI Analysis'}
          </h3>
          <div className="flex items-center">
            <span className={`text-sm font-medium px-2 py-1 rounded-full ${
              overall_confidence >= 0.7 
                ? 'bg-green-100 text-green-700' 
                : overall_confidence >= 0.5 
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
            }`}>
              {Math.round(overall_confidence * 100)}% {t('confidence') || 'Confidence'}
            </span>
          </div>
        </div>
        
        <p className="text-sm text-gray-600">
          {needs_confirmation 
            ? (t('aiNeedsConfirmation') || 'Please review and confirm the details below.')
            : (t('aiHighConfidence') || 'AI has high confidence in these results.')}
        </p>
      </div>
      
      {/* Help Type Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-700">
            {t('typeOfHelp') || 'Type of Help Needed'} *
          </label>
          <ConfidenceBadge 
            confidence={help_type_confidence} 
            edited={editedFields.help_type}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {HELP_TYPES.map(type => {
            const isSelected = editedData.help_type === type.value;
            const isAISuggested = extractedData.help_type === type.value && !editedFields.help_type;
            
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => handleChange('help_type', type.value)}
                className={`
                  p-3 rounded-xl border-2 transition-all relative
                  ${isSelected
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                {/* AI suggestion indicator */}
                {isAISuggested && !editedFields.help_type && (
                  <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    AI
                  </span>
                )}
                
                <span className="text-xl block">{type.icon}</span>
                <span className="text-xs font-medium mt-1 block">
                  {t(type.value) || type.value}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Help type reasoning */}
        {showReasoning && help_type_reasons.length > 0 && !editedFields.help_type && (
          <ReasoningBox reasons={help_type_reasons} t={t} />
        )}
      </div>
      
      {/* Urgency Level */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-700">
            {t('urgencyLevel') || 'Urgency Level'} *
          </label>
          <ConfidenceBadge 
            confidence={urgency_confidence} 
            edited={editedFields.urgency}
          />
        </div>
        
        <div className="space-y-2">
          {URGENCY_LEVELS.map(level => {
            const isSelected = editedData.urgency === level.value;
            const isAISuggested = extractedData.urgency === level.value && !editedFields.urgency;
            
            return (
              <label
                key={level.value}
                className={`
                  flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all relative
                  ${isSelected
                    ? `border-${level.color}-500 bg-${level.color}-50 ring-2 ring-${level.color}-200`
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <input
                  type="radio"
                  name="urgency"
                  value={level.value}
                  checked={isSelected}
                  onChange={(e) => handleChange('urgency', e.target.value)}
                  className="sr-only"
                />
                <span className={`w-3 h-3 rounded-full mr-3 ${level.bgClass}`}></span>
                <span className="font-medium flex-1">
                  {t(`${level.value}Urgency`) || level.value.charAt(0).toUpperCase() + level.value.slice(1)}
                </span>
                
                {/* AI suggestion indicator */}
                {isAISuggested && !editedFields.urgency && (
                  <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                    AI
                  </span>
                )}
              </label>
            );
          })}
        </div>
        
        {/* Urgency reasoning */}
        {showReasoning && urgency_reasons.length > 0 && !editedFields.urgency && (
          <ReasoningBox reasons={urgency_reasons} t={t} />
        )}
      </div>
      
      {/* Description */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-700">
            {t('description') || 'Description'}
          </label>
          {editedFields.description && (
            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              ✏️ {t('edited') || 'Edited'}
            </span>
          )}
        </div>
        
        <textarea
          value={editedData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder={t('describeYourSituation') || 'Describe your situation...'}
          rows={3}
          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>
      
      {/* Detected Information */}
      {(vulnerable_groups.length > 0 || resource_needs.length > 0 || keywords_detected.length > 0 || location_mentioned) && (
        <div className="bg-gray-50 p-4 rounded-xl space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center">
            <span className="mr-2">📊</span>
            {t('detectedInformation') || 'Detected Information'}
          </h4>
          
          {/* Vulnerable Groups */}
          {vulnerable_groups.length > 0 && (
            <div>
              <span className="text-xs text-gray-500">
                {t('vulnerableGroups') || 'Vulnerable Groups'}:
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {vulnerable_groups.map((group, i) => (
                  <span 
                    key={i} 
                    className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full"
                  >
                    ⚠️ {group}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Resource Needs */}
          {resource_needs.length > 0 && (
            <div>
              <span className="text-xs text-gray-500">
                {t('specificNeeds') || 'Specific Needs'}:
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {resource_needs.map((need, i) => (
                  <span 
                    key={i} 
                    className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full"
                  >
                    {need}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Keywords */}
          {keywords_detected.length > 0 && (
            <div>
              <span className="text-xs text-gray-500">
                {t('keywordsDetected') || 'Keywords Detected'}:
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {keywords_detected.slice(0, 6).map((keyword, i) => (
                  <span 
                    key={i} 
                    className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Location Mentioned */}
          {location_mentioned && (
            <div>
              <span className="text-xs text-gray-500">
                {t('locationMentioned') || 'Location Mentioned'}:
              </span>
              <span className="ml-2 text-sm text-gray-700">
                📍 {location_mentioned}
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* Confirmation Warning */}
      {needs_confirmation && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl">
          <div className="flex items-start">
            <span className="text-xl mr-3">⚠️</span>
            <div>
              <h4 className="font-medium text-yellow-800">
                {t('pleaseConfirm') || 'Please Confirm'}
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                {t('lowConfidenceWarning') || 'AI confidence is low for some fields. Please review and correct if needed.'}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirm Button */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isProcessing}
        className={`
          w-full py-4 rounded-xl text-white font-bold text-lg transition-all
          ${isProcessing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-green-500 hover:bg-green-600 active:scale-[0.98]'
          }
        `}
      >
        {isProcessing ? (
          <>
            <span className="spinner inline-block mr-2"></span>
            {t('processing') || 'Processing...'}
          </>
        ) : (
          <>
            ✓ {t('confirmAndContinue') || 'Confirm & Continue'}
          </>
        )}
      </button>
    </div>
  );
}

// Confidence Badge Component
function ConfidenceBadge({ confidence, edited }) {
  if (edited) {
    return (
      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
        ✏️ Edited
      </span>
    );
  }
  
  const level = getConfidenceLevel(confidence);
  const colorClasses = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
  };
  
  return (
    <div className="flex items-center space-x-2">
      {/* Confidence bar */}
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getConfidenceBarColor(confidence)} transition-all`}
          style={{ width: `${confidence * 100}%` }}
        ></div>
      </div>
      
      <span className={`text-xs px-2 py-0.5 rounded-full ${colorClasses[level.color]}`}>
        {level.icon} {Math.round(confidence * 100)}%
      </span>
    </div>
  );
}

// Reasoning Box Component
function ReasoningBox({ reasons, t }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!reasons || reasons.length === 0) return null;
  
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-purple-600 hover:text-purple-700 flex items-center"
      >
        <span className="mr-1">{expanded ? '▼' : '▶'}</span>
        {t('whyThisSuggestion') || 'Why this suggestion?'}
      </button>
      
      {expanded && (
        <div className="mt-2 p-2 bg-purple-50 rounded-lg border border-purple-100">
          <ul className="text-xs text-purple-700 space-y-1">
            {reasons.slice(0, 3).map((reason, i) => (
              <li key={i} className="flex items-start">
                <span className="mr-1">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AIAssistedForm;
