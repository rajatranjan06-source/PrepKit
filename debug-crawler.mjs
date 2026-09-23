
require('ts-node').register({ transpileOnly: true });
const { crawlWebsite } = require('./src/services/crawler');
crawlWebsite('https://example.com').then(r => console.log('Pages:', r.pages.length, 'Failed:', r.failedUrls)).catch(e => console.log('Error:', e.message, e.stack));
