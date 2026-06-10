const { query } = require('./db');
async function check2330() {
    try {
        const res = await query("SELECT content FROM ai_reports WHERE symbol = '2330'");
        console.log('---DB_CONTENT_START---');
        console.log(res.rows[0]?.content);
        console.log('---DB_CONTENT_END---');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
check2330();
