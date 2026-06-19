const fs = require('fs');

let content = fs.readFileSync('Dockerfile', 'utf8');

const search = `RUN npm config set fetch-retries 5 && \\
    npm config set fetch-retry-mintimeout 60000 && \\
    npm config set fetch-retry-maxtimeout 300000 && \\
    npm config set fetch-timeout 600000 && \\
    npm ci`;

const replace = `RUN npm config set fetch-retries 5 && \\
    npm config set fetch-retry-mintimeout 600000 && \\
    npm config set fetch-retry-maxtimeout 1200000 && \\
    npm config set fetch-timeout 1800000 && \\
    npm ci --prefer-offline --no-audit`;

content = content.replace(search, replace);

fs.writeFileSync('Dockerfile', content);
