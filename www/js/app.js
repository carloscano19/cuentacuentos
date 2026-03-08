// js/app.js
import { storage } from './storage.js';
import { buildUserPrompt } from './prompt.js';
import { generateStory, generateAudio, generateOpenAIAudio, APIError } from './api.js?v=11';
import { StoryPlayer } from './player.js';

// --- Firebase & Auth ---
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyBVDD3COAaBdQnIUW6wuiM9swKCyIFDgUw",
    authDomain: "cuentacuentos-299da.firebaseapp.com",
    projectId: "cuentacuentos-299da",
    storageBucket: "cuentacuentos-299da.firebasestorage.app",
    messagingSenderId: "976654237332",
    appId: "1:976654237332:web:f1bf09a990b329c060be81"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Configuración SaaS ---
// isSaaS: true oculta los campos de API Keys para el usuario final.
const CONFIG = {
    isSaaS: !!window.Capacitor || window.location.hostname === 'carloscanofernandez.com',
    proxyUrl: 'https://tu-backend-api.com', // Futuro endpoint para Cloud Functions
    plans: {
        free: { name: 'El Aprendiz', desc: 'Narrativa estándar (Gratis)' },
        premium: { name: 'Mago Maestro', desc: 'Narrativa Avanzada (Premium)' }
    }
};

// --- Estado Global ---
const state = {
    age: null,
    characters: [], // Array de { name, gender }
    currentGender: 'girl',
    themes: [],
    length: 10,
    value: '',
    fearLevel: 'medium',
    audioUrl: null,
    audioEnabled: true,
    audioSource: 'none',
    ttsProvider: 'elevenlabs',
    browserVoice: null,
    openaiVoice: 'shimmer',
    player: null,
    generatedStoryText: '',
    currentView: 'login',
    textProvider: 'openai',
    user: null,
    userCredits: 0,
    tempKeys: {}
};

// --- Selectores Globales ---
let views, btnSettings, inputChar, btnAddChar, charChipsContainer, charCount, btnCreate, inputValue, valueCount;

// --- Inicialización Principal ---
document.addEventListener('DOMContentLoaded', () => {
    views = document.querySelectorAll('.view');
    btnSettings = document.getElementById('btn-settings');
    inputChar = document.getElementById('input-character');
    btnAddChar = document.getElementById('btn-add-char');
    charChipsContainer = document.getElementById('char-chips');
    charCount = document.getElementById('char-count');
    btnCreate = document.getElementById('btn-create');
    inputValue = document.getElementById('input-value');
    valueCount = document.getElementById('value-count');

    initStarfield();
    loadSavedPreferences();
    initAuthObserver();
    attachEventListeners();
});

// --- Lógica de Autenticación & Créditos ---

function initAuthObserver() {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            state.user = user;
            console.log("🟢 Sesión activa:", user.email);

            try {
                const userData = await loadUserCredits(user.uid, user.email);
                console.log("📊 Datos cargados de Firestore:", userData);
                updateCreditsUI();

                if (userData && userData.onboardingComplete) {
                    showView('workshop');
                } else {
                    console.log("👋 Usuario nuevo o onboarding pendiente");
                    window.currentWizStep = 1;
                    showView('onboarding');
                    updateWizUI();
                }
            } catch (err) {
                console.error("❌ Fallo cargando datos de usuario:", err);
                updateCreditsUI();
                showView('onboarding');
            }

        } else {
            state.user = null;
            state.userCredits = 0;
            updateCreditsUI();
            showView('login');
            console.log("⚪ Sin sesión. Mostrando login.");
        }
    });
}

async function loadUserCredits(uid, email) {
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        const data = userDoc.data();
        state.userCredits = data.credits ?? 0;
        return data;
    } else {
        console.log("✨ Registrando nuevo usuario con 1 ticket de regalo");
        const newData = {
            credits: 1,
            email: email,
            onboardingComplete: false,
            createdAt: new Date().toISOString()
        };
        await setDoc(userRef, newData);
        state.userCredits = 1;
        return newData;
    }
}

