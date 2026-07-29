const fs = require('fs');
const path = require('path');

function getFiles(dir, suffix) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(getFiles(file, suffix));
    } else { 
      if (file.endsWith(suffix)) results.push(file);
    }
  });
  return results;
}

const files = getFiles('e:/Antigravity/New folder/src', 'Sidebar.css');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace color: white; for header and titles
  content = content.replace(/color:\s*white;/g, 'color: var(--sidebar-header-text);');
  
  // Replace color: #FFFFFF; for active/hover links
  content = content.replace(/color:\s*#ffffff;/gi, 'color: var(--sidebar-hover-text);');
  
  // Replace border for admin-badge
  content = content.replace(/rgba\(255, 255, 255, 0\.05\)/g, 'var(--border-color)');
  content = content.replace(/rgba\(255, 255, 255, 0\.1\)/g, 'var(--border-color)');

  // Ensure active nav link keeps white text
  content = content.replace(/\.nav-link\.active\s*\{\s*[^}]*?color:\s*var\(--sidebar-hover-text\);/gi, match => match.replace('var(--sidebar-hover-text)', '#FFFFFF'));
  content = content.replace(/\.active\s*\{\s*[^}]*?color:\s*var\(--sidebar-hover-text\);/gi, match => match.replace('var(--sidebar-hover-text)', '#FFFFFF'));
  content = content.replace(/\.student-nav-link\.active\s*\{\s*[^}]*?color:\s*var\(--sidebar-hover-text\);/gi, match => match.replace('var(--sidebar-hover-text)', '#FFFFFF'));

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Updated ${file}`);
}
