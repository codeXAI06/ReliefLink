import axios from 'axios';

// API base URL - uses Vite proxy in development
const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============ Help Requests API ============

export const createRequest = async (requestData) => {
  const response = await api.post('/requests/', requestData);
  return response.data;
};

export const getRequests = async (params = {}) => {
  const response = await api.get('/requests/', { params });
  return response.data;
};

export const getAllRequests = async () => {
  // Get all requests including completed for map view
  const response = await api.get('/requests/', { 
    params: { per_page: 100 } 
  });
  return response.data;
};

export const getRequest = async (id) => {
  const response = await api.get(`/requests/${id}`);
  return response.data;
};

export const updateRequest = async (id, data) => {
  const response = await api.patch(`/requests/${id}`, data);
  return response.data;
};

export const getNearbyRequests = async (lat, lon, radiusKm = 10) => {
  const response = await api.get('/requests/nearby', {
    params: { lat, lon, radius_km: radiusKm }
  });
  return response.data;
};

export const acceptRequest = async (requestId, helperId) => {
  const response = await api.post(`/requests/${requestId}/accept`, null, {
    params: { helper_id: helperId }
  });
  return response.data;
};

export const completeRequest = async (requestId, helperId, notes = '') => {
  const response = await api.post(`/requests/${requestId}/complete`, null, {
    params: { helper_id: helperId, notes }
  });
  return response.data;
};

export const getRequestHistory = async (requestId) => {
  const response = await api.get(`/requests/${requestId}/history`);
  return response.data;
};

// ============ Helpers API ============

export const registerHelper = async (helperData) => {
  const response = await api.post('/helpers/', helperData);
  return response.data;
};

export const loginHelper = async (phone) => {
  const response = await api.post('/helpers/login', null, {
    params: { phone }
  });
  return response.data;
};

export const getRequestsForHelper = async (helperId, lat = null, lon = null) => {
  const params = { helper_id: helperId };
  if (lat) params.lat = lat;
  if (lon) params.lon = lon;
  const response = await api.get('/requests/for-helper', { params });
  return response.data;
};

export const getHelpers = async () => {
  const response = await api.get('/helpers/');
  return response.data;
};

export const getHelper = async (id) => {
  const response = await api.get(`/helpers/${id}`);
  return response.data;
};

export const getHelperDashboard = async (helperId, lat = null, lon = null) => {
  const params = {};
  if (lat !== null) params.lat = lat;
  if (lon !== null) params.lon = lon;
  const response = await api.get(`/helpers/${helperId}/dashboard`, { params });
  return response.data;
};

export const updateHelperLocation = async (helperId, lat, lon) => {
  const response = await api.patch(`/helpers/${helperId}/location`, null, {
    params: { lat, lon }
  });
  return response.data;
};

// ============ Stats API ============

export const getStats = async () => {
  const response = await api.get('/stats/');
  return response.data;
};

export const getSummary = async () => {
  const response = await api.get('/stats/summary');
  return response.data;
};

// ============ AI API ============

export const analyzeRequest = async (requestData) => {
  const response = await api.post('/ai/analyze', requestData);
  return response.data;
};

export const getAIPriority = async (data) => {
  const response = await api.post('/ai/priority', data);
  return response.data;
};

export const getAICategory = async (description, userSelectedType = null) => {
  const response = await api.post('/ai/categorize', {
    description,
    user_selected_type: userSelectedType
  });
  return response.data;
};

export const translateText = async (text, sourceLanguage = null) => {
  const response = await api.post('/ai/translate', {
    text,
    source_language: sourceLanguage
  });
  return response.data;
};

export const checkDuplicate = async (data) => {
  const response = await api.post('/ai/check-duplicate', data);
  return response.data;
};

export const getHelperMatches = async (requestId, topN = 3) => {
  const response = await api.get(`/ai/helper-matches/${requestId}`, {
    params: { top_n: topN }
  });
  return response.data;
};

export const getSmartRecommendations = async (helperId, topN = 5) => {
  const response = await api.get(`/ai/smart-recommendations/${helperId}`, {
    params: { top_n: topN }
  });
  return response.data;
};

export const getAILogs = async (requestId) => {
  const response = await api.get(`/ai/logs/${requestId}`);
  return response.data;
};

// ============ Voice Processing API ============

/**
 * Process voice input to structured help request
 * Uses browser's Web Speech API transcription
 */
export const processVoiceInput = async (data) => {
  const response = await api.post('/voice/process', {
    transcribed_text: data.transcribedText,
    audio_base64: data.audioBase64,
    audio_format: data.audioFormat || 'wav',
    detected_language: data.detectedLanguage,
    preferred_language: data.preferredLanguage,
  });
  return response.data;
};

/**
 * Upload audio file for processing
 */
export const uploadAudioFile = async (audioFile, preferredLanguage = null) => {
  const formData = new FormData();
  formData.append('audio_file', audioFile);
  if (preferredLanguage) {
    formData.append('preferred_language', preferredLanguage);
  }
  
  const response = await api.post('/voice/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 30000, // 30 second timeout for audio processing
  });
  return response.data;
};

/**
 * Transcribe audio to text only (no extraction)
 */
export const transcribeAudio = async (audioBase64, audioFormat = 'wav', preferredLanguage = null) => {
  const response = await api.post('/voice/transcribe', {
    audio_base64: audioBase64,
    audio_format: audioFormat,
    preferred_language: preferredLanguage,
  });
  return response.data;
};

/**
 * Extract structured help request from text
 */
export const extractFromText = async (text, sourceLanguage = null) => {
  const response = await api.post('/voice/extract', {
    text,
    source_language: sourceLanguage,
  });
  return response.data;
};

/**
 * Detect language of text
 */
export const detectLanguage = async (text) => {
  const response = await api.post('/voice/detect-language', { text });
  return response.data;
};

/**
 * Translate text to English
 */
export const translateToEnglish = async (text, sourceLanguage = null) => {
  const response = await api.post('/voice/translate', {
    text,
    source_language: sourceLanguage,
  });
  return response.data;
};

/**
 * Get supported languages for voice input
 */
export const getSupportedLanguages = async () => {
  const response = await api.get('/voice/languages');
  return response.data;
};

/**
 * Check voice service health
 */
export const checkVoiceServiceHealth = async () => {
  const response = await api.get('/voice/health');
  return response.data;
};

// ============ Utility Functions ============

export const getUrgencyColor = (urgency) => {
  const colors = {
    critical: 'bg-red-500',
    moderate: 'bg-orange-500',
    low: 'bg-green-500'
  };
  return colors[urgency] || 'bg-gray-500';
};

export const getStatusColor = (status) => {
  const colors = {
    requested: 'bg-blue-500',
    accepted: 'bg-purple-500',
    in_progress: 'bg-orange-500',
    completed: 'bg-green-500',
    cancelled: 'bg-gray-500'
  };
  return colors[status] || 'bg-gray-500';
};

export const getHelpTypeIcon = (type) => {
  const icons = {
    food: '🍚',
    water: '💧',
    medical: '🏥',
    shelter: '🏠',
    rescue: '🚨',
    other: '📦'
  };
  return icons[type] || '📦';
};

export default api;
