import express from 'express';
import PlacementCompany from '../models/PlacementCompany.js';
import PlacementJob from '../models/PlacementJob.js';
import PlacementApplication from '../models/PlacementApplication.js';
import PlacementInterview from '../models/PlacementInterview.js';
import PlacementSelection from '../models/PlacementSelection.js';
import Student from '../models/Student.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Multi-tenant college filter helper
 */
const getTenantFilter = (req) => {
  if (req.user?.role === 'Super Admin') {
    return {};
  }

  const collegeId = req.collegeId || req.user?.tenantId || req.user?.collegeId;
  if (!collegeId || collegeId === 'system') {
    return { collegeId: '__NO_COLLEGE__' };
  }

  if (collegeId === 'mock_college_id' || collegeId === 'unassigned_college') {
    return {
      $or: [
        { collegeId: collegeId },
        { tenantId: collegeId },
        { collegeId: { $in: [null, undefined, 'unassigned_college', 'mock_college_id'] } }
      ]
    };
  }

  return {
    $or: [
      { collegeId: collegeId },
      { tenantId: collegeId }
    ]
  };
};

const getCollegeIdForCreate = (req) => {
  return req.collegeId || req.user?.tenantId || req.user?.collegeId || 'unassigned_college';
};

// ==========================================
// COMPANIES
// ==========================================

// @desc    Get all placement companies for current college
// @route   GET /api/placement/companies
// @access  Private
router.get('/companies', protect, collegeScope, async (req, res) => {
  try {
    const filter = getTenantFilter(req);
    const companies = await PlacementCompany.find(filter).sort({ createdAt: -1 });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching companies' });
  }
});

// @desc    Add a placement company
// @route   POST /api/placement/companies
// @access  Private/Admin/Principal/Sub-Admin/Placement
router.post('/companies', protect, authorize('Admin', 'Principal', 'Sub-Admin', 'Placement', 'Placement Officer'), collegeScope, async (req, res) => {
  try {
    const { name, sector, location, status, logo, website, hrName, hrEmail, hrContact } = req.body;
    const companyId = `COMP${Date.now()}`;
    const collegeId = getCollegeIdForCreate(req);
    const company = await PlacementCompany.create({ 
      companyId, name, sector, location, status,
      logo, website, hrName, hrEmail, hrContact,
      collegeId
    });
    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating company' });
  }
});

// @desc    Update a placement company
// @route   PUT /api/placement/companies/:id
// @access  Private/Admin/Principal/Sub-Admin/Placement
router.put('/companies/:id', protect, authorize('Admin', 'Principal', 'Sub-Admin', 'Placement', 'Placement Officer'), collegeScope, async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getTenantFilter(req) };
    const company = await PlacementCompany.findOneAndUpdate(filter, req.body, { new: true });
    if (!company) return res.status(404).json({ message: 'Company not found or unauthorized' });
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating company' });
  }
});

// @desc    Delete a placement company
// @route   DELETE /api/placement/companies/:id
// @access  Private/Admin/Principal/Sub-Admin/Placement
router.delete('/companies/:id', protect, authorize('Admin', 'Principal', 'Sub-Admin', 'Placement', 'Placement Officer'), collegeScope, async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getTenantFilter(req) };
    const company = await PlacementCompany.findOneAndDelete(filter);
    if (!company) return res.status(404).json({ message: 'Company not found or unauthorized' });
    res.json({ message: 'Company removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error deleting company' });
  }
});

// ==========================================
// JOBS
// ==========================================

// @desc    Get all placement jobs for current college
// @route   GET /api/placement/jobs
// @access  Private
router.get('/jobs', protect, collegeScope, async (req, res) => {
  try {
    const filter = getTenantFilter(req);
    const jobs = await PlacementJob.find(filter).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching jobs' });
  }
});

// @desc    Add a placement job
// @route   POST /api/placement/jobs
// @access  Private/Admin/Principal/Sub-Admin/Placement
router.post('/jobs', protect, authorize('Admin', 'Principal', 'Sub-Admin', 'Placement', 'Placement Officer'), collegeScope, async (req, res) => {
  try {
    const { company, role, ctc, eligibility, minCgpa, maxArrears, eligibleDepartments, driveDate, deadline } = req.body;
    const jobId = `JOB${Date.now()}`;
    const collegeId = getCollegeIdForCreate(req);
    const job = await PlacementJob.create({ 
      jobId, company, role, ctc, eligibility, 
      minCgpa: minCgpa || 0,
      maxArrears: maxArrears || 0,
      eligibleDepartments: eligibleDepartments || [], 
      driveDate,
      deadline,
      collegeId
    });
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating job' });
  }
});

