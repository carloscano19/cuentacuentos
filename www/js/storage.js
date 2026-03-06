// js/storage.js
const KEYS = {
  OPENAI_KEY: 'sd_openai_key',
  GEMINI_KEY: 'sd_gemini_key',
  TEXT_PROVIDER: 'sd_text_provider',
  LLM_MODEL: 'sd_llm_model',
  TTS_PROVIDER: 'sd_tts_provider', // 'elevenlabs', 'openai'
  EL_KEY: 'sd_elevenlabs_key',
  EL_VOICE: 'sd_elevenlabs_voice',
  OPENAI_VOICE: 'sd_openai_voice',
  BROWSER_VOICE: 'sd_browser_voice',
  AUDIO_MODE: 'sd_audio_mode',
  ONBOARDING: 'sd_onboarding_complete',
  LAST_STORY: 'sd_last_story',
  REMEMBER_KEYS: 'sd_remember_keys'
};

const storage = {
  get: (key) => localStorage.getItem(KEYS[key]),
  set: (key, value) => {
    if (value === undefined || value === null) return;
    localStorage.setItem(KEYS[key], value);
  },
  remove: (key) => localStorage.removeItem(KEYS[key]),

  isAudioMode: () => localStorage.getItem(KEYS.AUDIO_MODE) === 'true',
  isOnboardingComplete: () => localStorage.getItem(KEYS.ONBOARDING) === 'true',

  clear: () => localStorage.clear()
};

export { storage };
