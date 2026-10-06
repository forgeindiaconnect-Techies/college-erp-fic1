import Assignment from '../models/Assignment.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import ActivityLog from '../models/ActivityLog.js';
import Student from '../models/Student.js';
import Staff from '../models/Staff.js';

// Create a new Assignment
export const createAssignment = async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.tenantId || req.user?.collegeId || 'unassigned_college';
    const {
      title,
      subject,
      department,
      class: targetClass,
      semester,
      course,
      description,
      dueDate,
      faculty,
      departmentId,
      courseId,
      semesterId,
      sectionId,
      section,
      subjectId,
      facultyId
    } = req.body;

    let parsedDueDate;
    if (dueDate) {
      const d = new Date(dueDate);
      parsedDueDate = isNaN(d.getTime()) ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : d;
    } else {
      parsedDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const newAssignment = new Assignment({
      collegeId,
      tenantId: collegeId,
      title: title || 'Untitled Coursework',
      subject: subject || 'General Subject',
      department: department || req.user?.department || 'General',
      class: targetClass || semester || 'Semester 1',
      semester: semester || targetClass || 'Semester 1',
      course: course || '',
      description: description || '',
      dueDate: parsedDueDate,
      faculty: faculty || req.user?.name || 'Faculty',
      facultyId: facultyId || (req.user?._id ? String(req.user._id) : null),
      departmentId: departmentId || null,
      courseId: courseId || null,
      semesterId: semesterId || null,
      sectionId: sectionId || null,
      section: section || 'All',
      subjectId: subjectId || null
    });

    await newAssignment.save();

    req.app.get('io')?.emit('dataUpdated', {
      module: 'assignments',
      action: 'created'
    });
    req.app.get('io')?.emit('assignments', {
      action: 'created',
      data: newAssignment
    });

    // Log Activity
    try {
      await ActivityLog.create({
        collegeId,
        userId: facultyId || req.user?._id || faculty,
        userName: faculty || req.user?.name,
        role: req.user?.role || 'Staff',
        action: `Posted new assignment: ${title}`,
        moduleName: 'Assignments',
        dept: department || req.user?.department,
        ip: req.ip || req.connection.remoteAddress
      });
    } catch (logErr) {
      console.error('Failed to log activity:', logErr);
    }

    res.status(201).json(newAssignment);
  } catch (err) {
    console.error('Error in createAssignment:', err);
    res.status(500).json({ message: 'Error creating assignment', error: err.message });
  }
};

// Get all assignments (optionally filter by dept/class/college)
export const getAssignments = async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.tenantId || req.user?.collegeId;
    const { department, class: targetClass, departmentId, semesterId, sectionId, faculty } = req.query;
    let query = {};
    if (req.user?.role !== 'Super Admin' && collegeId && collegeId !== 'system') {
      query.$or = [
        { collegeId },
        { tenantId: collegeId },
        { collegeId: 'unassigned_college' },
        { tenantId: 'unassigned_college' },
        { collegeId: 'mock_college_id' },
        { tenantId: 'mock_college_id' },
        { collegeId: null },
        { tenantId: null },
        { collegeId: { $exists: false } }
      ];
    }

    if (department && department !== 'all' && department !== 'All') {
      const deptRegex = new RegExp(department.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      const deptCond = {
        $or: [
          { department: department },
          { department: deptRegex },
          { course: deptRegex }
        ]
      };
      if (query.$or) {
        query.$and = [{ $or: query.$or }, deptCond];
        delete query.$or;
      } else {
        query.$or = deptCond.$or;
      }
    }

    if (faculty) {
      const facRegex = new RegExp(faculty.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      if (query.$and) {
        query.$and.push({ faculty: facRegex });
      } else {
        query.faculty = facRegex;
      }
    }

    if (departmentId) query.departmentId = departmentId;
    if (targetClass) {
      const semNum = String(targetClass).replace(/\D/g, '');
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { class: targetClass },
          { class: new RegExp(targetClass.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') },
          { semester: targetClass },
          ...(semNum ? [{ class: new RegExp(`sem.*${semNum}`, 'i') }, { semester: new RegExp(`sem.*${semNum}`, 'i') }] : [])
        ]
      });
    }
    if (semesterId) query.semesterId = semesterId;
    if (sectionId) query.sectionId = sectionId;

    const assignments = await Assignment.find(query).sort({ createdAt: -1 });
    res.status(200).json(assignments);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching assignments', error: err.message });
  }
};

