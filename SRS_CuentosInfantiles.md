# 📖 SRS — StoryDreams: WebApp de Cuentos Infantiles Personalizados
**Versión:** 1.0 | **Fecha:** 2026-02-27 | **Autor:** PM/UX Senior (IA)

---

## 1. VISIÓN GENERAL DEL PRODUCTO

**Nombre:** StoryDreams ✨  
**Descripción:** Herramienta web estática para padres que genera cuentos infantiles personalizados con IA. Soporta modo solo-texto (gratuito) y modo audio con voz sintética premium (API Key propia del usuario).  
**Stack:** HTML5 + Tailwind CSS (CDN) + Vanilla JavaScript. Sin backend. Sin base de datos. Todo en el navegador.  
**Deployment:** GitHub Pages vía GitHub Actions.

---

## 2. ARQUITECTURA DE ARCHIVOS

```
storydreams/
├── index.html              # Punto de entrada único (SPA)
├── css/
│   └── custom.css          # Animaciones y overrides mínimos sobre Tailwind
├── js/
│   ├── app.js              # Estado global, router de vistas
│   ├── api.js              # Llamadas a OpenAI y ElevenLabs
│   ├── storage.js          # Wrapper de localStorage
│   ├── prompt.js           # System prompt y builder de user prompt
│   └── player.js           # Reproductor de audio
├── assets/
│   ├── icons/              # SVGs temáticos (hada, cohete, pata de oso, etc.)
│   └── fonts/              # Playfair Display + Inter (self-hosted o Google Fonts)
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions → GitHub Pages
└── README.md
```

---

## 3. ESTADOS DE LA APLICACIÓN

La app es una SPA con 5 estados/vistas gestionados desde `app.js` mediante un router ligero.

| Estado ID | Nombre UI | Descripción |
|-----------|-----------|-------------|
| `ONBOARDING` | Bienvenida | Primera visita. Explica modos. Captura API Keys opcionales. |
| `WORKSHOP` | Taller de Cuentos | Formulario de configuración del cuento. |
| `GENERATING` | Creando Magia… | Pantalla de carga con animaciones. Llamadas a API en curso. |
| `STORY_VIEW` | Tu Cuento | Muestra el texto del cuento + reproductor de audio (si aplica). |
| `ERROR` | ¡Ups! | Pantalla de error con mensaje específico y CTA para reintentar. |

### Diagrama de Flujo de Estados
```
[ONBOARDING] ──(Guardar configuración)──► [WORKSHOP]
                                              │
                                    (Generar cuento)
                                              │
                                              ▼
                                        [GENERATING]
                                         /         \
                                    (éxito)       (error)
                                       │               │
                                  [STORY_VIEW]    [ERROR]
                                       │               │
                                  (Nuevo cuento)  (Reintentar)
                                       └──────────────►[WORKSHOP]
```

---

## 4. ESPECIFICACIÓN FUNCIONAL DETALLADA

### 4.1 Vista: ONBOARDING

**Trigger:** Primera visita O si `localStorage.getItem('onboarding_complete')` es `null`.

**Componentes:**

```
┌─────────────────────────────────────────┐
│  🌙 StoryDreams                         │
│  "Cuentos mágicos para soñar juntos"    │
├─────────────────────────────────────────┤
│  VIÑETA 1 — Opción A: Solo Lectura      │
│  ✦ Gratis y sin registro                │
│  ✦ Genera el texto del cuento           │
│  ✦ Sin API Keys necesarias              │
├─────────────────────────────────────────┤
│  VIÑETA 2 — Opción B: Audio Mágico ✨   │
│  ✦ La IA lee el cuento en voz alta      │
│  ✦ Usa tu propia API Key de ElevenLabs  │
│  ✦ 100% privado — guardado solo en tu   │
│    navegador, nunca en servidores        │
├─────────────────────────────────────────┤
│  [Campo] OpenAI API Key *               │
│  [Campo] ElevenLabs API Key (opcional)  │
│  [Campo] ElevenLabs Voice ID (opcional) │
│                                         │
│  ℹ️ Tooltip: ¿Dónde encuentro mi Voice ID?│
├─────────────────────────────────────────┤
│         [ Comenzar a crear ✨ ]          │
└─────────────────────────────────────────┘
```

