const { GoogleGenerativeAI } = require('@google/generative-ai');

const keys = [
  'AIzaSyD2BIx8MULgAaMi5FkpMaH0dwECsK1egYI',
  'AIzaSyDHhzwNf6XgvX9H9PByoU5WjI6xoZ4s_ww',
  'AIzaSyDTZfpXSQPApRfIVN3k3C3lYsCG86rKVUM',
  'AIzaSyDjlXCGtrvwPhcy3Auynx1GRpJW6FYjnus',
  'AIzaSyAvAK41YH94H4Dfozv1RWkNTcWpSaLw0Bk',
];

async function testKey(key, index) {
  const hint = key.substring(0, 12) + '...';
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemma-4-31b-it' });
    const result = await model.generateContent('Say "OK" in one word.');
    const text = result.response.text().trim().substring(0, 20);
    console.log(`✅ Key ${index + 1} (${hint}): OK - response: "${text}"`);
  } catch (err) {
    const errCode = err.message.includes('403') ? '403 Forbidden' :
                    err.message.includes('429') ? '429 Rate Limit' :
                    err.message.substring(0, 50);
    console.log(`❌ Key ${index + 1} (${hint}): FAILED - ${errCode}`);
  }
}

(async () => {
  console.log('🔍 測試所有 Gemma API 金鑰...\n');
  for (let i = 0; i < keys.length; i++) {
    await testKey(keys[i], i);
  }
  console.log('\n✅ 測試完成');
})();
