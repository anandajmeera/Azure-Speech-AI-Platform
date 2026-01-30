const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:5000'
    : 'https://azure-speech-ai-platform.onrender.com';

const socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnectionAttempts: 3
});

// UI Elements
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const copyBtn = document.getElementById('copy-btn');
const downloadBtn = document.getElementById('download-btn');
const pdfBtn = document.getElementById('pdf-btn');
const languageSelect = document.getElementById('language-select');
const transcriptionDisplay = document.getElementById('transcription-display');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');
const historyList = document.getElementById('history-list');
const newBtn = document.getElementById('new-btn');
const summarizeBtn = document.getElementById('summarize-btn');
const clearBtn = document.getElementById('clear-btn');
const logoutBtn = document.getElementById('logout-btn');
const authOverlay = document.getElementById('auth-overlay');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authError = document.getElementById('auth-error');
const displayUsername = document.getElementById('display-username');
const translateToggle = document.getElementById('translate-toggle');
const targetLanguageSelect = document.getElementById('target-language-select');
const summarySection = document.getElementById('summary-section');
const summaryContent = document.getElementById('summary-content');

let finalTranscript = '';
let interimTranscript = '';
let finalTranslation = '';
let isRecording = false;
let sessions = [];
let authMode = 'login';

// Initialize
checkAuth();

async function checkAuth() {
    const user = localStorage.getItem('voiceflow_user');
    if (user) {
        if (displayUsername) displayUsername.innerText = user;
        if (authOverlay) authOverlay.classList.add('hidden');
        loadSessions();
    } else {
        if (authOverlay) authOverlay.classList.remove('hidden');
    }
}

// Fixed Toggle Logic
window.toggleAuth = (mode) => {
    authMode = mode;
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const slider = document.getElementById('tab-slider');
    const error = document.getElementById('auth-error');

    if (title) title.innerText = mode === 'login' ? 'Welcome Back' : 'Join VoiceFlow';
    if (subtitle) subtitle.innerText = mode === 'login' ? 'Log in to sync your transcription workspace.' : 'Create an account to start saving live sessions.';
    if (error) error.innerText = '';
    if (slider) slider.style.transform = mode === 'login' ? 'translateX(0)' : 'translateX(calc(100% + 0px))';

    const tabs = document.querySelectorAll('.auth-tabs button');
    if (tabs.length >= 2) {
        tabs[0].className = mode === 'login' ? 'active' : '';
        tabs[1].className = mode === 'register' ? 'active' : '';
    }
};

// Fail-Safe Auth Submission
if (authForm) authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const submitBtn = authForm.querySelector('button[type="submit"]');

    submitBtn.innerText = 'Connecting...';
    submitBtn.disabled = true;

    try {
        const timeout = new Promise((_, reject) => setTimeout(() => reject('timeout'), 4000));
        const fetchJob = fetch(`${BACKEND_URL}/${authMode === 'login' ? 'login' : 'register'}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const res = await Promise.race([fetchJob, timeout]);
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('voiceflow_user', username);
            location.reload();
        } else {
            authError.innerText = data.message || 'Error occurred';
        }
    } catch (err) {
        // FAIL-SAFE: If server is down, log in anyway for demo purposes
        console.log("Server unreachable, entering Demo Mode");
        localStorage.setItem('voiceflow_user', username + " (Guest)");
        location.reload();
    } finally {
        submitBtn.innerText = 'Continue';
        submitBtn.disabled = false;
    }
});

// Socket Status
socket.on('connect', () => {
    if (statusDot) statusDot.className = 'dot connected';
    if (statusText) statusText.innerText = 'Connected';
});

socket.on('disconnect', () => {
    if (statusDot) statusDot.className = 'dot error';
    if (statusText) statusText.innerText = 'Server connection lost';
});

// Speech Recognition
let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = async (event) => {
        let interimText = '';
        let newFinalText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
                newFinalText = transcript;
            } else {
                interimText += transcript;
            }
        }
        interimTranscript = interimText;
        if (translateToggle && translateToggle.checked && newFinalText) {
            const translated = await doTranslate(newFinalText, targetLanguageSelect.value);
            finalTranslation += translated + ' ';
        }
        updateDisplay();
    };
}

async function doTranslate(text, lang) {
    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${lang}`);
        const data = await res.json();
        return data.responseData.translatedText;
    } catch (e) { return "..."; }
}

async function startRecording() {
    if (isRecording) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        globalStream = stream;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        if (recognition) {
            recognition.lang = languageSelect.value;
            recognition.start();
        }
        isRecording = true;
        startBtn.disabled = true; stopBtn.disabled = false;
        statusDot.className = 'dot recording'; statusText.innerText = 'Listening...';
        if (transcriptionDisplay.querySelector('.placeholder-text')) transcriptionDisplay.innerHTML = '';
        drawVisualizer();
    } catch (err) {
        console.error(err);
        const msg = err.name === 'NotAllowedError' ? 'Microphone access denied' : 'Mic error occurred';
        statusDot.className = 'dot error';
        statusText.innerText = msg;
        alert(msg);
    }
}

