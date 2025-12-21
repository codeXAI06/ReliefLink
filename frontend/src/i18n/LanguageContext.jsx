import { createContext, useContext, useState, useEffect } from 'react';
import translations from './translations';

const LanguageContext = createContext();

export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
];

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('relieflink_language') || null;
  });
  
  const [showLanguageModal, setShowLanguageModal] = useState(!language);

  useEffect(() => {
    if (language) {
      localStorage.setItem('relieflink_language', language);
    }
  }, [language]);

  const t = (key) => {
    const lang = language || 'en';
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  const selectLanguage = (langCode) => {
    setLanguage(langCode);
    setShowLanguageModal(false);
  };

  return (
    <LanguageContext.Provider value={{ 
      language: language || 'en', 
      setLanguage: selectLanguage, 
      t,
      showLanguageModal,
      setShowLanguageModal,
      LANGUAGES
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
