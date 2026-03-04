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
3. VALORES: Integra el valor educativo especificado como el EJE CENTRAL del nudo. No des sermones; haz que el protagonista demuestre el valor con sus actos.
4. PERSONAJES: Si te indican nombres, el PRIMER NOMBRE es el PROTAGONISTA ABSOLUTO. Úsalo constantemente. La historia trata sobre él/ella. Si hay más nombres, son sus amigos inseparables.
5. TONO: Cálido, mágico, poético pero comprensible. Usa frases musicales. Incluye descripciones sensoriales suaves (colores, olores agradables, texturas suaves).
6. VOCABULARIO: Adaptado a la edad indicada. Para menores de 5 años: frases cortas, palabras simples, mucha repetición rítmica. Para mayores: puede ser más elaborado.
7. FORMATO DE RESPUESTA: 
   - Empieza SIEMPRE con el título del cuento entre asteriscos: **Título del cuento**
   - Luego los tres bloques con sus etiquetas: [INTRODUCCIÓN], [NUDO], [DESENLACE]
   - Solo texto plano, sin markdown adicional, sin listas, sin negritas en el cuerpo.
   - Termina con una frase de cierre suave que invite al sueño.
`;

export function buildUserPrompt({ age, characters, themes, duration, value }) {
    const themeMap = {
        fairy: 'hadas, magia y bosques encantados',
        space: 'aventura espacial, planetas y estrellas',
        animals: 'animales del bosque y la naturaleza',
        ocean: 'el fondo del mar y aventuras submarinas',
        dinos: 'dinosaurios amigables y la prehistoria',
        kingdom: 'reinos mágicos, castillos y caballeros bondadosos',
        pirates: 'piratas valientes, tesoros escondidos y barcos en islas lejanas',
        superheroes: 'superhéroes con poderes bondadosos que ayudan a los demás',
        robots: 'robots amigables y un futuro lleno de inventos curiosos',
        magic_school: 'una escuela de magia donde se aprenden trucos divertidos',
        jungle: 'la selva tropical con plantas gigantes y animales exóticos',
        toys: 'un mundo donde los juguetes cobran vida por la noche'
    };

    // Asumimos una velocidad de lectura de ~120 palabras por minuto para cuentos infantiles
    const wordCount = duration * 110; // Reducimos un poco para cuentos más pausados
    const lengthPrompt = `Escribe un cuento de aproximadamente ${wordCount} palabras (diseñado para ser leído pausadamente en unos ${duration} minutos).`;

    const ageGuide = {
        '2-3': 'muy simples, con frases de 5-8 palabras y mucha repetición rítmica',
        '4-5': 'sencillas y mágicas, con frases fluidas y descriptivas',
        '6-8': 'imaginativas, con pequeñas sorpresas y vocabulario enriquecedor',
        '9-12': 'ricas en descripción, con personajes con profundidad y tramas interesantes'
    };

    const themeList = themes.map(t => themeMap[t]).join(' y ');
    const charLine = characters.length > 0
        ? `EL PROTAGONISTA ES: ${characters[0]}. ${characters.length > 1 ? `Sus amigos son: ${characters.slice(1).join(', ')}.` : ''} ES MANDATORIO que uses sus nombres y que ${characters[0]} sea quien viva la aventura.`
        : 'Inventa un protagonista entrañable que encaje con la temática.';
    const valueText = value ? `\nEL CUENTO DEBE TRATAR SOBRE: "${value}". Haz que este valor sea el motor de la historia.` : '';

    return `${lengthPrompt}, con un lenguaje ${ageGuide[age]}, para un niño de ${age} años.

${charLine}
La temática es: ${themeList}.${valueText}

Recuerda: estructura con [INTRODUCCIÓN], [NUDO] y [DESENLACE] relajante. Empieza con el título en **asteriscos**. Es OBLIGATORIO que los nombres proporcionados sean los protagonistas reales y el valor sea el tema central.`;
}
