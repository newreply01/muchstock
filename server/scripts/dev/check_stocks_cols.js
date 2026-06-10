const { query } = require('./db');

async function checkColumns() {
  try {
    const res = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'stocks'");
    console.log(res.rows.map(r => r.column_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkColumns();