**Lógica:**
- Al pulsar "Comenzar", validar que `openai_key` no esté vacío.
- Si `elevenlabs_key` tiene valor, activar modo Audio (`audio_mode = true`).
- Guardar en `localStorage`: `openai_key`, `elevenlabs_key`, `elevenlabs_voice_id`, `audio_mode`, `onboarding_complete = true`.
- Redirigir a `WORKSHOP`.
- Icono ⚙️ en header siempre visible → vuelve a ONBOARDING para editar claves.

---

### 4.2 Vista: WORKSHOP (Taller de Cuentos)

**Campos del formulario:**

#### Campo 1: Edad del niño
- Tipo: Selector visual con tarjetas clicables.
- Opciones: `2-3 años` 👶 | `4-5 años` 🧒 | `6-8 años` 🧑 | `9-12 años` 🧑‍🎓
- Estado: Un solo valor seleccionado (requerido).

#### Campo 2: Personajes principales
- Tipo: Input de texto con chips/tags.
- Placeholder: "Ej: Luna la conejita, el mago Tomás…"
- Límite: 3 personajes máximo, 30 caracteres por personaje.
- Contador: "2/3 personajes" visible.

#### Campo 3: Temática
- Tipo: Grid de tarjetas con icono + etiqueta.
- Opciones:
  | Icono | Temática | Valor |
  |-------|----------|-------|
  | 🧚 | Hadas y Magia | `fairy` |
  | 🚀 | Aventura Espacial | `space` |
  | 🐻 | Animales del Bosque | `animals` |
  | 🌊 | Mundo Submarino | `ocean` |
  | 🦕 | Dinosaurios | `dinos` |
  | 🏰 | Reinos y Castillos | `kingdom` |
- Selección múltiple (máx. 2).

#### Campo 4: Duración del cuento
- Tipo: Slider visual con 3 posiciones.
- Opciones:
  | Label | Valor | Tokens aprox. | Palabras aprox. | Tiempo lectura |
  |-------|-------|---------------|-----------------|----------------|
  | Cuento Corto 🌙 | `short` | ~400 tokens | ~250 palabras | 2-3 min |
  | Cuento Normal ⭐ | `medium` | ~800 tokens | ~500 palabras | 4-6 min |
  | Cuento Largo 🌌 | `long` | ~1400 tokens | ~900 palabras | 8-10 min |

#### Campo 5: Valor extra (opcional)
- Tipo: Input de texto corto.
- Label: "¿Qué quieres que aprenda? (opcional)"
- Placeholder: "Ej: compartir juguetes, ser valiente, cuidar el medioambiente"
- Límite: 60 caracteres.

**Estimador de coste (UI):**
```
┌──────────────────────────────────────┐
│ 💰 Coste estimado de este cuento:    │
│    Generación texto:  ~$0.002        │
│    Audio ElevenLabs:  ~$0.015 ✨     │
│    ─────────────────────────────     │
│    Total estimado:    ~$0.017        │
│  (basado en tarifas estándar de API) │
└──────────────────────────────────────┘
```
Cálculo en JS: `texto_tokens * 0.000003` (GPT-4o-mini) + `caracteres_estimados * 0.000030` (ElevenLabs Starter).

**CTA:** `[ ✨ Crear el cuento ]` — deshabilitado hasta que edad + ≥1 personaje + temática estén completos.

---

### 4.3 Vista: GENERATING (Pantalla de Carga)

**Secuencia de animación (3 fases):**

```javascript
const phases = [
  { icon: "✍️", text: "Despertando a los magos escritores…",    duration: 2000 },
  { icon: "📖", text: "Tejiendo palabras con hilo de luna…",    duration: 3000 },
  { icon: "🎨", text: "Pintando las últimas estrellas…",        duration: 2000 },
];
```

- Fondo: animación CSS de estrellas parpadeantes (keyframes en `custom.css`).
- Barra de progreso indeterminada con gradiente violeta→azul.
- Si `audio_mode = true`, tras el texto aparece fase adicional: "🎙️ Grabando la voz mágica…".

---

### 4.4 Vista: STORY_VIEW (El Cuento)

**Layout:**
```
┌─────────────────────────────────────────┐
│  🌙 [Título del cuento generado]        │
│  ✦ Para [nombre personaje] · [temática] │
├─────────────────────────────────────────┤
│  [REPRODUCTOR — solo si audio_mode]     │
│  ▶ ⏸  ━━━━━━●━━━━  02:34 / 05:10       │
│  🔊 ────────────                        │
├─────────────────────────────────────────┤
│                                         │
│  [Texto del cuento — Serif, legible,    │
│   tamaño 18-20px, line-height 1.8]      │
│                                         │
│  ▶ Párrafo 1: Introducción             │
│  ▶ Párrafo 2: Nudo                     │
│  ▶ Párrafo 3: Desenlace                │
│                                         │
├─────────────────────────────────────────┤
│  [ 🔄 Crear otro cuento ] [ 💾 Guardar ]│
└─────────────────────────────────────────┘
```