// @desc    Update a placement job
// @route   PUT /api/placement/jobs/:id
// @access  Private/Admin/Principal/Sub-Admin/Placement
router.put('/jobs/:id', protect, authorize('Admin', 'Principal', 'Sub-Admin', 'Placement', 'Placement Officer'), collegeScope, async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getTenantFilter(req) };
    const job = await PlacementJob.findOneAndUpdate(filter, req.body, { new: true });
    if (!job) return res.status(404).json({ message: 'Job not found or unauthorized' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating job' });
  }
});

// @desc    Delete a placement job
// @route   DELETE /api/placement/jobs/:id
// @access  Private/Admin/Principal/Sub-Admin/Placement
router.delete('/jobs/:id', protect, authorize('Admin', 'Principal', 'Sub-Admin', 'Placement', 'Placement Officer'), collegeScope, async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getTenantFilter(req) };
    const job = await PlacementJob.findOneAndDelete(filter);
    if (!job) return res.status(404).json({ message: 'Job not found or unauthorized' });
    res.json({ message: 'Job removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error deleting job' });
  }
});

// @desc    Get eligible students for a specific job (Tenant isolated)
// @route   GET /api/placement/jobs/:id/eligible-students
// @access  Private/Admin/Staff/HOD/Placement
router.get('/jobs/:id/eligible-students', protect, collegeScope, async (req, res) => {
  try {
    const jobFilter = { _id: req.params.id, ...getTenantFilter(req) };
    const job = await PlacementJob.findOne(jobFilter);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const studentFilter = getTenantFilter(req);
    const students = await Student.find(studentFilter);
    
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

// ==========================================
// APPLICATIONS
// ==========================================

// @desc    Get all placement applications for current college
// @route   GET /api/placement/applications
// @access  Private
router.get('/applications', protect, collegeScope, async (req, res) => {
  try {
    const filter = getTenantFilter(req);
    const applications = await PlacementApplication.find(filter)
      .populate('studentId', 'name dept cgpa arrears')
      .sort({ createdAt: -1 });
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
    const collegeId = getCollegeIdForCreate(req);
    const application = await PlacementApplication.create({
      applicationId, studentId, student, regNo, dept, cgpa, company, role,
      collegeId
    });
    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating application' });
  }
});

// @desc    Update placement application status
// @route   PUT /api/placement/applications/:id/status
// @access  Private/Admin/Staff/Placement
router.put('/applications/:id/status', protect, authorize('Admin', 'Principal', 'Sub-Admin', 'Staff', 'Placement', 'Placement Officer'), collegeScope, async (req, res) => {
  try {
    const collegeId = getCollegeIdForCreate(req);
    const filter = { _id: req.params.id, ...getTenantFilter(req) };
    const application = await PlacementApplication.findOneAndUpdate(
      filter,
      { status: req.body.status },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({ message: 'Application not found or unauthorized' });
    }

    // If marked as selected, auto-create a selection record to feed HOD/Principal dashboards
    if (req.body.status === 'Selected') {
      const job = await PlacementJob.findOne({ 
        company: application.company, 
        role: application.role,
        ...getTenantFilter(req)
      });
      const ctc = job ? job.ctc : 'TBD';
      
      const existingSelection = await PlacementSelection.findOne({ 
        regNo: application.regNo, 
        company: application.company,
        ...getTenantFilter(req)
      });
      
      if (!existingSelection) {
        await PlacementSelection.create({
          selectionId: `SEL${Date.now()}`,
          student: application.student,
          regNo: application.regNo,
          company: application.company,
          role: application.role,
          ctc: ctc,
          date: new Date(),
          collegeId
        });
      }
    }

    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating application status' });
  }
});

// ==========================================
// INTERVIEWS
// ==========================================

// @desc    Get all placement interviews for current college
// @route   GET /api/placement/interviews
// @access  Private
router.get('/interviews', protect, collegeScope, async (req, res) => {
  try {
    const filter = getTenantFilter(req);
    const interviews = await PlacementInterview.find(filter).sort({ date: 1, time: 1 });
    res.json(interviews);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching interviews' });
  }
});

// @desc    Add a placement interview
// @route   POST /api/placement/interviews
// @access  Private/Admin/Staff/Placement
router.post('/interviews', protect, authorize('Admin', 'Principal', 'Sub-Admin', 'Staff', 'Placement', 'Placement Officer'), collegeScope, async (req, res) => {
  try {
    const { company, role, round, date, time, mode, venue, panel, candidates } = req.body;
    const interviewId = `INT${Date.now()}`;
    const collegeId = getCollegeIdForCreate(req);
    const interview = await PlacementInterview.create({ 
      interviewId, company, role, round, date, time, mode, venue, panel, candidates,
      collegeId
    });
    res.status(201).json(interview);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating interview' });
  }
});

// @desc    Update a placement interview
// @route   PUT /api/placement/interviews/:id
// @access  Private/Admin/Staff/Placement
router.put('/interviews/:id', protect, authorize('Admin', 'Principal', 'Sub-Admin', 'Staff', 'Placement', 'Placement Officer'), collegeScope, async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getTenantFilter(req) };
    const interview = await PlacementInterview.findOneAndUpdate(filter, req.body, { new: true });
    if (!interview) return res.status(404).json({ message: 'Interview not found or unauthorized' });
    res.json(interview);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating interview' });
  }
});

