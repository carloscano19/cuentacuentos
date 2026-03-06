// server/index.js
// Ejemplo de Backend Proxy para Cuentacuentos
// Protege tus claves y permite monetizar el servicio

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURACIÓN SEGURA ---
// En producción, estas claves irían en variables de entorno (Environment Variables)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'TU_CLAVE_MAESTRA_AQUÍ';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'TU_CLAVE_GEMINI_AQUÍ';

/**
 * Endpoints de Generación de Cuentos
 */
app.post('/generate-story', async (req, res) => {
    const { prompt, provider, model } = req.body;

    // TODO: Aquí validarías si el usuario tiene "Créditos" o ha Pagado

    try {
        let text = '';
        if (provider === 'gemini') {
            // Lógica para llamar a Google Gemini desde el servidor
            // ...
        } else {
            // Lógica para OpenAI
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: model || 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'Eres un cuentacuentos mágico...' },
                        { role: 'user', content: prompt }
                    ]
                })
            });
            const data = await response.json();
            text = data.choices[0].message.content;
        }

        res.json({ text });
    } catch (error) {
        res.status(500).json({ error: 'Error generando el cuento' });
    }
});

/**
 * Endpoint de Voz (OpenAI)
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

        // Hacemos un "pipe" del stream de audio directamente al cliente
        response.body.pipe(res);
    } catch (error) {
        res.status(500).json({ error: 'Error generando audio' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor seguro de Cuentacuentos corriendo en puerto ${PORT}`);
});