**Función "Guardar":** Genera un `.txt` con el cuento y lo descarga via `Blob + URL.createObjectURL`.

**Scroll suave:** El reproductor hace `sticky` en la parte superior al hacer scroll.

---

### 4.5 Vista: ERROR

**Tipos de error y mensajes:**

| Código | Causa | Mensaje UI | Acción |
|--------|-------|-----------|--------|
| `ERR_OPENAI_KEY` | API Key inválida o sin créditos | "Tu API Key de OpenAI no funciona. Puede que no tenga créditos o sea incorrecta." | [Verificar clave] → ONBOARDING |
| `ERR_OPENAI_RATE` | Rate limit / 429 | "Los magos están muy ocupados ahora. Espera un momento e inténtalo de nuevo." | [Reintentar en 30s] |
| `ERR_OPENAI_NETWORK` | Sin conexión | "Parece que la magia necesita internet. Comprueba tu conexión." | [Reintentar] |
| `ERR_ELEVENLABS_KEY` | ElevenLabs Key inválida | "La voz mágica no pudo activarse. Comprueba tu API Key de ElevenLabs." | [Continuar sin audio] |
| `ERR_ELEVENLABS_QUOTA` | Sin créditos ElevenLabs | "Te has quedado sin minutos de audio este mes. El cuento aparecerá en texto." | [Ver cuento en texto] |
| `ERR_ELEVENLABS_VOICE` | Voice ID inválido | "No encontramos esa voz. Usa el Voice ID por defecto." | [Usar voz por defecto] |
| `ERR_CONTENT_FILTER` | OpenAI rechaza el prompt | "Los personajes elegidos no pudieron crear una historia. Prueba con otros nombres." | [Volver al formulario] |

---

## 5. DISEÑO UI/UX — LOOK & FEEL "DREAMY NIGHT"

### 5.1 Paleta de Colores

```css
/* custom.css — CSS Variables */
:root {
  /* Fondos */
  --color-bg-deep:       #0D1B2A;  /* Azul medianoche profundo */
  --color-bg-mid:        #1A2744;  /* Azul noche medio */
  --color-bg-card:       #1E2D4E;  /* Azul para tarjetas */
  --color-bg-card-hover: #253560;  /* Hover en tarjetas */

  /* Acentos */
  --color-accent-violet: #7C5CBF;  /* Violeta suave principal */
  --color-accent-purple: #9B6FD4;  /* Violeta claro CTA */
  --color-accent-moon:   #F2C94C;  /* Amarillo luna */
  --color-accent-star:   #FFE082;  /* Amarillo estrella (highlights) */

  /* Texto */
  --color-text-primary:  #F0EDE4;  /* Crema principal */
  --color-text-secondary:#B8C4D4;  /* Azul claro secundario */
  --color-text-muted:    #7A8FA6;  /* Texto deshabilitado */

  /* Semánticos */
  --color-success:       #4CAF82;  /* Verde menta */
  --color-error:         #E57373;  /* Rojo suave */
  --color-info:          #64B5F6;  /* Azul info */

  /* Gradientes */
  --gradient-cta: linear-gradient(135deg, #7C5CBF 0%, #9B6FD4 50%, #F2C94C 100%);
  --gradient-bg:  linear-gradient(180deg, #0D1B2A 0%, #1A2744 100%);
  --gradient-card: linear-gradient(135deg, #1E2D4E 0%, #253560 100%);
}
```

### 5.2 Tipografía

```html
<!-- En <head> de index.html -->
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
```

| Uso | Fuente | Peso | Tamaño base |
|-----|--------|------|-------------|
| Títulos H1 | Playfair Display | 700 | 2.5rem |
| Títulos H2 | Playfair Display | 400 | 1.8rem |
| Subtítulos | Playfair Display Italic | 400 | 1.2rem |
| Cuerpo texto cuento | Playfair Display | 400 | 1.15rem, line-height 1.9 |
| UI Labels | Inter | 500 | 0.875rem |
| Cuerpo UI | Inter | 400 | 1rem |
| Texto muted | Inter | 300 | 0.875rem |

### 5.3 Componentes Base

