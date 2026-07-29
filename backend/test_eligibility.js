import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import PlacementJob from './models/PlacementJob.js';
import Student from './models/Student.js';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const job = await PlacementJob.findOne({ company: 'Fic' });
  const students = await Student.find({});
  
  const eligibleStudents = [];
  const notEligibleStudents = [];

  students.forEach(student => {
    let isEligible = true;
    let reason = [];

    const studentCgpa = parseFloat(student.cgpa || 0);
    if (job.minCgpa > 0 && studentCgpa < job.minCgpa) {
      isEligible = false;
      reason.push('Low CGPA');
    }

    const studentArrears = parseInt(student.arrears || 0);
    if (job.maxArrears >= 0 && studentArrears > job.maxArrears) {
      isEligible = false;
      reason.push('Excess Arrears');
    }

    if (job.eligibleDepartments && job.eligibleDepartments.length > 0 && job.eligibleDepartments[0] !== '') {
      const matchesDept = job.eligibleDepartments.some(d => {
        const sDept = (student.dept || '').toLowerCase().replace(/\s+/g, '');
        const jDept = d.toLowerCase().replace(/\s+/g, '');
        return sDept.includes(jDept) || sDept === jDept;
      });
      if (!matchesDept) {
        isEligible = false;
        reason.push('Dept Not Eligible');
      }
    }

    if (student.name === 'Dhanush' || student.name === 'Sabari') {
      console.log(`[${student.name}] isEligible:`, isEligible, reason, 'minCgpa:', job.minCgpa, 'studentCgpa:', studentCgpa);
    }
  });

  process.exit(0);
});
