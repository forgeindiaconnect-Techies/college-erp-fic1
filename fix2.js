const fs = require('fs');
const path = 'src/pages/Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('`n', '');
fs.writeFileSync(path, content);
console.log('Fixed Dashboard.jsx');