**Botón CTA Principal:**
```css
.btn-primary {
  background: var(--gradient-cta);
  color: #0D1B2A;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  padding: 0.875rem 2rem;
  border-radius: 9999px;
  box-shadow: 0 0 20px rgba(124, 92, 191, 0.4);
  transition: all 0.3s ease;
}
.btn-primary:hover {
  box-shadow: 0 0 35px rgba(124, 92, 191, 0.7);
  transform: translateY(-2px);
}
```

**Tarjeta de selección:**
```css
.selection-card {
  background: var(--gradient-card);
  border: 1px solid rgba(124, 92, 191, 0.2);
  border-radius: 1rem;
  transition: all 0.2s ease;
}
.selection-card.selected {
  border-color: var(--color-accent-moon);
  box-shadow: 0 0 15px rgba(242, 201, 76, 0.3);
}
```

**Input de texto:**
```css
.input-magical {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(124, 92, 191, 0.3);
  border-radius: 0.75rem;
  color: var(--color-text-primary);
  font-family: 'Inter', sans-serif;
}
.input-magical:focus {
  outline: none;
  border-color: var(--color-accent-violet);
  box-shadow: 0 0 10px rgba(124, 92, 191, 0.3);
}
```

### 5.4 Animaciones CSS Clave

```css
/* Fondo estrellado */
@keyframes twinkle {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.3); }
}

/* Entrada de elementos */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Pulso mágico para botón CTA */
@keyframes magicPulse {
  0%, 100% { box-shadow: 0 0 20px rgba(124, 92, 191, 0.4); }
  50%       { box-shadow: 0 0 40px rgba(242, 201, 76, 0.6); }
}

/* Orbe flotante de fondo */
@keyframes floatOrb {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50%       { transform: translateY(-20px) rotate(180deg); }
}
```

---

## 6. ESTRATEGIA DE PROMPTS

### 6.1 System Prompt para OpenAI

```javascript
// js/prompt.js
export const SYSTEM_PROMPT = `
Eres un experto narrador de cuentos infantiles con 20 años de experiencia. 
Tu misión es crear historias mágicas, seguras y educativas para niños.

REGLAS ABSOLUTAS (nunca las rompes):
1. SEGURIDAD: Jamás incluyas violencia, terror, muerte, contenido adulto, lenguaje inapropiado ni situaciones que puedan asustar o disturbar a un niño.
2. ESTRUCTURA OBLIGATORIA: Cada cuento DEBE tener exactamente tres partes claramente diferenciadas:
   - INTRODUCCIÓN: Presenta el mundo y los personajes de forma cálida y acogedora.
   - NUDO: Una pequeña aventura o desafío que el personaje resuelve con ingenio, bondad o valentía. Sin antagonistas aterradores; los obstáculos son suaves y superables.
   - DESENLACE RELAJANTE: Siempre feliz y tranquilo. Los personajes terminan descansando, en casa, con familia, o bajo las estrellas. El final debe inducir calma y sueño.
3. VALORES: Integra de forma natural el valor educativo si se especifica. Muéstralo con acciones, no con sermones.
4. TONO: Cálido, mágico, poético pero comprensible. Usa frases musicales. Incluye descripciones sensoriales suaves (colores, olores agradables, texturas suaves).
5. VOCABULARIO: Adaptado a la edad indicada. Para menores de 5 años: frases cortas, palabras simples, mucha repetición rítmica. Para mayores: puede ser más elaborado.
6. FORMATO DE RESPUESTA: 
   - Empieza SIEMPRE con el título del cuento entre asteriscos: **Título del cuento**
   - Luego los tres bloques con sus etiquetas: [INTRODUCCIÓN], [NUDO], [DESENLACE]
   - Solo texto plano, sin markdown adicional, sin listas, sin negritas en el cuerpo.
   - Termina con una frase de cierre suave que invite al sueño.
`;
```

### 6.2 User Prompt Builder

