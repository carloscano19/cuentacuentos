// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN SEGURA ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

/**
 * Endpoint de Generación de Cuentos (Proxy para Gemini y OpenAI)
 */
app.post('/generate-story', async (req, res) => {
    const { prompt, provider, model } = req.body;

    async function callGemini(p, m) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m || 'gemini-1.5-flash'}:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: p }] }]
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.candidates[0].content.parts[0].text;
    }

    async function callOpenAI(p, m) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: m || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'Eres un cuentacuentos mágico experto en crear historias infantiles cautivadoras.' },
                    { role: 'user', content: p }
                ]
            })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return data.choices[0].message.content;
    }

    try {
        let text = '';
        if (provider === 'gemini') {
            text = await callGemini(prompt, model);
        } else {
            try {
                // Modo SaaS: Intentamos primero con tu clave de OpenAI (Calidad Premium)
                text = await callOpenAI(prompt, model);
            } catch (error) {
                console.warn("⚠️ OpenAI falló (posiblemente fondos agotados). Cambiando a Gemini (Gratis) como respaldo...");
                // FALLBACK AUTOMÁTICO: Si OpenAI falla, le damos el servicio con Gemini para no perder al cliente
                text = await callGemini(prompt, 'gemini-1.5-flash');
            }
        }
        res.json({ text });
    } catch (error) {
        console.error("❌ Error crítico en Proxy:", error.message);
        res.status(500).json({ error: 'El narrador mágico está descansando un momento. Vuelve a intentarlo pronto.' });
    }
});

/**
 * Endpoint de Voz (OpenAI TTS)
 */
app.post('/generate-audio-oa', async (req, res) => {
    const { text, voice } = req.body;

    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text,
                voice: voice || 'shimmer'
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'Error en OpenAI TTS');
        }

        // Enviamos el audio directamente como stream
        res.setHeader('Content-Type', 'audio/mpeg');
        response.body.pipe(res);

    } catch (error) {
        console.error("Error en Audio Proxy:", error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint de Voz (ElevenLabs TTS)
 */
app.post('/generate-audio-el', async (req, res) => {
    const { text, voiceId } = req.body;
    const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId || DEFAULT_VOICE_ID}`, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: { stability: 0.75, similarity_boost: 0.85 }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail?.status === 'quota_exceeded' ? 'Cuota de ElevenLabs agotada' : 'Error en ElevenLabs');
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        response.body.pipe(res);

    } catch (error) {
        console.error("Error en ElevenLabs Proxy:", error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Health Check
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor de Cuentacuentos activo' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor seguro de Cuentacuentos en puerto ${PORT}`);
});
