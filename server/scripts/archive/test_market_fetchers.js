
const { fetchMarketInstitutional, fetchMarketMargin } = require('../twse_fetcher');

async function test() {
    const testDate = new Date('2026-03-20');
    console.log('--- Testing Market Institutional ---');
    await fetchMarketInstitutional(testDate);
    console.log('--- Testing Market Margin ---');
    await fetchMarketMargin(testDate);
    console.log('Done.');
    process.exit(0);
}

test();
