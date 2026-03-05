// js/api.js
import { SYSTEM_PROMPT } from './prompt.js';

export class APIError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

export async function generateStory(prompt, apiKey, provider = 'openai', model = '') {
    try {
        if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model || 'gpt-4o-mini',
                    max_tokens: 1600,
                    temperature: 0.85,
                    presence_penalty: 0.3,
                    frequency_penalty: 0.3,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: prompt }
                    ]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("OpenAI Error:", response.status, errorData);
                if (response.status === 400) throw new APIError('ERR_OPENAI_REQUEST', errorData.error?.message || 'Bad Request');
                if (response.status === 401) throw new APIError('ERR_OPENAI_KEY', 'Invalid API Key');
                if (response.status === 429) throw new APIError('ERR_OPENAI_RATE', 'Rate limit exceeded');
                throw new APIError('ERR_OPENAI_NETWORK', 'Network error');
            }

            const data = await response.json();
            if (data.choices[0].finish_reason === 'content_filter') {
                throw new APIError('ERR_CONTENT_FILTER', 'Content rejected by filter');
            }
            return data.choices[0].message.content;

        } else if (provider === 'gemini') {
            const trimmedKey = apiKey.trim();
            // Usamos v1beta para system_instruction. Usamos 'gemini-flash-latest' que es el alias más estable de Google.
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${trimmedKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    system_instruction: {
                        parts: [{ text: SYSTEM_PROMPT }]
                    },
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        maxOutputTokens: 2048,
                        temperature: 0.8
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error("Gemini Error:", response.status, errorData);
                const errorMsg = errorData?.error?.message || response.statusText;

                // Si el error es 404, puede que el modelo lite no esté en todas las regiones, volvemos al flash normal
                if (response.status === 404) {
                    return generateStory(prompt, apiKey, 'gemini-fallback', model);
                }

                if (response.status === 400 && errorMsg.toLowerCase().includes('key not valid')) {
                    throw new APIError('ERR_OPENAI_KEY', 'La clave de Gemini no parece válida. Asegúrate de copiar el código completo (empieza por AIza) y que sea de Google AI Studio.');
                }

                if (response.status === 401 || response.status === 403) throw new APIError('ERR_OPENAI_KEY', `Clave inválida o bloqueada: ${errorMsg}`);

                if (response.status === 429) {
                    let customMsg = `Límite superado: ${errorMsg}`;
                    if (errorMsg.includes('limit: 0')) {
                        customMsg = "Tu cuenta de Google no tiene permiso para usar Gemini gratis en esta región o con este modelo. Prueba a crear una clave nueva en Google AI Studio asegurándote de que no hay restricciones.";
                    }
                    throw new APIError('ERR_OPENAI_RATE', customMsg);
                }
                throw new APIError('ERR_OPENAI_REQUEST', `Error de Gemini (${response.status}): ${errorMsg}`);
            }

            const data = await response.json();
            if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
                throw new APIError('ERR_CONTENT_FILTER', 'Gemini bloqueó el contenido por seguridad o no generó respuesta.');
            }
            return data.candidates[0].content.parts[0].text;

        } else if (provider === 'gemini-fallback') {
            // Un intento final con el formato más básico y el modelo estándar
            const trimmedKey = apiKey.trim();
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${trimmedKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${SYSTEM_PROMPT}\n\nUSER PROMPT: ${prompt}` }]
                    }]
                })
            });
            if (!response.ok) throw new APIError('ERR_OPENAI_REQUEST', 'Gemini Fallback failed');
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;

        } else if (provider === 'anthropic') {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'dangerously-allow-browser': 'true'
                },
                body: JSON.stringify({
                    model: model || 'claude-3-haiku-20240307',
                    max_tokens: 2000,
                    system: SYSTEM_PROMPT,
                    messages: [
                        { role: 'user', content: prompt }
                    ]
                })
            });

            if (!response.ok) {
                if (response.status === 401) throw new APIError('ERR_OPENAI_KEY', 'Invalid Anthropic Key');
                throw new APIError('ERR_OPENAI_NETWORK', 'Anthropic Network error');
            }

            const data = await response.json();
            return data.content[0].text;
        }
    } catch (error) {
        if (error instanceof APIError) throw error;
        throw new APIError('ERR_OPENAI_NETWORK', error.message);
    }
}

export async function generateAudio(text, apiKey, voiceId) {
    const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel — voz cálida femenina

    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || DEFAULT_VOICE_ID}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.75,
                        similarity_boost: 0.85,
                        style: 0.20,
                        use_speaker_boost: true
                    }
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            if (response.status === 401) throw new APIError('ERR_ELEVENLABS_KEY', 'Invalid ElevenLabs Key');
            if (response.status === 429 || (errorData.detail && errorData.detail.status === 'quota_exceeded')) {
                throw new APIError('ERR_ELEVENLABS_QUOTA', 'Quota exceeded');
            }
            throw new APIError('ERR_ELEVENLABS_VOICE', 'Voice error');
        }

        const audioBlob = await response.blob();
        return URL.createObjectURL(audioBlob);
    } catch (error) {
        if (error instanceof APIError) throw error;
        throw new APIError('ERR_ELEVENLABS_NETWORK', error.message);
    }
}
export async function generateOpenAIAudio(text, apiKey, voice = 'shimmer') {
    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text.replace(/\[.*?\]/g, '').substring(0, 4000), // OpenAI limit is 4096 chars
                voice: voice
            })
        });

        if (!response.ok) {
            if (response.status === 401) throw new APIError('ERR_OPENAI_KEY', 'Invalid OpenAI Key');
            throw new APIError('ERR_OPENAI_NETWORK', 'OpenAI TTS error');
        }

        const audioBlob = await response.blob();
        return URL.createObjectURL(audioBlob);
    } catch (error) {
        if (error instanceof APIError) throw error;
        throw new APIError('ERR_OPENAI_NETWORK', error.message);
    }
}
