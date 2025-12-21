import { Link, useLocation } from 'react-router-dom';
import { useLanguage, LANGUAGES } from '../i18n/LanguageContext';
import { useAuth } from '../context/AuthContext';

function Header() {
  const location = useLocation();
  const { t, language, setLanguage } = useLanguage();
  const { isAuthenticated, user, logout } = useAuth();
  
  const isActive = (path) => location.pathname === path;
  
  // Get next language for quick toggle
  const languageIndex = LANGUAGES.findIndex(l => l.code === language);
  const nextLanguage = LANGUAGES[(languageIndex + 1) % LANGUAGES.length];
  
  return (
    <>
      {/* Top Header */}
      <header className="bg-blue-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl">🆘</span>
              <h1 className="text-xl font-bold">ReliefLink</h1>
            </Link>
            
            <div className="flex items-center space-x-2">
              {/* Language Toggle */}
              <button
                onClick={() => setLanguage(nextLanguage.code)}
                className="bg-blue-500 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm font-medium"
                title={t('changeLanguage') || 'Change Language'}
              >
                {language.toUpperCase()}
              </button>
              
              {/* Auth Button */}
              {isAuthenticated ? (
                <Link 
                  to="/helper"
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-semibold text-sm"
                >
                  👤 {user?.name?.split(' ')[0]}
                </Link>
              ) : (
                <Link 
                  to="/login"
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg font-semibold text-sm"
                >
                  {t('login') || 'Login'}
                </Link>
              )}
              
              {/* Need Help Button */}
              <Link 
                to="/request"
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg font-semibold text-sm"
              >
                🆘 {t('needHelp') || 'Need Help?'}
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      {/* Bottom Navigation - Mobile First */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
        <div className="flex justify-around items-center py-2">
          <NavItem to="/" icon="🏠" label={t('home') || 'Home'} active={isActive('/')} />
          <NavItem to="/feed" icon="📋" label={t('requests') || 'Requests'} active={isActive('/feed')} />
          <NavItem to="/map" icon="🗺️" label={t('map') || 'Map'} active={isActive('/map')} />
          <NavItem 
            to={isAuthenticated ? "/helper" : "/login"} 
            icon={isAuthenticated ? "🤝" : "🔐"} 
            label={isAuthenticated ? (t('dashboard') || 'Dashboard') : (t('login') || 'Login')} 
            active={isActive('/helper') || isActive('/login')} 
          />
        </div>
      </nav>
    </>
  );
}

function NavItem({ to, icon, label, active }) {
  return (
    <Link 
      to={to}
      className={`flex flex-col items-center px-4 py-1 rounded-lg transition-colors ${
        active 
          ? 'text-blue-600' 
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-xs mt-1 font-medium">{label}</span>
    </Link>
  );
}

export default Header;
