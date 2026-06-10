const { generateAIReport } = require('./utils/ai_service');
async function run() {
    const res = await generateAIReport('2330');
    console.log('---FULL_CONTENT_START---');
    console.log(res.content);
    console.log('---FULL_CONTENT_END---');
    process.exit(0);
}
run();
