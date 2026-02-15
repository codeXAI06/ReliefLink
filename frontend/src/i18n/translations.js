// Language translations for ReliefLink
// Supports: English, Hindi, Tamil, Telugu, Bengali

const translations = {
  en: {
    // Common
    appName: "ReliefLink",
    tagline: "Connecting disaster victims with helpers in real-time",
    loading: "Loading...",
    submit: "Submit",
    cancel: "Cancel",
    back: "Back",
    save: "Save",
    close: "Close",
    refresh: "Refresh",
    logout: "Logout",
    login: "Login",
    signup: "Sign Up",
    
    // Language Selection
    selectLanguage: "Select Your Language",
    continue: "Continue",
    
    // Home Page
    welcome: "Welcome to ReliefLink",
    needHelp: "I Need Help",
    needHelpDesc: "Request emergency assistance",
    canHelp: "I Can Help",
    canHelpDesc: "View requests & provide assistance",
    viewRequests: "View All Requests",
    viewMap: "View Map",
    adminLogin: "Helper/Admin Login",
    
    // Quick Stats
    liveStatus: "Live Status",
    activeRequests: "Active Requests",
    criticalRequests: "Critical",
    helpersOnline: "Helpers Online",
    completed: "Completed",
    
    // Request Form
    requestHelp: "Request Help",
    requestHelpSubtitle: "Fill in the details below. Help is on the way!",
    whatDoYouNeed: "What do you need?",
    howUrgent: "How urgent?",
    yourLocation: "Your Location",
    locationCaptured: "Location captured",
    tapToShareLocation: "Tap to share location",
    gettingLocation: "Getting location...",
    enterAddressManually: "Or enter address manually",
    orEnterCoordinates: "Or enter coordinates manually:",
    latitude: "Latitude",
    longitude: "Longitude",
    describeYourSituation: "Describe your situation",
    descriptionPlaceholder: "Any details that will help responders...",
    contactInfo: "Contact Info (Optional)",
    yourName: "Your name",
    phoneNumber: "Phone number",
    phonePrivacyNote: "Phone number will be shared with helpers to contact you",
    submitHelpRequest: "Submit Help Request",
    requestSubmitted: "Help Request Submitted!",
    requestReceivedMsg: "Your request has been received. Nearby helpers will be notified.",
    
    // Help Types
    food: "Food",
    water: "Water",
    medical: "Medical",
    shelter: "Shelter",
    rescue: "Rescue",
    other: "Other",
    
    // Urgency Levels
    critical: "Critical",
    criticalDesc: "Critical - Life threatening",
    moderate: "Moderate",
    moderateDesc: "Moderate - Need soon",
    low: "Low",
    lowDesc: "Low - Can wait",
    
    // Status
    status: "Status",
    type: "Type",
    requested: "Requested",
    accepted: "Accepted",
    inProgress: "In Progress",
    completedStatus: "Completed",
    cancelled: "Cancelled",
    
    // Feed
    helpRequests: "Help Requests",
    allActive: "All Active",
    pending: "Pending",
    allUrgency: "All Urgency",
    allTypes: "All Types",
    sortBy: "Sort By",
    priority: "Priority",
    oldestFirst: "Oldest First",
    urgency: "Urgency",
    noRequestsFound: "No requests found",
    tryAdjustingFilters: "Try adjusting your filters",
    
    // Map
    legend: "Legend",
    requests: "requests",
    openInGoogleMaps: "Open in Google Maps",
    getDirections: "Get Directions",
    showRoute: "Show Route",
    hideRoute: "Hide Route",
    
    // Helper Dashboard
    becomeHelper: "Become a Helper",
    registerToHelp: "Register to help disaster victims in your area",
    yourNameRequired: "Your Name *",
    enterYourName: "Enter your name",
    organization: "Organization (if any)",
    orgPlaceholder: "NGO or volunteer group name",
    whatCanYouHelp: "What can you help with?",
    helpWithPlaceholder: "e.g., food, water, medical, transport",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    registerAsHelper: "Register as Helper",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    signInHere: "Sign in here",
    signUpHere: "Sign up here",
    
    // Dashboard
    hi: "Hi",
    independentVolunteer: "Independent Volunteer",
    activeTasks: "Active Tasks",
    myTasks: "My Tasks",
    nearbyRequests: "Nearby Requests",
    noActiveTasks: "No active tasks",
    acceptRequestToStart: "Accept a request to get started",
    noPendingRequests: "No pending requests nearby",
    checkBackLater: "Check back later",
    refreshDashboard: "Refresh Dashboard",
    
    // Request Card
    needed: "Needed",
    kmAway: "km away",
    beingHelpedBy: "Being helped by",
    viewDetails: "View Details",
    accept: "Accept",
    complete: "Complete",
    callSeeker: "Call Seeker",
    
    // Request Detail
    description: "Description",
    location: "Location",
    locationOnMap: "Location available on map",
    coordinates: "Coordinates",
    contact: "Contact",
    phone: "Phone",
    acceptThisRequest: "Accept This Request",
    markAsCompleted: "Mark as Completed",
    requestCompleted: "This request has been completed",
    statusHistory: "Status History",
    created: "Created",
    lastUpdated: "Last updated",
    backToRequests: "Back to requests",
    acceptRequest: "Accept This Request",
    markCompleted: "Mark as Completed",
    processing: "Processing...",
    priorityScore: "Priority Score",
    needed: "Needed",
    
    // Errors
    errorLoadingStats: "Unable to load stats",
    errorLoadingRequests: "Failed to load requests. Please try again.",
    errorSubmitting: "Failed to submit request. Please try again.",
    errorAccepting: "Failed to accept request",
    errorCompleting: "Failed to complete request",
    selectHelpType: "Please select the type of help you need",
    provideLocation: "Please provide your location or address",
    enterName: "Please enter your name",
    enterEmail: "Please enter your email",
    enterPassword: "Please enter your password",
    passwordsDoNotMatch: "Passwords do not match",
    invalidCredentials: "Invalid email or password",
    
    // How it works
    howItWorks: "How it works",
    step1: "Request help with your location",
    step2: "Nearby volunteers see your request",
    step3: "Helpers accept & deliver assistance",
    step4: "Track status in real-time",
    
    // Navigation
    home: "Home",
    map: "Map",
    help: "Help",
    dashboard: "Dashboard",
    requests: "Requests",
    
    // Additional
    route: "Route",
    call: "Call",
    totalRequests: "Total",
    locationEnabled: "Location enabled",
    showingNearby: "showing distance to requests",
    allRequests: "All Requests",
    acceptToStart: "Accept a request to get started",
    noRequests: "No pending requests",
    enterPhone: "Please enter your phone number",
    loginWithPhone: "Enter the phone number you registered with",
    changeLanguage: "Change Language",

    // Admin Dashboard
    admin: "Admin",
    adminDashboard: "Admin Dashboard",
    realtimeAnalytics: "Real-time analytics & moderation",
    exportCsv: "Export CSV",
    overview: "Overview",
    flagged: "Flagged",
    leaderboard: "Leaderboard",
    totalHelpers: "Total Helpers",
    avgResponse: "Avg Response",
    escalated: "Escalated",
    requestsLast7Days: "Requests (Last 7 Days)",
    requestCategories: "Request Categories",
    flaggedRequests: "Flagged Requests",
    requireManualReview: "Require manual review",
    autoEscalated: "Auto-escalated by system",
    noFlaggedRequests: "No flagged requests",
    allRequestsClean: "All requests look clean!",
    view: "View",
    approve: "Approve",
    reject: "Reject",
    helperLeaderboard: "Helper Leaderboard",
    topResponders: "Top responders by completed requests",
    noHelpersYet: "No helpers yet",
    notAvailable: "N/A",
    loadingAdminDashboard: "Loading admin dashboard...",

    // Map extras
    hazardZones: "Hazard Zones",
    disasterZone: "Disaster Zone",
    extreme: "Extreme",
    high: "High",
    needsBreakdown: "Needs breakdown",
    radiusKm: "Radius",
    outsideZone: "Outside Zone",
    insideZone: "Inside Zone",
    hyderabadHazardZone: "Hyderabad Hazard Zone",
    zones: "zones",

    // Request Detail extras
    emotionalDistressAnalysis: "Emotional Distress Analysis",
    whyThisPriority: "Why This Priority? — AI Explainability",
    baseUrgencyScore: "Base Urgency Score",
    aiPriorityScore: "AI Priority Score",
    distressBoost: "Distress Boost",
    finalPriority: "Final Priority",
    aiReason: "AI Reason",
    aiDecisionTrail: "AI Decision Trail",
    photoEvidence: "Photo Evidence",
    requestNotFound: "Request not found",

    // Request Card extras
    escalatedLevel: "Escalated",
    distressLevel: "Distress level",
    photos: "photos",
    live: "LIVE",

    // Feed extras
    matchRank: "Match",
    matchPercent: "match",

    // Helper Dashboard extras
    smartPicks: "Smart Picks",
    aiRecommendations: "AI Recommendations",
    aiRecommendationsDesc: "Requests sorted by distance, your skills, and urgency",
    noRecommendations: "No recommendations available",
    enableLocation: "Enable location for personalized picks",
    loadError: "Failed to load dashboard",
    acceptError: "Failed to accept request",
    completeError: "Failed to complete request",
  },
  
  hi: {
    // Common
    appName: "रिलीफलिंक",
    tagline: "आपदा पीड़ितों को वास्तविक समय में सहायकों से जोड़ना",
    loading: "लोड हो रहा है...",
    submit: "जमा करें",
    cancel: "रद्द करें",
    back: "वापस",
    save: "सहेजें",
    close: "बंद करें",
    refresh: "रिफ्रेश",
    logout: "लॉग आउट",
    login: "लॉग इन",
    signup: "साइन अप",
    
    // Language Selection
    selectLanguage: "अपनी भाषा चुनें",
    continue: "जारी रखें",
    
    // Home Page
    welcome: "रिलीफलिंक में आपका स्वागत है",
    needHelp: "मुझे मदद चाहिए",
    needHelpDesc: "आपातकालीन सहायता का अनुरोध करें",
    canHelp: "मैं मदद कर सकता हूं",
    canHelpDesc: "अनुरोध देखें और सहायता प्रदान करें",
    viewRequests: "सभी अनुरोध देखें",
    viewMap: "मानचित्र देखें",
    adminLogin: "सहायक/व्यवस्थापक लॉगिन",
    
    // Quick Stats
    liveStatus: "लाइव स्थिति",
    activeRequests: "सक्रिय अनुरोध",
    criticalRequests: "गंभीर",
    helpersOnline: "ऑनलाइन सहायक",
    completed: "पूर्ण",
    
    // Request Form
    requestHelp: "मदद का अनुरोध करें",
    requestHelpSubtitle: "नीचे विवरण भरें। मदद आ रही है!",
    whatDoYouNeed: "आपको क्या चाहिए?",
    howUrgent: "कितना जरूरी है?",
    yourLocation: "आपका स्थान",
    locationCaptured: "स्थान प्राप्त",
    tapToShareLocation: "स्थान साझा करने के लिए टैप करें",
    gettingLocation: "स्थान प्राप्त हो रहा है...",
    enterAddressManually: "या पता मैन्युअल रूप से दर्ज करें",
    orEnterCoordinates: "या निर्देशांक मैन्युअल रूप से दर्ज करें:",
    latitude: "अक्षांश",
    longitude: "देशांतर",
    describeYourSituation: "अपनी स्थिति का वर्णन करें",
    descriptionPlaceholder: "कोई विवरण जो उत्तरदाताओं की मदद करेगा...",
    contactInfo: "संपर्क जानकारी (वैकल्पिक)",
    yourName: "आपका नाम",
    phoneNumber: "फोन नंबर",
    phonePrivacyNote: "फोन नंबर सहायकों के साथ साझा किया जाएगा",
    submitHelpRequest: "मदद का अनुरोध जमा करें",
    requestSubmitted: "मदद का अनुरोध जमा हो गया!",
    requestReceivedMsg: "आपका अनुरोध प्राप्त हो गया है। आस-पास के सहायकों को सूचित किया जाएगा।",
    
    // Help Types
    food: "भोजन",
    water: "पानी",
    medical: "चिकित्सा",
    shelter: "आश्रय",
    rescue: "बचाव",
    other: "अन्य",
    
    // Urgency Levels
    critical: "गंभीर",
    criticalDesc: "गंभीर - जीवन के लिए खतरा",
    moderate: "मध्यम",
    moderateDesc: "मध्यम - जल्द जरूरत",
    low: "कम",
    lowDesc: "कम - इंतजार कर सकते हैं",
    
    // Status
    status: "स्थिति",
    type: "प्रकार",
    requested: "अनुरोधित",
    accepted: "स्वीकृत",
    inProgress: "प्रगति में",
    completedStatus: "पूर्ण",
    cancelled: "रद्द",
    
    // Feed
    helpRequests: "मदद के अनुरोध",
    allActive: "सभी सक्रिय",
    pending: "लंबित",
    allUrgency: "सभी तात्कालिकता",
    allTypes: "सभी प्रकार",
    sortBy: "क्रमबद्ध करें",
    priority: "प्राथमिकता",
    oldestFirst: "सबसे पुराना पहले",
    urgency: "तात्कालिकता",
    noRequestsFound: "कोई अनुरोध नहीं मिला",
    tryAdjustingFilters: "फ़िल्टर समायोजित करने का प्रयास करें",
    
    // Map
    legend: "लीजेंड",
    requests: "अनुरोध",
    openInGoogleMaps: "गूगल मैप्स में खोलें",
    getDirections: "दिशा-निर्देश प्राप्त करें",
    showRoute: "मार्ग दिखाएं",
    hideRoute: "मार्ग छुपाएं",
    
    // Helper Dashboard
    becomeHelper: "सहायक बनें",
    registerToHelp: "अपने क्षेत्र में आपदा पीड़ितों की मदद के लिए पंजीकरण करें",
    yourNameRequired: "आपका नाम *",
    enterYourName: "अपना नाम दर्ज करें",
    organization: "संगठन (यदि कोई हो)",
    orgPlaceholder: "एनजीओ या स्वयंसेवी समूह का नाम",
    whatCanYouHelp: "आप किसमें मदद कर सकते हैं?",
    helpWithPlaceholder: "जैसे, भोजन, पानी, चिकित्सा, परिवहन",
    email: "ईमेल",
    password: "पासवर्ड",
    confirmPassword: "पासवर्ड की पुष्टि करें",
    registerAsHelper: "सहायक के रूप में पंजीकरण करें",
    alreadyHaveAccount: "पहले से खाता है?",
    dontHaveAccount: "खाता नहीं है?",
    signInHere: "यहां साइन इन करें",
    signUpHere: "यहां साइन अप करें",
    
    // Dashboard
    hi: "नमस्ते",
    independentVolunteer: "स्वतंत्र स्वयंसेवक",
    activeTasks: "सक्रिय कार्य",
    myTasks: "मेरे कार्य",
    nearbyRequests: "आस-पास के अनुरोध",
    noActiveTasks: "कोई सक्रिय कार्य नहीं",
    acceptRequestToStart: "शुरू करने के लिए अनुरोध स्वीकार करें",
    noPendingRequests: "आस-पास कोई लंबित अनुरोध नहीं",
    checkBackLater: "बाद में जांचें",
    refreshDashboard: "डैशबोर्ड रिफ्रेश करें",
    
    // Request Card
    needed: "आवश्यक",
    kmAway: "किमी दूर",
    beingHelpedBy: "मदद कर रहे हैं",
    viewDetails: "विवरण देखें",
    accept: "स्वीकार करें",
    complete: "पूर्ण करें",
    callSeeker: "साधक को कॉल करें",
    
    // Request Detail
    description: "विवरण",
    location: "स्थान",
    locationOnMap: "मानचित्र पर स्थान उपलब्ध",
    coordinates: "निर्देशांक",
    contact: "संपर्क",
    phone: "फोन",
    acceptThisRequest: "इस अनुरोध को स्वीकार करें",
    markAsCompleted: "पूर्ण के रूप में चिह्नित करें",
    requestCompleted: "यह अनुरोध पूरा हो गया है",
    statusHistory: "स्थिति इतिहास",
    created: "बनाया गया",
    lastUpdated: "अंतिम अपडेट",
    backToRequests: "अनुरोधों पर वापस",
    acceptRequest: "इस अनुरोध को स्वीकार करें",
    markCompleted: "पूर्ण के रूप में चिह्नित करें",
    processing: "प्रोसेसिंग...",
    priorityScore: "प्राथमिकता स्कोर",
    
    // Errors
    errorLoadingStats: "आंकड़े लोड करने में असमर्थ",
    errorLoadingRequests: "अनुरोध लोड करने में विफल। कृपया पुनः प्रयास करें।",
    errorSubmitting: "अनुरोध जमा करने में विफल। कृपया पुनः प्रयास करें।",
    errorAccepting: "अनुरोध स्वीकार करने में विफल",
    errorCompleting: "अनुरोध पूर्ण करने में विफल",
    selectHelpType: "कृपया आपको जिस प्रकार की मदद चाहिए उसे चुनें",
    provideLocation: "कृपया अपना स्थान या पता प्रदान करें",
    enterName: "कृपया अपना नाम दर्ज करें",
    enterEmail: "कृपया अपना ईमेल दर्ज करें",
    enterPassword: "कृपया अपना पासवर्ड दर्ज करें",
    passwordsDoNotMatch: "पासवर्ड मेल नहीं खाते",
    invalidCredentials: "अमान्य ईमेल या पासवर्ड",
    
    // How it works
    howItWorks: "यह कैसे काम करता है",
    step1: "अपने स्थान के साथ मदद का अनुरोध करें",
    step2: "आस-पास के स्वयंसेवक आपका अनुरोध देखते हैं",
    step3: "सहायक स्वीकार करते हैं और सहायता प्रदान करते हैं",
    step4: "वास्तविक समय में स्थिति ट्रैक करें",
    
    // Navigation
    home: "होम",
    map: "मानचित्र",
    help: "मदद",
    dashboard: "डैशबोर्ड",
    route: "मार्ग",
    call: "कॉल",
    totalRequests: "कुल",
    locationEnabled: "स्थान सक्षम",
    showingNearby: "अनुरोधों की दूरी दिखा रहा है",
    allRequests: "सभी अनुरोध",
    acceptToStart: "शुरू करने के लिए अनुरोध स्वीकार करें",
    noRequests: "कोई लंबित अनुरोध नहीं",
    enterPhone: "कृपया अपना फोन नंबर दर्ज करें",
    loginWithPhone: "पंजीकृत फोन नंबर दर्ज करें",
    changeLanguage: "भाषा बदलें",

    // Admin Dashboard
    admin: "व्यवस्थापक",
    adminDashboard: "व्यवस्थापक डैशबोर्ड",
    realtimeAnalytics: "रियल-टाइम विश्लेषण और मॉडरेशन",
    exportCsv: "CSV निर्यात",
    overview: "अवलोकन",
    flagged: "चिह्नित",
    leaderboard: "लीडरबोर्ड",
    totalHelpers: "कुल सहायक",
    avgResponse: "औसत प्रतिक्रिया",
    escalated: "बढ़ाया गया",
    requestsLast7Days: "अनुरोध (पिछले 7 दिन)",
    requestCategories: "अनुरोध श्रेणियां",
    flaggedRequests: "चिह्नित अनुरोध",
    requireManualReview: "मैन्युअल समीक्षा आवश्यक",
    autoEscalated: "सिस्टम द्वारा स्वतः बढ़ाया गया",
    noFlaggedRequests: "कोई चिह्नित अनुरोध नहीं",
    allRequestsClean: "सभी अनुरोध साफ दिखते हैं!",
    view: "देखें",
    approve: "स्वीकृत करें",
    reject: "अस्वीकार करें",
    helperLeaderboard: "सहायक लीडरबोर्ड",
    topResponders: "पूर्ण अनुरोधों द्वारा शीर्ष उत्तरदाता",
    noHelpersYet: "अभी तक कोई सहायक नहीं",
    notAvailable: "उपलब्ध नहीं",
    loadingAdminDashboard: "व्यवस्थापक डैशबोर्ड लोड हो रहा है...",

    // Map extras
    hazardZones: "खतरे के क्षेत्र",
    disasterZone: "आपदा क्षेत्र",
    extreme: "अत्यधिक",
    high: "उच्च",
    needsBreakdown: "आवश्यकता विवरण",
    radiusKm: "त्रिज्या",
    outsideZone: "क्षेत्र के बाहर",
    insideZone: "क्षेत्र के अंदर",
    hyderabadHazardZone: "हैदराबाद खतरा क्षेत्र",
    zones: "क्षेत्र",

    // Request Detail extras
    emotionalDistressAnalysis: "भावनात्मक संकट विश्लेषण",
    whyThisPriority: "यह प्राथमिकता क्यों? — AI व्याख्या",
    baseUrgencyScore: "आधार तात्कालिकता स्कोर",
    aiPriorityScore: "AI प्राथमिकता स्कोर",
    distressBoost: "संकट बूस्ट",
    finalPriority: "अंतिम प्राथमिकता",
    aiReason: "AI कारण",
    aiDecisionTrail: "AI निर्णय ट्रेल",
    photoEvidence: "फोटो प्रमाण",
    requestNotFound: "अनुरोध नहीं मिला",

    // Request Card extras
    escalatedLevel: "बढ़ाया गया",
    distressLevel: "संकट स्तर",
    photos: "फोटो",
    live: "लाइव",

    // Feed extras
    matchRank: "मैच",
    matchPercent: "मैच",

    // Helper Dashboard extras
    smartPicks: "स्मार्ट पिक्स",
    aiRecommendations: "AI अनुशंसाएं",
    aiRecommendationsDesc: "दूरी, आपके कौशल और तात्कालिकता के अनुसार क्रमबद्ध",
    noRecommendations: "कोई अनुशंसा उपलब्ध नहीं",
    enableLocation: "व्यक्तिगत सुझावों के लिए स्थान सक्षम करें",
    loadError: "डैशबोर्ड लोड करने में विफल",
    acceptError: "अनुरोध स्वीकार करने में विफल",
    completeError: "अनुरोध पूर्ण करने में विफल",
  },
  
  ta: {
    // Common
    appName: "ரிலீஃப்லிங்க்",
    tagline: "பேரிடர் பாதிக்கப்பட்டவர்களை உதவியாளர்களுடன் நிகழ்நேரத்தில் இணைத்தல்",
    loading: "ஏற்றுகிறது...",
    submit: "சமர்ப்பிக்கவும்",
    cancel: "ரத்து செய்",
    back: "பின்",
    save: "சேமி",
    close: "மூடு",
    refresh: "புதுப்பி",
    logout: "வெளியேறு",
    login: "உள்நுழை",
    signup: "பதிவு செய்",
    
    selectLanguage: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்",
    continue: "தொடரவும்",
    
    welcome: "ரிலீஃப்லிங்க்க்கு வரவேற்கிறோம்",
    needHelp: "எனக்கு உதவி தேவை",
    needHelpDesc: "அவசர உதவி கோரவும்",
    canHelp: "நான் உதவ முடியும்",
    canHelpDesc: "கோரிக்கைகளைப் பார்க்கவும் & உதவி வழங்கவும்",
    viewRequests: "அனைத்து கோரிக்கைகளையும் காண்க",
    viewMap: "வரைபடம் காண்க",
    adminLogin: "உதவியாளர்/நிர்வாகி உள்நுழைவு",
    
    liveStatus: "நேரடி நிலை",
    activeRequests: "செயலில் உள்ள கோரிக்கைகள்",
    criticalRequests: "முக்கியமான",
    helpersOnline: "ஆன்லைனில் உதவியாளர்கள்",
    completed: "முடிந்தது",
    
    requestHelp: "உதவி கோரவும்",
    food: "உணவு",
    water: "தண்ணீர்",
    medical: "மருத்துவம்",
    shelter: "தங்குமிடம்",
    rescue: "மீட்பு",
    other: "மற்றவை",
    
    critical: "முக்கியமான",
    moderate: "மிதமான",
    low: "குறைவான",
    
    helpRequests: "உதவி கோரிக்கைகள்",
    noRequestsFound: "கோரிக்கைகள் இல்லை",
    
    home: "முகப்பு",
    map: "வரைபடம்",
    help: "உதவி",
  },
  
  te: {
    appName: "రిలీఫ్‌లింక్",
    tagline: "విపత్తు బాధితులను సహాయకులతో రియల్ టైమ్‌లో అనుసంధానం చేయడం",
    loading: "లోడ్ అవుతోంది...",
    submit: "సమర్పించు",
    cancel: "రద్దు చేయి",
    
    selectLanguage: "మీ భాషను ఎంచుకోండి",
    continue: "కొనసాగించు",
    
    welcome: "రిలీఫ్‌లింక్‌కు స్వాగతం",
    needHelp: "నాకు సహాయం కావాలి",
    needHelpDesc: "అత్యవసర సహాయం కోరండి",
    canHelp: "నేను సహాయం చేయగలను",
    canHelpDesc: "అభ్యర్థనలు చూడండి & సహాయం అందించండి",
    
    food: "ఆహారం",
    water: "నీరు",
    medical: "వైద్యం",
    shelter: "ఆశ్రయం",
    rescue: "రక్షణ",
    other: "ఇతర",
    
    home: "హోమ్",
    map: "మ్యాప్",
    help: "సహాయం",
  },
  
  bn: {
    appName: "রিলিফলিংক",
    tagline: "দুর্যোগে ক্ষতিগ্রস্তদের সাথে সাহায্যকারীদের রিয়েল-টাইমে সংযুক্ত করা",
    loading: "লোড হচ্ছে...",
    submit: "জমা দিন",
    cancel: "বাতিল",
    
    selectLanguage: "আপনার ভাষা নির্বাচন করুন",
    continue: "চালিয়ে যান",
    
    welcome: "রিলিফলিংকে স্বাগতম",
    needHelp: "আমার সাহায্য দরকার",
    needHelpDesc: "জরুরি সহায়তার অনুরোধ করুন",
    canHelp: "আমি সাহায্য করতে পারি",
    canHelpDesc: "অনুরোধ দেখুন এবং সহায়তা প্রদান করুন",
    
    food: "খাদ্য",
    water: "জল",
    medical: "চিকিৎসা",
    shelter: "আশ্রয়",
    rescue: "উদ্ধার",
    other: "অন্যান্য",
    
    home: "হোম",
    map: "মানচিত্র",
    help: "সাহায্য",
    
    // Voice Input
    voiceInput: "ভয়েস ইনপুট",
    textInput: "টাইপ করুন",
  }
};

