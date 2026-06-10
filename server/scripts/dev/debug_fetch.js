const fetch = require('node-fetch');
const nodeFetch = fetch.default || fetch;

async function debug() {
    const url = 'https://www.twse.com.tw/exchangeReport/MI_MARGN?response=json&date=20260320';
    console.log(`Fetching ${url}...`);
    const res = await nodeFetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
}

debug().catch(console.error);
