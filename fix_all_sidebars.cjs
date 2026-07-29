const fs = require('fs');
const files = [
  'src/subadmin/components/SubAdminSidebar.jsx',
  'src/student/components/StudentSidebar.jsx',
  'src/staff/components/StaffSidebar.jsx',
  'src/parent/components/ParentSidebar.jsx',
  'src/hod/components/HodSidebar.jsx',
  'src/driver/components/DriverSidebar.jsx',
  'src/accounts/components/AccountsSidebar.jsx'
];

const newHeader = `      <div className="sidebar-header">
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
            src="/logo.svg" 
            alt="ERPSYS Logo" 
            style={{ height: '32px', objectFit: 'contain' }} 
          />
        )}
      </div>`;

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Add SettingsContext import if missing
    if (!content.includes('SettingsContext')) {
      content = content.replace(/import React.*?;/, "$&\nimport { SettingsContext } from '../../App';");
    }
    
    // Add collegeSettings context usage if missing
    if (!content.includes('const { collegeSettings }')) {
      content = content.replace(/const \w+ = \(\{.*?\}\) => \{/, "$&\n  const { collegeSettings } = React.useContext(SettingsContext);");
    }

    // Replace the old sidebar-header
    content = content.replace(/<div className="sidebar-header"[^>]*>[\s\S]*?<img src="\/logo\.svg[^>]*>[\s\S]*?<\/div>/i, newHeader);
    
    fs.writeFileSync(file, content);
    console.log('Fixed ' + file);
  }
});
