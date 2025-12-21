import { getUrgencyColor, getHelpTypeIcon } from '../api';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { AIPriorityBadge, DuplicateWarning, FlagWarning, LanguageBadge, CategoryBadge } from './AIBadges';

function RequestCard({ request, showActions = false, onAccept, onComplete, onShowRoute }) {
  const { t } = useLanguage();
  const { isAuthenticated, helper } = useAuth();
  
  const urgencyColors = {
    critical: 'border-l-red-500 bg-red-50',
    moderate: 'border-l-orange-500 bg-orange-50',
    low: 'border-l-green-500 bg-green-50'
  };

  const statusBadge = {
    requested: 'bg-blue-100 text-blue-800',
    accepted: 'bg-purple-100 text-purple-800',
    in_progress: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  // Function to open Google Maps directions
  const openDirections = () => {
    const destination = `${request.latitude},${request.longitude}`;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(url, '_blank');
  };

  // Function to call directly
  const callSeeker = () => {
    if (request.phone) {
      window.location.href = `tel:${request.phone}`;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${urgencyColors[request.urgency]} card-hover`}>
      <div className="p-4">
        {/* AI Warnings - Show at top if flagged or duplicate */}
        {request.is_flagged && (
          <div className="mb-3">
            <FlagWarning reason={request.flag_reason} />
          </div>
        )}
        {request.duplicate_of_id && (
          <div className="mb-3">
            <DuplicateWarning 
              duplicateOfId={request.duplicate_of_id} 
              similarity={request.duplicate_similarity}
              onViewOriginal={(id) => window.location.href = `/request/${id}`}
            />
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getHelpTypeIcon(request.help_type)}</span>
            <div>
              <h3 className="font-semibold text-gray-900 capitalize">
                {request.help_type} {t('needed')}
              </h3>
              <p className="text-xs text-gray-500">{request.time_ago}</p>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            {/* AI Priority Badge */}
            {request.ai_priority_score !== undefined && (
              <AIPriorityBadge 
                score={request.ai_priority_score}
                label={request.ai_priority_label}
                reason={request.ai_priority_reason}
              />
            )}
            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
              request.urgency === 'critical' ? 'bg-red-100 text-red-800 animate-pulse-critical' :
              request.urgency === 'moderate' ? 'bg-orange-100 text-orange-800' :
              'bg-green-100 text-green-800'
            }`}>
              {t(request.urgency)}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusBadge[request.status]}`}>
              {request.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* AI Category Badge - if detected type differs from user selection */}
        {request.ai_detected_type && (
          <div className="mb-2">
            <CategoryBadge 
              detectedType={request.ai_detected_type}
              confidence={request.ai_confidence}
              userType={request.help_type}
              extractedSupplies={request.extracted_supplies}
            />
          </div>
        )}

        {/* Description */}
        {request.description && (
          <div className="mb-3">
            <p className="text-gray-700 text-sm line-clamp-2">
              {request.simplified_text || request.description}
            </p>
            {/* Language badge if non-English */}
            <LanguageBadge 
              language={request.detected_language}
              translatedText={request.translated_text}
              simplifiedText={request.simplified_text}
              originalText={request.description}
            />
          </div>
        )}

        {/* Location */}
        <div className="flex items-center text-sm text-gray-600 mb-3">
          <span className="mr-1">📍</span>
          <span className="truncate">{request.address || t('locationAvailable') || 'Location available'}</span>
          {request.distance_km && (
            <span className="ml-2 text-blue-600 font-medium">
              {request.distance_km} km {t('away') || 'away'}
            </span>
          )}
        </div>

        {/* Contact Info - Show phone for seekers or when viewing as helper */}
        {request.contact_name && (
          <div className="text-sm text-gray-600 mb-2">
            <span className="mr-1">👤</span>
            <span>{request.contact_name}</span>
          </div>
        )}
        
        {/* Phone number - show full number to authenticated helpers */}
        {request.phone && isAuthenticated && (
          <div className="text-sm mb-3 bg-green-50 p-2 rounded-lg flex items-center justify-between">
            <div>
              <span className="mr-1">📞</span>
              <span className="font-semibold text-green-700">{request.phone}</span>
            </div>
            <button
              onClick={callSeeker}
              className="bg-green-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-green-600"
            >
              {t('call') || 'Call'}
            </button>
          </div>
        )}
        
        {/* Masked phone for non-authenticated users */}
        {request.phone_masked && !isAuthenticated && (
          <div className="text-sm text-gray-500 mb-3">
            <span className="mr-1">📞</span>
            <span>{request.phone_masked}</span>
          </div>
        )}

        {/* Helper Info */}
        {request.helper_name && (
          <div className="text-sm text-purple-600 mb-3">
            <span className="mr-1">🤝</span>
            <span>{t('beingHelpedBy') || 'Being helped by'}: {request.helper_name}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <Link 
            to={`/request/${request.id}`}
            className="text-blue-600 text-sm font-medium hover:text-blue-700"
          >
            {t('viewDetails')} →
          </Link>
          
          <div className="flex space-x-2">
            {/* Route button for authenticated helpers */}
            {isAuthenticated && request.status !== 'completed' && (
              <button
                onClick={openDirections}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center"
              >
                🗺️ {t('route') || 'Route'}
              </button>
            )}
            
            {showActions && (
              <>
                {request.status === 'requested' && onAccept && (
                  <button
                    onClick={() => onAccept(request.id)}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {t('accept') || 'Accept'}
                  </button>
                )}
                {(request.status === 'accepted' || request.status === 'in_progress') && onComplete && (
                  <button
                    onClick={() => onComplete(request.id)}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {t('complete') || 'Complete'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RequestCard;
