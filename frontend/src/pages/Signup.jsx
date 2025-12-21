import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

function Signup() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useLanguage();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    organization: '',
    can_help_with: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError(t('enterName') || 'Please enter your name');
      return;
    }
    if (!formData.phone.trim()) {
      setError(t('enterPhone') || 'Please enter your phone number');
      return;
    }

    setLoading(true);
    const result = await register({
      name: formData.name,
      phone: formData.phone,
      organization: formData.organization,
      can_help_with: formData.can_help_with
    });
    setLoading(false);

    if (result.success) {
      navigate('/helper');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <span className="text-5xl block mb-3">🤝</span>
        <h1 className="text-2xl font-bold text-gray-900">{t('becomeHelper') || 'Become a Helper'}</h1>
        <p className="text-gray-600 text-sm mt-1">
          {t('registerToHelp') || 'Register to help disaster victims in your area'}
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
            👤 {t('yourNameRequired') || 'Your Name *'}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t('enterYourName') || 'Enter your name'}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 text-lg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📱 {t('phoneNumber') || 'Phone Number'} *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+91 9876543210"
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 text-lg"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('phoneLoginNote') || 'You will use this number to log in'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🏢 {t('organization') || 'Organization (optional)'}
          </label>
          <input
            type="text"
            value={formData.organization}
            onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
            placeholder={t('orgPlaceholder') || 'NGO or volunteer group name'}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            💪 {t('whatCanYouHelp') || 'What can you help with?'}
          </label>
          <input
            type="text"
            value={formData.can_help_with}
            onChange={(e) => setFormData(prev => ({ ...prev, can_help_with: e.target.value }))}
            placeholder={t('helpWithPlaceholder') || 'e.g., food, water, medical, transport'}
            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {loading ? (t('loading') || 'Registering...') : ('🤝 ' + (t('registerAsHelper') || 'Register as Helper'))}
        </button>
      </form>

      <p className="text-center mt-6 text-gray-600">
        {t('alreadyHaveAccount') || 'Already registered?'}{' '}
        <Link to="/login" className="text-green-600 font-medium hover:underline">
          {t('signInHere') || 'Sign in here'}
        </Link>
      </p>

      <Link 
        to="/"
        className="block text-center mt-4 text-gray-500 hover:text-gray-700"
      >
        ← {t('back') || 'Back to'} {t('home') || 'Home'}
      </Link>
    </div>
  );
}

export default Signup;