function stopRecording() {
    if (!isRecording) return;
    isRecording = false;
    if (recognition) try { recognition.stop(); } catch (e) { }
    if (globalStream) globalStream.getTracks().forEach(t => t.stop());
    saveCurrentSession();
    startBtn.disabled = false; stopBtn.disabled = true;
    statusDot.className = 'dot connected'; statusText.innerText = 'Connected';
}

function updateDisplay() {
    transcriptionDisplay.innerHTML = `
        <div style="font-size: 1.3rem; color: white;">${finalTranscript}<span style="color: grey;">${interimTranscript}</span></div>
        ${finalTranslation ? `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #333; color: #fbbf24; font-size: 1.4rem;">${finalTranslation}</div>` : ''}
    `;
    transcriptionDisplay.scrollTop = transcriptionDisplay.scrollHeight;
}

function drawVisualizer() {
    if (!analyser) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const draw = () => {
        animationId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        canvasCtx.fillStyle = 'rgba(15, 23, 42, 0.2)';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const barHeight = dataArray[i] / 2;
            canvasCtx.fillStyle = `rgba(99, 102, 241, ${barHeight / 128})`;
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    };
    draw();
}

// Exports
if (copyBtn) copyBtn.addEventListener('click', () => {
    const text = finalTranscript + "\n\n" + finalTranslation;
    navigator.clipboard.writeText(text);
    copyBtn.innerText = '✅ Copied';
    setTimeout(() => copyBtn.innerText = '📋 Copy', 2000);
});

if (downloadBtn) downloadBtn.addEventListener('click', () => {
    const blob = new Blob([finalTranscript + "\n\n" + finalTranslation], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'transcript.txt'; a.click();
});

if (pdfBtn) pdfBtn.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("VoiceFlow Transcript", 20, 20);
    doc.text(doc.splitTextToSize(finalTranscript, 170), 20, 30);
    doc.save('transcript.pdf');
});

if (clearBtn) clearBtn.addEventListener('click', () => {
    finalTranscript = ''; finalTranslation = ''; interimTranscript = ''; updateDisplay();
});

if (summarizeBtn) summarizeBtn.addEventListener('click', async () => {
    if (!finalTranscript.trim()) return;
    const originalContent = summarizeBtn.innerHTML;
    summarizeBtn.innerHTML = '<span>⏳</span> Generating summary...';
    summarizeBtn.disabled = true;
    try {
        const res = await fetch(`${BACKEND_URL}/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: finalTranscript })
        });
        const data = await res.json();
        if (res.ok) {
            summaryContent.innerHTML = data.summary.replace(/\n/g, '<br>');
            summarySection.classList.remove('hidden');
        } else { alert('AI Summarization failed'); }
    } catch (e) { console.log(e); }
    summarizeBtn.innerHTML = originalContent;
    summarizeBtn.disabled = false;
});

window.closeSummary = () => summarySection.classList.add('hidden');

if (startBtn) startBtn.addEventListener('click', startRecording);
if (stopBtn) stopBtn.addEventListener('click', stopRecording);
if (logoutBtn) logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('voiceflow_user');
    location.reload();
});
if (newBtn) newBtn.addEventListener('click', () => { location.reload(); });

async function loadSessions() {
    try {
        const res = await fetch(`${BACKEND_URL}/sessions`);
        if (res.ok) { sessions = await res.json(); renderHistory(); }
    } catch (e) { }
}
async function saveCurrentSession() {
    if (!finalTranscript.trim()) return;
    try {
        await fetch(`${BACKEND_URL}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: new Date().toLocaleString(), text: finalTranscript, translation: finalTranslation, language: languageSelect.value })
        });
        loadSessions();
    } catch (e) { }
}

function renderHistory() {
    if (!historyList) return;
    if (sessions.length === 0) {
        historyList.innerHTML = '<div class="history-empty">No saved sessions</div>';
        return;
    }
    historyList.innerHTML = sessions.map(s => {
        const d = new Date(s.date);
        const dateStr = !isNaN(d.getTime())
            ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : s.date;
        return `
            <div class="history-item" onclick="loadSession(${s.id})">
                <div class="hist-title">${s.title || 'Untitled Session'}</div>
                <div class="hist-date">${dateStr}</div>
            </div>
        `;
    }).join('');
}
window.loadSession = (id) => {
    const s = sessions.find(x => x.id === id);
    if (s) {
        finalTranscript = s.text;
        finalTranslation = s.translation || '';
        updateDisplay();
    }
};
if (translateToggle) translateToggle.addEventListener('change', () => targetLanguageSelect.disabled = !translateToggle.checked);
