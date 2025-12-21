import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * SimpleVoiceRecorder - A straightforward voice recording component
 * Uses Web Speech API for real-time speech-to-text
 */

const LANGUAGES = {
  en: 'en-US',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
};

function SimpleVoiceRecorder({ onTranscript, language = 'en', disabled = false }) {
  const { t } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const isActiveRef = useRef(false); // Track if recording should be active
  const transcriptRef = useRef(''); // Ref for transcript to avoid stale closures
  const interimRef = useRef(''); // Ref for interim text

  // Check if browser supports speech recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSupported = !!SpeechRecognition;

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  const startListening = async () => {
    if (!isSupported) {
      setError('Speech recognition not supported. Please use Chrome or Edge.');
      return;
    }

    // Request microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');
    } catch (err) {
      setError('Microphone access denied. Please allow microphone permission.');
      return;
    }

    // Reset all state and refs
    setError('');
    setTranscript('');
    setInterimText('');
    setSeconds(0);
    transcriptRef.current = '';
    interimRef.current = '';

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LANGUAGES[language] || 'en-US';
    
    console.log('🔧 Creating recognition with lang:', recognition.lang);

    recognition.onstart = () => {
      console.log('🎤 Listening started!');
    };

    recognition.onaudiostart = () => {
      console.log('🔊 Audio capture started');
    };

    recognition.onsoundstart = () => {
      console.log('🔉 Sound detected');
    };

    recognition.onspeechstart = () => {
      console.log('🗣️ Speech detected');
    };

    recognition.onresult = (event) => {
      let final = '';
      let interim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      console.log('📝 Result:', { final, interim });
      
      if (final) {
        transcriptRef.current = final.trim();
        setTranscript(final.trim());
      }
      interimRef.current = interim;
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      console.error('❌ Recognition Error:', event.error, event.message);
      if (event.error === 'no-speech') {
        // Not a critical error, just no speech detected yet
        return;
      }
      if (event.error === 'aborted') {
        // User stopped or browser stopped
        return;
      }
      setError(`Error: ${event.error}`);
    };

    recognition.onend = () => {
      console.log('🔴 Recognition ended, isActive:', isActiveRef.current);
      // Auto-restart if still supposed to be listening (use ref to avoid stale closure)
      if (recognitionRef.current && isActiveRef.current) {
        console.log('🔄 Auto-restarting recognition...');
        setTimeout(() => {
          try {
            if (recognitionRef.current && isActiveRef.current) {
              recognition.start();
            }
          } catch (e) {
            console.log('Could not restart:', e);
          }
        }, 100);
      }
    };

    // Set active BEFORE starting
    isActiveRef.current = true;
    recognitionRef.current = recognition;
    
    try {
      console.log('▶️ Starting recognition...');
      recognition.start();
      setIsListening(true); // Set immediately, don't wait for onstart
      
      // Start timer immediately
      timerRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      console.error('❌ Failed to start:', err);
      isActiveRef.current = false;
      setError('Failed to start recording: ' + err.message);
    }
  };

  const stopListening = () => {
    console.log('⏹️ Stopping...');
    
    // Mark as inactive first (prevents auto-restart)
    isActiveRef.current = false;
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop recognition
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    
    if (recognition) {
      recognition.onend = null; // Prevent auto-restart
      try {
        recognition.stop();
      } catch (e) {}
    }

    setIsListening(false);

    // Get final text using refs (to avoid stale closure)
    const finalText = (transcriptRef.current + ' ' + interimRef.current).trim();
    console.log('✅ Final text:', finalText);

    if (finalText && onTranscript) {
      onTranscript({
        text: finalText,
        duration: seconds,
        language: LANGUAGES[language] || 'en-US'
      });
    }

    // Clear refs
    transcriptRef.current = '';
    interimRef.current = '';
    setInterimText('');
  };

  const displayText = transcript + (interimText ? ' ' + interimText : '');

  if (!isSupported) {
    return (
      <div className="text-center p-6 bg-yellow-50 rounded-xl">
        <p className="text-yellow-800">⚠️ Voice input not supported in this browser.</p>
        <p className="text-sm text-yellow-600 mt-2">Please use Chrome, Edge, or Safari.</p>
      </div>
    );
  }

  return (
    <div className="voice-recorder">
      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Main Button */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          disabled={disabled}
          className={`
            w-24 h-24 rounded-full flex items-center justify-center
            transition-all duration-300 shadow-lg
            ${isListening 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600'
            }
            ${disabled ? 'opacity-50' : ''}
          `}
        >
          {isListening ? (
            <div className="w-8 h-8 bg-white rounded" />
          ) : (
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          )}
        </button>

        {/* Status */}
        <div className="mt-4 text-center">
          {isListening ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                <span className="text-red-600 font-semibold">Recording...</span>
              </div>
              <div className="text-2xl font-mono font-bold">
                {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
              </div>
              <p className="text-xs text-gray-500">Tap to stop</p>
            </div>
          ) : (
            <p className="text-gray-600">Tap to start recording</p>
          )}
        </div>
      </div>

      {/* Live Transcript */}
      {(displayText || isListening) && (
        <div className={`mt-6 p-4 rounded-xl border-2 ${
          isListening ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-gray-700">
              {t('transcript') || 'What we heard'}:
            </span>
            {isListening && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded animate-pulse">
                Live
              </span>
            )}
          </div>
          <div className="min-h-[50px]">
            {displayText ? (
              <p className="text-gray-800">
                {transcript}
                <span className="text-blue-500">{interimText}</span>
                {isListening && <span className="inline-block w-0.5 h-4 bg-blue-500 ml-1 animate-pulse" />}
              </p>
            ) : (
              <p className="text-gray-400 italic flex items-center gap-2">
                <span>Listening</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Language */}
      <div className="mt-4 text-center">
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          🌐 {LANGUAGES[language] || 'en-US'}
        </span>
      </div>
    </div>
  );
}

export default SimpleVoiceRecorder;
