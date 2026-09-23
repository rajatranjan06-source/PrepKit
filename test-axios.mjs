
const axios = require('axios');
axios.get('https://example.com')
  .then(r => console.log('OK:', r.status))
  .catch(e => console.log('Error:', e.code, e.message));
