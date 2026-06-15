fetch('https://www.twse.com.tw/exchangeReport/TWTB4U?response=json&date=20240530').then(r=>r.json()).then(j=>{
    if(j.tables && j.tables.length > 1) {
        console.log(j.tables[1].fields);
        console.log(j.tables[1].data.find(x => x[0] === '2330'));
    }
}).catch(console.error);
