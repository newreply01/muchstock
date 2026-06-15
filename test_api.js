require('dotenv').config({path: '.env'});
const { fetchFinMind } = require('./server/finmind_full_sync.js');
fetchFinMind('TaiwanStockTotalReturnIndex', 'TAIEX', '2024-05-30').then(data => {
    console.log('TAIEX Returned data size:', data ? data.length : 0);
}).catch(console.error).finally(()=>process.exit(0));
