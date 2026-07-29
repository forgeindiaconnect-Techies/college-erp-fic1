import express from 'express';
import PlacementCompany from '../models/PlacementCompany.js';
import PlacementJob from '../models/PlacementJob.js';
import PlacementApplication from '../models/PlacementApplication.js';
import PlacementInterview from '../models/PlacementInterview.js';
import PlacementSelection from '../models/PlacementSelection.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get all placement companies
// @route   GET /api/placement/companies
// @access  Private
router.get('/companies', protect, collegeScope, async (req, res) => {
  try {
    const companies = await PlacementCompany.find({});
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching companies' });
  }
});

// @desc    Add a placement company
// @route   POST /api/placement/companies
// @access  Private/Admin
router.post('/companies', protect, authorize('Admin', 'Principal', 'Sub-Admin'), collegeScope, async (req, res) => {
  try {
    const { name, sector, location, status, logo, website, hrName, hrEmail, hrContact } = req.body;
    const companyId = `COMP${Date.now()}`;
    const company = await PlacementCompany.create({ 
      companyId, name, sector, location, status,
      logo, website, hrName, hrEmail, hrContact
    });
    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating company' });
  }
});

// @desc    Update a placement company
// @route   PUT /api/placement/companies/:id
// @access  Private/Admin
router.put('/companies/:id', protect, authorize('Admin', 'Principal', 'Sub-Admin'), collegeScope, async (req, res) => {
  try {
    const company = await PlacementCompany.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating company' });
  }
});

// @desc    Delete a placement company
// @route   DELETE /api/placement/companies/:id
// @access  Private/Admin
router.delete('/companies/:id', protect, authorize('Admin', 'Principal', 'Sub-Admin'), collegeScope, async (req, res) => {
  try {
    await PlacementCompany.findByIdAndDelete(req.params.id);
    res.json({ message: 'Company removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error deleting company' });
  }
});

// @desc    Get all placement jobs
// @route   GET /api/placement/jobs
// @access  Private
router.get('/jobs', protect, collegeScope, async (req, res) => {
  try {
    const jobs = await PlacementJob.find({});
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching jobs' });
  }
});

// @desc    Add a placement job
// @route   POST /api/placement/jobs
// @access  Private/Admin
router.post('/jobs', protect, authorize('Admin', 'Principal', 'Sub-Admin'), collegeScope, async (req, res) => {
  try {
    const { company, role, ctc, eligibility, minCgpa, maxArrears, eligibleDepartments, driveDate, deadline } = req.body;
    const jobId = `JOB${Date.now()}`;
    const job = await PlacementJob.create({ 
      jobId, company, role, ctc, eligibility, 
      minCgpa: minCgpa || 0,
      maxArrears: maxArrears || 0,
      eligibleDepartments: eligibleDepartments || [], 
      driveDate,
      deadline 
    });
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating job' });
  }
});

// @desc    Update a placement job
// @route   PUT /api/placement/jobs/:id
// @access  Private/Admin
router.put('/jobs/:id', protect, authorize('Admin', 'Principal', 'Sub-Admin'), collegeScope, async (req, res) => {
  try {
    const job = await PlacementJob.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating job' });
  }
});

// @desc    Delete a placement job
// @route   DELETE /api/placement/jobs/:id
// @access  Private/Admin
router.delete('/jobs/:id', protect, authorize('Admin', 'Principal', 'Sub-Admin'), collegeScope, async (req, res) => {
  try {
    await PlacementJob.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error deleting job' });
  }
});

// @desc    Get eligible students for a specific job
// @route   GET /api/placement/jobs/:id/eligible-students
// @access  Private/Admin/Staff/HOD
import Student from '../models/Student.js';