```javascript
// js/prompt.js
export function buildUserPrompt({ age, characters, themes, length, value }) {
  const themeMap = {
    fairy: 'hadas, magia y bosques encantados',
    space: 'aventura espacial, planetas y estrellas',
    animals: 'animales del bosque y la naturaleza',
    ocean: 'el fondo del mar y criaturas marinas',
    dinos: 'dinosaurios amigables y la prehistoria',
    kingdom: 'reinos mágicos, castillos y caballeros bondadosos'
  };

  const lengthMap = {
    short:  'Escribe un cuento CORTO de aproximadamente 250 palabras',
    medium: 'Escribe un cuento de aproximadamente 500 palabras',
    long:   'Escribe un cuento LARGO y detallado de aproximadamente 900 palabras'
  };

  const ageGuide = {
    '2-3': 'muy simples, con frases de 5-8 palabras y mucha repetición',
    '4-5': 'sencillas y mágicas, con frases fluidas',
    '6-8': 'imaginativas y con pequeñas sorpresas',
    '9-12': 'ricas en descripción y con personajes con profundidad'
  };

  const themeList = themes.map(t => themeMap[t]).join(' y ');
  const charList = characters.join(', ');
  const valueText = value ? `\nValor a transmitir de forma natural: "${value}".` : '';

  return `${lengthMap[length]}, con un lenguaje ${ageGuide[age]}, para un niño de ${age} años.

Los personajes principales son: ${charList}.
La temática es: ${themeList}.${valueText}

Recuerda: estructura con [INTRODUCCIÓN], [NUDO] y [DESENLACE] relajante. Empieza con el título en **asteriscos**.`;
}
```

### 6.3 Configuración de la Llamada a OpenAI

```javascript
// js/api.js
export async function generateStory(prompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',           // Óptimo precio/calidad para cuentos
      max_tokens: 1600,
      temperature: 0.85,              // Creatividad alta pero coherente
      presence_penalty: 0.3,          // Evita repetición de ideas
      frequency_penalty: 0.3,         // Evita repetición de palabras
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: prompt }
      ]
    })
  });
  // ... manejo de errores
}
```

---

## 7. INTEGRACIÓN ELEVENLABS

```javascript
// js/api.js
export async function generateAudio(text, apiKey, voiceId) {
  const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel — voz cálida femenina

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
          stability: 0.75,         // Voz estable y cálida
          similarity_boost: 0.85,  // Alta fidelidad a la voz elegida
          style: 0.20,             // Expresividad suave, no exagerada
          use_speaker_boost: true
        }
      })
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    // Detectar tipo de error por status y body
    throw new ElevenLabsError(response.status, errorData);
  }

  const audioBlob = await response.blob();
  return URL.createObjectURL(audioBlob);
}
```

---

## 8. STORAGE MANAGER

```javascript
// js/storage.js
const KEYS = {
  OPENAI_KEY:    'sd_openai_key',
  EL_KEY:        'sd_elevenlabs_key',
  EL_VOICE:      'sd_elevenlabs_voice',
  AUDIO_MODE:    'sd_audio_mode',
  ONBOARDING:    'sd_onboarding_complete',
  LAST_STORY:    'sd_last_story'
};

export const storage = {
  get: (key) => localStorage.getItem(KEYS[key]),
  set: (key, value) => localStorage.setItem(KEYS[key], value),
  clear: () => Object.values(KEYS).forEach(k => localStorage.removeItem(k)),
  isOnboardingComplete: () => localStorage.getItem(KEYS.ONBOARDING) === 'true',
  isAudioMode: () => localStorage.getItem(KEYS.AUDIO_MODE) === 'true',
};
```

---

## 9. GITHUB ACTIONS — DEPLOY

