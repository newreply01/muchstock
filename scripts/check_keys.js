const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const apiKeys = process.env.GEMINI_API_KEY.split(',').map(k => k.trim());
const GEMMA_MODEL = "models/gemma-4-31b-it";
const FLASH_MODEL = "models/gemini-1.5-flash";

async function testKey(key, index) {
    const genAI = new GoogleGenerativeAI(key);
    const results = {
        index: index + 1,
        keyHint: key.substring(0, 8) + '...',
        gemmaStatus: 'Pending',
        gemmaError: null,
        flashStatus: 'Pending',
        flashError: null
    };

    // Test Gemma
    try {
        const model = genAI.getGenerativeModel({ model: GEMMA_MODEL });
        await model.generateContent("Hi");
        results.gemmaStatus = '✅ Success';
    } catch (err) {
        results.gemmaStatus = '❌ Failed';
        results.gemmaError = err.message || String(err);
    }

    // Test Flash (as baseline)
    try {
        const model = genAI.getGenerativeModel({ model: FLASH_MODEL });
        await model.generateContent("Hi");
        results.flashStatus = '✅ Success';
    } catch (err) {
        results.flashStatus = '❌ Failed';
        results.flashError = err.message || String(err);
    }

    return results;
}

async function run() {
    console.log(`Checking ${apiKeys.length} API keys...\n`);
    const allResults = [];
    for (let i = 0; i < apiKeys.length; i++) {
        console.log(`Testing Key ${i+1}/${apiKeys.length}...`);
        const result = await testKey(apiKeys[i], i);
        allResults.push(result);
    }

    console.log('\n--- API Key Inventory Result ---\n');
    allResults.forEach(r => {
        console.log(`Key ${r.index} (${r.keyHint}):`);
        console.log(`  Gemma (${GEMMA_MODEL}): ${r.gemmaStatus}`);
        if (r.gemmaError) console.log(`    Error: ${r.gemmaError}`);
        console.log(`  Flash (${FLASH_MODEL}): ${r.flashStatus}`);
        if (r.flashError) console.log(`    Error: ${r.flashError}`);
        console.log('-----------------------------------');
    });
}

run();
