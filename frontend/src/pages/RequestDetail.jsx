import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getRequest, getRequestHistory, acceptRequest, completeRequest, getHelpTypeIcon, getAILogs } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useLanguage } from '../i18n/LanguageContext';
import { AIInsightsCard, DuplicateWarning, FlagWarning, AIPriorityBadge } from '../components/AIBadges';

function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [request, setRequest] = useState(null);
  const [history, setHistory] = useState([]);
  const [aiLogs, setAILogs] = useState([]);
  const [showAIExplain, setShowAIExplain] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const helperId = localStorage.getItem('helperId');

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    setLoading(true);
    try {
      const [requestData, historyData] = await Promise.all([
        getRequest(id),
        getRequestHistory(id)
      ]);
      setRequest(requestData);
      setHistory(historyData);
      // Load AI logs for explainability
      try {
        const logs = await getAILogs(id);
        setAILogs(logs);
      } catch (_) { /* AI logs optional */ }
    } catch (err) {
      console.error('Error loading request:', err);
      setError(t('requestNotFound'));
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!helperId) {
      navigate('/helper');
      return;
    }
    
    setActionLoading(true);
    try {
      await acceptRequest(id, parseInt(helperId));
      loadRequest();
    } catch (err) {
      setError(err.response?.data?.detail || t('errorAccepting'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!helperId) return;
    
    setActionLoading(true);
    try {
      await completeRequest(id, parseInt(helperId));
      loadRequest();
    } catch (err) {
      setError(err.response?.data?.detail || t('errorCompleting'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text={t('loading')} />;
  }

  if (error && !request) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <span className="text-5xl block mb-4">😔</span>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{error}</h2>
        <Link to="/feed" className="text-blue-600 font-medium">
          ← {t('backToRequests')}
        </Link>
      </div>
    );
  }

  const urgencyColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    moderate: 'bg-orange-100 text-orange-800 border-orange-200',
    low: 'bg-green-100 text-green-800 border-green-200'
  };

  const statusColors = {
    requested: 'bg-blue-100 text-blue-800',
    accepted: 'bg-purple-100 text-purple-800',
    in_progress: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Back button */}
      <Link to="/feed" className="text-blue-600 text-sm font-medium mb-4 inline-block">
        ← {t('backToRequests')}
      </Link>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className={`p-4 ${
          request.urgency === 'critical' ? 'bg-red-50' :
          request.urgency === 'moderate' ? 'bg-orange-50' :
          'bg-green-50'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-4xl">{getHelpTypeIcon(request.help_type)}</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900 capitalize">
                  {t(request.help_type)} {t('needed')}
                </h1>
                <p className="text-sm text-gray-600">{request.time_ago}</p>
              </div>
            </div>
          </div>
          
          {/* Badges */}
          <div className="flex space-x-2 mt-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize border ${urgencyColors[request.urgency]}`}>
              {request.urgency === 'critical' && '🔴 '}
              {t(request.urgency) || request.urgency}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusColors[request.status]}`}>
              {t(request.status) || request.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* AI Warnings - Show at top if flagged or duplicate */}
          {request.is_flagged && (
            <FlagWarning reason={request.flag_reason} />
          )}
          {request.duplicate_of_id && (
            <DuplicateWarning 
              duplicateOfId={request.duplicate_of_id} 
              similarity={request.duplicate_similarity}
              onViewOriginal={(id) => navigate(`/request/${id}`)}
            />
          )}
          
          {/* AI Insights Card */}
          <AIInsightsCard request={request} />
          
          {/* Distress Analysis */}
          {request.distress_score > 0 && (
            <div className={`rounded-lg p-3 border ${
              request.distress_score > 0.7 ? 'bg-red-50 border-red-200' :
              request.distress_score > 0.4 ? 'bg-orange-50 border-orange-200' :
              'bg-yellow-50 border-yellow-200'
            }`}>
              <h3 className="text-sm font-semibold mb-2">
                🧠 {t('emotionalDistressAnalysis')}
              </h3>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${
                      request.distress_score > 0.7 ? 'bg-red-500' :
                      request.distress_score > 0.4 ? 'bg-orange-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${request.distress_score * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-bold">
                  {(request.distress_score * 100).toFixed(0)}%
                </span>
              </div>
              {request.distress_indicators && Object.keys(request.distress_indicators).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(request.distress_indicators).map(([key, score]) => (
                    <span key={key} className="text-xs bg-white/80 rounded px-2 py-0.5 capitalize">
                      {key.replace('_', ' ')}: {(score * 100).toFixed(0)}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Explainability Panel */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
            <button
              onClick={() => setShowAIExplain(!showAIExplain)}
              className="w-full p-3 flex items-center justify-between text-left"
            >
              <span className="text-sm font-semibold text-indigo-800">
                🤖 {t('whyThisPriority')}
              </span>
              <span className="text-indigo-400">{showAIExplain ? '▲' : '▼'}</span>
            </button>
            {showAIExplain && (
              <div className="px-3 pb-3 space-y-2">
                {/* Priority breakdown */}
                <div className="bg-white rounded-lg p-3 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('baseUrgencyScore')}</span>
                    <span className="font-mono font-bold">
                      {request.urgency === 'critical' ? '80' : request.urgency === 'moderate' ? '50' : '20'}/100
                    </span>
                  </div>
                  {request.ai_priority_score != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('aiPriorityScore')}</span>
                      <span className="font-mono font-bold">{request.ai_priority_score}/100</span>
                    </div>
                  )}
                  {request.distress_score > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('distressBoost')}</span>
                      <span className="font-mono font-bold text-red-600">
                        +{(request.distress_score * 15).toFixed(0)} pts
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold text-gray-800">{t('finalPriority')}</span>
                    <span className="font-mono font-bold text-lg">{request.priority_score}/100</span>
                  </div>
                  {request.ai_priority_reason && (
                    <p className="text-xs text-gray-500 italic mt-1">
                      {t('aiReason')}: "{request.ai_priority_reason}"
                    </p>
                  )}
                </div>

                {/* AI Decision Log */}
                {aiLogs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-indigo-700 mb-1">{t('aiDecisionTrail')}:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {aiLogs.map((log, idx) => (
                        <div key={idx} className="bg-white rounded p-2 text-xs">
                          <div className="flex justify-between">
                            <span className="font-medium capitalize">{log.action}</span>
                            <span className="text-gray-400">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          {log.result && (
                            <p className="text-gray-600 mt-0.5 truncate">{JSON.stringify(log.result)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-indigo-400 italic">
                  Patent: Multi-factor AI triage with emotional distress NLP
                </p>
              </div>
            )}
          </div>

          {/* Image Gallery */}
          {request.image_urls && request.image_urls.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">📸 {t('photoEvidence')}</h3>
              <div className="grid grid-cols-3 gap-2">
                {request.image_urls.map((url, idx) => (
                  <img 
                    key={idx}
                    src={url} 
                    alt={`Evidence ${idx + 1}`}
                    className="w-full h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                    onClick={() => window.open(url, '_blank')}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Description */}
          {request.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">{t('description')}</h3>
              <p className="text-gray-800">{request.description}</p>
            </div>
          )}

          {/* Location */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-1">📍 {t('location')}</h3>
            <p className="text-gray-800">{request.address || t('locationOnMap')}</p>
            <p className="text-sm text-gray-500">
              {t('coordinates')}: {request.latitude.toFixed(4)}, {request.longitude.toFixed(4)}
            </p>
            <a
              href={`https://www.google.com/maps?q=${request.latitude},${request.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 text-sm font-medium mt-1 inline-block"
            >
              {t('openInGoogleMaps')} →
            </a>
          </div>

          {/* Contact */}
          {(request.contact_name || request.phone_masked) && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">👤 {t('contact')}</h3>
              {request.contact_name && <p className="text-gray-800">{request.contact_name}</p>}
              {request.phone_masked && (
                <p className="text-gray-600 text-sm">{t('phone')}: {request.phone_masked}</p>
              )}
            </div>
          )}

          {/* Helper Info */}
          {request.helper_name && (
            <div className="bg-purple-50 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-purple-800 mb-1">🤝 {t('beingHelpedBy')}</h3>
              <p className="text-purple-700">{request.helper_name}</p>
              {request.accepted_at && (
                <p className="text-sm text-purple-600">
                  {t('accepted')}: {new Date(request.accepted_at).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Priority Score */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <span className="text-sm text-gray-600">{t('priorityScore')}</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">{request.priority_score}/100</span>
              {request.ai_priority_score !== undefined && (
                <AIPriorityBadge 
                  score={request.ai_priority_score}
                  label={request.ai_priority_label}
                  reason={request.ai_priority_reason}
                />
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-gray-50">
          {request.status === 'requested' && (
            <button
              onClick={handleAccept}
              disabled={actionLoading}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
            >
              {actionLoading ? t('processing') : `🤝 ${t('acceptRequest')}`}
            </button>
          )}
          
          {(request.status === 'accepted' || request.status === 'in_progress') && 
           request.helper_id === parseInt(helperId) && (
            <button
              onClick={handleComplete}
              disabled={actionLoading}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
            >
              {actionLoading ? t('processing') : `✅ ${t('markCompleted')}`}
            </button>
          )}

          {request.status === 'completed' && (
            <div className="text-center py-3 text-green-600 font-medium">
              ✅ {t('requestCompleted')}
            </div>
          )}
        </div>
      </div>

      {/* Status History */}
      {history.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">📜 {t('statusHistory')}</h2>
          <div className="bg-white rounded-xl shadow-sm">
            {history.map((log, index) => (
              <div
                key={log.id}
                className={`p-3 flex items-start space-x-3 ${
                  index !== history.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className={`w-3 h-3 rounded-full mt-1 ${
                  log.new_status === 'completed' ? 'bg-green-500' :
                  log.new_status === 'accepted' ? 'bg-purple-500' :
                  log.new_status === 'in_progress' ? 'bg-orange-500' :
                  'bg-blue-500'
                }`}></div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 capitalize">
                    {t(log.new_status) || log.new_status.replace('_', ' ')}
                  </p>
                  {log.notes && <p className="text-sm text-gray-600">{log.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="mt-6 text-sm text-gray-500 space-y-1">
        <p>{t('created')}: {new Date(request.created_at).toLocaleString()}</p>
        <p>{t('lastUpdated')}: {new Date(request.updated_at).toLocaleString()}</p>
        {request.completed_at && (
          <p>{t('completed')}: {new Date(request.completed_at).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

export default RequestDetail;
