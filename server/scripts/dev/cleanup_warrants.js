const { query } = require('./db');
require('dotenv').config();

async function cleanupWarrantReports() {
  try {
    console.log('Cleaning up invalid reports for warrants...');
    const res = await query(`
      DELETE FROM ai_reports
      WHERE NOT (symbol ~ '^\\d{4}$' OR symbol ~ '^00\\d{4}$')
    `);
    console.log(`Deleted ${res.rowCount} invalid AI reports.`);
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

cleanupWarrantReports();