// Voice-related translations for all languages
const voiceTranslations = {
  en: {
    // Voice Recording
    voiceInput: "Voice Input",
    textInput: "Type Instead",
    speakYourRequest: "Speak Your Request",
    voiceInstructions: "Describe your situation in any language. AI will help structure your request.",
    tapToRecord: "Tap to record your help request",
    recording: "Recording",
    maxDuration: "Max",
    speakAtLeast: "Speak for at least",
    transcript: "Transcript",
    clear: "Clear",
    speakNow: "Speak now...",
    stopRecording: "Stop Recording",
    startRecording: "Start Recording",
    processingVoice: "Processing your request...",
    supportedLanguages: "Supports: English, Hindi, Tamil, Telugu, Bengali & more",
    
    // Voice Errors
    voiceNotSupported: "Voice recording not supported in this browser",
    voiceNotSupportedMessage: "Voice input is not supported in your browser.",
    useTextInstead: "Please use the text input below.",
    voiceFallbackHint: "Please type your message instead.",
    voiceRecordingError: "Recording error",
    microphonePermissionDenied: "Microphone permission denied. Please allow access.",
    noSpeechDetected: "No speech detected. Please try again.",
    microphoneNotFound: "No microphone found. Please check your device.",
    networkError: "Network error. Please check your connection.",
    failedToStartRecording: "Failed to start recording",
    speechTooShort: "Speech too short. Please try again.",
    voiceProcessingError: "Could not process voice. Please type your request.",
    fallbackToText: "You can type your request instead.",
    
    // AI Analysis
    aiAnalysis: "AI Analysis",
    confidence: "Confidence",
    aiNeedsConfirmation: "Please review and confirm the details below.",
    aiHighConfidence: "AI has high confidence in these results.",
    typeOfHelp: "Type of Help Needed",
    urgencyLevel: "Urgency Level",
    edited: "Edited",
    detectedInformation: "Detected Information",
    vulnerableGroups: "Vulnerable Groups",
    specificNeeds: "Specific Needs",
    keywordsDetected: "Keywords Detected",
    locationMentioned: "Location Mentioned",
    pleaseConfirm: "Please Confirm",
    lowConfidenceWarning: "AI confidence is low for some fields. Please review and correct if needed.",
    confirmAndContinue: "Confirm & Continue",
    processing: "Processing...",
    whyThisSuggestion: "Why this suggestion?",
    
    // Review
    reviewYourRequest: "Review Your Request",
    startOver: "Start Over",
    youSaid: "You said",
    analyzing: "Analyzing...",
    analyzeWithAI: "Analyze with AI",
    
    // Urgency labels
    criticalUrgency: "Critical - Life threatening",
    moderateUrgency: "Moderate - Need soon",
    lowUrgency: "Low - Can wait",
  },
  
  hi: {
    // Voice Recording
    voiceInput: "आवाज़ से बताएं",
    textInput: "टाइप करें",
    speakYourRequest: "अपनी मदद बताएं",
    voiceInstructions: "किसी भी भाषा में अपनी स्थिति बताएं। AI आपकी मदद करेगा।",
    tapToRecord: "रिकॉर्ड करने के लिए टैप करें",
    recording: "रिकॉर्डिंग",
    maxDuration: "अधिकतम",
    speakAtLeast: "कम से कम बोलें",
    transcript: "प्रतिलेख",
    clear: "साफ़ करें",
    speakNow: "अब बोलें...",
    stopRecording: "रिकॉर्डिंग बंद करें",
    startRecording: "रिकॉर्डिंग शुरू करें",
    processingVoice: "आपका अनुरोध प्रोसेस हो रहा है...",
    supportedLanguages: "समर्थित: हिंदी, अंग्रेज़ी, तमिल, तेलुगु, बंगाली और अधिक",
    
    // Voice Errors
    voiceNotSupported: "इस ब्राउज़र में वॉइस रिकॉर्डिंग समर्थित नहीं है",
    voiceNotSupportedMessage: "आपके ब्राउज़र में वॉइस इनपुट समर्थित नहीं है।",
    useTextInstead: "कृपया नीचे टेक्स्ट इनपुट का उपयोग करें।",
    voiceFallbackHint: "कृपया अपना संदेश टाइप करें।",
    voiceRecordingError: "रिकॉर्डिंग त्रुटि",
    microphonePermissionDenied: "माइक्रोफ़ोन अनुमति अस्वीकृत। कृपया अनुमति दें।",
    noSpeechDetected: "कोई आवाज़ नहीं सुनी। कृपया फिर से कोशिश करें।",
    microphoneNotFound: "माइक्रोफ़ोन नहीं मिला। कृपया अपना डिवाइस जांचें।",
    networkError: "नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।",
    failedToStartRecording: "रिकॉर्डिंग शुरू नहीं हो सकी",
    speechTooShort: "बहुत कम बोला। कृपया फिर से कोशिश करें।",
    voiceProcessingError: "आवाज़ प्रोसेस नहीं हो सकी। कृपया टाइप करें।",
    fallbackToText: "आप अपना अनुरोध टाइप कर सकते हैं।",
    
    // AI Analysis
    aiAnalysis: "AI विश्लेषण",
    confidence: "विश्वास",
    aiNeedsConfirmation: "कृपया नीचे दिए गए विवरण की समीक्षा करें और पुष्टि करें।",
    aiHighConfidence: "AI को इन परिणामों पर उच्च विश्वास है।",
    typeOfHelp: "किस प्रकार की मदद चाहिए",
    urgencyLevel: "तात्कालिकता स्तर",
    edited: "संपादित",
    detectedInformation: "पता लगाई गई जानकारी",
    vulnerableGroups: "कमजोर समूह",
    specificNeeds: "विशिष्ट ज़रूरतें",
    keywordsDetected: "पहचाने गए कीवर्ड",
    locationMentioned: "उल्लिखित स्थान",
    pleaseConfirm: "कृपया पुष्टि करें",
    lowConfidenceWarning: "कुछ क्षेत्रों में AI विश्वास कम है। कृपया समीक्षा करें।",
    confirmAndContinue: "पुष्टि करें और जारी रखें",
    processing: "प्रोसेसिंग...",
    whyThisSuggestion: "यह सुझाव क्यों?",
    
    // Review
    reviewYourRequest: "अपना अनुरोध देखें",
    startOver: "फिर से शुरू करें",
    youSaid: "आपने कहा",
    analyzing: "विश्लेषण हो रहा है...",
    analyzeWithAI: "AI से विश्लेषण करें",
    
    // Urgency labels
    criticalUrgency: "गंभीर - जीवन के लिए खतरा",
    moderateUrgency: "मध्यम - जल्द जरूरत",
    lowUrgency: "कम - इंतजार कर सकते हैं",
  },
  
  ta: {
    // Voice Recording
    voiceInput: "குரல் உள்ளீடு",
    textInput: "டைப் செய்யுங்கள்",
    speakYourRequest: "உங்கள் கோரிக்கையைச் சொல்லுங்கள்",
    voiceInstructions: "எந்த மொழியிலும் உங்கள் நிலையை விவரிக்கவும். AI உதவும்.",
    tapToRecord: "பதிவு செய்ய தட்டவும்",
    recording: "பதிவு செய்கிறது",
    transcript: "எழுத்துப்பெயர்ப்பு",
    clear: "அழி",
    speakNow: "இப்போது பேசுங்கள்...",
    processingVoice: "உங்கள் கோரிக்கை செயலாக்கப்படுகிறது...",
    
    // AI Analysis
    aiAnalysis: "AI பகுப்பாய்வு",
    confidence: "நம்பிக்கை",
    confirmAndContinue: "உறுதிப்படுத்தி தொடரவும்",
    
    // Review
    reviewYourRequest: "உங்கள் கோரிக்கையை மதிப்பாய்வு செய்யுங்கள்",
    youSaid: "நீங்கள் சொன்னது",
  },
  
  te: {
    // Voice Recording
    voiceInput: "వాయిస్ ఇన్‌పుట్",
    textInput: "టైప్ చేయండి",
    speakYourRequest: "మీ అభ్యర్థనను చెప్పండి",
    voiceInstructions: "ఏ భాషలోనైనా మీ పరిస్థితిని వివరించండి. AI సహాయం చేస్తుంది.",
    tapToRecord: "రికార్డ్ చేయడానికి ట్యాప్ చేయండి",
    recording: "రికార్డింగ్",
    transcript: "లిప్యంతరీకరణ",
    clear: "క్లియర్",
    speakNow: "ఇప్పుడు మాట్లాడండి...",
    processingVoice: "మీ అభ్యర్థన ప్రాసెస్ అవుతోంది...",
    
    // AI Analysis
    aiAnalysis: "AI విశ్లేషణ",
    confidence: "నమ్మకం",
    confirmAndContinue: "నిర్ధారించి కొనసాగించండి",
    
    // Review
    reviewYourRequest: "మీ అభ్యర్థనను సమీక్షించండి",
    youSaid: "మీరు చెప్పారు",
  },
  
  bn: {
    // Voice Recording
    voiceInput: "ভয়েস ইনপুট",
    textInput: "টাইপ করুন",
    speakYourRequest: "আপনার অনুরোধ বলুন",
    voiceInstructions: "যেকোনো ভাষায় আপনার পরিস্থিতি বর্ণনা করুন। AI সাহায্য করবে।",
    tapToRecord: "রেকর্ড করতে ট্যাপ করুন",
    recording: "রেকর্ডিং",
    transcript: "প্রতিলিপি",
    clear: "মুছুন",
    speakNow: "এখন বলুন...",
    processingVoice: "আপনার অনুরোধ প্রক্রিয়া করা হচ্ছে...",
    
    // AI Analysis
    aiAnalysis: "AI বিশ্লেষণ",
    confidence: "আস্থা",
    confirmAndContinue: "নিশ্চিত করুন এবং চালিয়ে যান",
    
    // Review
    reviewYourRequest: "আপনার অনুরোধ পর্যালোচনা করুন",
    youSaid: "আপনি বলেছেন",
  }
};

// Merge voice translations into main translations
Object.keys(voiceTranslations).forEach(lang => {
  if (translations[lang]) {
    translations[lang] = { ...translations[lang], ...voiceTranslations[lang] };
  }
});

export default translations;
