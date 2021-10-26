const config = require('./lpkickrun-config3.json');
const req = config;
console.log(JSON.stringify(req));
require('./lpkick.js')(req);
