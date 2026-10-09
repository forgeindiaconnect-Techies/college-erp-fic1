import express from 'express';
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
  io.to("college:" + collegeId).emit('dataUpdated', {
    module: 'placement',
    action,
    collegeId,
    ...data
  });
};

const tenantFilter = (req) => {
  if (req.user?.role === 'Super Admin') return {};
  const collegeId = req.collegeId || req.user?.tenantId || req.user?.collegeId;
  const knownColleges = ['COL001-9284712', 'COL002-8379189', 'COL003-5192834', 'COL004-3190860', 'system', 'unassigned_college', 'mock_college_id', ''];
  if (!collegeId || collegeId === 'system') {
    return {
      $or: [
        { collegeId: { $in: [null, undefined, ...knownColleges] } },
        { tenantId: { $in: [null, undefined, ...knownColleges] } }
      ]
    };
  }
  return {
    $or: [
      { collegeId: collegeId },
      { tenantId: collegeId },
      { collegeId: { $in: [null, undefined, ...knownColleges] } },
      { tenantId: { $in: [null, undefined, ...knownColleges] } }
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
    const jobs = await PlacementJob.find(tenantFilter(req)).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error fetching jobs' });
  }
});

router.post(
  '/jobs',
  protect,
  authorize('Admin', 'Principal', 'Sub-Admin', 'Placement', 'Placement Officer'),
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
        collegeId
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
            collegeId
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

    const application = await PlacementApplication.create({
      applicationId,
      studentId,
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

router.put(
  '/applications/:id/status',
  protect,
  authorize('Admin', 'Principal', 'Sub-Admin', 'Staff', 'Placement', 'Placement Officer'),
  collegeScope,
  async (req, res) => {
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

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: `Invalid application status. Allowed: ${allowedStatuses.join(', ')}`
        });
      }

      const filter = { _id: req.params.id, ...tenantFilter(req) };
      const currentApp = await PlacementApplication.findOne(filter);
      if (!currentApp) {
        return res.status(404).json({
          message: 'Application not found or unauthorized'
        });
      }

      const updatePayload = { status };
      if (roundName) {
        const roundEvaluations = currentApp.roundEvaluations || {};
        roundEvaluations[roundName] = {
          status,
          notes: notes || '',
          updatedAt: new Date()
        };
        updatePayload.roundEvaluations = roundEvaluations;
      }
      if (roundIndex !== undefined && status === 'Qualified') {
        updatePayload.currentRound = Math.max(Number(roundIndex) + 2, currentApp.currentRound || 1);
      }

      const application = await PlacementApplication.findOneAndUpdate(
        filter,
        { $set: updatePayload },
        { new: true }
      );

      if (status === 'Selected') {
        const job = await PlacementJob.findOne({
          company: application.company,
          role: application.role,
          ...tenantFilter(req)
        });

        const ctc = job ? job.ctc : 'TBD';
        const collegeId = getCollegeId(req);

        const existingSelection = await PlacementSelection.findOne({
          regNo: application.regNo,
          company: application.company,
          ...tenantFilter(req)
        });

        if (!existingSelection) {
          const selection = await PlacementSelection.create({
            selectionId: `SEL${Date.now()}`,
            student: application.student,
            regNo: application.regNo,
            company: application.company,
            role: application.role,
            ctc,
            date: new Date(),
            collegeId
          });
        }
      }

      emitPlacementUpdate(req, 'application_status_updated', { recordId: application._id, studentId: application.studentId, regNo: application.regNo, status: application.status });
      if (status === 'Selected') {
        emitPlacementUpdate(req, 'selection_created', { regNo: application.regNo, studentId: application.studentId });
      }

      res.json(application);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: 'Server Error updating application status'
      });
    }
  }
);

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












