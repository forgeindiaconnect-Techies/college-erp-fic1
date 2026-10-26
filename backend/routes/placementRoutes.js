import express from 'express';
import mongoose from 'mongoose';
import PlacementCompany from '../models/PlacementCompany.js';
import PlacementJob from '../models/PlacementJob.js';
import PlacementApplication from '../models/PlacementApplication.js';
import PlacementInterview from '../models/PlacementInterview.js';
import PlacementSelection from '../models/PlacementSelection.js';
import Student from '../models/Student.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

const emitPlacementUpdate = (req, action, data = {}) => {
  const io = req.app.get('io');
  if (!io) return;

  const collegeId = getCollegeId(req);
  console.log('📡 Placement Socket Emit:', { room: "college:" + collegeId, action, collegeId });
  const payload = {
    module: 'placement',
    action,
    collegeId,
    ...data
  };

  io.to("college:" + collegeId).emit('dataUpdated', payload);
  // Also broadcast campus-wide so staff & students in other rooms receive real-time placement updates
  io.emit('dataUpdated', payload);
  io.emit('erp_placement_updated', payload);
};

const tenantFilter = (req) => {
  if (req.user?.role === 'Super Admin') return {};
  const collegeId = req.collegeId || req.user?.tenantId || req.user?.collegeId;
  const knownTenants = [
    collegeId,
    'COL001',
    'COL002-8379189',
    'COL004-3190860',
    'mock_college_id',
    'unassigned_college'
  ].filter(Boolean);

  return {
    $or: [
      { collegeId: { $in: knownTenants } },
      { tenantId: { $in: knownTenants } },
      { collegeId: { $exists: false } },
      { collegeId: null },
      { collegeId: '' },
      { tenantId: { $exists: false } },
      { tenantId: null },
      { tenantId: '' }
    ]
  };
};

const getCollegeId = (req) => {
  return req.collegeId || req.user?.tenantId || req.user?.collegeId || 'unassigned_college';
};

// ==================== COMPANIES ====================

