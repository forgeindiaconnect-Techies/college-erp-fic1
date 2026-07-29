import Assignment from '../models/Assignment.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import ActivityLog from '../models/ActivityLog.js';

// Create a new Assignment
export const createAssignment = async (req, res) => {
  try {
    const { title, subject, department, class: targetClass, description, dueDate, faculty } = req.body;
    
    const newAssignment = new Assignment({
      title,
      subject,
      department,
      class: targetClass,
      description,
      dueDate,
      faculty
    });
    
    await newAssignment.save();

    // Log Activity
    try {
      await ActivityLog.create({
        userId: faculty,
        userName: faculty,
        role: 'Staff',
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

// Get all assignments (optionally filter by dept/class)
export const getAssignments = async (req, res) => {
  try {
    const { department, class: targetClass } = req.query;
    let query = {};
    if (department) query.department = department;
    if (targetClass) query.class = targetClass;
    
    const assignments = await Assignment.find(query).sort({ createdAt: -1 });
    res.status(200).json(assignments);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching assignments', error: err.message });
  }
};

// Submit an assignment
export const submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { studentId, studentName, department, fileName } = req.body;
    
    // Check if already submitted
    const existing = await AssignmentSubmission.findOne({ assignmentId, studentId });
    if (existing) {
      existing.fileName = fileName;
      existing.status = 'Submitted';
      await existing.save();
      return res.status(200).json(existing);
    }
    
    const newSubmission = new AssignmentSubmission({
      assignmentId,
      studentId,
      studentName,
      department,
      fileName
    });
    await newSubmission.save();
    
    // Increment assignment submissionsCount
    await Assignment.findByIdAndUpdate(assignmentId, {
      $inc: { submissionsCount: 1 }
    });
    
    res.status(201).json(newSubmission);
  } catch (err) {
    res.status(500).json({ message: 'Error submitting assignment', error: err.message });
  }
};

// Get submissions for a specific assignment
export const getAssignmentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const submissions = await AssignmentSubmission.find({ assignmentId });
    res.status(200).json(submissions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching submissions', error: err.message });
  }
};

// Get submissions by student
export const getStudentSubmissions = async (req, res) => {
  try {
    const { studentId } = req.params;
    const submissions = await AssignmentSubmission.find({ studentId });
    res.status(200).json(submissions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching student submissions', error: err.message });
  }
};
