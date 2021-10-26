
const configName = process.argv[2] || 'config2';

const config = require(`./lpkickrun-${configName}.json`);

const req = config;

console.log(JSON.stringify(req));
require('./lpkick.js')(req);