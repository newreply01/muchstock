const { updateDailyStats } = require('./server/utils/statsAggregator');

async function backfill() {
    for(let i=7; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
        await updateDailyStats(dStr);
    }
    console.log('done');
    process.exit(0);
}
backfill().catch(console.error);
