# 🎙️ VoiceFlow: Production-Grade AI Speech-to-Text Platform

VoiceFlow is a high-performance, full-stack application engineered for real-time speech transcription, live translation, and intelligent analytics. Built on **Azure Cognitive Services** and **OpenAI**, this platform delivers sub-second latency for live dictation and high-fidelity text processing, tailored for professional meetings, lectures, and enterprise documentation.

---

## 🌟 Core Technical Features

- **⚡ Real-time Stream Transcription**: Low-latency, WebSocket-driven speech recognition using the **Azure Speech SDK**.
- **🌍 Instant Multi-lingual Translation**: Real-time translation layer (Hindi, Spanish, French, German, etc.) processed simultaneously with transcription.
- **🤖 GPT-Driven Summarization**: Deep-learning based summarization using **OpenAI's GPT-3.5-Turbo** to extract key action items and bulleted highlights.
- **🔐 Professional Security & Data Persistence**: Secure user session management and historical data persistence via **SQLAlchemy** and **Flask-SocketIO**.
- **📊 Dynamic UI/UX**: Premium glassmorphic interface with real-time audio visualization using the **Web Audio API**.
- **📄 Document Generation**: Integrated exports for recruiter-ready **PDF** and **Plain Text** reports.

---

## 🔗 Live Links

- **Frontend (Live Demo)**: [https://azure-speech-ai-platform.vercel.app/](https://azure-speech-ai-platform.vercel.app/)
- **Backend (API Service)**: [https://azure-speech-ai-platform.onrender.com](https://azure-speech-ai-platform.onrender.com)

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: Vanilla ES6+ JavaScript, HTML5, CSS3 Glassmorphism, Web Audio API.
- **Backend**: Python 3.9+, Flask, Eventlet, Flask-SocketIO (Real-time WebSockets).
- **Core AI Integration**:
  - **Azure AI Speech Service**: Continuous recognition & translation.
  - **OpenAI API**: Contextual summarization.
- **Deployment Ready**: Configured for **Render/Vercel** with HTTPS and secure CORS support.

---

## 🚀 Quick Deployment Guide

### 1. Local Setup
```bash
# Clone the repository
git clone https://github.com/anandajmeera/Azure-Speech-AI-Platform.git
cd Azure-Speech-AI-Platform

# Install dependencies
pip install -r backend/requirements.txt
```

### 2. Environment Configuration
Create a `.env` file in the `backend/` directory:
```env
SPEECH_KEY=your_key
SPEECH_REGION=your_region
OPENAI_API_KEY=your_openai_key
SECRET_KEY=your_secure_string
```

### 3. Execution
```bash
python backend/app.py
```

---

## 📖 Production Capabilities

*   **Session Archiving**: Intelligent sidebar management for searching and retrieving past transcriptions.
*   **Real-time Error Handling**: Advanced fallback mechanisms for cloud authentication and microphone access.
*   **Hybrid Recognition**: Browser-native fallback for visual feedback during cloud processing latency.

---

## 📂 Project Structure
```
├── backend/
│   ├── app.py           # Flask Server & SocketIO Core
│   ├── Procfile         # Deployment config
│   └── requirements.txt  # Production dependencies
├── frontend/
│   ├── index.html       # Dynamic Dashboard
│   ├── script.js        # Real-time WebSocket Logic
│   └── style.css        # Premium Design System
└── README.md            # Technical Documentation
```

---
**Prepared for AI/ML Engineering Technical Review.** 🎙️✨🥇
