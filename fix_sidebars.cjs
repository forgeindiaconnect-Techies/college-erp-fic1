const fs = require('fs');
const path = require('path');
const sidebars = [
  'src/accounts/components/AccountsSidebar.jsx',
  'src/driver/components/DriverSidebar.jsx',
  'src/hod/components/HodSidebar.jsx',
  'src/parent/components/ParentSidebar.jsx',
  'src/principal/components/PrincipalSidebar.jsx',
  'src/staff/components/StaffSidebar.jsx',
  'src/student/components/StudentSidebar.jsx',
  'src/subadmin/components/SubAdminSidebar.jsx'
];

sidebars.forEach(file => {
  const fullPath = path.join('e:/Antigravity/New folder', file);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  
  if (!content.includes('SettingsContext')) {
    content = content.replace(/import React([^;]+);/, "import React$1;\nimport { SettingsContext } from '../../App';");
  }
  
  const componentMatch = content.match(/(const [a-zA-Z]+Sidebar = \([^)]+\) => \{)/);
  if (componentMatch && !content.includes('collegeSettings')) {
    content = content.replace(componentMatch[1], componentMatch[1] + "\n  const { collegeSettings } = React.useContext(SettingsContext);");
  }
  
  const headerRegex = /<div className=\"sidebar-header\">[\s\S]*?<button className=\"sidebar-close-btn\"/;
  const newHeader = `<div className=\"sidebar-header\">
        {collegeSettings?.collegeLogo ? (
          <img 
            src={collegeSettings.collegeLogo} 
            alt={collegeSettings.collegeName || "College Logo"} 
            style={{ height: '32px', objectFit: 'contain' }} 
          />
        ) : collegeSettings?.collegeName ? (
          <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--sidebar-text-active, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
            {collegeSettings.collegeName}
          </div>
        ) : (
          <img 
            src="/logo.svg?v=1782115707199" 
            alt="ERPSYS Logo" 
            style={{ height: '32px', objectFit: 'contain' }} 
          />
        )}
        <button className="sidebar-close-btn"`;
  content = content.replace(headerRegex, newHeader);
  
  fs.writeFileSync(fullPath, content);
  console.log('Updated', file);
});
