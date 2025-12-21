import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * VoiceRecorder Component
 * 
 * A mobile-first voice recording component that:
 * - Uses Web Speech API for real-time transcription
 * - Supports multiple Indian languages
 * - Provides visual feedback during recording
 * - Falls back gracefully when features unavailable
 * - Works on low-end devices
 */

// Language code mappings for Web Speech API
const SPEECH_LANGUAGES = {
  en: 'en-IN',  // Indian English
  hi: 'hi-IN',  // Hindi
  ta: 'ta-IN',  // Tamil
  te: 'te-IN',  // Telugu
  bn: 'bn-IN',  // Bengali
  mr: 'mr-IN',  // Marathi
  gu: 'gu-IN',  // Gujarati
  kn: 'kn-IN',  // Kannada
  ml: 'ml-IN',  // Malayalam
  pa: 'pa-IN',  // Punjabi
};

// Check for Web Speech API support
const isSpeechRecognitionSupported = () => {
  return !!(
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    window.mozSpeechRecognition ||
    window.msSpeechRecognition
  );
};

// Get SpeechRecognition constructor
const getSpeechRecognition = () => {
  return (
    window.SpeechRecognition ||
    window.webkitSpeechRecognition ||
    window.mozSpeechRecognition ||
    window.msSpeechRecognition
  );
};

