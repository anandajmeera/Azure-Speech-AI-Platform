# 🎙️ VoiceFlow: AI-Powered Speech-to-Text & Translation Platform

VoiceFlow is a production-ready, full-stack web application that leverages state-of-the-art AI to provide real-time speech transcription, instant translation, and intelligent summarization. Designed with a premium glassmorphic UI, it provides a seamless experience for meetings, lectures, and personal notes.

---

## 🚀 Key Features

- **✨ Real-time Transcription**: High-accuracy, low-latency speech-to-text using **Azure Cognitive Services**.
- **🌍 Live Translation**: Speak in one language and see the translation appear instantly (Supports Hindi, Spanish, French, German, etc.).
- **🤖 AI Summarization**: One-click intelligent bullet-point summaries powered by **OpenAI GPT**.
- **🔐 Secure Authentication**: Private user accounts with encrypted password storage via **Flask-SQLAlchemy**.
- **📂 Session History**: Persistent database storage for all transcriptions with the ability to rename, search, and recall past sessions.
- **📄 Professional Exports**: Download your work as **PDF** or **Plain Text (.txt)**.
- **📊 Live Visualizer**: Real-time waveform visualization using the **Web Audio API**.

---

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3 (Glassmorphism), Web Audio API.
- **Backend**: Python, Flask, Flask-SocketIO (WebSockets), SQLAlchemy.
- **AI/ML**: 
  - **Azure AI Speech SDK**: For continuous recognition and translation.
  - **OpenAI API**: For intelligent text summarization.
- **Database**: SQLite (Local development) / PostgreSQL ready.

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- Python 3.8+
- An [Azure Account](https://azure.microsoft.com/) with Speech Service keys.
- An [OpenAI API Key](https://platform.openai.com/).

### 2. Clone and Install
```bash
# Clone the repository
git clone https://github.com/yourusername/voiceflow.git
cd voiceflow

# Install dependencies
pip install -r backend/requirements.txt
```

### 3. Environment Configuration
Create a `.env` file in the `backend/` directory:
```env
SPEECH_KEY=your_azure_speech_key
SPEECH_REGION=your_azure_region
OPENAI_API_KEY=your_openai_api_key
SECRET_KEY=your_flask_secret_key
```

### 4. Run the Application
```bash
# Run the Flask server
python backend/app.py
```
Open **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your browser.

---

## 📖 How to Use

1.  **Register/Login**: Create an account to save your history.
2.  **Select Language**: Choose your primary speaking language from the dropdown.
3.  **Translate (Optional)**: Toggle "Translate" and select a target language to see live translations.
4.  **Start Recording**: Click the "Start" button and speak clearly into your microphone.
5.  **Summarize**: After stopping, click "Summarize" to get an AI-generated summary of your session.
6.  **Export**: Save your transcript as a professional PDF for your records.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/voiceflow/issues).

## 📄 License
This project is [MIT](https://opensource.org/licenses/MIT) licensed.

---
*Built with ❤️ for AI Engineers and Developers.*
