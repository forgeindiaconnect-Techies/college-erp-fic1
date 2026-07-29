const fs = require('fs');

const replaceInFile = (file, replacements) => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  for (const { search, replace } of replacements) {
    if (typeof search === 'string') {
      content = content.replace(search, replace);
    } else {
      content = content.replace(search, replace);
    }
  }
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
};

replaceInFile('src/principal/pages/PrincipalAcademicPlanning.jsx', [
  {
    search: /<div className="stat-card" style=\{\{ borderBottom: '3px solid var\(--primary\)', transition: 'none' \}\}>\s*<div className="stat-icon-wrapper text-white" style=\{\{ background: 'linear-gradient\(135deg, \\nvar\(--primary\), #3b82f6\)' \}\}>/g,
    replace: `<div className="stat-card" style={{ border: '1px solid #E3E5EC', transition: 'none' }}>\n            <div className="stat-icon-wrapper" style={{ background: '#EEEDFE', color: 'var(--primary)' }}>`
  },
  {
    search: /<div className="stat-card" style=\{\{ borderBottom: '3px solid var\(--success\)', transition: 'none' \}\}>\s*<div className="stat-icon-wrapper text-white" style=\{\{ background: 'var\(--primary\)' \}\}>/g,
    replace: `<div className="stat-card" style={{ border: '1px solid #E3E5EC', transition: 'none' }}>\n            <div className="stat-icon-wrapper" style={{ background: '#EEEDFE', color: 'var(--primary)' }}>`
  },
  {
    search: /<div className="stat-card" style=\{\{ borderBottom: '3px solid var\(--warning\)', transition: 'none' \}\}>\s*<div className="stat-icon-wrapper text-white" style=\{\{ background: 'var\(--primary\)' \}\}>/g,
    replace: `<div className="stat-card" style={{ border: '1px solid #E3E5EC', transition: 'none' }}>\n            <div className="stat-icon-wrapper" style={{ background: '#FFFBEB', color: 'var(--warning)' }}>`
  },
  {
    search: /<div className="stat-card" style=\{\{ borderBottom: '3px solid #6366F1', transition: 'none' \}\}>\s*<div className="stat-icon-wrapper text-white" style=\{\{ background: 'var\(--primary\)' \}\}>/g,
    replace: `<div className="stat-card" style={{ border: '1px solid #E3E5EC', transition: 'none' }}>\n            <div className="stat-icon-wrapper" style={{ background: '#EEEDFE', color: 'var(--primary)' }}>`
  },
  {
    search: /<div className="stat-card" style=\{\{ borderBottom: '3px solid var\(--secondary\)', minWidth: '240px', \\ntransition: 'none' \}\}>\s*<div className="stat-icon-wrapper text-white" style=\{\{ background: 'var\(--primary\)' \}\}>/g,
    replace: `<div className="stat-card" style={{ border: '1px solid #E3E5EC', minWidth: '240px', transition: 'none' }}>\n            <div className="stat-icon-wrapper" style={{ background: '#EEEDFE', color: 'var(--primary)' }}>`
  }
]);

// Wait, the regexes with newlines might fail because of whitespace formatting.
// Let's use a simpler approach for the hardcoded AcademicPlanning file: replace all borderBottom, then replace stat-icon-wrapper colors based on adjacent label.
