'use strict';
const fs = require('fs');
const path = require('path');
const spec = require('./mob-api/swagger');
fs.writeFileSync(path.join(__dirname, 'swagger-mob-output.json'), JSON.stringify(spec, null, 2) + '\n');
console.log('Generated customer mobile OpenAPI specification.');
