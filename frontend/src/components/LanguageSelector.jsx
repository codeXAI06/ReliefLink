import { useLanguage, LANGUAGES } from '../i18n/LanguageContext';

function LanguageSelector() {
  const { showLanguageModal, setLanguage, setShowLanguageModal, t } = useLanguage();

  if (!showLanguageModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-5xl block mb-3">🌍</span>
          <h2 className="text-2xl font-bold text-gray-900">
            Select Your Language
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            अपनी भाषा चुनें • மொழியைத் தேர்ந்தெடுக்கவும்
          </p>
        </div>

        {/* Language Options */}
        <div className="space-y-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">
                  {lang.code === 'en' && '🇬🇧'}
                  {lang.code === 'hi' && '🇮🇳'}
                  {lang.code === 'ta' && '🇮🇳'}
                  {lang.code === 'te' && '🇮🇳'}
                  {lang.code === 'bn' && '🇮🇳'}
                </span>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{lang.nativeName}</p>
                  <p className="text-sm text-gray-500">{lang.name}</p>
                </div>
              </div>
              <span className="text-gray-400 group-hover:text-blue-500 transition-colors">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LanguageSelector;
