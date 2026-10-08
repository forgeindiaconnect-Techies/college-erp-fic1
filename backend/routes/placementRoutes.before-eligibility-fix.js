import express from 'express';
import PlacementCompany from '../models/PlacementCompany.js';
import PlacementJob from '../models/PlacementJob.js';
import PlacementApplication from '../models/PlacementApplication.js';
import PlacementInterview from '../models/PlacementInterview.js';
import PlacementSelection from '../models/PlacementSelection.js';
import Student from '../models/Student.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

const tenantFilter = (req) => {
  if (req.user?.role === 'Super Admin') return {};
  const collegeId = req.collegeId || req.user?.tenantId || req.user?.collegeId;
  if (!collegeId || collegeId === 'system') return { collegeId: '__NO_COLLEGE__' };
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

      const companyId = `COMP${Date.now()}`;
      const collegeId = getCollegeId(req);

      const company = await PlacementCompany.create({
        companyId,
        name,
        sector,
        location,
        status: status || 'Active',
        logo,
        website,
        hrName,
        hrEmail,
        hrContact,
        collegeId
      });

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
        deadline
      } = req.body;

      const jobId = `JOB${Date.now()}`;
      const collegeId = getCollegeId(req);

      const job = await PlacementJob.create({
        jobId,
        company,
        role,
        ctc,
        eligibility,
        minCgpa: minCgpa || 0,
        maxArrears: maxArrears ?? 0,
        eligibleDepartments: eligibleDepartments || [],
        driveDate,
        deadline,
        collegeId
      });

      res.status(201).json(job);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error creating job' });
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

    const studentFilter = tenantFilter(req);
    const students = await Student.find(studentFilter);

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

    res.status(201).json(application);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Server Error creating application'
    });
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
        'Selected'
      ];

      const { status } = req.body;

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: `Invalid application status. Allowed: ${allowedStatuses.join(', ')}`
        });
      }

      const filter = { _id: req.params.id, ...tenantFilter(req) };
      const application = await PlacementApplication.findOneAndUpdate(
        filter,
        { status },
        { new: true }
      );

      if (!application) {
        return res.status(404).json({
          message: 'Application not found or unauthorized'
        });
      }

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
          await PlacementSelection.create({
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

      res.json({ message: 'Selection removed' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server Error deleting selection' });
    }
  }
);

export default router;
