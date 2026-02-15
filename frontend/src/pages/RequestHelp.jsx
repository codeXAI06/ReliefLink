import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRequest, processVoiceInput, extractFromText, uploadImages } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import AudioRecorder from '../components/AudioRecorder';
import AIAssistedForm from '../components/AIAssistedForm';
import ImageUploader from '../components/ImageUploader';

const HELP_TYPES = [
  { value: 'food', key: 'food', icon: '🍚' },
  { value: 'water', key: 'water', icon: '💧' },
  { value: 'medical', key: 'medical', icon: '🏥' },
  { value: 'shelter', key: 'shelter', icon: '🏠' },
  { value: 'rescue', key: 'rescue', icon: '🚨' },
  { value: 'other', key: 'other', icon: '📦' },
];

const URGENCY_LEVELS = [
  { value: 'critical', key: 'criticalDesc', color: 'red' },
  { value: 'moderate', key: 'moderateDesc', color: 'orange' },
  { value: 'low', key: 'lowDesc', color: 'green' },
];

// Input mode options
const INPUT_MODES = {
  VOICE: 'voice',
  TEXT: 'text',
};

function RequestHelp() {
  const navigate = useNavigate();
  const { t, currentLanguage } = useLanguage();
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  // Voice processing state
  const [inputMode, setInputMode] = useState(INPUT_MODES.VOICE);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [showAIForm, setShowAIForm] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    help_type: '',
    urgency: 'moderate',
    description: '',
    latitude: null,
    longitude: null,
    address: '',
    phone: '',
    contact_name: '',
  });

  // Try to get location on mount
  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError(t('geolocationNotSupported') || 'Geolocation not supported. Please enter address manually.');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setGettingLocation(false);
        setError('');
      },
      (err) => {
        console.error('Location error:', err);
        setError(t('locationError') || 'Could not get location. Please enter address manually.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle voice transcript from VoiceRecorder
  const handleVoiceTranscript = async ({ text, duration, language }) => {
    console.log('Voice transcript received:', { text, duration, language });
    
    if (!text || text.trim().length < 3) {
      setProcessingError(t('speechTooShort') || 'Speech too short. Please try again.');
      return;
    }
    
    setVoiceTranscript(text);
    setProcessingError(null);
    
    // Set the transcript as description immediately
    setFormData(prev => ({
      ...prev,
      description: text,
    }));
    
    // Try AI processing, but don't block on it
    setIsProcessingVoice(true);
    
    try {
      const result = await processVoiceInput({
        transcribedText: text,
        detectedLanguage: language?.split('-')[0],
        preferredLanguage: currentLanguage,
      });
      
      console.log('Voice processing result:', result);
      
      if (result && result.success && result.extracted_request) {
        setExtractedData(result.extracted_request);
        setShowAIForm(true);
        setFormData(prev => ({
          ...prev,
          description: result.extracted_request.description || text,
          help_type: result.extracted_request.help_type || prev.help_type,
          urgency: result.extracted_request.urgency || prev.urgency,
        }));
      } else {
        // AI processing failed, but we still have the transcript - show form directly
        console.log('AI processing failed, using transcript directly');
        setInputMode(INPUT_MODES.TEXT);
        // Scroll to help type selection
        setTimeout(() => {
          document.getElementById('help-type-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Voice processing error:', err);
      // Don't show error - just switch to text mode with the transcript
      setInputMode(INPUT_MODES.TEXT);
      // Scroll to help type selection
      setTimeout(() => {
        document.getElementById('help-type-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } finally {
      setIsProcessingVoice(false);
    }
  };

  // Handle text extraction for manual input
  const handleTextExtract = async () => {
    const text = formData.description;
    if (!text || text.trim().length < 10) return;
    
    setIsProcessingVoice(true);
    try {
      const result = await extractFromText(text);
      if (result) {
        setExtractedData(result);
        setShowAIForm(true);
        setFormData(prev => ({
          ...prev,
          help_type: result.help_type || prev.help_type,
          urgency: result.urgency || prev.urgency,
        }));
      }
    } catch (err) {
      console.error('Text extraction error:', err);
    } finally {
      setIsProcessingVoice(false);
    }
  };

  // Handle AI form confirmation
  const handleAIConfirm = (confirmedData) => {
    setFormData(prev => ({
      ...prev,
      description: confirmedData.description,
      help_type: confirmedData.help_type,
      urgency: confirmedData.urgency,
    }));
    setShowAIForm(false);
    document.getElementById('location-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Reset to start over
  const handleReset = () => {
    setVoiceTranscript('');
    setExtractedData(null);
    setShowAIForm(false);
    setProcessingError(null);
    setFormData({
      help_type: '',
      urgency: 'moderate',
      description: '',
      latitude: formData.latitude,
      longitude: formData.longitude,
      address: '',
      phone: '',
      contact_name: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.help_type) {
      setError(t('selectHelpType') || 'Please select the type of help you need');
      return;
    }
    
    const submitData = { ...formData };
    
    if (!submitData.latitude || !submitData.longitude) {
      if (!submitData.address) {
        setError(t('provideLocation') || 'Please provide your location or address');
        return;
      }
      submitData.latitude = 20.5937;
      submitData.longitude = 78.9629;
    }

    setLoading(true);

    try {
      const newRequest = await createRequest(submitData);
      
      // Upload images if any were selected
      if (selectedImages.length > 0 && newRequest?.id) {
        try {
          await uploadImages(newRequest.id, selectedImages);
        } catch (imgErr) {
          console.error('Image upload failed:', imgErr);
        }
      }
      
      setSuccess(true);
      setTimeout(() => navigate('/feed'), 2000);
    } catch (err) {
      console.error('Error creating request:', err);
      setError(t('submitError') || 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Success screen
  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center">
        <div className="bg-green-50 rounded-2xl p-8">
          <span className="text-6xl block mb-4">✅</span>
          <h2 className="text-2xl font-bold text-green-800 mb-2">{t('requestSubmitted')}</h2>
          <p className="text-green-700">{t('requestReceivedMsg')}</p>
          <p className="text-sm text-green-600 mt-4">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <span className="mr-2">🆘</span> {t('requestHelp')}
        </h1>
        <p className="text-gray-600 text-sm mt-1">{t('requestHelpSubtitle')}</p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Input Mode Toggle */}
      {!showAIForm && (
        <div className="bg-gray-100 rounded-xl p-1 mb-6 flex">
          <button
            type="button"
            onClick={() => setInputMode(INPUT_MODES.VOICE)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center ${
              inputMode === INPUT_MODES.VOICE
                ? 'bg-white shadow text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span className="mr-2">🎤</span>
            {t('voiceInput') || 'Voice Input'}
          </button>
          <button
            type="button"
            onClick={() => setInputMode(INPUT_MODES.TEXT)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center ${
              inputMode === INPUT_MODES.TEXT
                ? 'bg-white shadow text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <span className="mr-2">✏️</span>
            {t('textInput') || 'Type Instead'}
          </button>
        </div>
      )}

      {/* Processing Error */}
      {processingError && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4">
          <div className="flex items-center">
            <span className="mr-2">⚠️</span>
            <span>{processingError}</span>
          </div>
          <p className="text-sm mt-1 text-yellow-700">
            {t('fallbackToText') || 'You can type your request instead.'}
          </p>
        </div>
      )}

      {/* Voice Input Section */}
      {inputMode === INPUT_MODES.VOICE && !showAIForm && (
        <div className="mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-2 text-center">
              {t('speakYourRequest') || 'Speak Your Request'}
            </h2>
            <p className="text-sm text-gray-600 text-center mb-4">
              {t('voiceInstructions') || 'Describe your situation in any language. AI will help structure your request.'}
            </p>
            
            <AudioRecorder
              onTranscript={handleVoiceTranscript}
              language={currentLanguage}
              disabled={isProcessingVoice}
            />
            
            {isProcessingVoice && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center px-4 py-2 bg-white rounded-full shadow">
                  <span className="spinner mr-2"></span>
                  <span className="text-gray-600">{t('processingVoice') || 'Processing your request...'}</span>
                </div>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500 text-center mt-3">
            🌐 {t('supportedLanguages') || 'Supports: English, Hindi, Tamil, Telugu, Bengali & more'}
          </p>
        </div>
      )}

      {/* AI Assisted Form */}
      {showAIForm && extractedData && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {t('reviewYourRequest') || 'Review Your Request'}
            </h2>
            <button type="button" onClick={handleReset} className="text-sm text-gray-500 hover:text-gray-700">
              {t('startOver') || 'Start Over'}
            </button>
          </div>
          
          {voiceTranscript && (
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <span className="text-xs text-gray-500 block mb-1">{t('youSaid') || 'You said'}:</span>
              <p className="text-gray-700 text-sm italic">"{voiceTranscript}"</p>
            </div>
          )}
          
          <AIAssistedForm
            extractedData={extractedData}
            onConfirm={handleAIConfirm}
            onEdit={(data) => setFormData(prev => ({ ...prev, ...data }))}
            isProcessing={loading}
          />
        </div>
      )}

      {/* Main Form */}
      {!showAIForm && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Voice transcript success banner */}
          {voiceTranscript && inputMode === INPUT_MODES.TEXT && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-600">✓</span>
                <span className="font-semibold text-green-800">{t('voiceRecorded') || 'Voice recorded successfully!'}</span>
              </div>
              <p className="text-sm text-green-700 italic">"{voiceTranscript}"</p>
              <p className="text-xs text-green-600 mt-2">{t('nowSelectHelpType') || 'Now select the type of help you need below.'}</p>
            </div>
          )}

          {/* Description (Text Mode) */}
          {inputMode === INPUT_MODES.TEXT && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('describeYourSituation')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
              
              {formData.description.length >= 20 && (
                <button
                  type="button"
                  onClick={handleTextExtract}
                  disabled={isProcessingVoice}
                  className="mt-2 text-sm text-purple-600 hover:text-purple-700 flex items-center"
                >
                  {isProcessingVoice ? (
                    <><span className="spinner mr-2 w-4 h-4"></span>{t('analyzing') || 'Analyzing...'}</>
                  ) : (
                    <><span className="mr-1">🤖</span>{t('analyzeWithAI') || 'Analyze with AI'}</>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Help Type Selection */}
          <div id="help-type-section">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {t('whatDoYouNeed')} *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {HELP_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleChange('help_type', type.value)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    formData.help_type === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl block">{type.icon}</span>
                  <span className="text-sm font-medium mt-1 block">{t(type.key)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Urgency Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              {t('howUrgent')} *
            </label>
            <div className="space-y-2">
              {URGENCY_LEVELS.map(level => (
                <label
                  key={level.value}
                  className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.urgency === level.value
                      ? `border-${level.color}-500 bg-${level.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="urgency"
                    value={level.value}
                    checked={formData.urgency === level.value}
                    onChange={(e) => handleChange('urgency', e.target.value)}
                    className="sr-only"
                  />
                  <span className={`w-4 h-4 rounded-full mr-3 ${
                    level.color === 'red' ? 'bg-red-500' :
                    level.color === 'orange' ? 'bg-orange-500' : 'bg-green-500'
                  }`}></span>
                  <span className="font-medium">{t(level.key)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Location */}
          <div id="location-section">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('yourLocation')} *
            </label>
            {formData.latitude && formData.longitude ? (
              <div className="bg-green-50 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-green-600 mr-2">📍</span>
                  <span className="text-green-700 text-sm">
                    {t('locationCaptured')}: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                  </span>
                </div>
                <button type="button" onClick={getLocation} className="text-blue-600 text-sm font-medium">
                  {t('refresh')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={getLocation}
                disabled={gettingLocation}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                {gettingLocation ? (
                  <><span className="spinner inline-block mr-2"></span>{t('gettingLocation')}</>
                ) : (
                  <><span className="mr-2">📍</span>{t('tapToShareLocation')}</>
                )}
              </button>
            )}
            <input
              type="text"
              placeholder={t('enterAddressManually')}
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full mt-2 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            <div className="mt-3 p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-2">{t('orEnterCoordinates') || 'Or enter coordinates manually:'}</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder={t('latitude') || 'Latitude'}
                  value={formData.latitude || ''}
                  onChange={(e) => handleChange('latitude', e.target.value ? parseFloat(e.target.value) : null)}
                  className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  step="any"
                  placeholder={t('longitude') || 'Longitude'}
                  value={formData.longitude || ''}
                  onChange={(e) => handleChange('longitude', e.target.value ? parseFloat(e.target.value) : null)}
                  className="p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Description (Voice Mode - after recording) */}
          {inputMode === INPUT_MODES.VOICE && formData.description && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('describeYourSituation')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          )}

          {/* Contact Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('contactInfo')}</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder={t('yourName')}
                value={formData.contact_name}
                onChange={(e) => handleChange('contact_name', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="tel"
                placeholder={t('phoneNumber')}
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500">🔒 {t('phonePrivacyNote')}</p>
            </div>
          </div>

          {/* Photo Evidence */}
          <div className="bg-gray-50 rounded-xl p-4">
            <ImageUploader 
              images={selectedImages} 
              onImagesChange={setSelectedImages} 
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-all ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <><span className="spinner inline-block mr-2"></span>{t('loading')}</>
            ) : (
              '🆘 ' + t('submitHelpRequest')
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default RequestHelp;
