import express from 'express';
const router = express.Router();
import {
  createAssignment,
  getAssignments,
  submitAssignment,
  getAssignmentSubmissions,
  getStudentSubmissions
} from '../controllers/assignmentController.js';

import { protect, collegeScope } from '../middleware/authMiddleware.js';

router.use(protect);
router.use(collegeScope);

router.post('/', createAssignment);
router.get('/', getAssignments);
router.post('/:assignmentId/submit', submitAssignment);
router.get('/:assignmentId/submissions', getAssignmentSubmissions);
router.get('/student/:studentId', getStudentSubmissions);

export default router;
