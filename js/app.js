// js/app.js
import { storage } from './storage.js';
import { buildUserPrompt } from './prompt.js';
import { generateStory, generateAudio, generateOpenAIAudio, APIError } from './api.js?v=10';
import { StoryPlayer } from './player.js';

// --- Estado Global ---
const state = {
    age: null,
    characters: [], // Array de objetos { name, gender }
    currentGender: 'girl',
    themes: [],
    length: 10,
    value: '',
    fearLevel: 'medium', // 'low', 'medium', 'high'
    audioUrl: null,
    audioEnabled: true,
    audioSource: 'none', // 'none', 'elevenlabs', 'openai', 'browser'
    ttsProvider: 'elevenlabs',
    browserVoice: null,
    openaiVoice: 'shimmer',
    player: null,
    generatedStoryText: '',
    currentView: 'onboarding',
    textProvider: 'openai'
};

// --- Selectores ---
const views = document.querySelectorAll('.view');
const btnSettings = document.getElementById('btn-settings');
const inputChar = document.getElementById('input-character');
const btnAddChar = document.getElementById('btn-add-char');
const charChipsContainer = document.getElementById('char-chips');
const charCount = document.getElementById('char-count');
const btnCreate = document.getElementById('btn-create');
const inputValue = document.getElementById('input-value');
const valueCount = document.getElementById('value-count');

// --- Utilidades de UI ---
function showView(viewId) {
    views.forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(`view-${viewId}`);
    if (target) {
        target.classList.remove('hidden');
        state.currentView = viewId;
    }
}

function updateCharChips() {
    charChipsContainer.innerHTML = '';
    state.characters.forEach((charObj, index) => {
        const chip = document.createElement('div');
        chip.className = 'bg-white/10 px-3 py-1 rounded-lg text-sm flex items-center gap-2 border border-white/10';
        const icon = charObj.gender === 'boy' ? '👦' : '👧';
        chip.innerHTML = `
      <span class="opacity-70">${icon}</span>
      <span>${charObj.name}</span>
      <button class="hover:text-red-400 font-bold ml-1" onclick="removeCharacter(${index})">×</button>
    `;
        charChipsContainer.appendChild(chip);
    });
    charCount.textContent = `${state.characters.length}/3 personajes`;
    validateWorkshop();
}

window.removeCharacter = (index) => {
    state.characters.splice(index, 1);
    updateCharChips();
};

function validateWorkshop() {
    const isValid = state.age && state.themes.length > 0;
    btnCreate.disabled = !isValid;
}

