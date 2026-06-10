const { generateAIReport } = require('./utils/ai_service');
async function test() {
    console.log('--- TEST START ---');
    try {
        const res = await generateAIReport('2330');
        console.log('Success:', res.success);
        if (res.success) {
            console.log('Content Length:', res.content.length);
            console.log('Mode:', res.isFallback ? 'Rule Engine' : 'AI');
            console.log('Preview:\n', res.content.substring(0, 500));
        } else {
            console.error('Error:', res.error);
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
test();