// Submit an assignment
export const submitAssignment = async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId || req.user?.tenantId || 'mock_college_id';
    const { assignmentId } = req.params;
    const { studentId, studentName, department, fileName } = req.body;

    let assignment = await Assignment.findOne({
      _id: assignmentId,
      collegeId
    });

    if (!assignment) {
      assignment = await Assignment.findById(assignmentId);
    }

    if (!assignment) {
      return res.status(404).json({
        message: 'Assignment not found'
      });
    }

    if (
      req.user?.role === 'Student' &&
      req.user?.referenceId &&
      studentId &&
      req.user.referenceId !== studentId &&
      req.user.referenceId !== 'mock-id'
    ) {
      // Allow mock / demo logins if referenceId matches default or mock
      if (req.user.referenceId !== 'CS2022001' && studentId !== 'CS2022001') {
        return res.status(403).json({
          message: 'You can submit only your own assignment'
        });
      }
    }

    const student = await Student.findOne({
      $or: [
        { collegeId, id: studentId },
        { id: studentId }
      ]
    });

    if (student && assignment.sectionId && student.sectionId) {
      if (String(student.sectionId) !== String(assignment.sectionId)) {
        return res.status(403).json({
          message: 'This assignment is not allocated to your section'
        });
      }
    }

    const effectiveCollegeId = collegeId || assignment.collegeId || 'mock_college_id';

    // Check if already submitted
    const existing = await AssignmentSubmission.findOne({
      $or: [
        { collegeId: effectiveCollegeId, assignmentId, studentId },
        { assignmentId, studentId }
      ]
    });

    if (existing) {
      existing.fileName = fileName || 'assignment_submission.pdf';
      existing.status = 'Submitted';
      existing.collegeId = effectiveCollegeId;
      await existing.save();

      req.app.get('io').emit('dataUpdated', {
        module: 'assignments',
        action: 'submitted'
      });
      return res.status(200).json(existing);
    }

    const newSubmission = new AssignmentSubmission({
      collegeId: effectiveCollegeId,
      assignmentId,
      studentId: studentId || 'CS2022001',
      studentName: studentName || 'Student',
      department: department || assignment.department || 'General',
      fileName: fileName || 'assignment_submission.pdf'
    });
    await newSubmission.save();

    req.app.get('io').emit('dataUpdated', {
      module: 'assignments',
      action: 'submitted'
    });

    // Increment assignment submissionsCount
    await Assignment.findOneAndUpdate({
      _id: assignmentId
    }, {
      $inc: { submissionsCount: 1 }
    });

    res.status(201).json(newSubmission);
  } catch (err) {
    console.error('Error in submitAssignment:', err);
    res.status(500).json({ message: 'Error submitting assignment', error: err.message });
  }
};

// Get submissions for a specific assignment
export const getAssignmentSubmissions = async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId;
    const { assignmentId } = req.params;
    const submissions = await AssignmentSubmission.find({
      collegeId,
      assignmentId
    });
    res.status(200).json(submissions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching submissions', error: err.message });
  }
};

// Get submissions by student
export const getStudentSubmissions = async (req, res) => {
  try {
    const { studentId } = req.params;
    const submissions = await AssignmentSubmission.find({
      collegeId: req.collegeId || req.user?.collegeId,
      studentId
    });
    res.status(200).json(submissions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching student submissions', error: err.message });
  }
};
