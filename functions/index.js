const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const cors = require('cors')({ origin: true });

admin.initializeApp();

/**
 * Proxy para Generación de Historias (Gemini / OpenAI)
 */
exports.generateStory = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        const { prompt, provider, model } = req.body;
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
                    text = await callOpenAI(prompt, model);
                } catch (error) {
                    console.warn("⚠️ OpenAI falló. Reintentando con Gemini...");
                    text = await callGemini(prompt, 'gemini-1.5-flash');
                }
            }
            res.json({ text });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});

/**
 * Proxy para Voces (OpenAI TTS)
 */
exports.generateAudioOA = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        const { text, voice } = req.body;
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

            const buffer = await response.buffer();
            res.set('Content-Type', 'audio/mpeg');
            res.send(buffer);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});
