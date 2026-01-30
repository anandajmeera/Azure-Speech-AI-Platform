---
description: Setup and Run VoiceFlow locally
---
// turbo-all
1. Create a virtual environment: `python -m venv backend/venv`
2. Activate environment:
   - Windows: `backend\venv\Scripts\activate`
   - macOS/Linux: `source backend/venv/bin/activate`
3. Install dependencies: `pip install -r backend/requirements.txt`
4. Configure Azure: Rename `backend/.env.example` to `backend/.env` and add your keys.
5. Start the backend: `python backend/app.py`
6. Open `frontend/index.html` in your browser.