// --- PDF Generation ---
function downloadPDF() {
    const element = document.getElementById('view-story');
    const title = document.getElementById('story-title').textContent;

    // Configuración para un PDF bonito
    const opt = {
        margin: [15, 15],
        filename: `Cuento_${title.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: '#0f172a' // Corresponde al fondo dark de la app
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Estilos temporales para el PDF para asegurar legibilidad
    const storyBody = document.getElementById('story-body');
    const originalStyle = storyBody.style.color;
    storyBody.style.color = '#ffffff';

    // Generar PDF
    html2pdf().set(opt).from(element).save().then(() => {
        storyBody.style.color = originalStyle;
    });
}

const sectionFearLevel = document.getElementById('section-fear-level');

// --- Animación de Fondo: Estrellas ---
function initStarfield() {
    const starfield = document.getElementById('starfield');
    for (let i = 0; i < 50; i++) {
        const star = document.createElement('div');
        star.className = 'star animate-twinkle';
        const size = Math.random() * 3 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.animationDelay = `${Math.random() * 3}s`;
        starfield.appendChild(star);
    }
}

// --- Flow Principal ---
async function handleGenerate() {
    showView('generating');

    const phaseText = document.getElementById('generating-phase-text');
    const phases = [
        { icon: "✍️", text: "Despertando a los magos escritores...", duration: 2500 },
        { icon: "📖", text: "Tejiendo palabras con hilo de luna...", duration: 3000 },
        { icon: "🎨", text: "Pintando las últimas estrellas...", duration: 2500 }
    ];

    if (storage.isAudioMode()) {
        phases.push({ icon: "🎙️", text: "Grabando la voz mágica...", duration: 3000 });
    }

    let phaseIndex = 0;
    const phaseInterval = setInterval(() => {
        phaseIndex++;
        if (phaseIndex < phases.length) {
            phaseText.textContent = phases[phaseIndex].text;
        }
    }, 2700);

    try {
        // Capturar automáticamente cualquier texto que el usuario haya dejado en los inputs sin pulsar "+"
        const hangingChar = inputChar.value.trim();
        const alreadyExists = state.characters.some(c => c.name.toLowerCase() === hangingChar.toLowerCase());
        if (hangingChar && state.characters.length < 3 && !alreadyExists) {
            state.characters.push({ name: hangingChar, gender: state.currentGender });
            updateCharChips();
        }

        const userPrompt = buildUserPrompt({
            age: state.age,
            characters: state.characters,
            themes: state.themes,
            duration: state.length,
            value: state.value,
            fearLevel: state.fearLevel
        });

        const rawOKey = document.getElementById('input-openai-key').value;
        const rawGKey = document.getElementById('input-gemini-key').value;

        // Sanitizar claves (quitar espacios y posibles prefijos "Key: " o similar)
        const sanitizeKey = (k) => k.replace(/^(key|api\s*key|clave):\s*/i, '').trim();

        const oKey = sanitizeKey(rawOKey);
        const gKey = sanitizeKey(rawGKey);

        const storyApiKey = state.textProvider === 'gemini' ? gKey : oKey;

        console.log(`Intentando generar con ${state.textProvider}. Clave (inicio): ${storyApiKey ? storyApiKey.substring(0, 8) + '...' : 'FALTA'}`);

        if (!storyApiKey) throw new APIError('ERR_OPENAI_KEY', `Falta la clave de ${state.textProvider}`);

        const storyText = await generateStory(userPrompt, storyApiKey, state.textProvider);
        state.generatedStoryText = storyText;

        const elKey = storage.get('EL_KEY') || state.tempKeys?.eKey;
        const oaKey = storage.get('OPENAI_KEY') || state.tempKeys?.oKey;
        const elVoice = storage.get('EL_VOICE') || state.tempKeys?.vId;

        if (state.audioEnabled) {
            if (state.ttsProvider === 'elevenlabs' && elKey) {
                state.audioUrl = await generateAudio(storyText, elKey, storage.get('EL_VOICE'));
                state.audioSource = 'elevenlabs';
            } else if (state.ttsProvider === 'openai' && oaKey) {
                state.audioUrl = await generateOpenAIAudio(storyText, oaKey, state.openaiVoice);
                state.audioSource = 'openai';
            } else {
                state.audioSource = 'browser';
            }
        } else {
            state.audioSource = 'none';
        }

        clearInterval(phaseInterval);
        renderStory(storyText);
        showView('story');
    } catch (error) {
        clearInterval(phaseInterval);
        handleError(error);
    }
}

function renderStory(text) {
    const titleMatch = text.match(/\*\*(.*?)\*\*/);
    const title = titleMatch ? titleMatch[1] : "Historia Mágica";
    document.getElementById('story-title').textContent = title;

    const charPart = state.characters.length > 0 ? `Para ${state.characters[0].name} · ` : '';
    document.getElementById('story-meta').textContent = `${charPart}${state.themes.join(', ')}`;

    const content = text.replace(/\*\*(.*?)\*\*/, '').trim();
    const sections = content.split(/\[(INTRODUCCIÓN|NUDO|DESENLACE)\]/g);

    const body = document.getElementById('story-body');
    body.innerHTML = '';

    for (let i = 1; i < sections.length; i += 2) {
        const sectionName = sections[i];
        const sectionText = sections[i + 1]?.trim() || '';

        const div = document.createElement('div');
        div.className = 'story-section';
        div.innerHTML = `
      <p>${sectionText.replace(/\n/g, '<br>')}</p>
      ${i < sections.length - 2 ? '<div class="text-center py-6 text-yellow-500/30">✦ ✦ ✦</div>' : ''}
    `;
        body.appendChild(div);
    }

    // Audio Player
    const audioContainer = document.getElementById('audio-container');
    if (state.audioSource !== 'none') {
        audioContainer.classList.remove('hidden');
        if (state.audioSource === 'elevenlabs' || state.audioSource === 'openai') {
            initPlayer(state.audioUrl);
        } else {
            initBrowserPlayer(text);
        }
    } else {
        audioContainer.classList.add('hidden');
    }
}

function initBrowserPlayer(text) {
    if (state.player) state.player.stop();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const playIcon = document.getElementById('player-icon-play');
    const pauseIcon = document.getElementById('player-icon-pause');
    const progressBar = document.getElementById('player-progress-bar');
    const timeCurrent = document.getElementById('player-time-current');
    const timeTotal = document.getElementById('player-time-total');

    // Hide some progress UI for browser TTS since it's hard to track precisely
    progressBar.style.width = '0%';
    timeCurrent.textContent = "Navegador";
    timeTotal.textContent = "Gratis";

    // Limpiar todo el Markdown para que el TTS no lea "asterisco asterisco" etc.
    const cleanText = text
        .replace(/\[.*?\]/g, '')           // Quitar [INTRODUCCIÓN], [NUDO], etc.
        .replace(/\*\*(.+?)\*\*/g, '$1')   // **negrita** → solo texto
        .replace(/\*(.+?)\*/g, '$1')       // *cursiva* → solo texto
        .replace(/#{1,6}\s*/g, '')         // # Títulos → sin símbolo
        .replace(/`{1,3}.*?`{1,3}/g, '')   // `código` → eliminar
        .replace(/\n{2,}/g, '. ')          // Párrafos → pausa natural
        .replace(/\n/g, ' ')               // Saltos de línea → espacio
        .replace(/\s{2,}/g, ' ')           // Espacios múltiples → uno
        .trim();
    // Dividir en bloques pequeños (oraciones) para evitar bugs de corte prematuro
    const sentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];
    let currentChunk = 0;

    function speakNextChunk() {
        if (currentChunk >= sentences.length) {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
            currentChunk = 0; // Se puede repetir el audio
            return;
        }

        const utterance = new SpeechSynthesisUtterance(sentences[currentChunk]);

        if (state.browserVoice && 'speechSynthesis' in window) {
            const voices = window.speechSynthesis.getVoices();
            const selectedVoice = voices.find(v => v.name === state.browserVoice);
            if (selectedVoice) utterance.voice = selectedVoice;
        }

        utterance.lang = 'es-ES';
        utterance.rate = 0.9;

        utterance.onend = () => {
            // Solo seguimos si el icono de play está oculto (es decir, el audio está fluyendo)
            if (playIcon.classList.contains('hidden')) {
                currentChunk++;
                speakNextChunk();

                // Track visual de progreso "falso" aproximado
                const approxPercent = (currentChunk / sentences.length) * 100;
                progressBar.style.width = `${approxPercent}%`;
            }
        };

        utterance.onerror = (e) => {
            console.error("Browser TTS Err:", e);
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        };

        window.speechSynthesis.speak(utterance);
    }

    document.getElementById('player-toggle').onclick = () => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        } else if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        } else {
            // Reproducir desde el principio o desde el último punto
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
            speakNextChunk();
        }
    };

    document.getElementById('player-progress-container').onclick = null; // Scale not supported for native TTS
}

function initPlayer(url) {
    if (state.player) state.player.stop();

    const playIcon = document.getElementById('player-icon-play');
    const pauseIcon = document.getElementById('player-icon-pause');
    const progressBar = document.getElementById('player-progress-bar');
    const timeCurrent = document.getElementById('player-time-current');
    const timeTotal = document.getElementById('player-time-total');

    state.player = new StoryPlayer(url,
        (data) => {
            progressBar.style.width = `${data.percent}%`;
            timeCurrent.textContent = formatTime(data.currentTime);
            timeTotal.textContent = formatTime(data.duration);
        },
        () => {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }
    );

    document.getElementById('player-toggle').onclick = () => {
        state.player.toggle();
        const isPaused = state.player.audio.paused;
        playIcon.classList.toggle('hidden', !isPaused);
        pauseIcon.classList.toggle('hidden', isPaused);
    };

    document.getElementById('player-progress-container').onclick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = ((e.clientX - rect.left) / rect.width) * 100;
        state.player.seek(percent);
    };

    document.getElementById('player-volume').oninput = (e) => {
        state.player.setVolume(e.target.value / 100);
    };
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function handleError(error) {
    console.error(error);
    const code = error.code || 'ERR_UNKNOWN';
    const providerName = state.textProvider === 'gemini' ? 'Gemini' : 'OpenAI';
    const errorMap = {
        'ERR_OPENAI_KEY': {
            title: `Clave de ${providerName} inválida`,
            desc: `Tu clave de ${providerName} no funciona. Puede que sea incorrecta o necesite activación.`,
            cta: "Verificar clave",
            action: () => showView('onboarding')
        },
        'ERR_OPENAI_RATE': {
            title: "Límite superado / Sin Saldo",
            desc: error.message || `Los servidores están saturados o tu cuenta de ${providerName} no tiene créditos.`,
            cta: "Reintentar en 30s",
            action: () => handleGenerate()
        },
        'ERR_OPENAI_REQUEST': {
            title: "Error en la petición",
            desc: `${providerName} rechazó la solicitud. Mensaje: ` + (error.message || ""),
            cta: "Volver",
            action: () => showView('workshop')
        },
        'ERR_OPENAI_NETWORK': {
            title: "Error de red",
            desc: "Parece que la magia necesita internet o hubo un fallo de conexión.",
            cta: "Reintentar",
            action: () => handleGenerate()
        },
        'ERR_ELEVENLABS_KEY': { title: "Voz no disponible", desc: "La API Key de ElevenLabs es incorrecta.", cta: "Continuar sin audio", action: () => { storage.set('AUDIO_MODE', false); renderStory(state.generatedStoryText); showView('story'); } },
        'ERR_ELEVENLABS_QUOTA': { title: "Sin créditos de audio", desc: "Te has quedado sin minutos de audio este mes.", cta: "Ver cuento en texto", action: () => { storage.set('AUDIO_MODE', false); renderStory(state.generatedStoryText); showView('story'); } },
        'ERR_CONTENT_FILTER': { title: "Personajes no válidos", desc: `Los personajes elegidos no pudieron crear una historia segura (${providerName}).`, cta: "Volver al taller", action: () => showView('workshop') }
    };

    const config = errorMap[code] || { title: "Error Inesperado", desc: `Algo salió mal en el taller de sueños. Código: ${code}. Detalle: ${error.message || 'Desconocido'}.`, cta: "Volver al taller", action: () => showView('workshop') };

    document.getElementById('error-title').textContent = config.title;
    document.getElementById('error-desc').textContent = config.desc;
    const ctaBtn = document.getElementById('error-cta-btn');
    ctaBtn.textContent = config.cta;
    ctaBtn.onclick = config.action;

    showView('error');
}

function initBrowserVoiceSelector() {
    const container = document.getElementById('browser-voice-selection');
    const select = document.getElementById('select-browser-voice');

    if (!('speechSynthesis' in window)) return;



    function populateVoices() {
        const voices = window.speechSynthesis.getVoices();
        const spanishVoices = voices.filter(v => v.lang.startsWith('es'));

        select.innerHTML = spanishVoices.length > 0
            ? spanishVoices.map(v => `<option value="${v.name}" ${v.name === state.browserVoice ? 'selected' : ''}>${v.name}</option>`).join('')
            : '<option value="">No se encontraron voces en español</option>';

        if (!state.browserVoice && spanishVoices.length > 0) {
            state.browserVoice = spanishVoices[0].name;
        }
    }

    populateVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoices;
    }

    select.onchange = (e) => {
        state.browserVoice = e.target.value;
        storage.set('BROWSER_VOICE', state.browserVoice);
    };
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    initStarfield();

    // Cargar datos guardados
    document.getElementById('input-openai-key').value = storage.get('OPENAI_KEY') || '';
    document.getElementById('input-gemini-key').value = storage.get('GEMINI_KEY') || '';
    document.getElementById('input-el-key').value = storage.get('EL_KEY') || '';
    document.getElementById('input-el-voice').value = storage.get('EL_VOICE') || '';
    const shouldRemember = storage.get('REMEMBER_KEYS') === 'true';
    document.getElementById('check-remember').checked = shouldRemember;

    state.textProvider = storage.get('TEXT_PROVIDER') || 'openai';
    updateTextProviderUI();

    state.browserVoice = storage.get('BROWSER_VOICE');
    state.ttsProvider = storage.get('TTS_PROVIDER') || 'elevenlabs';
    state.openaiVoice = storage.get('OPENAI_VOICE') || 'shimmer';

    initBrowserVoiceSelector();
    updateTTSUI();

    // Siempre empezamos en onboarding para mostrar el mensaje de bienvenida y configuración
    showView('onboarding');

    // Si ya está completo, el botón "Comenzar a crear" simplemente saltará al taller
    // (Ya pre-llenamos los campos arriba)

    // Onboarding
    document.getElementById('btn-start').onclick = () => {
        const sanitizeKey = (k) => k.replace(/^(key|api\s*key|clave):\s*/i, '').trim();
        const oKey = sanitizeKey(document.getElementById('input-openai-key').value);
        const gKey = sanitizeKey(document.getElementById('input-gemini-key').value);
        const eKey = sanitizeKey(document.getElementById('input-el-key').value);
        const vId = document.getElementById('input-el-voice').value.trim();
        const remember = document.getElementById('check-remember').checked;

        if (!oKey && !gKey) return alert('Debes introducir al menos una API Key (OpenAI o Gemini)');

        // --- AUTO-CORRECCIÓN INTELIGENTE ---
        // 1. Texto: Si no tiene clave para el proveedor elegido, pero sí para el otro, cambiamos
        if (state.textProvider === 'gemini' && !gKey && oKey) {
            setTextProvider('openai');
        } else if (state.textProvider === 'openai' && !oKey && gKey) {
            setTextProvider('gemini');
        }

        // 2. Audio: Si tiene clave de OpenAI pero no de ElevenLabs, forzamos OpenAI TTS para evitar voz robótica
        if (oKey && !eKey && state.ttsProvider === 'elevenlabs') {
            setTTSProvider('openai');
        }

        // 3. Voz OpenAI: Leer siempre el valor actual del select
        state.openaiVoice = document.getElementById('select-openai-voice').value;

        // Guardar preferencia de "recordar"
        storage.set('REMEMBER_KEYS', remember);

        if (remember) {
            storage.set('OPENAI_KEY', oKey);
            storage.set('GEMINI_KEY', gKey);
            storage.set('EL_KEY', eKey);
            storage.set('EL_VOICE', vId);
        } else {
            storage.remove('OPENAI_KEY');
            storage.remove('GEMINI_KEY');
            storage.remove('EL_KEY');
            storage.remove('EL_VOICE');
            state.tempKeys = { oKey, gKey, eKey, vId };
        }

        storage.set('TEXT_PROVIDER', state.textProvider);

        storage.set('TTS_PROVIDER', state.ttsProvider);
        storage.set('OPENAI_VOICE', state.openaiVoice);
        storage.set('BROWSER_VOICE', document.getElementById('select-browser-voice').value);
        storage.set('AUDIO_MODE', !!eKey || !!storage.get('BROWSER_VOICE') || true);
        storage.set('ONBOARDING', true);

        showView('workshop');
    };

    btnSettings.onclick = () => showView('onboarding');

    // Workshop - Edad
    document.querySelectorAll('.age-card').forEach(card => {
        card.onclick = () => {
            document.querySelectorAll('.age-card').forEach(c => c.classList.remove('selected', 'bg-white/10'));
            card.classList.add('selected', 'bg-white/10');
            state.age = card.dataset.age;

            // Mostrar/Ocultar temas de adultos y sección de miedo
            const isAdult = state.age === 'adult';
            document.querySelectorAll('.theme-card[data-theme="mystery"], .theme-card[data-theme="horror"]')
                .forEach(c => c.classList.toggle('hidden', !isAdult));

            // Si pasamos de adulto a niño y había temas de adultos seleccionados, los quitamos
            if (!isAdult) {
                state.themes = state.themes.filter(t => t !== 'mystery' && t !== 'horror');
                document.querySelectorAll('.theme-card[data-theme="mystery"], .theme-card[data-theme="horror"]')
                    .forEach(c => c.classList.remove('selected', 'bg-white/10'));
            }

            updateFearSection();
            validateWorkshop();
        };
    });

    // Workshop - Género
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.currentGender = btn.dataset.gender;
        };
    });

    // Workshop - Personajes
    btnAddChar.onclick = () => {
        const char = inputChar.value.trim();
        const alreadyExists = state.characters.some(c => c.name.toLowerCase() === char.toLowerCase());
        if (char && state.characters.length < 3 && !alreadyExists) {
            state.characters.push({ name: char, gender: state.currentGender });
            inputChar.value = '';
            updateCharChips();
        }
    };

    // Workshop - Temática
    document.querySelectorAll('.theme-card').forEach(card => {
        card.onclick = () => {
            const theme = card.dataset.theme;
            if (state.themes.includes(theme)) {
                state.themes = state.themes.filter(t => t !== theme);
                card.classList.remove('selected', 'bg-white/10');
            } else if (state.themes.length < 2) {
                state.themes.push(theme);
                card.classList.add('selected', 'bg-white/10');
            }
            updateFearSection();
            validateWorkshop();
        };
    });

    // Workshop - Nivel de Miedo
    document.querySelectorAll('.fear-card').forEach(card => {
        card.onclick = () => {
            document.querySelectorAll('.fear-card').forEach(c => c.classList.remove('selected', 'bg-white/10', 'shadow-lg', 'text-white', 'font-medium'));
            card.classList.add('selected', 'bg-white/10', 'shadow-lg', 'text-white', 'font-medium');
            state.fearLevel = card.dataset.fear;
        };
    });

    // Workshop - Duración
    document.querySelectorAll('.len-card').forEach(card => {
        card.onclick = () => {
            document.querySelectorAll('.len-card').forEach(c => c.classList.remove('bg-white/10', 'text-white', 'font-medium', 'shadow-lg'));
            card.classList.add('bg-white/10', 'text-white', 'font-medium', 'shadow-lg');
            state.length = parseInt(card.dataset.len, 10);
        };
    });

    // Workshop - Valor
    inputValue.oninput = (e) => {
        state.value = e.target.value;
        valueCount.textContent = `${state.value.length}/60`;
    };

    document.getElementById('toggle-audio').onchange = (e) => {
        state.audioEnabled = e.target.checked;
    };

    btnCreate.onclick = handleGenerate;

    // Story - Download PDF
    document.getElementById('btn-download-pdf').onclick = downloadPDF;
});

function updateTTSUI() {
    const isOpenAI = state.ttsProvider === 'openai';
    document.getElementById('openai-voice-config').classList.toggle('hidden', !isOpenAI);
    document.getElementById('elevenlabs-voice-config').classList.toggle('hidden', isOpenAI);

    document.getElementById('provider-openai').classList.toggle('bg-white/10', isOpenAI);
    document.getElementById('provider-openai').classList.toggle('text-white', isOpenAI);
    document.getElementById('provider-openai').classList.toggle('text-secondary', !isOpenAI);

    document.getElementById('provider-elevenlabs').classList.toggle('bg-white/10', !isOpenAI);
    document.getElementById('provider-elevenlabs').classList.toggle('text-white', !isOpenAI);
    document.getElementById('provider-elevenlabs').classList.toggle('text-secondary', isOpenAI);
}

function updateTextProviderUI() {
    const isGemini = state.textProvider === 'gemini';
    document.getElementById('text-provider-openai').classList.toggle('bg-white/10', !isGemini);
    document.getElementById('text-provider-openai').classList.toggle('text-white', !isGemini);
    document.getElementById('text-provider-openai').classList.toggle('text-secondary', isGemini);

    document.getElementById('text-provider-gemini').classList.toggle('bg-white/10', isGemini);
    document.getElementById('text-provider-gemini').classList.toggle('text-white', isGemini);
    document.getElementById('text-provider-gemini').classList.toggle('text-secondary', !isGemini);
}

window.setTextProvider = (provider) => {
    state.textProvider = provider;
    updateTextProviderUI();
};

window.toggleGeminiHelp = () => {
    const guide = document.getElementById('gemini-help-guide');
    guide.classList.toggle('hidden');
};

window.setTTSProvider = (provider) => {
    state.ttsProvider = provider;
    updateTTSUI();
};

function updateFearSection() {
    const isAdult = state.age === 'adult';
    const hasScaryTheme = state.themes.includes('horror') || state.themes.includes('mystery');
    document.getElementById('section-fear-level').classList.toggle('hidden', !(isAdult && hasScaryTheme));
}

