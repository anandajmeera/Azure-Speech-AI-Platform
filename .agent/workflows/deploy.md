---
description: Deploy VoiceFlow to Production
---
### Backend Deployment (Render/Azure/Railway)
1. Push your code to a GitHub repository.
2. Link the repository to your hosting provider.
3. Set the **Start Command**: `gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT backend.app:app`
4. Add **Environment Variables**:
   - `SPEECH_KEY`: Your Azure Speech Key.
   - `SPEECH_REGION`: Your Azure Region.
   - `PYTHON_VERSION`: 3.8 or higher.

### Frontend Deployment (Netlify/Vercel)
1. Open `frontend/script.js`.
2. Change the socket connection URL:
   - Change `const socket = io('http://localhost:5000');` to `const socket = io('https://your-backend-url.com');`.
3. Deploy the `frontend/` folder as a static site.
4. **Important**: Ensure your site is served over **HTTPS** to allow microphone access.