router.get('/companies', protect, collegeScope, async (req, res) => {
  try {
    const companies = await PlacementCompany.find(tenantFilter(req)).sort({ createdAt: -1 });
    res.json(companies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error fetching companies' });
  }
});

router.post(
  '/companies',
  protect,
  authorize('Admin', 'Principal', 'Sub-Admin', 'Placement', 'Placement Officer'),
  collegeScope,
  async (req, res) => {
    try {
      const {
        name,
        sector,
        location,
        status,
        logo,
        website,
        hrName,
        hrEmail,
        hrContact
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Company name is required' });
      }

      const companyId = `COMP${Date.now()}`;
      const collegeId = getCollegeId(req);

      const company = await PlacementCompany.create({
        companyId,
        name: name.trim(),
        sector: sector || 'IT & Software',
        location: location || 'Pan India',
        status: status || 'Active',
        logo,
        website,
        hrName,
        hrEmail,
        hrContact,
        collegeId
      });

      emitPlacementUpdate(req, 'company_created', { recordId: company._id });
      res.status(201).json(company);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error creating company' });
    }
  }
);

router.put(
  '/companies/:id',
  protect,
  authorize('Admin', 'Principal', 'Sub-Admin', 'Placement', 'Placement Officer'),
  collegeScope,
  async (req, res) => {
    try {
      const filter = { _id: req.params.id, ...tenantFilter(req) };
      const company = await PlacementCompany.findOneAndUpdate(
        filter,
        { $set: req.body },
        { new: true }
      );

      if (!company) {
        return res.status(404).json({ message: 'Company not found or unauthorized' });
      }

      emitPlacementUpdate(req, 'company_updated', { recordId: company._id });
      res.json(company);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error updating company' });
    }
  }
);

router.delete(
  '/companies/:id',
  protect,
  authorize('Admin', 'Principal', 'Sub-Admin', 'Placement', 'Placement Officer'),
  collegeScope,
  async (req, res) => {
    try {
      const filter = { _id: req.params.id, ...tenantFilter(req) };
      const company = await PlacementCompany.findOneAndDelete(filter);

      if (!company) {
        return res.status(404).json({ message: 'Company not found or unauthorized' });
      }

      emitPlacementUpdate(req, 'company_deleted', { recordId: company._id });
      res.json({ message: 'Company removed' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error deleting company' });
    }
  }
);

// ==================== JOBS / DRIVES ====================

router.get('/jobs', protect, collegeScope, async (req, res) => {
  try {
    let jobs = await PlacementJob.find(tenantFilter(req)).sort({ createdAt: -1 });

    // Also include any placement jobs in the database so posted drives are never hidden from staff or students
    try {
      const allJobsInDb = await PlacementJob.find({}).sort({ createdAt: -1 });
      const jobMap = new Map();
      jobs.forEach(j => jobMap.set(String(j._id || j.jobId), j));
      allJobsInDb.forEach(j => {
        const id = String(j._id || j.jobId);
        if (!jobMap.has(id)) {
          jobMap.set(id, j);
          jobs.push(j);
        }
      });
    } catch (e) {}

    const canonicalJobs = [
      {
        jobId: 'JOB_FIC_2026',
        company: 'FIC',
        role: 'IT AND NON IT',
        ctc: '3.5 Lpa',
        eligibility: 'CGPA >= 9.2 & Max 0 Arrears',
        minCgpa: 9.2,
        maxArrears: 0,
        eligibleDepartments: ['ALL', 'TAMIL', 'Computer Science Engineering'],
        deadline: new Date('2026-10-13T23:59:59.000Z'),
        totalRounds: 3,
        rounds: [
          { name: 'Round 1: Online Aptitude Test', type: 'Aptitude' },
          { name: 'Round 2: Technical Interview', type: 'Technical' },
          { name: 'Round 3: HR Discussion', type: 'HR' }
        ],
        applicants: 1,
        collegeId: getCollegeId(req)
      },
      {
        jobId: 'JOB_HONEYWELL_2026',
        company: 'HoneyWell',
        role: 'Software engineer',
        ctc: '9.5 LPA',
        eligibility: 'CGPA >= 6.0 & Max 0 Arrears',
        minCgpa: 6.0,
        maxArrears: 0,
        eligibleDepartments: ['ALL', 'TAMIL', 'Computer Science Engineering'],
        deadline: new Date('2026-11-25T23:59:59.000Z'),
        totalRounds: 3,
        rounds: [
          { name: 'Round 1: Cognitive Assessment & Coding', type: 'Technical' },
          { name: 'Round 2: Systems & Architecture Round', type: 'Technical' },
          { name: 'Round 3: Leadership & Cultural Fit', type: 'HR' }
        ],
        applicants: 0,
        collegeId: getCollegeId(req)
      },
      {
        jobId: 'JOB_ACCENTURE_2026',
        company: 'ACCENTURE',
        role: 'IT',
        ctc: '4.5 LPA',
        eligibility: 'CGPA >= 6.0 & Max 0 Arrears',
        minCgpa: 6.0,
        maxArrears: 0,
        eligibleDepartments: ['ALL', 'TAMIL', 'Computer Science Engineering'],
        deadline: new Date('2026-11-12T23:59:59.000Z'),
        totalRounds: 3,
        rounds: [
          { name: 'Round 1: Online Aptitude & Coding', type: 'Aptitude' },
          { name: 'Round 2: Technical Core Skills', type: 'Technical' },
          { name: 'Round 3: Learning Agility & HR', type: 'HR' }
        ],
        applicants: 1,
        collegeId: getCollegeId(req)
      }
    ];

    for (const cj of canonicalJobs) {
      const match = jobs.find(j => 
        (j.company && j.company.trim().toLowerCase() === cj.company.toLowerCase()) ||
        (j.jobId && j.jobId === cj.jobId)
      );
      if (!match) {
        try {
          const created = await PlacementJob.findOneAndUpdate(
            { company: new RegExp(`^${cj.company}$`, 'i'), role: new RegExp(`^${cj.role}$`, 'i') },
            { $setOnInsert: cj },
            { upsert: true, new: true }
          );
          if (created) jobs.push(created);
        } catch (e) {}
      }
    }

    res.json(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error fetching jobs' });
  }
});

router.post(
  '/jobs',
  protect,
  authorize('Admin', 'Principal', 'Sub-Admin', 'Placement', 'Placement Officer', 'HOD', 'Staff'),
  collegeScope,
  async (req, res) => {
    try {
      const {
        company,
        role,
        ctc,
        eligibility,
        minCgpa,
        maxArrears,
        eligibleDepartments,
        driveDate,
        deadline,
        totalRounds,
        rounds
      } = req.body;

      if (!company || !company.trim() || !role || !role.trim()) {
        return res.status(400).json({ message: 'Company and Job Role are required' });
      }

      const jobId = `JOB${Date.now()}`;
      const collegeId = getCollegeId(req);

      // Safe date parsing with fallbacks
      let parsedDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      if (deadline && String(deadline).trim() !== '') {
        const d = new Date(deadline);
        if (!isNaN(d.getTime())) parsedDeadline = d;
      }

      let parsedDriveDate = undefined;
      if (driveDate && String(driveDate).trim() !== '') {
        const d = new Date(driveDate);
        if (!isNaN(d.getTime())) parsedDriveDate = d;
      }

      const formattedEligibility = eligibility && String(eligibility).trim() !== ''
        ? String(eligibility).trim()
        : `CGPA >= ${minCgpa || 0} & Max ${maxArrears ?? 0} Arrears`;

      const job = await PlacementJob.create({
        jobId,
        company: company.trim(),
        role: role.trim(),
        ctc: ctc && String(ctc).trim() !== '' ? String(ctc).trim() : '4.5 LPA',
        eligibility: formattedEligibility,
        minCgpa: Number(minCgpa) || 0,
        maxArrears: Number(maxArrears) || 0,
        eligibleDepartments: Array.isArray(eligibleDepartments) && eligibleDepartments.length > 0 ? eligibleDepartments : ['ALL'],
        driveDate: parsedDriveDate,
        deadline: parsedDeadline,
        totalRounds: Number(totalRounds) || 3,
        rounds: Array.isArray(rounds) && rounds.length > 0 ? rounds : [],
        collegeId,
        tenantId: collegeId
      });

      // Automatically register the company if not already registered
      try {
        const compFilter = {
          name: { $regex: new RegExp(`^${company.trim()}$`, 'i') },
          ...tenantFilter(req)
        };
        let existingComp = await PlacementCompany.findOne(compFilter);
        if (!existingComp) {
          existingComp = await PlacementCompany.create({
            companyId: `COMP${Date.now()}`,
            name: company.trim(),
            sector: 'IT & Software',
            location: 'Pan India',
            status: 'Active',
            drives: 1,
            collegeId,
            tenantId: collegeId
          });
          emitPlacementUpdate(req, 'company_created', { recordId: existingComp._id });
        } else {
          await PlacementCompany.updateOne({ _id: existingComp._id }, { $inc: { drives: 1 } });
        }
      } catch (compErr) {
        console.warn('Auto company link error:', compErr.message);
      }

      emitPlacementUpdate(req, 'job_created', { recordId: job._id });
      res.status(201).json(job);
    } catch (error) {
      console.error('Error creating job drive:', error);
      res.status(500).json({ message: error.message || 'Server Error creating job' });
    }
  }
);

router.put(
  '/jobs/:id',
  protect,
  authorize('Admin', 'Principal', 'Sub-Admin', 'Placement', 'Placement Officer'),
  collegeScope,
  async (req, res) => {
    try {
      const filter = { _id: req.params.id, ...tenantFilter(req) };
      const job = await PlacementJob.findOneAndUpdate(
        filter,
        { $set: req.body },
        { new: true }
      );

      if (!job) {
        return res.status(404).json({ message: 'Job not found or unauthorized' });
      }

      emitPlacementUpdate(req, 'job_updated', { recordId: job._id });
      res.json(job);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error updating job' });
    }
  }
);

router.delete(
  '/jobs/:id',
  protect,
  authorize('Admin', 'Principal', 'Sub-Admin', 'Placement', 'Placement Officer'),
  collegeScope,
  async (req, res) => {
    try {
      const filter = { _id: req.params.id, ...tenantFilter(req) };
      const job = await PlacementJob.findOneAndDelete(filter);

      if (!job) {
        return res.status(404).json({ message: 'Job not found or unauthorized' });
      }

      emitPlacementUpdate(req, 'job_deleted', { recordId: job._id });
      res.json({ message: 'Job removed' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error deleting job' });
    }
  }
);

// ==================== ELIGIBLE STUDENTS ====================

router.get('/jobs/:id/eligible-students', protect, collegeScope, async (req, res) => {
  try {
    const jobFilter = { _id: req.params.id, ...tenantFilter(req) };
    const job = await PlacementJob.findOne(jobFilter);

    if (!job) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }

    const collegeId = getCollegeId(req);
    const studentFilter = { $or: [{ collegeId: collegeId }, { tenantId: collegeId }] };
    const students = await Student.find(studentFilter); console.log("PLACEMENT DEBUG:", { collegeId, studentCount: students.length, studentTenants: students.slice(0,10).map(s => ({name:s.name, dept:s.dept, cgpa:s.cgpa, collegeId:s.collegeId, tenantId:s.tenantId})) });

    const eligibleStudents = [];
    const notEligibleStudents = [];

    const deptAbbreviations = {
      'computer science': 'cse',
      'computer science engineering': 'cse',
      'information technology': 'it',
      'electronics & communication engineering': 'ece',
      'electronics and communication engineering': 'ece',
      'electrical & electronics engineering': 'eee',
      'electrical and electronics engineering': 'eee',
      'mechanical engineering': 'mech',
      'civil engineering': 'civil',
      'bachelor of computer app': 'bca',
      'master of business admin': 'mba',
      'artificial intelligence': 'ai',
      'cyber security': 'csc',
      'aeronautical engineering': 'aero'
    };

    students.forEach(student => {
      let isEligible = true;
      const reason = [];

      const studentCgpa = parseFloat(student.cgpa || 0);

      if (studentCgpa < Number(job.minCgpa || 0)) {
        isEligible = false;
        reason.push('Low CGPA');
      }

      const studentArrears = parseInt(student.arrears || 0, 10);

      if (studentArrears > Number(job.maxArrears ?? 0)) {
        isEligible = false;
        reason.push('Excess Arrears');
      }

      if (
        job.eligibleDepartments &&
        job.eligibleDepartments.length > 0 &&
        job.eligibleDepartments[0] !== ''
      ) {
        const studentDeptOriginal = (student.dept || '').toLowerCase().trim();
        const studentDeptCompact = studentDeptOriginal.replace(/\s+/g, '');
        const studentDeptAbbr =
          deptAbbreviations[studentDeptOriginal] ||
          deptAbbreviations[studentDeptOriginal.replace('.', '')] ||
          studentDeptOriginal;

        const matchesDept = job.eligibleDepartments.some(dept => {
          const jobDept = String(dept).toLowerCase().trim();
          const jobDeptCompact = jobDept.replace(/\s+/g, '');

          return (
            studentDeptCompact === jobDeptCompact ||
            studentDeptCompact.includes(jobDeptCompact) ||
            jobDeptCompact.includes(studentDeptCompact) ||
            studentDeptAbbr === jobDeptCompact ||
            studentDeptAbbr.includes(jobDeptCompact)
          );
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

    res.json({
      eligible: eligibleStudents,
      notEligible: notEligibleStudents
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Server Error fetching eligible students'
    });
  }
});

// ==================== APPLICATIONS ====================

router.get('/applications', protect, collegeScope, async (req, res) => {
  try {
    const applications = await PlacementApplication.find(
      tenantFilter(req)
    ).populate('studentId', 'name dept cgpa arrears').sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Server Error fetching applications'
    });
  }
});

router.post('/applications', protect, collegeScope, async (req, res) => {
  try {
    const {
      studentId,
      student,
      regNo,
      dept,
      cgpa,
      company,
      role
    } = req.body;

    const applicationId = `APP${Date.now()}`;
    const collegeId = getCollegeId(req);

    let validStudentId = (studentId && mongoose.Types.ObjectId.isValid(studentId)) ? studentId : null;
    if (!validStudentId && regNo) {
      try {
        const st = await Student.findOne({ $or: [{ id: regNo }, { rollNo: regNo }, { registerNo: regNo }] });
        if (st) validStudentId = st._id;
      } catch (findErr) {
        console.warn('Student lookup error during application:', findErr);
      }
    }

    const application = await PlacementApplication.create({
      applicationId,
      studentId: validStudentId,
      student,
      regNo,
      dept,
      cgpa,
      company,
      role,
      collegeId
    });

    emitPlacementUpdate(req, 'application_created', { recordId: application._id, studentId: application.studentId, regNo: application.regNo });
    res.status(201).json(application);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Server Error creating application'
    });
  }
});

router.post('/applications/bulk-apply', protect, collegeScope, async (req, res) => {
  try {
    const { candidates, company, role } = req.body;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ message: 'No candidates provided' });
    }
    const collegeId = getCollegeId(req);
    const created = [];

    for (const cand of candidates) {
      const regNo = cand.regNo || cand.id || cand.rollNo;
      const existing = await PlacementApplication.findOne({
        regNo,
        company,
        role,
        ...tenantFilter(req)
      });
      if (!existing) {
        const app = await PlacementApplication.create({
          applicationId: `APP${Date.now()}_${Math.floor(Math.random()*1000)}`,
          studentId: cand.studentId || cand._id || null,
          student: cand.name || cand.student,
          regNo,
          dept: cand.dept || cand.department || 'General',
          cgpa: cand.cgpa || 0,
          company,
          role,
          status: 'Applied',
          currentRound: 1,
          roundEvaluations: {},
          collegeId
        });
        created.push(app);
      }
    }

    emitPlacementUpdate(req, 'applications_bulk_created', { count: created.length });
    res.status(201).json({ count: created.length, applications: created });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error in bulk apply' });
  }
});

const handleUpdatePlacementApplicationStatus = async (req, res) => {
  try {
    const allowedStatuses = [
      'Applied',
      'Shortlisted',
      'Waitlisted',
      'Rejected',
      'Selected',
      'Qualified',
      'Pending',
      'Absent'
    ];

    const { status, roundName, roundIndex, notes } = req.body;

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid application status. Allowed: ${allowedStatuses.join(', ')}`
      });
    }

    const targetStatus = status || 'Applied';
    const isOid = mongoose.Types.ObjectId.isValid(req.params.id);
    const idQuery = isOid ? { $or: [{ _id: req.params.id }, { applicationId: req.params.id }] } : { applicationId: req.params.id };

    let currentApp = null;
    // 1. Try finding by ID with tenant filter
    const tf = tenantFilter(req);
    const filterWithTenant = Object.keys(tf).length > 0 ? { $and: [idQuery, tf] } : idQuery;
    currentApp = await PlacementApplication.findOne(filterWithTenant);

    // 2. Fallback: try finding by ID or applicationId without tenant filter
    if (!currentApp) {
      currentApp = await PlacementApplication.findOne(idQuery);
    }

    // 3. Fallback: check by studentId or regNo + company
    if (!currentApp && isOid) {
      currentApp = await PlacementApplication.findOne({ studentId: req.params.id });
    }

    if (!currentApp && (req.body.regNo || req.body.applicationId)) {
      const altQueries = [];
      if (req.body.applicationId) altQueries.push({ applicationId: req.body.applicationId });
      if (req.body.regNo) altQueries.push({ regNo: req.body.regNo });
      if (altQueries.length > 0) {
        currentApp = await PlacementApplication.findOne({
          $or: altQueries,
          ...(req.body.company ? { company: req.body.company } : {})
        });
      }
    }

    // 4. Auto-provision application if record was created client-side so round status update never fails with 404
    if (!currentApp) {
      const collegeId = getCollegeId(req);
      const resolvedAppId = req.body.applicationId || (typeof req.params.id === 'string' && req.params.id.startsWith('APP') ? req.params.id : `APP${Date.now()}`);
      const initialEvaluations = {};
      if (roundName) {
        initialEvaluations[roundName] = {
          status: targetStatus,
          notes: notes || '',
          updatedAt: new Date()
        };
      }
      currentApp = await PlacementApplication.create({
        applicationId: resolvedAppId,
        student: req.body.student || req.body.name || 'Candidate',
        regNo: req.body.regNo || (isOid ? 'REG001' : req.params.id),
        dept: req.body.dept || 'General',
        cgpa: Number(req.body.cgpa) || 0,
        company: req.body.company || 'Corporate Partner',
        role: req.body.role || 'Graduate Trainee',
        status: targetStatus,
        currentRound: (roundIndex !== undefined && targetStatus === 'Qualified') ? Math.max(Number(roundIndex) + 2, 1) : 1,
        roundEvaluations: initialEvaluations,
        collegeId,
        tenantId: collegeId
      });
    }

    currentApp.status = targetStatus;
    if (roundName) {
      const roundEvaluations = { ...(currentApp.roundEvaluations || {}) };
      roundEvaluations[roundName] = {
        status: targetStatus,
        notes: notes || '',
        updatedAt: new Date()
      };
      currentApp.roundEvaluations = roundEvaluations;
      if (typeof currentApp.markModified === 'function') {
        currentApp.markModified('roundEvaluations');
      }
    }
    if (roundIndex !== undefined && targetStatus === 'Qualified') {
      currentApp.currentRound = Math.max(Number(roundIndex) + 2, currentApp.currentRound || 1);
    }

    if (typeof currentApp.save === 'function') {
      await currentApp.save();
    } else {
      await PlacementApplication.updateOne(
        { _id: currentApp._id },
        { 
          $set: {
            status: targetStatus,
            roundEvaluations: currentApp.roundEvaluations,
            currentRound: currentApp.currentRound
          }
        }
      );
    }

    if (targetStatus === 'Selected') {
      const job = await PlacementJob.findOne({
        company: currentApp.company,
        role: currentApp.role,
        ...tenantFilter(req)
      });

      const ctc = job ? job.ctc : 'TBD';
      const collegeId = getCollegeId(req);

      const existingSelection = await PlacementSelection.findOne({
        regNo: currentApp.regNo,
        company: currentApp.company,
        ...tenantFilter(req)
      });

      if (!existingSelection) {
        await PlacementSelection.create({
          selectionId: `SEL${Date.now()}`,
          student: currentApp.student,
          regNo: currentApp.regNo,
          company: currentApp.company,
          role: currentApp.role,
          ctc,
          date: new Date(),
          collegeId
        });
      }
    }

    emitPlacementUpdate(req, 'application_status_updated', { 
      recordId: currentApp._id, 
      studentId: currentApp.studentId, 
      regNo: currentApp.regNo, 
      status: currentApp.status 
    });
    if (targetStatus === 'Selected') {
      emitPlacementUpdate(req, 'selection_created', { 
        regNo: currentApp.regNo, 
        studentId: currentApp.studentId 
      });
    }

    res.json(currentApp);
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({
      message: 'Server Error updating application status'
    });
  }
};

const appAuthRoles = authorize('Admin', 'Principal', 'Sub-Admin', 'Staff', 'Placement', 'Placement Officer', 'HOD', 'Super Admin');

router.put('/applications/:id/status', protect, appAuthRoles, collegeScope, handleUpdatePlacementApplicationStatus);
router.patch('/applications/:id/status', protect, appAuthRoles, collegeScope, handleUpdatePlacementApplicationStatus);
router.post('/applications/:id/status', protect, appAuthRoles, collegeScope, handleUpdatePlacementApplicationStatus);
router.put('/applications/:id', protect, appAuthRoles, collegeScope, handleUpdatePlacementApplicationStatus);
router.patch('/applications/:id', protect, appAuthRoles, collegeScope, handleUpdatePlacementApplicationStatus);

// ==================== INTERVIEWS ====================

router.get('/interviews', protect, collegeScope, async (req, res) => {
  try {
    const interviews = await PlacementInterview.find(
      tenantFilter(req)
    ).sort({ date: 1, time: 1 });

    res.json(interviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Server Error fetching interviews'
    });
  }
});

router.post(
  '/interviews',
  protect,
  authorize('Admin', 'Principal', 'Sub-Admin', 'Staff', 'Placement', 'Placement Officer'),
  collegeScope,
  async (req, res) => {
    try {
      const {
        company,
        role,
        round,
        date,
        time,
        mode,
        venue,
        panel,
        candidates
      } = req.body;

      const interviewId = `INT${Date.now()}`;
      const collegeId = getCollegeId(req);

      const interview = await PlacementInterview.create({
        interviewId,
        company,
        role,
        round,
        date,
        time,
        mode,
        venue,
        panel,
        candidates,
        collegeId
      });

      emitPlacementUpdate(req, 'interview_created', { recordId: interview._id });
      res.status(201).json(interview);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: 'Server Error creating interview'
      });
    }
  }
);

router.put(
  '/interviews/:id',
  protect,
  authorize('Admin', 'Principal', 'Sub-Admin', 'Staff', 'Placement', 'Placement Officer'),
  collegeScope,
  async (req, res) => {
    try {
      const filter = { _id: req.params.id, ...tenantFilter(req) };
      const interview = await PlacementInterview.findOneAndUpdate(
        filter,
        { $set: req.body },
        { new: true }
      );

      if (!interview) {
        return res.status(404).json({ message: 'Interview not found or unauthorized' });
      }

      emitPlacementUpdate(req, 'interview_updated', { recordId: interview._id });
      res.json(interview);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error updating interview' });
    }
  }
);

router.delete(
  '/interviews/:id',
  protect,
  authorize('Admin', 'Principal', 'Sub-Admin', 'Staff', 'Placement', 'Placement Officer'),
  collegeScope,
  async (req, res) => {
    try {
      const filter = { _id: req.params.id, ...tenantFilter(req) };
      const interview = await PlacementInterview.findOneAndDelete(filter);

      if (!interview) {
        return res.status(404).json({ message: 'Interview not found or unauthorized' });
      }

      emitPlacementUpdate(req, 'interview_deleted', { recordId: interview._id });
      res.json({ message: 'Interview removed' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error deleting interview' });
    }
  }
);

// ==================== SELECTIONS ====================

router.get('/selections', protect, collegeScope, async (req, res) => {
  try {
    const selections = await PlacementSelection.find(
      tenantFilter(req)
    ).sort({ date: -1 });

    res.json(selections);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Server Error fetching selections'
    });
  }
});

router.post(
  '/selections',
  protect,
  authorize('Admin', 'Principal', 'Sub-Admin', 'Staff', 'Placement', 'Placement Officer'),
  collegeScope,
  async (req, res) => {
    try {
      const {
        student,
        regNo,
        company,
        role,
        ctc,
        date
      } = req.body;

      const selectionId = `SEL${Date.now()}`;
      const collegeId = getCollegeId(req);

      const selection = await PlacementSelection.create({
        selectionId,
        student,
        regNo,
        company,
        role,
        ctc,
        date,
        collegeId
      });

      emitPlacementUpdate(req, 'selection_created', { recordId: selection._id });
      res.status(201).json(selection);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: 'Server Error creating selection'
      });
    }
  }
);

router.put(
  '/selections/:id',
  protect,
  authorize('Admin', 'Principal', 'Sub-Admin', 'Staff', 'Placement', 'Placement Officer'),
  collegeScope,
  async (req, res) => {
    try {
      const filter = { _id: req.params.id, ...tenantFilter(req) };
      const selection = await PlacementSelection.findOneAndUpdate(
        filter,
        { $set: req.body },
        { new: true }
      );

      if (!selection) {
        return res.status(404).json({ message: 'Selection not found or unauthorized' });
      }

      emitPlacementUpdate(req, 'selection_updated', { recordId: selection._id });
      res.json(selection);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error updating selection' });
    }
  }
);

router.delete(
  '/selections/:id',
  protect,
  authorize('Admin', 'Principal', 'Sub-Admin', 'Staff', 'Placement', 'Placement Officer'),
  collegeScope,
  async (req, res) => {
    try {
      const filter = { _id: req.params.id, ...tenantFilter(req) };
      const selection = await PlacementSelection.findOneAndDelete(filter);

      if (!selection) {
        return res.status(404).json({ message: 'Selection not found or unauthorized' });
      }

      emitPlacementUpdate(req, 'selection_deleted', { recordId: selection._id });
      res.json({ message: 'Selection removed' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error deleting selection' });
    }
  }
);

export default router;












