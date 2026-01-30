const BACKEND_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:5000'
    : 'https://azure-speech-ai-platform.onrender.com';

const socket = io(BACKEND_URL, {
    transports: ['websocket', 'polling']
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

// Audio Logic
let globalStream = null;
let audioContext = null;
let analyser = null;
let animationId = null;

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

// Socket Status
socket.on('connect', () => {
    if (statusDot) statusDot.className = 'dot connected';
    if (statusText) statusText.innerText = 'Connected';
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
    } catch (err) { alert('Mic access denied. Please ensure you are on HTTPS.'); }
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

// Action Bar Functionalities
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
    summarizeBtn.innerText = '⌛...';
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
    summarizeBtn.innerHTML = '<span>✨</span> Summarize';
});

window.closeSummary = () => summarySection.classList.add('hidden');

// Auth & Sidebar
if (authForm) authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    localStorage.setItem('voiceflow_user', document.getElementById('username').value);
    location.reload();
});

if (startBtn) startBtn.addEventListener('click', startRecording);
if (stopBtn) stopBtn.addEventListener('click', stopRecording);
if (logoutBtn) logoutBtn.addEventListener('click', () => { localStorage.removeItem('voiceflow_user'); location.reload(); });
if (newBtn) newBtn.addEventListener('click', () => { location.reload(); });

async function loadSessions() {
    const res = await fetch(`${BACKEND_URL}/sessions`);
    if (res.ok) { sessions = await res.json(); renderHistory(); }
}
async function saveCurrentSession() {
    if (!finalTranscript.trim()) return;
    await fetch(`${BACKEND_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toLocaleString(), text: finalTranscript, translation: finalTranslation, language: languageSelect.value })
    });
    loadSessions();
}
function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = sessions.map(s => `<div class="history-item" onclick="loadSession(${s.id})" style="cursor:pointer; padding:10px; border-bottom:1px solid #222;"><div>${s.title || 'Session ' + s.id}</div><small style="color:grey">${s.date}</small></div>`).join('');
}
window.loadSession = (id) => { const s = sessions.find(x => x.id === id); if (s) { finalTranscript = s.text; finalTranslation = s.translation; updateDisplay(); } };
if (translateToggle) translateToggle.addEventListener('change', () => targetLanguageSelect.disabled = !translateToggle.checked);
