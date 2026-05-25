const { GoogleGenerativeAI } = require("@google/generative-ai");

const keyToTest = "AIzaSyCk0qLFu56ts0_3Xn3PmXw9VIQTE5aM2T4";

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

async function verifyOneKey() {
    console.log(`--- 測試使用者提供的金鑰 ---`);
    const hint = keyToTest.substring(0, 8) + '...';
    const res = await checkModel(keyToTest);
    console.log(JSON.stringify({ hint, success: res.success, error: res.error }, null, 2));
}

verifyOneKey();
