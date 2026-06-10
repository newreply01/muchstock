const { query } = require('./db');
async function getPrompt() {
    try {
        const res = await query('SELECT content FROM ai_prompt_templates ORDER BY id DESC LIMIT 1');
        console.log('---PROMPT_START---');
        console.log(res.rows[0]?.content || 'No prompt found');
        console.log('---PROMPT_END---');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
getPrompt();
