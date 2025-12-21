import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError(t('enterPhone') || 'Please enter your phone number');
      return;
    }

    setLoading(true);
    const result = await login(phone);
    setLoading(false);

    if (result.success) {
      navigate('/helper');
    } else {
      setError(result.error || t('invalidCredentials') || 'Phone not registered. Please sign up first.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-3">🔐</span>
          <h1 className="text-2xl font-bold text-gray-900">{t('login')}</h1>
          <p className="text-gray-600 text-sm mt-1">
            {t('adminLogin') || 'Sign in to access Helper Dashboard'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📱 {t('phone') || 'Phone Number'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('loginWithPhone') || 'Enter the phone number you registered with'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {loading ? t('loading') : t('login')}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          {t('dontHaveAccount') || "Don't have an account?"}{' '}
          <Link to="/signup" className="text-blue-600 font-medium hover:underline">
            {t('signUpHere') || 'Sign up here'}
          </Link>
        </p>

        <Link 
          to="/"
          className="block text-center mt-4 text-gray-500 hover:text-gray-700"
        >
          ← {t('back') || 'Back to'} {t('home') || 'Home'}
        </Link>
      </div>
    </div>
  );
}

export default Login;