```yaml
# .github/workflows/deploy.yml
name: Deploy StoryDreams to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

## 10. CONSIDERACIONES DE PRIVACIDAD Y SEGURIDAD

- Las API Keys **nunca salen del navegador del usuario**. No hay ningún servidor intermediario.
- Las llamadas a OpenAI y ElevenLabs se realizan **directamente desde el navegador** del usuario.
- CORS: Ambas APIs permiten llamadas desde navegador con la API Key en header.
- **Advertencia visible en UI:** "⚠️ Importante: Nunca compartas tu API Key con nadie. Esta app no la almacena en ningún servidor."
- El texto del cuento no se persiste en localStorage salvo `last_story` temporalmente para refresh de página.

---

## 11. ESTIMADOR DE COSTES — LÓGICA DETALLADA

```javascript
// js/app.js
function estimateCost(length, audioMode) {
  const tokenCosts = { short: 500, medium: 950, long: 1600 }; // input+output
  const charCosts  = { short: 1400, medium: 2800, long: 5000 }; // caracteres aprox.

  const GPT4O_MINI_PER_TOKEN = 0.000000150; // $0.15 por 1M tokens (output)
  const ELEVENLABS_PER_CHAR  = 0.000030;    // ~$0.30 por 10k chars (Starter)

  const textCost  = tokenCosts[length] * GPT4O_MINI_PER_TOKEN;
  const audioCost = audioMode ? charCosts[length] * ELEVENLABS_PER_CHAR : 0;

  return {
    text:  textCost.toFixed(4),
    audio: audioCost.toFixed(4),
    total: (textCost + audioCost).toFixed(4)
  };
}
```

---

## 12. ACCESIBILIDAD (A11Y)

- Contraste mínimo de 4.5:1 entre texto y fondo (crema sobre azul oscuro: ~9:1 ✅).
- Todos los iconos SVG tienen `aria-label` o `aria-hidden` según función.
- Navegación por teclado: todos los elementos interactivos son `focusable` y tienen `focus-visible`.
- Los reproductores de audio tienen controles nativos accesibles como fallback.
- `lang="es"` en `<html>` para correcta síntesis de voz del navegador.
- Textos alternativos en todas las imágenes decorativas: `alt=""`.

---

## 13. RESPONSIVE DESIGN

| Breakpoint | Layout |
|------------|--------|
| Mobile (< 640px) | Stack vertical, tarjetas en 1 columna |
| Tablet (640-1024px) | Grid 2 columnas para temáticas |
| Desktop (> 1024px) | Contenido centrado max-width: 720px |

El diseño está optimizado para **uso en tablet o móvil** (padres leyendo con el niño).

---

---

# 🚀 MASTER PROMPT PARA CODEGEN

> **Instrucciones de uso:** Copia el bloque completo entre las líneas de guiones y pégalo directamente en Cursor, Windsurf, Claude Code, o cualquier herramienta de generación de código.

---

```
Crea una WebApp estática completa llamada "StoryDreams" en UN SOLO ARCHIVO index.html 
con Tailwind CSS (CDN) y JavaScript Vanilla. NO uses frameworks. NO uses módulos ES6 imports.
Todo el CSS custom y JS van en <style> y <script> dentro del mismo HTML.