router.get('/jobs/:id/eligible-students', protect, collegeScope, async (req, res) => {
  try {
    const job = await PlacementJob.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Find all students matching criteria
    // Note: In our Student model, dept might be 'Computer Science' while job.eligibleDepartments might be 'CSE'.
    // We would either need mapping or assume the UI sends the correct dept codes matching the Student.dept values.
    // Let's do a simple filter. Since CGPA might be stored differently, we'll try to find students with cgpa >= minCgpa.
    
    // For this prototype, we'll fetch all students and filter in memory if schema is complex, but let's try direct mongo query.
    // If job.eligibleDepartments is empty, it means all departments are eligible.
    let query = {};
    if (job.eligibleDepartments && job.eligibleDepartments.length > 0) {
       // Just doing a simple regex/in match. In reality, requires rigorous code mapping.
       // We will do a generic approach: fetch all, filter.
    }

    const students = await Student.find({});
    
    const eligibleStudents = [];
    const notEligibleStudents = [];

    students.forEach(student => {
      let isEligible = true;
      let reason = [];

      // Check CGPA (assuming student.cgpa is stored as a string or number, default to 0 if missing)
      const studentCgpa = parseFloat(student.cgpa || 0);
      if (job.minCgpa > 0 && studentCgpa < job.minCgpa) {
        isEligible = false;
        reason.push('Low CGPA');
      }

      // Check Arrears (assuming student.arrears is stored as a number, default to 0 if missing)
      // Since student model might not have arrears explicitly, we default to 0 or parse it if it exists.
      const studentArrears = parseInt(student.arrears || 0);
      if (job.maxArrears >= 0 && studentArrears > job.maxArrears) {
        isEligible = false;
        reason.push('Excess Arrears');
      }

      // Check Department
      if (job.eligibleDepartments && job.eligibleDepartments.length > 0 && job.eligibleDepartments[0] !== '') {
        const deptAbbreviations = {
          'computer science': 'cse',
          'computer science engineering': 'cse',
          'information technology': 'it',
          'electronics & communication engineering': 'ece',
          'electronics and communication engineering': 'ece',
          'electrical & electronics engineering': 'eee',
          'electrical and electronics engineering': 'eee',
          'mechanical engin': 'mech',
          'mechanical engineering': 'mech',
          'civil engineering': 'civil',
          'bachelor of computer app': 'bca',
          'master of business admin': 'mba',
          'artificial intelligence': 'ai',
          'cyber security': 'csc',
          'aeronautical engineering': 'aero'
        };

        const matchesDept = job.eligibleDepartments.some(d => {
          const sDeptOriginal = (student.dept || '').toLowerCase().trim();
          const sDeptAbbr = deptAbbreviations[sDeptOriginal] || deptAbbreviations[sDeptOriginal.replace('.', '')] || sDeptOriginal;
          
          const sDept = sDeptOriginal.replace(/\s+/g, '');
          const jDept = d.toLowerCase().replace(/\s+/g, '');
          
          return sDept.includes(jDept) || sDept === jDept || sDeptAbbr.includes(jDept) || sDeptAbbr === jDept;
        });
        if (!matchesDept) {
          isEligible = false;
          reason.push('Dept Not Eligible');
        }
      }

      const studentData = {
        id: student.id || student.referenceId || student._id,
        name: student.name,
        dept: student.dept,
        cgpa: student.cgpa || 0,
        arrears: student.arrears || 0,
        reason: reason.join(', ')
      };

      if (isEligible) {
        eligibleStudents.push(studentData);
      } else {
        notEligibleStudents.push(studentData);
      }
    });

    res.json({ eligible: eligibleStudents, notEligible: notEligibleStudents });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error fetching eligible students' });
  }
});

// @desc    Get all placement applications
// @route   GET /api/placement/applications
// @access  Private
router.get('/applications', protect, collegeScope, async (req, res) => {
  try {
    const applications = await PlacementApplication.find({})
      .populate('studentId', 'name dept cgpa arrears');
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching applications' });
  }
});

// @desc    Apply for a placement drive
// @route   POST /api/placement/applications
// @access  Private
router.post('/applications', protect, collegeScope, async (req, res) => {
  try {
    const { studentId, student, regNo, dept, cgpa, company, role } = req.body;
    const applicationId = `APP${Date.now()}`;
    const application = await PlacementApplication.create({
      applicationId, studentId, student, regNo, dept, cgpa, company, role
    });
    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating application' });
  }
});

// @desc    Update placement application status
// @route   PUT /api/placement/applications/:id/status
// @access  Private/Admin/Staff
router.put('/applications/:id/status', protect, authorize('Admin', 'Principal', 'Sub-Admin', 'Staff'), collegeScope, async (req, res) => {
  try {
    const application = await PlacementApplication.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    // If marked as selected, auto-create a selection record to feed HOD/Principal dashboards
    if (req.body.status === 'Selected') {
      const job = await PlacementJob.findOne({ company: application.company, role: application.role });
      const ctc = job ? job.ctc : 'TBD';
      
      const existingSelection = await PlacementSelection.findOne({ 
        regNo: application.regNo, company: application.company 
      });
      
      if (!existingSelection) {
        await PlacementSelection.create({
          selectionId: `SEL${Date.now()}`,
          student: application.student,
          regNo: application.regNo,
          company: application.company,
          role: application.role,
          ctc: ctc,
          date: new Date()
        });
      }
    }

    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating application status' });
  }
});

// @desc    Get all placement interviews
// @route   GET /api/placement/interviews
// @access  Private
router.get('/interviews', protect, collegeScope, async (req, res) => {
  try {
    const interviews = await PlacementInterview.find({});
    res.json(interviews);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching interviews' });
  }
});

// @desc    Add a placement interview
// @route   POST /api/placement/interviews
// @access  Private/Admin/Staff
router.post('/interviews', protect, authorize('Admin', 'Principal', 'Sub-Admin', 'Staff'), collegeScope, async (req, res) => {
  try {
    const { company, role, round, date, time, mode, venue, panel, candidates } = req.body;
    const interviewId = `INT${Date.now()}`;
    const interview = await PlacementInterview.create({ interviewId, company, role, round, date, time, mode, venue, panel, candidates });
    res.status(201).json(interview);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating interview' });
  }
});

// @desc    Get all placement selections
// @route   GET /api/placement/selections
// @access  Private
router.get('/selections', protect, collegeScope, async (req, res) => {
  try {
    const selections = await PlacementSelection.find({});
    res.json(selections);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching selections' });
  }
});

// @desc    Add a placement selection
// @route   POST /api/placement/selections
// @access  Private/Admin/Staff
router.post('/selections', protect, authorize('Admin', 'Principal', 'Sub-Admin', 'Staff'), collegeScope, async (req, res) => {
  try {
    const { student, regNo, company, role, ctc, date } = req.body;
    const selectionId = `SEL${Date.now()}`;
    const selection = await PlacementSelection.create({ selectionId, student, regNo, company, role, ctc, date });
    res.status(201).json(selection);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating selection' });
  }
});

export default router;