function VoiceRecorder({
  onTranscript,
  onRecordingStart,
  onRecordingStop,
  onError,
  language = 'en',
  maxDuration = 60,
  minDuration = 3,
  disabled = false,
  className = '',
}) {
  const { t } = useLanguage();
  
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [waveHeights, setWaveHeights] = useState([4, 4, 4, 4, 4, 4, 4]);
  
  // Refs
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const waveAnimationRef = useRef(null);
  const transcriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const recordingDurationRef = useRef(0);
  
  // Check browser support on mount
  useEffect(() => {
    const supported = isSpeechRecognitionSupported();
    setIsSupported(supported);
    
    if (!supported) {
      setError(t('voiceNotSupported') || 'Voice recording not supported in this browser');
    }
    
    return () => {
      cleanup();
    };
  }, []);
  
  // Animate wave bars when recording
  useEffect(() => {
    if (isRecording) {
      const animateWaves = () => {
        setWaveHeights(prev => prev.map((_, i) => {
          const base = 8 + audioLevel * 0.25;
          const wave = Math.sin(Date.now() / 150 + i * 1.2) * 12;
          const random = Math.random() * 4;
          return Math.max(4, Math.min(36, base + wave + random));
        }));
        waveAnimationRef.current = requestAnimationFrame(animateWaves);
      };
      animateWaves();
    } else {
      if (waveAnimationRef.current) {
        cancelAnimationFrame(waveAnimationRef.current);
      }
      setWaveHeights([4, 4, 4, 4, 4, 4, 4]);
    }
    
    return () => {
      if (waveAnimationRef.current) {
        cancelAnimationFrame(waveAnimationRef.current);
      }
    };
  }, [isRecording, audioLevel]);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop audio analysis
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);
  
  // Setup audio level analyzer
  const setupAudioAnalyzer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      // Start analyzing audio levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(Math.min(100, average * 1.5));
        
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      
      updateLevel();
      
    } catch (err) {
      console.error('Audio analyzer setup failed:', err);
      // Don't fail - audio visualization is optional
    }
  };
  
  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      console.error('SpeechRecognition API not available');
      return null;
    }
    
    console.log('Initializing speech recognition...');
    const recognition = new SpeechRecognition();
    
    // Configure recognition
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    // Set language
    const speechLang = SPEECH_LANGUAGES[language] || 'en-IN';
    recognition.lang = speechLang;
    console.log('Speech language set to:', speechLang);
    
    // Event handlers
    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsRecording(true);
      setError(null);
      if (onRecordingStart) onRecordingStart();
    };
    
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interim = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      
      console.log('Speech result:', { finalTranscript, interim });
      
      if (finalTranscript) {
        setTranscript(prev => {
          const newTranscript = prev + (prev ? ' ' : '') + finalTranscript;
          transcriptRef.current = newTranscript; // Keep ref in sync
          return newTranscript;
        });
      }
      setInterimTranscript(interim);
      interimTranscriptRef.current = interim; // Keep ref in sync
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      let errorMessage = t('voiceRecordingError') || 'Recording error';
      
      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          errorMessage = t('microphonePermissionDenied') || 'Microphone permission denied. Please allow access.';
          break;
        case 'no-speech':
          errorMessage = t('noSpeechDetected') || 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = t('microphoneNotFound') || 'No microphone found. Please check your device.';
          break;
        case 'network':
          errorMessage = t('networkError') || 'Network error. Please check your connection.';
          break;
        case 'aborted':
          // User stopped - not an error
          return;
        default:
          errorMessage = `${t('voiceRecordingError') || 'Recording error'}: ${event.error}`;
      }
      
      setError(errorMessage);
      if (onError) onError(errorMessage);
    };
    
    recognition.onend = () => {
      console.log('Speech recognition ended, isRecording:', recognitionRef.current !== null);
      // Auto-restart if we still have a reference (user didn't stop)
      if (recognitionRef.current) {
        try {
          console.log('Auto-restarting speech recognition...');
          recognition.start();
        } catch (e) {
          console.log('Could not restart recognition:', e.message);
        }
      }
    };
    
    // Try to detect language from results
    recognition.onspeechend = () => {
      // Speech ended - this is normal, recognition continues
      console.log('Speech ended (pause detected)');
    };
    
    return recognition;
  }, [language, onRecordingStart, onError, t]);
  
  // Start recording
  const startRecording = async () => {
    if (disabled || !isSupported) {
      console.log('Recording disabled or not supported', { disabled, isSupported });
      return;
    }
    
    console.log('Starting recording...');
    
    // Reset state
    setTranscript('');
    setInterimTranscript('');
    setRecordingDuration(0);
    setError(null);
    setDetectedLanguage(null);
    
    // First, request microphone permission explicitly
    try {
      console.log('Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone permission granted');
      
      // Store stream for audio visualization
      mediaStreamRef.current = stream;
      
      // Setup audio analyzer for visual feedback
      await setupAudioAnalyzer();
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setError(t('microphonePermissionDenied') || 'Microphone access denied. Please allow microphone permission and try again.');
      return;
    }
    
    // Initialize and start recognition
    const recognition = initRecognition();
    if (!recognition) {
      setError(t('voiceNotSupported') || 'Voice recording not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    
    recognitionRef.current = recognition;
    
    // Reset refs
    transcriptRef.current = '';
    interimTranscriptRef.current = '';
    recordingDurationRef.current = 0;
    
    try {
      recognition.start();
      console.log('Recognition.start() called');
      setIsRecording(true);
      
      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          recordingDurationRef.current = newDuration; // Keep ref in sync
          
          // Auto-stop at max duration
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          
          return newDuration;
        });
      }, 1000);
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(t('failedToStartRecording') || 'Failed to start recording. Please check microphone permissions.');
      cleanup();
    }
  };
  
  // Stop recording
  const stopRecording = useCallback(() => {
    console.log('Stopping recording...');
    
    // Clear recognition ref FIRST to prevent auto-restart
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    
    // Stop recognition
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        console.log('Recognition already stopped');
      }
    }
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop audio analysis
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    setIsRecording(false);
    setIsPaused(false);
    setAudioLevel(0);
    
    // Use refs to get current transcript values (avoid stale closure)
    const currentTranscript = transcriptRef.current;
    const currentInterim = interimTranscriptRef.current;
    const currentDuration = recordingDurationRef.current;
    
    // Combine final and interim transcripts
    const finalText = (currentTranscript + ' ' + currentInterim).trim();
    
    console.log('Final transcript:', finalText, { currentTranscript, currentInterim });
    
    // Notify parent
    if (onTranscript && finalText) {
      onTranscript({
        text: finalText,
        duration: currentDuration,
        language: SPEECH_LANGUAGES[language] || 'en-IN',
        detectedLanguage: detectedLanguage
      });
    }
    
    if (onRecordingStop) {
      onRecordingStop({
        text: finalText,
        duration: currentDuration
      });
    }
    
    // Clear state
    setInterimTranscript('');
    transcriptRef.current = '';
    interimTranscriptRef.current = '';
  }, [language, detectedLanguage, onTranscript, onRecordingStop]);
  
  // Toggle recording
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  // Format duration as MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Clear transcript
  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
  };
  
  // Current display text
  const displayText = transcript + (interimTranscript ? ` ${interimTranscript}` : '');
  
  // Warning for short recordings
  const showMinDurationWarning = isRecording && recordingDuration < minDuration;
  
  // Sound wave bars for visualization
  const SoundWave = ({ isActive, level }) => (
    <div className="flex items-center justify-center gap-1 h-8">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-150 ${
            isActive ? 'bg-red-500' : 'bg-gray-300'
          }`}
          style={{
            height: isActive 
              ? `${Math.max(8, Math.min(32, 8 + (level * 0.3) + Math.sin(Date.now() / 200 + i) * 8))}px`
              : '8px',
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  );

  return (
    <div className={`voice-recorder ${className}`}>
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm animate-shake">
          <div className="flex items-center">
            <span className="mr-2">⚠️</span>
            <span>{error}</span>
          </div>
          {!isSupported && (
            <p className="mt-2 text-xs">
              {t('voiceFallbackHint') || 'Please use Chrome, Edge, or Safari for voice input.'}
            </p>
          )}
        </div>
      )}
      
      {/* Recording Interface */}
      {isSupported && (
        <div className="relative">
          {/* Main Record Button Area */}
          <div className="flex flex-col items-center">
            
            {/* Animated Background Circles */}
            <div className="relative">
              {/* Outer ripple rings when recording */}
              {isRecording && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full border-4 border-red-300 animate-ping opacity-20" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="rounded-full bg-red-200 opacity-30 animate-pulse"
                      style={{ 
                        width: `${100 + audioLevel * 0.5}px`,
                        height: `${100 + audioLevel * 0.5}px`,
                      }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="rounded-full bg-red-300 opacity-20"
                      style={{ 
                        width: `${120 + audioLevel * 0.8}px`,
                        height: `${120 + audioLevel * 0.8}px`,
                        transition: 'all 0.1s ease-out'
                      }}
                    />
                  </div>
                </>
              )}
              
              {/* Main Button */}
              <button
                type="button"
                onClick={toggleRecording}
                disabled={disabled}
                className={`
                  relative w-24 h-24 rounded-full flex items-center justify-center
                  transition-all duration-300 transform z-10
                  ${isRecording 
                    ? 'bg-gradient-to-br from-red-500 to-red-600 scale-110 shadow-red-300' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:scale-110 shadow-blue-300'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
                  shadow-xl hover:shadow-2xl
                `}
                aria-label={isRecording ? t('stopRecording') : t('startRecording')}
              >
                {/* Spinning border when recording */}
                {isRecording && (
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-white border-r-white animate-spin opacity-50" 
                    style={{ animationDuration: '2s' }}
                  />
                )}
                
                {/* Icon with transition */}
                <div className="relative z-10 transition-transform duration-300">
                  {isRecording ? (
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 bg-white rounded-sm animate-pulse" />
                    </div>
                  ) : (
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  )}
                </div>
              </button>
            </div>
            
            {/* Status Area */}
            <div className="mt-4 text-center min-h-[80px]">
              {isRecording ? (
                <div className="space-y-2 animate-fadeIn">
                  {/* Recording indicator */}
                  <div className="flex items-center justify-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-red-600 font-semibold tracking-wide uppercase text-sm">
                      {t('recording') || 'Recording'}
                    </span>
                  </div>
                  
                  {/* Sound wave visualization */}
                  <div className="flex justify-center">
                    <div className="flex items-end justify-center gap-1 h-10">
                      {waveHeights.map((height, i) => (
                        <div
                          key={i}
                          className="w-1.5 bg-gradient-to-t from-red-600 to-red-400 rounded-full"
                          style={{
                            height: `${height}px`,
                            transition: 'height 0.05s ease-out',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Timer */}
                  <div className="text-3xl font-mono font-bold text-gray-800 tabular-nums">
                    {formatDuration(recordingDuration)}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-48 mx-auto h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-1000 ease-linear"
                      style={{ width: `${(recordingDuration / maxDuration) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('maxDuration') || 'Max'}: {formatDuration(maxDuration)}
                  </div>
                  
                  {/* Tap to stop hint */}
                  <p className="text-xs text-gray-500 animate-pulse">
                    {t('tapToStop') || 'Tap the button to stop'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 animate-fadeIn">
                  <p className="text-gray-700 font-medium">
                    {t('tapToRecord') || 'Tap to start recording'}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {t('speakClearly') || 'Speak clearly in any language'}
                  </p>
                  
                  {/* Idle sound wave */}
                  <div className="flex justify-center opacity-40">
                    <div className="flex items-center gap-1 h-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-1 h-2 bg-gray-400 rounded-full" />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Min Duration Warning */}
            {showMinDurationWarning && (
              <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-4 py-2 rounded-full animate-bounce">
                ⏱️ {t('speakAtLeast') || 'Keep speaking for at least'} {minDuration - recordingDuration}s {t('more') || 'more'}
              </div>
            )}
          </div>
          
          {/* Live Transcript Display */}
          {(displayText || isRecording) && (
            <div className={`mt-6 p-4 rounded-xl border-2 transition-all duration-300 ${
              isRecording 
                ? 'bg-red-50 border-red-200' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">
                    {t('transcript') || 'What we heard'}
                  </span>
                  {isRecording && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse">
                      Live
                    </span>
                  )}
                </div>
                {displayText && !isRecording && (
                  <button
                    type="button"
                    onClick={clearTranscript}
                    className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                  >
                    ✕ {t('clear') || 'Clear'}
                  </button>
                )}
              </div>
              
              <div className="min-h-[60px] max-h-[120px] overflow-y-auto">
                {displayText ? (
                  <p className="text-gray-800 leading-relaxed">
                    {transcript}
                    {interimTranscript && (
                      <span className="text-gray-400 italic border-l-2 border-gray-300 pl-1 ml-1">
                        {interimTranscript}
                      </span>
                    )}
                    {isRecording && <span className="inline-block w-2 h-4 bg-red-500 ml-1 animate-blink" />}
                  </p>
                ) : isRecording ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <span className="animate-pulse">🎤</span>
                    <span className="italic">{t('listening') || 'Listening...'}</span>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          )}
          
          {/* Language Indicator */}
          <div className="mt-4 flex justify-center">
            <span className={`text-xs px-4 py-1.5 rounded-full transition-colors ${
              isRecording 
                ? 'bg-red-100 text-red-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              🌐 {SPEECH_LANGUAGES[language]?.replace('-IN', ' (India)') || 'English (India)'}
            </span>
          </div>
        </div>
      )}
      
      {/* Fallback for unsupported browsers */}
      {!isSupported && (
        <div className="text-center py-6 px-4 bg-gray-50 rounded-xl">
          <span className="text-5xl mb-3 block">🔇</span>
          <p className="text-gray-700 font-medium">
            {t('voiceNotSupportedMessage') || 'Voice input not available'}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            {t('useTextInstead') || 'Please use Chrome, Edge, or Safari browser.'}
          </p>
          <p className="text-gray-400 text-xs mt-2">
            {t('orTypeBelow') || 'Or switch to text input below.'}
          </p>
        </div>
      )}
      
      {/* Custom CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-blink { animation: blink 1s infinite; }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  );
}

export default VoiceRecorder;