window.handleLogin = async () => {
    try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
        // onAuthStateChanged se dispara automáticamente tras el popup
    } catch (error) {
        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
            console.error("Login Error:", error.code, error.message);
        }
    }
};

window.handleLogout = async () => {
    if (!confirm("¿Seguro que quieres cerrar sesión?")) return;
    await auth.signOut();
    location.reload();
};

// --- Gestión de Vistas ---
function showView(viewId) {
    if (!views) return;
    views.forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(`view-${viewId}`);
    if (target) {
        target.classList.remove('hidden');
        state.currentView = viewId;
        console.log("👀 Vista:", viewId);
    }
}

function updateCreditsUI() {
    const el = document.getElementById('user-credits-display');
    const badge = document.getElementById('user-credits-badge');
    const settingsBtn = document.getElementById('btn-settings');
    const logoutBtn = document.getElementById('btn-logout-header');

    if (el) el.textContent = `${state.userCredits} ✨`;

    const isLogged = !!state.user;
    if (badge) badge.classList.toggle('hidden', !isLogged);
    if (settingsBtn) settingsBtn.classList.toggle('hidden', !isLogged);
    if (logoutBtn) logoutBtn.classList.toggle('hidden', !isLogged);
}

// --- Wizard de Onboarding ---
window.currentWizStep = 1;

function updateWizUI() {
    const allSteps = document.querySelectorAll('.wizard-content');
    // Guard: si el wizard aún no está en el DOM, salir silenciosamente
    if (!allSteps || allSteps.length === 0) return;

    allSteps.forEach(d => d.classList.add('hidden'));

    const currentStep = document.getElementById(`step-${window.currentWizStep}`);
    if (currentStep) currentStep.classList.remove('hidden');

    const progressBar = document.getElementById('wizard-progress-bar');
    if (progressBar) {
        const progress = ((window.currentWizStep - 1) / 2) * 100;
        progressBar.style.width = `${progress}%`;
    }

    const btnPrev = document.getElementById('btn-wiz-prev');
    const btnNext = document.getElementById('btn-wiz-next');
    const btnStart = document.getElementById('btn-start');

    if (btnPrev) {
        btnPrev.classList.toggle('opacity-0', window.currentWizStep === 1);
        btnPrev.classList.toggle('pointer-events-none', window.currentWizStep === 1);
    }

    if (btnNext && btnStart) {
        if (window.currentWizStep === 3) {
            btnNext.classList.add('hidden');
            btnStart.classList.remove('hidden');
            btnStart.classList.add('flex');
        } else {
            btnNext.classList.remove('hidden');
            btnStart.classList.add('hidden');
            btnStart.classList.remove('flex');
        }
    }

    // Indicadores visuales 1, 2, 3
    for (let i = 1; i <= 3; i++) {
        const ind = document.getElementById(`wiz-indicator-${i}`);
        if (!ind) continue;
        const circle = ind.querySelector('.wiz-circle');
        if (!circle) continue;
        if (i < window.currentWizStep) {
            circle.innerHTML = '✓';
            circle.className = 'wiz-circle w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold mb-2 transition-all';
        } else if (i === window.currentWizStep) {
            circle.innerHTML = i;
            circle.className = 'wiz-circle w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center font-bold mb-2 transition-all shadow-[0_0_15px_rgba(139,92,246,0.5)]';
        } else {
            circle.innerHTML = i;
            circle.className = 'wiz-circle w-8 h-8 rounded-full bg-white/10 text-white/50 flex items-center justify-center font-bold mb-2 transition-all';
        }
    }
}

window.nextWizStep = () => {
    if (window.currentWizStep < 3) {
        window.currentWizStep++;
        updateWizUI();
    }
};

window.prevWizStep = () => {
    if (window.currentWizStep > 1) {
        window.currentWizStep--;
        updateWizUI();
    }
};

