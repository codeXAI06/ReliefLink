import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSummary } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';

function Home() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t, setShowLanguageModal, language } = useLanguage();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getSummary();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Language Selector Button */}
      <button
        onClick={() => setShowLanguageModal(true)}
        className="absolute top-20 right-4 bg-white shadow-md rounded-full px-3 py-1.5 text-sm flex items-center space-x-1 hover:bg-gray-50 z-10"
      >
        <span>🌐</span>
        <span className="uppercase">{language}</span>
      </button>

      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🆘 {t('appName')}
        </h1>
        <p className="text-gray-600">
          {t('tagline')}
        </p>
      </div>

      {/* Main Action Buttons */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        {/* Need Help Button - Big & Prominent */}
        <Link
          to="/request"
          className="bg-red-500 hover:bg-red-600 text-white rounded-2xl p-6 text-center shadow-lg transition-all transform hover:scale-[1.02] border-4 border-red-400"
        >
          <span className="text-5xl block mb-2">🆘</span>
          <span className="text-2xl font-bold block">{t('needHelp')}</span>
          <span className="text-sm opacity-90">{t('needHelpDesc')}</span>
        </Link>

        {/* Can Help Button */}
        <Link
          to={isAuthenticated ? "/helper" : "/login"}
          className="bg-green-500 hover:bg-green-600 text-white rounded-2xl p-6 text-center shadow-lg transition-all transform hover:scale-[1.02]"
        >
          <span className="text-5xl block mb-2">🤝</span>
          <span className="text-2xl font-bold block">{t('canHelp')}</span>
          <span className="text-sm opacity-90">{t('canHelpDesc')}</span>
        </Link>
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link
          to="/feed"
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-4 text-center shadow transition-all"
        >
          <span className="text-2xl block mb-1">📋</span>
          <span className="font-semibold text-sm">{t('viewRequests')}</span>
        </Link>
        
        <Link
          to="/map"
          className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl p-4 text-center shadow transition-all"
        >
          <span className="text-2xl block mb-1">🗺️</span>
          <span className="font-semibold text-sm">{t('viewMap')}</span>
        </Link>
      </div>

      {/* Helper/Admin Login */}
      {!isAuthenticated ? (
        <Link
          to="/login"
          className="block w-full bg-gray-800 hover:bg-gray-900 text-white rounded-xl p-4 text-center shadow transition-all mb-6"
        >
          <span className="text-xl mr-2">🔐</span>
          <span className="font-semibold">{t('adminLogin')}</span>
        </Link>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-green-800">
                  {t('hi')}, {user?.name}!
                </p>
                <p className="text-sm text-green-600">
                  {user?.organization || t('independentVolunteer')}
                </p>
              </div>
            </div>
            <Link to="/helper" className="text-green-600 font-medium text-sm">
              Dashboard →
            </Link>
          </div>
        </div>
      )}

      {/* Live Stats */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <span className="mr-2">📊</span>
          {t('liveStatus')}
        </h2>
        {loading ? (
          <LoadingSpinner size="small" text={t('loading')} />
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3">
            <StatsCard
              icon="📋"
              value={stats.active_requests}
              label={t('activeRequests')}
              color="blue"
            />
            <StatsCard
              icon="🚨"
              value={stats.critical_requests}
              label={t('criticalRequests')}
              color="red"
            />
            <StatsCard
              icon="👥"
              value={stats.helpers_online}
              label={t('helpersOnline')}
              color="green"
            />
            <StatsCard
              icon="✅"
              value={stats.completed_today}
              label={t('completed')}
              color="purple"
            />
          </div>
        ) : (
          <p className="text-gray-500 text-center">{t('errorLoadingStats')}</p>
        )}
      </div>

      {/* How it works */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-start space-x-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <h3 className="font-semibold text-blue-900">{t('howItWorks')}</h3>
            <ul className="text-sm text-blue-800 mt-1 space-y-1">
              <li>• {t('step1')}</li>
              <li>• {t('step2')}</li>
              <li>• {t('step3')}</li>
              <li>• {t('step4')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({ to, icon, label }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center space-x-3">
        <span className="text-xl">{icon}</span>
        <span className="text-gray-700">{label}</span>
      </div>
      <span className="text-gray-400">→</span>
    </Link>
  );
}

export default Home;
