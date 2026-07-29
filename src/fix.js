const fs = require('fs');
const content = fs.readFileSync('e:/Antigravity/New folder/src/index.css', 'utf8');

const header = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  /* Premium SaaS Enterprise Color Palette */
  --bg-primary: #F8FAFC; 
  --bg-secondary: #FFFFFF;
  --bg-card: #FFFFFF; 
  
  /* Sidebar Design: Unique Premium Gradient */
  --sidebar-bg: linear-gradient(180deg, #111827 0%, #1e1b4b 100%);
  --sidebar-hover: rgba(255, 255, 255, 0.1);
  --sidebar-text: #cbd5e1;
  
  --primary: #4F46E5; 
  --primary-gradient: linear-gradient(135deg, #4F46E5, #7C3AED); 
  --secondary: #7C3AED; 
  --accent: #06B6D4;
  
  --text-main: #0F172A; 
  --text-muted: #64748B;
  --text-light: #94A3B8;
  
  --border-color: #E2E8F0;
  
  --success: #10B981; 
  --warning: #F59E0B; 
  --danger: #EF4444;

  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
`;

const lines = content.split('\n');
const startIndex = lines.findIndex(line => line.includes('--shadow-card: 0 4px 20px rgba(0, 0, 0, 0.08);'));
const remainingContent = lines.slice(startIndex).join('\n');

fs.writeFileSync('e:/Antigravity/New folder/src/index.css', header + remainingContent);
