import express from 'express';
const router = express.Router();
import {
  createAssignment,
  getAssignments,
  submitAssignment,
  getAssignmentSubmissions,
  getStudentSubmissions
} from '../controllers/assignmentController.js';

import {
  protect,
  authorize,
  collegeScope
} from '../middleware/authMiddleware.js';

router.use(protect);
router.use(collegeScope);

router.post(
  '/',
  authorize('Admin', 'Principal', 'HOD', 'Staff'),
  createAssignment
);

router.get(
  '/',
  authorize(
    'Admin',
    'Principal',
    'HOD',
    'Staff',
    'Student',
    'Parent'
  ),
  getAssignments
);

router.post(
  '/:assignmentId/submit',
  authorize('Student'),
  submitAssignment
);

router.get(
  '/:assignmentId/submissions',
  authorize('Admin', 'Principal', 'HOD', 'Staff'),
  getAssignmentSubmissions
);

router.get(
  '/student/:studentId',
  authorize('Admin', 'Principal', 'HOD', 'Staff', 'Student', 'Parent'),
  getStudentSubmissions
);

export default router;

