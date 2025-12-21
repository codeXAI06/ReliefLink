import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getHelperDashboard, 
  acceptRequest, 
  completeRequest,
  updateHelperLocation,
  getRequestsForHelper,
  getSmartRecommendations 
} from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import RequestCard from '../components/RequestCard';
import LoadingSpinner from '../components/LoadingSpinner';
import StatsCard from '../components/StatsCard';
import { AIPriorityBadge } from '../components/AIBadges';

function HelperDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  
  const [dashboard, setDashboard] = useState(null);
  const [allRequests, setAllRequests] = useState([]);
  const [smartRecs, setSmartRecs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('smart');
  const [userLocation, setUserLocation] = useState(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Load dashboard data
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadDashboard();
    }
  }, [isAuthenticated, user]);

  const loadDashboard = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Get user location
      let lat = null, lon = null;
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          lat = position.coords.latitude;
          lon = position.coords.longitude;
          setUserLocation([lat, lon]);
          
          // Update helper location
          await updateHelperLocation(user.id, lat, lon);
        } catch (e) {
          console.log('Location not available');
        }
      }
      
      // Load dashboard stats
      const data = await getHelperDashboard(user.id, lat, lon);
      setDashboard(data);
      
      // Load all requests with full phone numbers
      const requestsData = await getRequestsForHelper(user.id, lat, lon);
      setAllRequests(requestsData.requests || []);
      
      // Load AI-powered smart recommendations
      try {
        const recs = await getSmartRecommendations(user.id, 10);
        setSmartRecs(recs);
      } catch (e) {
        console.log('Smart recommendations not available:', e);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(t('loadError') || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    if (!user?.id) return;
    
    try {
      await acceptRequest(requestId, user.id);
      loadDashboard();
    } catch (err) {
      console.error('Error accepting request:', err);
      setError(err.response?.data?.detail || t('acceptError') || 'Failed to accept request');
    }
  };

  const handleComplete = async (requestId) => {
    if (!user?.id) return;
    
    try {
      await completeRequest(requestId, user.id);
      loadDashboard();
    } catch (err) {
      console.error('Error completing request:', err);
      setError(err.response?.data?.detail || t('completeError') || 'Failed to complete request');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return <LoadingSpinner text={t('loading') || 'Loading dashboard...'} />;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            👋 {t('hi') || 'Hi'}, {user?.name}
          </h1>
          <p className="text-gray-600 text-sm">
            {user?.organization || t('independentVolunteer') || 'Independent Volunteer'}
          </p>
          {user?.phone && (
            <p className="text-xs text-gray-500">📱 {user.phone}</p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-red-500 text-sm hover:text-red-700 font-medium"
        >
          {t('logout') || 'Logout'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatsCard
          icon="📋"
          value={dashboard?.active_requests?.length || 0}
          label={t('activeTasks') || 'Active Tasks'}
          color="blue"
        />
        <StatsCard
          icon="✅"
          value={dashboard?.completed_count || 0}
          label={t('completed') || 'Completed'}
          color="green"
        />
        <StatsCard
          icon="🆘"
          value={allRequests.length}
          label={t('totalRequests') || 'Total Requests'}
          color="red"
        />
      </div>

      {/* Location Status */}
      {userLocation && (
        <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm mb-4 flex items-center">
          <span className="mr-2">📍</span>
          {t('locationEnabled') || 'Location enabled'} - {t('showingNearby') || 'showing distance to requests'}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 mb-4 overflow-x-auto">
        <TabButton
          active={activeTab === 'smart'}
          onClick={() => setActiveTab('smart')}
          count={smartRecs?.recommendations?.length}
          icon="🤖"
        >
          {t('smartPicks') || 'Smart Picks'}
        </TabButton>
        <TabButton
          active={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
          count={allRequests.length}
        >
          {t('allRequests') || 'All Requests'}
        </TabButton>
        <TabButton
          active={activeTab === 'active'}
          onClick={() => setActiveTab('active')}
          count={dashboard?.active_requests?.length}
        >
          {t('myTasks') || 'My Tasks'}
        </TabButton>
      </div>

      {/* Content */}
      {activeTab === 'smart' ? (
        <div className="space-y-4">
          {/* AI Recommendation Header */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 border border-purple-100">
            <div className="flex items-center gap-2 mb-1">
              <span>🤖</span>
              <span className="font-semibold text-purple-800">{t('aiRecommendations') || 'AI Recommendations'}</span>
            </div>
            <p className="text-xs text-gray-600">
              {t('aiRecommendationsDesc') || 'Requests sorted by distance, your skills, and urgency'}
            </p>
          </div>
          
          {!smartRecs || smartRecs.recommendations?.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <span className="text-4xl block mb-2">🎯</span>
              <p className="text-gray-600">{t('noRecommendations') || 'No recommendations available'}</p>
              <p className="text-gray-500 text-sm">{t('enableLocation') || 'Enable location for personalized picks'}</p>
            </div>
          ) : (
            smartRecs.recommendations.map((rec, index) => (
              <SmartRecommendationCard
                key={rec.request_id}
                recommendation={rec}
                rank={index + 1}
                onAccept={handleAccept}
              />
            ))
          )}
        </div>
      ) : activeTab === 'all' ? (
        <div className="space-y-4">
          {allRequests.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <span className="text-4xl block mb-2">🎉</span>
              <p className="text-gray-600">{t('noRequests') || 'No pending requests'}</p>
              <p className="text-gray-500 text-sm">{t('checkBackLater') || 'Check back later'}</p>
            </div>
          ) : (
            allRequests.map(request => (
              <RequestCard
                key={request.id}
                request={request}
                showActions={true}
                onAccept={handleAccept}
                onComplete={handleComplete}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {dashboard?.active_requests?.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <span className="text-4xl block mb-2">📭</span>
              <p className="text-gray-600">{t('noActiveTasks') || 'No active tasks'}</p>
              <p className="text-gray-500 text-sm">{t('acceptToStart') || 'Accept a request to get started'}</p>
            </div>
          ) : (
            dashboard?.active_requests?.map(request => (
              <RequestCard
                key={request.id}
                request={request}
                showActions={true}
                onComplete={handleComplete}
              />
            ))
          )}
        </div>
      )}

      {/* Refresh button */}
      <button
        onClick={loadDashboard}
        className="w-full mt-4 py-3 bg-blue-50 text-blue-600 rounded-xl font-medium hover:bg-blue-100 transition-colors"
      >
        🔄 {t('refresh') || 'Refresh Dashboard'}
      </button>
    </div>
  );
}

function TabButton({ active, onClick, children, count, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
        active
          ? 'bg-blue-500 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {children}
      {count > 0 && (
        <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
          active ? 'bg-white/20' : 'bg-gray-300'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

// Smart Recommendation Card Component
function SmartRecommendationCard({ recommendation, rank, onAccept }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const rec = recommendation;
  
  const urgencyColors = {
    critical: 'border-l-red-500 bg-red-50',
    moderate: 'border-l-orange-500 bg-orange-50',
    low: 'border-l-green-500 bg-green-50'
  };
  
  const getHelpTypeIcon = (type) => {
    const icons = {
      food: '🍚', water: '💧', medical: '🏥',
      shelter: '🏠', rescue: '🚨', other: '📦'
    };
    return icons[type] || '📦';
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${urgencyColors[rec.urgency]}`}>
      <div className="p-4">
        {/* Rank Badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded-full">
              #{rank} Match
            </span>
            <span className="text-sm font-semibold text-gray-700">
              {Math.round(rec.match_score)}% match
            </span>
          </div>
          <AIPriorityBadge 
            score={rec.priority_score}
            label={rec.priority_label}
          />
        </div>
        
        {/* Request Info */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{getHelpTypeIcon(rec.help_type)}</span>
          <div>
            <h3 className="font-semibold text-gray-900 capitalize">
              {rec.help_type} {t('needed') || 'Needed'}
            </h3>
            <p className="text-xs text-gray-500">
              📍 {rec.distance_km} km away
            </p>
          </div>
        </div>
        
        {/* Description */}
        {rec.description && (
          <p className="text-gray-700 text-sm mb-2 line-clamp-2">
            {rec.description}
          </p>
        )}
        
        {/* Match Reasons */}
        <div className="flex flex-wrap gap-1 mb-3">
          {rec.match_reasons?.map((reason, i) => (
            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {reason}
            </span>
          ))}
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <button
            onClick={() => navigate(`/request/${rec.request_id}`)}
            className="text-blue-600 text-sm font-medium"
          >
            {t('viewDetails') || 'View Details'} →
          </button>
          <button
            onClick={() => onAccept(rec.request_id)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium"
          >
            {t('accept') || 'Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HelperDashboard;