window.finishOnboarding = async () => {
    console.log("🏁 Finalizando onboarding...");
    // Guardar preferencias finales
    storage.set('ONBOARDING', 'true');
    storage.set('TEXT_PROVIDER', state.textProvider);
    storage.set('TTS_PROVIDER', state.ttsProvider);
    storage.set('OPENAI_VOICE', state.openaiVoice);

    if (state.user) {
        try {
            await setDoc(doc(db, "users", state.user.uid), { onboardingComplete: true }, { merge: true });
        } catch (e) {
            console.error("Error guardando progreso:", e);
        }
    }
    showView('workshop');
};

// --- Taller de Cuentos (Workshop) ---
function attachEventListeners() {
    // Botón de Login con Google (conectar aquí de forma robusta)
    const btnLogin = document.getElementById('btn-google-login');
    if (btnLogin) btnLogin.onclick = window.handleLogin;

    // Config Wheel
    if (btnSettings) btnSettings.onclick = () => {
        if (state.currentView === 'onboarding') {
            if (state.userCredits > 0 || storage.get('ONBOARDING')) showView('workshop');
        } else {
            window.currentWizStep = 1;
            updateWizUI();
            showView('onboarding');
        }
    };

    // Age Cards
    document.querySelectorAll('.age-card').forEach(card => {
        card.onclick = () => {
            document.querySelectorAll('.age-card').forEach(c => c.classList.remove('selected', 'bg-white/10'));
            card.classList.add('selected', 'bg-white/10');
            state.age = card.dataset.age;

            // Themes filter
            const isAdult = state.age === 'adult';
            document.querySelectorAll('.theme-card[data-theme="mystery"], .theme-card[data-theme="horror"]')
                .forEach(c => c.classList.toggle('hidden', !isAdult));

            updateFearSection();
            validateWorkshop();
        };
    });

    // Characters
    btnAddChar.onclick = () => {
        const name = inputChar.value.trim();
        if (name && state.characters.length < 3) {
            state.characters.push({ name, gender: state.currentGender });
            inputChar.value = '';
            updateCharChips();
        }
    };

    // Themes
    document.querySelectorAll('.theme-card').forEach(card => {
        card.onclick = () => {
            const t = card.dataset.theme;
            if (state.themes.includes(t)) {
                state.themes = state.themes.filter(x => x !== t);
                card.classList.remove('selected', 'bg-white/10');
            } else if (state.themes.length < 2) {
                state.themes.push(t);
                card.classList.add('selected', 'bg-white/10');
            }
            updateFearSection();
            validateWorkshop();
        };
    });

    // Create Button
    btnCreate.onclick = handleGenerate;

    // Finish Onboarding Button
    document.getElementById('btn-start').onclick = window.finishOnboarding;
}

function updateCharChips() {
    charChipsContainer.innerHTML = '';
    state.characters.forEach((c, idx) => {
        const chip = document.createElement('div');
        chip.className = 'bg-white/10 px-3 py-1 rounded-lg text-sm flex items-center gap-2 border border-white/10';
        chip.innerHTML = `<span>${c.gender === 'boy' ? '👦' : '👧'}</span><span>${c.name}</span><button class="ml-1" onclick="removeChar(${idx})">×</button>`;
        charChipsContainer.appendChild(chip);
    });
    charCount.textContent = `${state.characters.length}/3 personajes`;
    validateWorkshop();
}

window.removeChar = (i) => {
    state.characters.splice(i, 1);
    updateCharChips();
};

function validateWorkshop() {
    btnCreate.disabled = !(state.age && state.themes.length > 0);
}

