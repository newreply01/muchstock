const fetch = require('node-fetch');
async function testTPExOpenApi() {
    try {
        const res = await fetch('https://www.tpex.org.tw/openapi/v1/tpex_intraday_trading_statistics');
        const json = await res.json();
        console.log("Count:", json.length);
        if(json.length > 0) console.log(json[0]);
    } catch(e) {
        console.error("Error:", e.message);
    }
}
testTPExOpenApi();
