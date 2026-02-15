import { useState, useEffect, useCallback } from 'react';
import { getRequests, connectSSE } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import RequestCard from '../components/RequestCard';
import LoadingSpinner from '../components/LoadingSpinner';

function Feed() {
  const { t } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveCount, setLiveCount] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    urgency: '',
    help_type: '',
    sort_by: 'priority',
  });

  useEffect(() => {
    loadRequests();
  }, [filters]);

  // SSE real-time updates
  useEffect(() => {
    const eventSource = connectSSE((eventType, data) => {
      if (eventType === 'new_request') {
        setLiveCount(prev => prev + 1);
        // Show browser notification if permitted
        if (Notification.permission === 'granted') {
          new Notification('New Help Request', {
            body: `${data.help_type?.toUpperCase()} - ${data.urgency} priority`,
            icon: '/favicon.ico',
            tag: `request-${data.id}`,
          });
        }
        // Auto-refresh
        loadRequests();
      } else if (eventType === 'request_completed' || eventType === 'request_accepted') {
        loadRequests();
      }
    });

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => eventSource.close();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { ...filters };
      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });
      
      const data = await getRequests(params);
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Error loading requests:', err);
      setError(t('errorLoadingRequests'));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <span className="mr-2">📋</span> {t('helpRequests')}
        </h1>
        <p className="text-gray-600 text-sm mt-1 flex items-center gap-2">
          {requests.length} {t('activeRequests')}
          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            {t('live') || 'LIVE'}
          </span>
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('status') || 'Status'}</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('allActive')}</option>
              <option value="requested">{t('pending')}</option>
              <option value="accepted">{t('accepted')}</option>
              <option value="in_progress">{t('inProgress')}</option>
              <option value="completed">{t('completed')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('urgency')}</label>
            <select
              value={filters.urgency}
              onChange={(e) => handleFilterChange('urgency', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('allUrgency')}</option>
              <option value="critical">🔴 {t('critical')}</option>
              <option value="moderate">🟠 {t('moderate')}</option>
              <option value="low">🟢 {t('low')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('type') || 'Type'}</label>
            <select
              value={filters.help_type}
              onChange={(e) => handleFilterChange('help_type', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('allTypes')}</option>
              <option value="food">🍚 {t('food')}</option>
              <option value="water">💧 {t('water')}</option>
              <option value="medical">🏥 {t('medical')}</option>
              <option value="shelter">🏠 {t('shelter')}</option>
              <option value="rescue">🚨 {t('rescue')}</option>
              <option value="other">📦 {t('other')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('sortBy')}</label>
            <select
              value={filters.sort_by}
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="priority">{t('priority')}</option>
              <option value="time">{t('oldestFirst')}</option>
              <option value="urgency">{t('urgency')}</option>
            </select>
          </div>
        </div>
        <button
          onClick={loadRequests}
          className="w-full mt-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
        >
          🔄 {t('refresh')}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Request List */}
      {loading ? (
        <LoadingSpinner text={t('loading')} />
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-5xl block mb-4">📭</span>
          <h3 className="text-lg font-semibold text-gray-700">{t('noRequestsFound')}</h3>
          <p className="text-gray-500 text-sm mt-1">{t('tryAdjustingFilters')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(request => (
            <RequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Feed;