// --- Generación & Créditos ---
async function handleGenerate() {
    showView('generating');

    const isPremium = state.textProvider === 'openai' || (state.audioEnabled && state.ttsProvider !== 'browser');

    if (CONFIG.isSaaS && isPremium && state.userCredits <= 0) {
        handleError({ code: 'ERR_QUOTA', message: 'No tienes tickets mágicos' });
        return;
    }

    try {
        const prompt = buildUserPrompt(state);
        const proxyUrl = CONFIG.isSaaS ? CONFIG.proxyUrl : null;
        const oKey = storage.get('OPENAI_KEY');
        const gKey = storage.get('GEMINI_KEY');
        const key = state.textProvider === 'gemini' ? gKey : oKey;

        const storyText = await generateStory(prompt, key, state.textProvider, '', proxyUrl);
        state.generatedStoryText = storyText;

        if (state.audioEnabled) {
            if (state.ttsProvider === 'elevenlabs') {
                state.audioUrl = await generateAudio(storyText, storage.get('EL_KEY'), storage.get('EL_VOICE'), proxyUrl);
            } else if (state.ttsProvider === 'openai') {
                state.audioUrl = await generateOpenAIAudio(storyText, oKey, state.openaiVoice, proxyUrl);
            }
        }

        if (CONFIG.isSaaS && isPremium) {
            await consumeCredit();
        }

        renderStory(storyText);
        showView('story');
    } catch (err) {
        handleError(err);
    }
}

async function consumeCredit() {
    state.userCredits--;
    const userRef = doc(db, "users", state.user.uid);
    await setDoc(userRef, { credits: state.userCredits }, { merge: true });
    updateCreditsUI();
}

// --- Renderizado Story ---
function renderStory(text) {
    const titleMatch = text.match(/\*\*(.*?)\*\*/);
    document.getElementById('story-title').textContent = titleMatch ? titleMatch[1] : "Cuento Mágico";

    const body = document.getElementById('story-body');
    body.innerHTML = `<p class="whitespace-pre-wrap">${text.replace(/\*\*(.*?)\*\*/, '').trim()}</p>`;

    showView('story');
}

// --- Utils de UI Auxiliares ---
function loadSavedPreferences() {
    state.textProvider = storage.get('TEXT_PROVIDER') || 'openai';
    state.ttsProvider = storage.get('TTS_PROVIDER') || 'elevenlabs';
    state.openaiVoice = storage.get('OPENAI_VOICE') || 'shimmer';
    state.browserVoice = storage.get('BROWSER_VOICE');

    updateTextProviderUI();
    updateTTSUI();
}

function updateTTSUI() {
    const p = state.ttsProvider;
    document.querySelectorAll('[name="wiz_audio"]').forEach(r => r.checked = (r.value === p));

    document.getElementById('browser-voice-selection').classList.toggle('hidden', p !== 'browser');
    document.getElementById('openai-voice-config').classList.toggle('hidden', p !== 'openai');
    document.getElementById('elevenlabs-voice-config').classList.toggle('hidden', p !== 'elevenlabs');
}

function updateTextProviderUI() {
    const p = state.textProvider;
    document.querySelectorAll('[name="wiz_text"]').forEach(r => r.checked = (r.value === p));

    document.getElementById('openai-key-box').classList.toggle('hidden', CONFIG.isSaaS || p !== 'openai');
    document.getElementById('gemini-key-box').classList.toggle('hidden', CONFIG.isSaaS || p !== 'gemini');
}

function updateFearSection() {
    const isAdult = state.age === 'adult';
    const hasScary = state.themes.includes('horror') || state.themes.includes('mystery');
    const sec = document.getElementById('section-fear-level');
    if (sec) sec.classList.toggle('hidden', !(isAdult && hasScary));
}

function initStarfield() {
    const starfield = document.getElementById('starfield');
    if (!starfield) return;
    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'star animate-twinkle';
        star.style.width = star.style.height = `${Math.random() * 3 + 1}px`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.left = `${Math.random() * 100}%`;
        starfield.appendChild(star);
    }
}

function handleError(error) {
    console.error("Error App:", error);
    document.getElementById('error-title').textContent = "¡Ups! Algo salió mal";
    document.getElementById('error-desc').textContent = error.message || "La magia se ha dispersado temporalmente.";
    document.getElementById('error-cta-btn').onclick = () => showView('workshop');
    showView('error');
}

function downloadPDF() {
    const element = document.getElementById('view-story');
    html2pdf().from(element).save();
}

window.setTextProvider = (p) => { state.textProvider = p; updateTextProviderUI(); };
window.setTTSProvider = (p) => { state.ttsProvider = p; updateTTSUI(); };
window.setGender = (g) => { state.currentGender = g; };
