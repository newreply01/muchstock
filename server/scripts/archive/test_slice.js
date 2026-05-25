const fs = require('fs');
const path = require('path');
const contextPath = path.join(__dirname, 'batch_context_reupdate_0_518.json');
const allContext = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
console.log('Total context items:', allContext.length);
const startIndex = 0;
const endIndex = 100;
const batchData = allContext.slice(startIndex, endIndex);
console.log('Batch data length:', batchData.length);
for (let i = 0; i < 10; i++) {
    console.log(`Item ${i}: ${batchData[i] ? batchData[i].symbol : 'UNDEFINED'}`);
}
