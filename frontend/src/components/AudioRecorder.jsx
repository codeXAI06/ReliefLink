import { useState, useRef } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * AudioRecorder - Records audio using MediaRecorder API
 * More reliable than Web Speech API, works offline
 * Sends audio to backend for processing
 */

const LANGUAGES = {
  en: { code: 'en-US', name: 'English' },
  hi: { code: 'hi-IN', name: 'हिंदी' },
  ta: { code: 'ta-IN', name: 'தமிழ்' },
  te: { code: 'te-IN', name: 'తెలుగు' },
  bn: { code: 'bn-IN', name: 'বাংলা' },
};

function AudioRecorder({ onTranscript, language = 'en', disabled = false }) {
  const { t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const secondsRef = useRef(0); // Use ref for accurate duration

  const startRecording = async () => {
    setError('');
    audioChunksRef.current = [];
    setSeconds(0);

    try {
      console.log('🎤 Requesting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      });
      
      streamRef.current = stream;
      console.log('✅ Microphone access granted');

      // Try different MIME types
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }
      
      console.log('📼 Using MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('📦 Chunk received:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('⏹️ Recording stopped, processing...');
        await processAudio();
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event.error);
        setError('Recording failed: ' + event.error?.message);
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      secondsRef.current = 0;
      console.log('🔴 Recording started');

      // Start timer
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(s => s + 1);
      }, 1000);

    } catch (err) {
      console.error('❌ Failed to start:', err);
      setError('Could not access microphone: ' + err.message);
    }
  };

  const stopRecording = () => {
    console.log('⏹️ Stop requested');
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  };

  const processAudio = async () => {
    if (audioChunksRef.current.length === 0) {
      console.log('⚠️ No audio recorded');
      setError('No audio was recorded. Please try again.');
      return;
    }

    setIsProcessing(true);
    const durationSecs = secondsRef.current;
    
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('📤 Audio blob size:', audioBlob.size, 'bytes, duration:', durationSecs, 's');

      // Send audio to backend for transcription
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');
      formData.append('preferred_language', LANGUAGES[language]?.code || 'en-US');
      
      try {
        const response = await fetch('/api/voice/upload', { 
          method: 'POST', 
          body: formData 
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Backend response:', result);
          
          // Backend returns: { success, speech_to_text: { text, ... }, ... }
          const transcribedText = result.speech_to_text?.text || result.text || '';
          
          if (onTranscript && transcribedText) {
            onTranscript({
              text: transcribedText,
              duration: durationSecs,
              language: result.speech_to_text?.detected_language || result.detected_language || LANGUAGES[language]?.code || 'en-US',
              confidence: result.speech_to_text?.confidence || result.confidence || 0.8,
              extractedData: result.extracted_request || null
            });
          } else if (onTranscript) {
            // No text returned, let user type
            onTranscript({
              text: '',
              duration: durationSecs,
              language: LANGUAGES[language]?.code || 'en-US',
              isPlaceholder: true
            });
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.log('⚠️ Backend error:', response.status, errorData);
          throw new Error(errorData.error || 'Server returned ' + response.status);
        }
      } catch (fetchError) {
        console.log('⚠️ Backend unavailable, using placeholder:', fetchError.message);
        // Backend not available - just let user know audio was captured
        if (onTranscript) {
          onTranscript({
            text: `[Audio captured: ${durationSecs}s - Type your request below]`,
            duration: durationSecs,
            language: LANGUAGES[language]?.code || 'en-US',
            isPlaceholder: true
          });
        }
      }

    } catch (err) {
      console.error('❌ Processing failed:', err);
      setError('Failed to process audio: ' + err.message);
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Main Record Button */}
      <button
        onClick={toggleRecording}
        disabled={disabled || isProcessing}
        className={`
          w-24 h-24 rounded-full flex items-center justify-center
          transition-all duration-300 shadow-lg
          ${isRecording 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110' 
            : 'bg-blue-500 hover:bg-blue-600'
          }
          ${(disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isProcessing ? (
          <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : isRecording ? (
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        )}
      </button>

      {/* Status Text */}
      <div className="text-center">
        {isRecording ? (
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              <span className="text-red-600 font-medium">
                {t('recording') || 'Recording'} {formatTime(seconds)}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {t('tapToStop') || 'Tap to stop'}
            </p>
          </div>
        ) : isProcessing ? (
          <p className="text-blue-600 font-medium">
            {t('processingAudio') || 'Processing audio...'}
          </p>
        ) : (
          <p className="text-gray-600">
            {t('tapToSpeak') || 'Tap to speak'}
          </p>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-red-600 text-sm text-center bg-red-50 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Language indicator */}
      <div className="text-xs text-gray-400">
        🌐 {LANGUAGES[language]?.name || 'English'}
      </div>

      {/* Alternative text input hint */}
      <p className="text-xs text-gray-500 text-center max-w-xs">
        💡 {t('voiceHint') || 'Voice recording captured! You can also type your request below.'}
      </p>
    </div>
  );
}

export default AudioRecorder;
