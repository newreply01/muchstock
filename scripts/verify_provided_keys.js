const { GoogleGenerativeAI } = require("@google/generative-ai");

const testKeys = [
    "AIzaSyD2BIx8MULgAaMi5FkpMaH0dwECsK1egYI",
    "AIzaSyDkhoe1j3Bd4SebAH_jbeRqeKZ34ERSidE",
    "AIzaSyB9E7-ZajBAIq0YUuzNfoT_hbVNm5DRQRc"
];

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

async function verifySpecificKeys() {
    console.log(`--- 測試使用者提供的 3 組金鑰 ---`);
    const results = [];
    for (let i = 0; i < testKeys.length; i++) {
        const key = testKeys[i];
        const hint = key.substring(0, 8) + '...';
        const res = await checkModel(key);
        results.push({ index: i, hint, success: res.success, error: res.error });
    }
    console.log(JSON.stringify(results, null, 2));
}

verifySpecificKeys();
