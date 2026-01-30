from flask import Flask, request, jsonify, session
from flask_socketio import SocketIO, emit
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import azure.cognitiveservices.speech as speechsdk
import json
import os
import eventlet
from openai import OpenAI

eventlet.monkey_patch()

load_dotenv()

app = Flask(__name__, 
            static_folder='../frontend', 
            static_url_path='')

# Production Security & CORS
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default_secret_key_123')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///voiceflow.db')
if app.config['SQLALCHEMY_DATABASE_URI'].startswith("postgres://"):
    app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLALCHEMY_DATABASE_URI'].replace("postgres://", "postgresql://", 1)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Enable CORS for production (replace with your frontend URL later for extra security)
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})

db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet', manage_session=True)

@app.route('/')
def index():
    return app.send_static_file('index.html')

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    sessions = db.relationship('TranscriptSession', backref='user', lazy=True)

class TranscriptSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.String(50))
    title = db.Column(db.String(100))
    text = db.Column(db.Text)
    translation = db.Column(db.Text)
    summary = db.Column(db.Text)
    language = db.Column(db.String(10))

# Azure & OpenAI Config
SPEECH_KEY = os.getenv('SPEECH_KEY')
SPEECH_REGION = os.getenv('SPEECH_REGION')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

with app.app_context():
    db.create_all()

class SpeechManager:
    def __init__(self, sid, language="en-US", target_language=None):
        self.sid = sid
        self.speech_config = speechsdk.SpeechConfig(subscription=SPEECH_KEY, region=SPEECH_REGION) if not target_language else \
                            speechsdk.translation.SpeechTranslationConfig(subscription=SPEECH_KEY, region=SPEECH_REGION)
        
        self.push_stream = speechsdk.audio.PushAudioInputStream()
        self.audio_config = speechsdk.audio.AudioConfig(stream=self.push_stream)
        
        if target_language:
            self.speech_config.speech_recognition_language = language
            self.speech_config.add_target_language(target_language)
            self.recognizer = speechsdk.translation.TranslationRecognizer(
                translation_config=self.speech_config, audio_config=self.audio_config)
            self.recognizer.recognizing.connect(self.recognizing_cb)
            self.recognizer.recognized.connect(self.recognized_cb)
        else:
            self.speech_config.speech_recognition_language = language
            self.recognizer = speechsdk.SpeechRecognizer(
                speech_config=self.speech_config, audio_config=self.audio_config)
            self.recognizer.recognizing.connect(self.recognizing_cb)
            self.recognizer.recognized.connect(self.recognized_cb)
        
        self.recognizer.session_started.connect(lambda evt: print(f"SessionStarted: {evt}"))
        self.recognizer.session_stopped.connect(lambda evt: print(f"SessionStopped: {evt}"))
        self.recognizer.canceled.connect(self.canceled_cb)

    def recognizing_cb(self, evt):
        text = evt.result.text
        translation = ""
        if hasattr(evt.result, 'translations'):
            translations = evt.result.translations
            if translations:
                translation = list(translations.values())[0]
        
        socketio.emit('transcription_update', {
            'text': text, 
            'translation': translation,
            'is_final': False
        }, room=self.sid)

    def recognized_cb(self, evt):
        if evt.result.reason in [speechsdk.ResultReason.RecognizedSpeech, speechsdk.ResultReason.TranslatedSpeech]:
            text = evt.result.text
            translation = ""
            if hasattr(evt.result, 'translations'):
                translations = evt.result.translations
                if translations:
                    translation = list(translations.values())[0]
            
            socketio.emit('transcription_update', {
                'text': text, 
                'translation': translation,
                'is_final': True
            }, room=self.sid)

    def canceled_cb(self, evt):
        print(f"Canceled: {evt.reason}")
        error_msg = str(evt.reason)
        if evt.reason == speechsdk.CancellationReason.Error:
            if "401" in evt.error_details or "Authentication" in evt.error_details:
                error_msg = "Azure Authentication Failed. Please check your credentials."
        
        socketio.emit('error', {'message': error_msg}, room=self.sid)

    def start(self):
        self.recognizer.start_continuous_recognition()

    def stop(self):
        self.recognizer.stop_continuous_recognition()
        self.push_stream.close()

    def write_audio(self, data):
        self.push_stream.write(data)

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'User already exists'}), 400
    
    hashed_pw = generate_password_hash(data['password'])
    new_user = User(username=data['username'], password=hashed_pw)
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if user and check_password_hash(user.password, data['password']):
        session['user_id'] = user.id
        session.permanent = True
        return jsonify({'message': 'Logged in successfully', 'username': user.username}), 200
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/sessions', methods=['GET'])
def get_sessions():
    if 'user_id' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    user_sessions = TranscriptSession.query.filter_by(user_id=session['user_id']).order_by(TranscriptSession.id.desc()).all()
    return jsonify([{
        'id': s.id, 'date': s.date, 'title': s.title or (s.text[:30] + '...' if s.text else 'New Session'),
        'text': s.text, 'translation': s.translation, 'summary': s.summary, 'language': s.language
    } for s in user_sessions])

@app.route('/sessions', methods=['POST'])
def save_session():
    if 'user_id' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    data = request.json
    text = data.get('text', '')
    new_session = TranscriptSession(
        user_id=session['user_id'],
        date=data['date'],
        title=data.get('title', text[:30] + '...' if len(text) > 30 else (text or 'New Session')),
        text=text,
        translation=data.get('translation', ''),
        language=data['language']
    )
    db.session.add(new_session)
    db.session.commit()
    return jsonify({'message': 'Session saved', 'id': new_session.id})

@app.route('/summarize', methods=['POST'])
def summarize():
    if 'user_id' not in session:
        return jsonify({'message': 'Unauthorized'}), 401
    data = request.json
    text = data.get('text')
    if not text or len(text) < 10:
        return jsonify({'message': 'Text too short'}), 400

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Summarize this transcript into concise bullet points."},
                {"role": "user", "content": text}
            ]
        )
        summary = response.choices[0].message.content
        return jsonify({'summary': summary})
    except Exception as e:
        return jsonify({'message': 'AI Summarization failed'}), 500

recognizers = {}

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    if request.sid in recognizers:
        recognizers[request.sid].stop()
        del recognizers[request.sid]

@socketio.on('start_transcription')
def handle_start(data=None):
    language = data.get('language', 'en-US') if data else 'en-US'
    target_language = data.get('target_language') if data else None
    if not SPEECH_KEY:
        emit('error', {'message': 'Azure Speech Key missing'})
        return
    try:
        manager = SpeechManager(request.sid, language=language, target_language=target_language)
        recognizers[request.sid] = manager
        manager.start()
    except Exception as e:
        emit('error', {'message': str(e)})

@socketio.on('audio_data')
def handle_audio(data):
    if request.sid in recognizers:
        recognizers[request.sid].write_audio(data)

@socketio.on('stop_transcription')
def handle_stop():
    if request.sid in recognizers:
        recognizers[request.sid].stop()
        del recognizers[request.sid]

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host='0.0.0.0', port=port)
