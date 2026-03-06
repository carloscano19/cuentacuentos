export const SYSTEM_PROMPT = `
Eres un experto narrador con 20 años de experiencia, capaz de adaptar tu estilo desde cuentos infantiles hasta relatos de misterio para adultos.

REGLAS SEGÚN EL PÚBLICO:
1. INFANTIL (menores de 12): Seguridad absoluta. Sin violencia, terror real, muerte ni contenido adulto. Finales siempre felices y relajantes.
2. ADULTOS (+18): Puedes incluir suspense, tensión, elementos de terror, misterio psicológico y escenas descriptivas intensas. No es necesario un final feliz, pero debe ser un relato conclusivo y de calidad cinematográfica.

ESTRUCTURA OBLIGATORIA:
- INTRODUCCIÓN: Presenta el mundo y los personajes.
- NUDO: El conflicto o misterio principal. Se debe integrar el valor educativo (si es para niños) o el nivel de intensidad/miedo (si es para adultos).
- DESENLACE: Resolución de la trama.

REGLAS GENERALES:
- PERSONAJES: Usa los nombres y géneros indicados. El primero es el protagonista.
- FORMATO: Título entre asteriscos (**Título**), bloques etiquetados como [INTRODUCCIÓN], [NUDO], [DESENLACE].
- Sin markdown adicional, solo texto fluido.
`;

export function buildUserPrompt({ age, characters, themes, duration, value, fearLevel = 'medium' }) {
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
        toys: 'un mundo donde los juguetes cobran vida por la noche',
        mystery: 'misterio intrigante, pistas ocultas y suspense',
        horror: 'terror, miedo y elementos sobrenaturales escalofriantes'
    };

    const isAdult = age === 'adult';
    const wordCount = duration * (isAdult ? 130 : 110);
    const lengthPrompt = `Escribe un relato de aproximadamente ${wordCount} palabras (lectura de ${duration} min).`;

    const ageGuide = {
        '2-3': 'muy simples, con mucha repetición rítmica',
        '4-5': 'sencillas y mágicas, con frases fluidas',
        '6-8': 'imaginativas y descriptivas',
        '9-12': 'ricas en descripción y trama interesante',
        'adult': 'literario, sofisticado, profundo y cautivador'
    };

    const charList = characters.map(c => `${c.name} (${c.gender === 'boy' ? 'niño/hombre' : 'niña/mujer'})`);
    const charLine = characters.length > 0
        ? `EL PROTAGONISTA ES: ${charList[0]}. ${characters.length > 1 ? `Otros personajes: ${charList.slice(1).join(', ')}.` : ''} Usa sus nombres y respeta sus géneros.`
        : 'Crea personajes interesantes para la historia.';

    const themeList = themes.map(t => themeMap[t]).join(' y ');

    let specialContext = '';
    if (isAdult) {
        const fearMap = {
            low: 'un toque ligero de suspense, inquietud sutil',
            medium: 'miedo moderado, atmósfera escalofriante y tensión constante',
            high: 'terror intenso, escenas de pesadilla y máxima tensión',
            extreme: 'TERROR EXTREMO: atmósfera opresiva, horror psicológico profundo, situaciones macabras y una sensación de peligro inminente e inevitable. Sin límites en el suspense.'
        };
        specialContext = themes.includes('horror') ? `\nGRADO DE MIEDO: ${fearMap[fearLevel]}.` : '';
    } else {
        specialContext = value ? `\nVALOR EDUCATIVO: "${value}".` : '';
    }

    return `${lengthPrompt}, para un público de ${isAdult ? 'Adultos (+18)' : age + ' años'}. Estilo: ${ageGuide[age]}.

${charLine}
LA TEMÁTICA ES: ${themeList}.${specialContext}

Recuerda: [INTRODUCCIÓN], [NUDO] y [DESENLACE]. Empieza con el título en **asteriscos**. Sé fiel al público objetivo.`;
}