═══════════════════════════════════════
PALETA DE COLORES (CSS variables en :root):
--bg-deep: #0D1B2A | --bg-mid: #1A2744 | --bg-card: #1E2D4E
--accent-violet: #7C5CBF | --accent-purple: #9B6FD4 | --accent-moon: #F2C94C
--text-primary: #F0EDE4 | --text-secondary: #B8C4D4 | --text-muted: #7A8FA6
Gradiente CTA: linear-gradient(135deg, #7C5CBF, #9B6FD4, #F2C94C)
Fondo general: linear-gradient(180deg, #0D1B2A, #1A2744)

TIPOGRAFÍA: Google Fonts — Playfair Display (títulos, cuerpo cuento) + Inter (UI).
Importar con <link> en <head>.

═══════════════════════════════════════
ARQUITECTURA DE VISTAS (SPA con display:none/block):
5 vistas en divs con id: #view-onboarding, #view-workshop, #view-generating, 
#view-story, #view-error. Solo una visible a la vez. Función showView(id) las controla.

═══════════════════════════════════════
VISTA 1 — #view-onboarding:
- Logo "🌙 StoryDreams" en Playfair Display grande.
- Subtítulo: "Cuentos mágicos para soñar juntos"
- 2 viñetas informativas en tarjetas con borde:
  • Viñeta A "📖 Solo Lectura": gratis, sin API Keys extras, solo texto
  • Viñeta B "✨ Audio Mágico": voz IA, necesita API Key de ElevenLabs, 100% privado
- Campos:
  • Input password "API Key de OpenAI *" (requerido, id: input-openai-key)
  • Input password "API Key de ElevenLabs (opcional)" (id: input-el-key)
  • Input text "ElevenLabs Voice ID (opcional)" placeholder "21m00Tcm4TlvDq8ikWAM" (id: input-el-voice)
- Aviso privacidad: "🔒 Tus claves se guardan solo en tu navegador. Nunca las enviamos a ningún servidor."
- Botón CTA "Comenzar a crear ✨" (gradient, pill shape, glow effect)
- Al click: validar openai key no vacío → guardar en localStorage (keys: sd_openai_key, sd_el_key, sd_el_voice, sd_audio_mode, sd_onboarding) → showView('workshop')
- Si ya hay onboarding completo en localStorage, saltar directo a workshop al cargar.
- Botón ⚙️ en header fijo siempre visible → vuelve a onboarding.

═══════════════════════════════════════
VISTA 2 — #view-workshop:
- Título "El Taller de Cuentos 🌟" en Playfair Display
- 5 secciones de formulario:

  SECCIÓN 1 - Edad:
  4 tarjetas clicables con emoji+texto: "2-3 años 👶" "4-5 años 🧒" "6-8 años 🧑" "9-12 años 🧑‍🎓"
  Una sola selección. Tarjeta activa: borde --accent-moon + glow amarillo.
  
  SECCIÓN 2 - Personajes:
  Input text con botón "+Añadir". Al añadir crea un chip/tag con × para borrar.
  Máx 3 personajes. Contador "X/3 personajes" visible. 30 chars por personaje máx.
  
  SECCIÓN 3 - Temática (grid 2x3 en móvil, 3x2 en desktop):
  6 tarjetas: "🧚 Hadas y Magia" "🚀 Aventura Espacial" "🐻 Animales" 
              "🌊 Mundo Submarino" "🦕 Dinosaurios" "🏰 Reinos Mágicos"
  Selección múltiple (máx 2). Activa: borde violeta + glow.
  
  SECCIÓN 4 - Duración:
  3 botones tipo toggle: "🌙 Corto (~2min)" "⭐ Normal (~5min)" "🌌 Largo (~9min)"
  Un solo valor. Selección por defecto: Normal.
  
  SECCIÓN 5 - Valor (opcional):
  Input text, placeholder "¿Qué quieres que aprenda? Ej: compartir, ser valiente…"
  Contador de chars 0/60.

- Panel "💰 Coste estimado" que se actualiza dinámicamente al cambiar duración:
  Muestra texto: ~$X.XXX | Audio (si audio_mode): ~$X.XXX | Total: ~$X.XXX
  Lógica: short=(texto:0.0001, audio:0.042), medium=(0.0002, 0.084), long=(0.0003, 0.150)

- Botón "✨ Crear el cuento" — deshabilitado (opacity 50%) si falta edad, personaje o temática.
  Al click: showView('generating') + llamar generateStory()

═══════════════════════════════════════
VISTA 3 — #view-generating:
- Fondo oscuro con 30 estrellas CSS absolutas animadas con keyframes twinkle (random positions, random delays 0-3s, random sizes 2-5px, color #F2C94C, opacity animated 0.1→1→0.1)
- 2 orbes grandes difuminados animados (floatOrb keyframe): uno violeta #7C5CBF 300px blur-3xl, uno amarillo #F2C94C 200px blur-3xl, posiciones opuestas.
- Icono central animado (rotation lenta 360deg infinita): ✨ en 4rem
- Texto de fase que cambia cada 2.5s:
  "✍️ Despertando a los magos escritores…"
  "📖 Tejiendo palabras con hilo de luna…"  
  "🎨 Pintando las últimas estrellas…"
  Si audio_mode: añadir "🎙️ Grabando la voz mágica…"
- Barra de progreso indeterminada (CSS animation shimmer) con gradiente violeta→amarillo
- Todos con animación fadeSlideUp al aparecer.

═══════════════════════════════════════
VISTA 4 — #view-story:
- Header con título del cuento (Playfair Display 700, 2rem, --accent-moon)
- Subtítulo con personajes y temática (Playfair Display Italic, --text-secondary)
- REPRODUCTOR (solo si audio_mode y audioUrl disponible):
  div sticky top-0, fondo semi-transparente con backdrop-blur
  Botón ▶/⏸ (togglePlay), barra de progreso clickable, tiempo actual/total, control volumen 🔊
  Implementado con HTMLAudioElement, eventos timeupdate y ended.
- Texto del cuento:
  Playfair Display 400, font-size 1.15rem, line-height 1.9, --text-primary
  Parseado del response: detectar [INTRODUCCIÓN], [NUDO], [DESENLACE] y mostrarlos
  como secciones con pequeño separador decorativo ✦ entre cada una.
  El título (entre **) se extrae y muestra arriba, no en el cuerpo.
- Dos botones al final: 
  "🔄 Crear otro cuento" (secondary, outline) → showView('workshop')
  "💾 Guardar cuento" → descarga .txt con Blob

═══════════════════════════════════════
VISTA 5 — #view-error:
- Icono 😔 grande
- Título del error (id: error-title)
- Descripción (id: error-desc)  
- Botón acción primaria (id: error-cta-btn, texto en id: error-cta-text)
- Botón secundario opcional (id: error-secondary, hidden por defecto)
Función showError(type) que configura todo según tabla:
  'openai_key': título="API Key inválida", desc="Tu clave de OpenAI no funciona…", cta="Verificar clave"→onboarding
  'openai_rate': título="Demasiadas solicitudes", desc="Espera un momento…", cta="Reintentar en 30s"
  'network': título="Sin conexión", desc="La magia necesita internet…", cta="Reintentar"→generateStory
  'el_key': título="Voz mágica no disponible", desc="API Key de ElevenLabs incorrecta", cta="Continuar sin audio"→showView story con solo texto
  'el_quota': título="Sin créditos de audio", desc="Cuento disponible en texto", cta="Ver cuento"→show story sin audio
  'content': título="Personajes no válidos", desc="Prueba con otros nombres", cta="Volver"→workshop

═══════════════════════════════════════
LÓGICA PRINCIPAL — función async generateStory():
1. Recoger valores del formulario (edad, personajes[], temas[], duración, valor)
2. Construir user prompt:
   "Escribe un cuento [LONGITUD] para un niño de [EDAD] años con lenguaje [NIVEL].
   Personajes: [LISTA]. Temática: [LISTA DESCRIPTIVA]. [VALOR si existe]
   Estructura obligatoria: título entre **asteriscos**, luego [INTRODUCCIÓN], [NUDO], [DESENLACE] relajante."
3. System prompt (string literal en JS):
   "Eres un experto narrador infantil. REGLAS: 1)Jamás incluyas violencia, miedo o contenido adulto. 
   2)Estructura SIEMPRE: **Título**, [INTRODUCCIÓN] cálida, [NUDO] con desafío suave resuelto con bondad, 
   [DESENLACE] feliz y relajante que invite al sueño. 3)Vocabulario adaptado a la edad. 
   4)Tono mágico, poético, con descripciones sensoriales suaves. 5)Integra valores con acciones, no sermones.
   6)Solo texto plano, sin markdown adicional en el cuerpo."
