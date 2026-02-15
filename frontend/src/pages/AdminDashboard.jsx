import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAnalytics, getFlaggedRequests, reviewRequest, exportStats, getHelpTypeIcon } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import LoadingSpinner from '../components/LoadingSpinner';

function AdminDashboard() {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState(null);
  const [flagged, setFlagged] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewingId, setReviewingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analyticsData, flaggedData] = await Promise.all([
        getAnalytics(),
        getFlaggedRequests().catch(() => [])
      ]);
      setAnalytics(analyticsData);
      setFlagged(flaggedData);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (requestId, action) => {
    setReviewingId(requestId);
    try {
      await reviewRequest(requestId, action);
      setFlagged(f => f.filter(r => r.id !== requestId));
    } catch (err) {
      console.error('Review failed:', err);
    } finally {
      setReviewingId(null);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportStats();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relieflink_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) return <LoadingSpinner text={t('loadingAdminDashboard')} />;

  const tabs = [
    { id: 'overview', label: `📊 ${t('overview')}`, count: null },
    { id: 'flagged', label: `🚩 ${t('flagged')}`, count: flagged.length },
    { id: 'helpers', label: `🏆 ${t('leaderboard')}`, count: null },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 {t('adminDashboard')}</h1>
          <p className="text-sm text-gray-500">{t('realtimeAnalytics')}</p>
        </div>
        <button
          onClick={handleExport}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          📥 {t('exportCsv')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && analytics && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox
              label={t('totalRequests')}
              value={analytics.total_requests}
              icon="📋"
              color="blue"
            />
            <StatBox
              label={t('totalHelpers')}
              value={analytics.total_helpers}
              icon="🤝"
              color="green"
            />
            <StatBox
              label={t('avgResponse')}
              value={`${analytics.avg_response_time_mins}m`}
              icon="⏱️"
              color="orange"
            />
            <StatBox
              label={t('escalated')}
              value={analytics.escalated_count}
              icon="⚡"
              color="red"
            />
          </div>

          {/* Daily Requests Chart */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">📈 {t('requestsLast7Days')}</h3>
            <div className="flex items-end space-x-2 h-40">
              {analytics.daily_requests.map((day, idx) => {
                const maxCount = Math.max(...analytics.daily_requests.map(d => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <span className="text-xs font-bold text-gray-700 mb-1">{day.count}</span>
                    <div
                      className="w-full bg-blue-400 rounded-t-md transition-all duration-500"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    ></div>
                    <span className="text-xs text-gray-400 mt-1">
                      {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">📊 {t('requestCategories')}</h3>
            <div className="space-y-2">
              {Object.entries(analytics.category_breakdown || {}).map(([type, count]) => {
                const total = analytics.total_requests || 1;
                const pct = ((count / total) * 100).toFixed(1);
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xl w-8">{getHelpTypeIcon(type)}</span>
                    <span className="text-sm font-medium text-gray-700 w-20 capitalize">{type}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div
                        className="bg-blue-500 h-3 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-gray-600 w-16 text-right">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Flagged + Escalated summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <div className="text-3xl font-bold text-red-600">{analytics.flagged_count}</div>
              <div className="text-sm text-red-700 font-medium">🚩 {t('flaggedRequests')}</div>
              <p className="text-xs text-red-500 mt-1">{t('requireManualReview')}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <div className="text-3xl font-bold text-orange-600">{analytics.escalated_count}</div>
              <div className="text-sm text-orange-700 font-medium">⚡ {t('escalated')}</div>
              <p className="text-xs text-orange-500 mt-1">{t('autoEscalated')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Flagged Tab */}
      {activeTab === 'flagged' && (
        <div className="space-y-4">
          {flagged.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <span className="text-5xl block mb-3">✅</span>
              <p className="text-gray-600 font-medium">{t('noFlaggedRequests')}</p>
              <p className="text-sm text-gray-400">{t('allRequestsClean')}</p>
            </div>
          ) : (
            flagged.map(req => (
              <div key={req.id} className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-red-400">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{getHelpTypeIcon(req.help_type)}</span>
                      <span className="font-semibold capitalize">{req.help_type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        req.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                        req.urgency === 'moderate' ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>{req.urgency}</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{req.description}</p>
                    {req.flag_reason && (
                      <p className="text-xs text-red-600 mt-1">🚩 {req.flag_reason}</p>
                    )}
                  </div>
                  <Link to={`/request/${req.id}`} className="text-blue-500 text-sm">{t('view')} →</Link>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleReview(req.id, 'approve')}
                    disabled={reviewingId === req.id}
                    className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    ✅ {t('approve')}
                  </button>
                  <button
                    onClick={() => handleReview(req.id, 'reject')}
                    disabled={reviewingId === req.id}
                    className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    ❌ {t('reject')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Helpers Leaderboard Tab */}
      {activeTab === 'helpers' && analytics && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border-b">
            <h3 className="text-lg font-bold text-gray-900">🏆 {t('helperLeaderboard')}</h3>
            <p className="text-sm text-gray-500">{t('topResponders')}</p>
          </div>
          {analytics.helper_leaderboard.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              {t('noHelpersYet')}
            </div>
          ) : (
            <div className="divide-y">
              {analytics.helper_leaderboard.map((helper, idx) => (
                <div key={helper.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-600' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-400'
                  }`}>
                    {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `#${idx + 1}`}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{helper.name}</div>
                    {helper.organization && (
                      <div className="text-xs text-gray-400">{helper.organization}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">{helper.completed}</div>
                    <div className="text-xs text-gray-400">{t('completed')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-yellow-600">
                      {'⭐'.repeat(Math.min(Math.round(helper.rating || 0), 5))}
                    </div>
                    <div className="text-xs text-gray-400">{helper.rating?.toFixed(1) || t('notAvailable')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, icon, color }) {
  const colorMap = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    green: 'bg-green-50 border-green-100 text-green-600',
    orange: 'bg-orange-50 border-orange-100 text-orange-600',
    red: 'bg-red-50 border-red-100 text-red-600',
  };
  
  return (
    <div className={`rounded-xl p-4 border ${colorMap[color]}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium opacity-80">{label}</div>
    </div>
  );
}

export default AdminDashboard;
