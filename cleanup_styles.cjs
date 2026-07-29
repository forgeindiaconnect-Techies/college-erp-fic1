const fs = require('fs');
const path = require('path');

const walk = (dir, callback) => {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

const cleanFiles = () => {
  walk('./src', (filePath) => {
    if (filePath.endsWith('.jsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;

      // Clean up common bad styles
      content = content.replace(/ style=\{\{ background: '#ffffff', border: '1px solid #e5e7eb'(, [^}]+)? \}\}/gi, '');
      content = content.replace(/ style=\{\{ background: '#FFFFFF', padding: '1\.25rem', borderRadius: '12px', border: '1px solid #E3E5EC'[^}]+\}\}/gi, '');
      content = content.replace(/ style=\{\{ color: '#fff' \}\}/gi, '');
      content = content.replace(/ style=\{\{ color: '#ffffff' \}\}/gi, '');
      content = content.replace(/ style=\{\{ fontSize: '1\.5rem', color: '#fff' \}\}/gi, '');
      content = content.replace(/ style=\{\{ color: 'var\(--primary\)' \}\}/gi, '');

      // Clean up staff stats details bad injections
      content = content.replace(/ style=\{\{ fontWeight: 600, color: "#6b7280" \}\}/g, '');
      content = content.replace(/ style=\{\{ fontWeight: 700, color: "#111827" \}\}/g, '');
      content = content.replace(/ style=\{\{ fontSize: "0\.72rem", color: "#9ca3af", margin: 0, fontWeight: 500 \}\}/g, '');
      content = content.replace(/ style=\{\{ fontSize: "0\.72rem", color: "#10b981", margin: 0, fontWeight: 500 \}\}/g, '');
      content = content.replace(/ style=\{\{ fontSize: "0\.72rem", color: "#ef4444", margin: 0, fontWeight: 500 \}\}/g, '');
      
      // Remove empty style={{}}
      content = content.replace(/ style=\{\{\s*\}\}/g, '');
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Cleaned inline styles in:', filePath);
      }
    } else if (filePath.endsWith('.css')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let originalContent = content;
      
      // Clean up bad !important styles
      content = content.replace(/ !important/g, '');
      content = content.replace(/\/\* hardcoded navlink \*\//g, '');
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Cleaned CSS in:', filePath);
      }
    }
  });
};

cleanFiles();
