
const configName = process.argv[2] || 'config';

const config = require(`./lpkickrun-${configName}.json`);

const req = config;

// console.log(JSON.stringify(req));
require('./lpkick.js')(req);