4. Fetch POST https://api.openai.com/v1/chat/completions:
   model: "gpt-4o-mini", max_tokens: 1600, temperature: 0.85,
   presence_penalty: 0.3, frequency_penalty: 0.3
   Headers: Authorization: Bearer [openai_key]
5. Manejo errores: 401→showError('openai_key'), 429→showError('openai_rate'), network fail→showError('network'), finish_reason=content_filter→showError('content')
6. Parsear respuesta: extraer título (entre **), separar secciones [INTRODUCCIÓN][NUDO][DESENLACE]
7. Si audio_mode: fetch POST https://api.elevenlabs.io/v1/text-to-speech/[voice_id]:
   Headers: xi-api-key: [el_key], body: {text, model_id:"eleven_multilingual_v2", 
   voice_settings:{stability:0.75,similarity_boost:0.85,style:0.20,use_speaker_boost:true}}
   Manejo errores: 401→showError('el_key'), 429/quota→showError('el_quota')
   Convertir response a Blob → URL.createObjectURL → guardar en audioUrl
8. showView('story'), poblar contenido, si audioUrl inicializar reproductor.

═══════════════════════════════════════
ANIMACIONES CSS A INCLUIR (en <style>):
@keyframes twinkle { 0%,100%{opacity:0.2;transform:scale(1)} 50%{opacity:1;transform:scale(1.4)} }
@keyframes fadeSlideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
@keyframes floatOrb { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-24px) rotate(180deg)} }
@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes spinSlow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
@keyframes magicPulse { 0%,100%{box-shadow:0 0 20px rgba(124,92,191,0.4)} 50%{box-shadow:0 0 40px rgba(242,201,76,0.6)} }

═══════════════════════════════════════
DETALLES FINALES:
- <html lang="es"> 
- Meta viewport, charset UTF-8, title "StoryDreams ✨"
- Header fijo con logo "🌙 StoryDreams" (Playfair Display) + botón ⚙️ (→ onboarding)
- Contenido principal: max-width 720px, centrado, padding mobile-friendly
- Tailwind via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Al cargar página (DOMContentLoaded): comprobar localStorage sd_onboarding → si existe showView('workshop'), si no showView('onboarding')
- Pre-rellenar inputs de onboarding con valores existentes de localStorage si los hay.
- Botón guardar cuento: crear Blob text/plain con título + texto completo, descargar como "cuento-[personaje1].txt"
- El reproductor de audio usa new Audio(audioUrl) con eventos: timeupdate (actualizar barra+tiempo), ended (resetear botón ▶)

RESULTADO ESPERADO: Una WebApp completamente funcional, hermosa, con el tema Dreamy Night, 
que funcione directamente abriendo el index.html en el navegador sin servidor. Lista para subir a GitHub Pages.
```

---

*Documento generado por StoryDreams PM/UX AI — v1.0*
