const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const apiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
    .split(",")
    .map(k => k.trim())
    .filter(k => k.length > 20);

async function checkModel(key) {
    const genAI = new GoogleGenerativeAI(key);
    try {
        const model = genAI.getGenerativeModel({ model: "gemma-4-31b-it" });
        const result = await model.generateContent("Hi");
        return { success: true, model: "gemma-4-31b-it" };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function verifyKeys() {
    console.log(`測試模型: gemma-4-31b-it`);
    const results = [];
    for (let i = 0; i < apiKeys.length; i++) {
        const key = apiKeys[i];
        const hint = key.substring(0, 8) + '...';
        const res = await checkModel(key);
        results.push({ index: i, hint, success: res.success, error: res.error });
    }
    console.log(JSON.stringify(results, null, 2));
}

verifyKeys();