// @desc    Delete a placement interview
// @route   DELETE /api/placement/interviews/:id
// @access  Private/Admin/Staff/Placement
router.delete('/interviews/:id', protect, authorize('Admin', 'Principal', 'Sub-Admin', 'Staff', 'Placement', 'Placement Officer'), collegeScope, async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getTenantFilter(req) };
    const interview = await PlacementInterview.findOneAndDelete(filter);
    if (!interview) return res.status(404).json({ message: 'Interview not found or unauthorized' });
    res.json({ message: 'Interview removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error deleting interview' });
  }
});

// ==========================================
// SELECTIONS
// ==========================================

// @desc    Get all placement selections for current college
// @route   GET /api/placement/selections
// @access  Private
router.get('/selections', protect, collegeScope, async (req, res) => {
  try {
    const filter = getTenantFilter(req);
    const selections = await PlacementSelection.find(filter).sort({ date: -1 });
    res.json(selections);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching selections' });
  }
});

// @desc    Add a placement selection
// @route   POST /api/placement/selections
// @access  Private/Admin/Staff/Placement
router.post('/selections', protect, authorize('Admin', 'Principal', 'Sub-Admin', 'Staff', 'Placement', 'Placement Officer'), collegeScope, async (req, res) => {
  try {
    const { student, regNo, company, role, ctc, date } = req.body;
    const selectionId = `SEL${Date.now()}`;
    const collegeId = getCollegeIdForCreate(req);
    const selection = await PlacementSelection.create({ 
      selectionId, student, regNo, company, role, ctc, date,
      collegeId
    });
    res.status(201).json(selection);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating selection' });
  }
});

// @desc    Update a placement selection
// @route   PUT /api/placement/selections/:id
// @access  Private/Admin/Staff/Placement
router.put('/selections/:id', protect, authorize('Admin', 'Principal', 'Sub-Admin', 'Staff', 'Placement', 'Placement Officer'), collegeScope, async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getTenantFilter(req) };
    const selection = await PlacementSelection.findOneAndUpdate(filter, req.body, { new: true });
    if (!selection) return res.status(404).json({ message: 'Selection not found or unauthorized' });
    res.json(selection);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating selection' });
  }
});

// @desc    Delete a placement selection
// @route   DELETE /api/placement/selections/:id
// @access  Private/Admin/Staff/Placement
router.delete('/selections/:id', protect, authorize('Admin', 'Principal', 'Sub-Admin', 'Staff', 'Placement', 'Placement Officer'), collegeScope, async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...getTenantFilter(req) };
    const selection = await PlacementSelection.findOneAndDelete(filter);
    if (!selection) return res.status(404).json({ message: 'Selection not found or unauthorized' });
    res.json({ message: 'Selection removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error deleting selection' });
  }
});

export default router;
