export const formatDeptWithCourse = (deptName) => {
  if (!deptName || deptName === 'All' || deptName === 'All Departments') return deptName;
  const name = deptName.toString();

  // MBA
  if (name.includes('Business') || name === 'MBA') return `M.B.A. - ${name}`;
  
  // MCA / BCA
  if (name.includes('Bachelor of Computer') || name === 'BCA') return `B.C.A. - ${name}`;
  if (name.includes('Master of Computer') || name === 'MCA') return `M.C.A. - ${name}`;

  // B.Tech
  if (name.includes('Information Technology') || 
      name.includes('Artificial Intelligence & Data Science') || 
      name.includes('Biotechnology')) {
    return `B.Tech. - ${name}`;
  }

  // B.E. (Default for engineering branches)
  if (name.includes('Engineering') || 
      name.includes('Cyber Security') ||
      name.includes('Computer Science') ||
      name.includes('Electronics') ||
      name.includes('Electrical') ||
      name.includes('Mechanical') ||
      name.includes('Civil') ||
      name.includes('Robotics') ||
      name.includes('Automobile') ||
      name.includes('Aeronautical') ||
      name.includes('Chemical')) {
    return `B.E. - ${name}`;
  }

  // Fallback
  return name;
};
