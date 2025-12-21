# 🆘 ReliefLink - Disaster Help Matching Platform

A simple, reliable web application that connects people in need during disasters with nearby volunteers/helpers in real-time. Features **AI-powered multilingual voice input** for accessibility.

![ReliefLink](https://img.shields.io/badge/Status-MVP%20Ready-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Python](https://img.shields.io/badge/Python-3.8+-blue)
![Node](https://img.shields.io/badge/Node.js-18+-green)

## 🎯 Overview

ReliefLink is designed for **emergency situations** where:
- Disaster-affected people need quick help
- Volunteers want to provide assistance
- Coordination between both is critical

**Key Design Principles:**
- ✅ Works on low-end devices
- ✅ Minimal data usage
- ✅ No login required to request help
- ✅ Large touch targets for stressed users
- ✅ Fast loading (<3 seconds)
- ✅ **Voice input for low-literacy users**

---

## 🆕 New Features (v2.0)

### 🎤 Multilingual Voice-Based Help Requests
- **Voice Input**: Speak your emergency in any supported language
- **AI-Powered Extraction**: Automatically detects help type, urgency, and details
- **10+ Languages**: English, Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, etc.
- **Human-in-the-Loop**: Review AI suggestions before submitting
- **Graceful Fallback**: Automatic text input if voice fails

### 🌐 Multi-Language UI Support
- **5 Languages**: English, Hindi (हिंदी), Tamil (தமிழ்), Telugu (తెలుగు), Bengali (বাংলা)
- Language selection on first visit
- Quick toggle in header

### 🔐 Helper Authentication
- Phone-based registration and login
- Simple, no-password authentication
- Secure session management

### 📍 Enhanced Navigation for Helpers
- **Route Navigation**: Get directions from your location to seeker
- **Google Maps Integration**: Open directions in Google Maps
- **Distance Display**: See how far each request is from you

### 📞 Contact Information
- **Full Phone Display**: Helpers can see complete phone numbers
- **Quick Call Button**: One-tap calling to seekers
- **Privacy**: Phone numbers are masked for non-authenticated users

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RELIEFLINK ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐                              ┌─────────────┐               │
│  │  REQUESTER  │                              │   HELPER    │               │
│  │  (Mobile)   │                              │  (Mobile)   │               │
│  └──────┬──────┘                              └──────┬──────┘               │
│         │                                            │                      │
│         └─────────────────┬──────────────────────────┘                      │
│                           │                                                 │
│                           ▼                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                   REACT FRONTEND (Vite + Tailwind)                    │  │
│  │  • Voice Recorder    • Request Form    • Live Feed    • Map View      │  │
│  │  • AI-Assisted Form  • Helper Dashboard • Status Tracking             │  │
│  │  • i18n Support      • Auth System      • Route Navigation            │  │
│  └───────────────────────────────┬───────────────────────────────────────┘  │
│                                  │ REST API                                 │
│                                  ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        FASTAPI BACKEND                                │  │
│  │  • Request Management  • Helper Management   • Voice Processing       │  │
│  │  • Priority Scoring    • Distance Matching   • Speech-to-Text         │  │
│  │  • Phone-based Auth    • Full Contact Info   • NLP Extraction         │  │
│  └───────────────────────────────┬───────────────────────────────────────┘  │
│                                  │                                          │
│                                  ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        SQLite DATABASE                                │  │
│  │            • help_requests  • helpers  • status_logs                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Voice Processing Pipeline

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Browser    │───▶│   Convert    │───▶│  Google STT  │───▶│   Extract    │
│ MediaRecorder│    │  WebM→WAV    │    │ (Multilingual)│   │  NLP Data    │
│   (Audio)    │    │  (FFmpeg)    │    │              │    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                   │
                    ┌──────────────┐    ┌──────────────┐           │
                    │   AI Form    │◀───│  Translate   │◀──────────┘
                    │  (Editable)  │    │  to English  │
                    └──────────────┘    └──────────────┘
```

---

## 📁 Project Structure

```
ReliefLink/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── database.py          # SQLite configuration
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── utils.py             # Helper functions
│   │   ├── routers/
│   │   │   ├── requests.py      # Help request endpoints
│   │   │   ├── helpers.py       # Helper endpoints + auth
│   │   │   ├── stats.py         # Statistics endpoints
│   │   │   ├── voice.py         # 🆕 Voice processing API
│   │   │   └── ai.py            # AI/ML endpoints
│   │   └── services/
│   │       ├── voice_service.py # 🆕 Speech-to-text & NLP
│   │       └── ai_service.py    # AI priority scoring
│   ├── scripts/
│   │   └── seed_data.py         # Demo data seeder
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── RequestCard.jsx
│   │   │   ├── AudioRecorder.jsx    # 🆕 Voice recording
│   │   │   ├── AIAssistedForm.jsx   # 🆕 AI form display
│   │   │   └── AIBadges.jsx         # 🆕 Confidence badges
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── RequestHelp.jsx      # 🆕 Voice input integrated
│   │   │   ├── Feed.jsx
│   │   │   ├── MapView.jsx
│   │   │   └── HelperDashboard.jsx
│   │   ├── i18n/
│   │   │   ├── translations.js
│   │   │   └── LanguageContext.jsx
│   │   └── context/
│   │       └── AuthContext.jsx
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Python** | 3.8+ | Backend server |
| **Node.js** | 18+ | Frontend build |
| **FFmpeg** | Latest | Audio conversion (voice input) |
| **Git** | Latest | Version control |

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/ReliefLink.git
cd ReliefLink
```

---

### Step 2: Install FFmpeg (Required for Voice Input)

**Windows (using Chocolatey):**
```powershell
choco install ffmpeg
```

**Windows (using Winget):**
```powershell
winget install FFmpeg.FFmpeg
```

**Windows (Manual Download):**
1. Download from https://www.gyan.dev/ffmpeg/builds/
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to System PATH
4. Restart terminal

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install ffmpeg
```

**Verify Installation:**
```bash
ffmpeg -version
```

---

### Step 3: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Seed demo data (optional but recommended)
python scripts/seed_data.py

# Start the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

✅ **Backend running at:** `http://localhost:8000`
- Swagger Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

---

### Step 4: Frontend Setup

```bash
# Open NEW terminal
cd frontend

# Install Node dependencies
npm install

# Start development server
npm run dev
```

✅ **Frontend running at:** `http://localhost:3000`

---

## 🧪 Testing the App

### Test Voice Input:
1. Open `http://localhost:3000`
2. Click **"I Need Help"**
3. Click the **🎤 microphone button**
4. **Speak**: "I need food and water, my family is stranded with elderly"
5. Click **stop**
6. Review AI-extracted data (help type, urgency)
7. Edit if needed, then submit

### Supported Languages:
| Language | Code | Example |
|----------|------|---------|
| English | en-IN | "I need food and water" |
| Hindi | hi-IN | "मुझे खाना और पानी चाहिए" |
| Tamil | ta-IN | "எனக்கு உணவு தேவை" |
| Telugu | te-IN | "నాకు ఆహారం కావాలి" |
| Bengali | bn-IN | "আমার খাবার দরকার" |

---

## 🔌 API Endpoints

### Voice Processing (NEW)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/voice/upload` | Upload audio for transcription |
| POST | `/api/voice/process` | Process text with NLP |
| GET | `/api/voice/languages` | Get supported languages |

### Help Requests
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/requests/` | Create help request |
| GET | `/api/requests/` | List all requests |
| POST | `/api/requests/{id}/accept` | Accept a request |
| POST | `/api/requests/{id}/complete` | Mark complete |

### Helpers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/helpers/` | Register helper |
| GET | `/api/helpers/{id}/dashboard` | Get dashboard |

---

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, Tailwind CSS |
| **Backend** | FastAPI, Python 3.8+ |
| **Database** | SQLite |
| **Maps** | Leaflet.js, OpenStreetMap |
| **Voice** | MediaRecorder API, Google Speech Recognition |
| **Audio** | FFmpeg, Pydub |
| **Translation** | Google Translate (googletrans) |

---

## 🧠 AI Features

### Voice NLP Extraction
```
Input: "My grandmother is sick and needs medicine urgently"
       
Output:
├── Help Type: Medical (90% confidence)
├── Urgency: Critical (85% confidence)
├── Vulnerable Groups: [elderly]
└── Description: "Grandmother sick, needs medicine urgently"
```

### Priority Scoring
- **Critical**: 60 base points + rescue/medical bonus
- **Time Factor**: +2 points per hour pending
- **Vulnerable Groups**: Additional priority boost

---

## 🚀 Deployment

### Push to GitHub

```bash
# Initialize git (if not already)
cd ReliefLink
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - ReliefLink with voice input"

# Add remote (create repo on GitHub first)
git remote add origin https://github.com/YOUR_USERNAME/ReliefLink.git

# Push
git branch -M main
git push -u origin main
```

### Deploy Backend (Railway/Render)
1. Connect GitHub repo
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Deploy Frontend (Vercel)
```bash
cd frontend
npm run build
npx vercel --prod
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License - Free for humanitarian use

---

**Built with ❤️ for disaster relief coordination**
