const { generateAIReport } = require('./server/utils/ai_service');
(async () => {
    try {
        console.log('Testing generateAIReport with gemma-4-31b-it...');
        const result = await generateAIReport('2330', 'models/gemma-4-31b-it');
        console.log('Result:', result);
        process.exit(0);
    } catch (err) {
        console.error('Failed to invoke:', err.message || err);
        process.exit(1);
    }
})();
