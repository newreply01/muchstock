fetch('https://openapi.twse.com.tw/v1/exchangeReport/TWT93U').then(r=>r.json()).then(j=>{
    const tsmc = j.find(x => x.Code === '2330');
    console.log(tsmc);
}).catch(console.error);
