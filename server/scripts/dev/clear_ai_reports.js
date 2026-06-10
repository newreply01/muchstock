const { query } = require('./db');
async function clearReports() {
    try {
        const res = await query('DELETE FROM ai_reports');
        console.log(`Successfully deleted ${res.rowCount} reports.`);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
clearReports();
