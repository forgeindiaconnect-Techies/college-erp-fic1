import Assignment from '../models/Assignment.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import ActivityLog from '../models/ActivityLog.js';
import Student from '../models/Student.js';
import Staff from '../models/Staff.js';

// Create a new Assignment
export const createAssignment = async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId;
    const {
      title,
      subject,
      department,
      class: targetClass,
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

    const newAssignment = new Assignment({
      collegeId,
      title,
      subject,
      department,
      class: targetClass,
      description,
      dueDate,
      faculty,
      departmentId: departmentId || null,
      courseId: courseId || null,
      semesterId: semesterId || null,
      sectionId: sectionId || null,
      section: section || null,
      subjectId: subjectId || null,
      facultyId: facultyId || null
    });

    await newAssignment.save();

    req.app.get('io').emit('dataUpdated', {
      module: 'assignments',
      action: 'created'
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
        dept: department,
        ip: req.ip || req.connection.remoteAddress
      });
    } catch (logErr) {
      console.error('Failed to log activity:', logErr);
    }

    res.status(201).json(newAssignment);
  } catch (err) {
    res.status(500).json({ message: 'Error creating assignment', error: err.message });
  }
};

// Get all assignments (optionally filter by dept/class/college)
export const getAssignments = async (req, res) => {
  try {
    const collegeId = req.collegeId || req.user?.collegeId;
    const { department, class: targetClass, departmentId, semesterId, sectionId } = req.query;
    let query = {};
    if (collegeId) query.collegeId = collegeId;
    if (department) query.department = department;
    if (departmentId) query.departmentId = departmentId;
    if (targetClass) query.class = targetClass;
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
