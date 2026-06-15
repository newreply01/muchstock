require('dotenv').config({path: '.env'});
const { fetchFinMind } = require('./server/finmind_full_sync.js');
fetchFinMind('TaiwanStockDayTrading', '2330').then(console.log).catch(console.error).finally(()=>process.exit(0));
