import { generateStory } from './js/api.js';

// The API key is in the localStorage of the user normally, but since we are running in Node 
// we won't have it, let's just make a mock call to see the exception thrown
async function test() {
    try {
        await generateStory("Hola ninos", "invalid_key");
        console.log("Success");
    } catch(e) {
        console.log("Caught:", e.code, e.message);
    }
}
test();
