import express from 'express';
import FeePlan from '../models/FeePlan.js';
import FeeStructure from '../models/FeeStructure.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper to sync FeePlan to FeeStructure
const syncPlanToStructure = async (collegeId, plan) => {
  try {
    const course = plan.courseName || plan.courseId;
    const department = plan.departmentName || plan.departmentId;
    const semesterNumber = parseInt(String(plan.semester).replace(/\D/g, '')) || 1;
    const academicYear = plan.academicYear || '2026-2027';

    const feesList = [
      { feeType: 'Tuition Fee', amount: Number(plan.tuitionFee) || 0 },
      { feeType: 'Exam Fee', amount: Number(plan.examFee) || 0 },
      { feeType: 'Lab Fee', amount: Number(plan.labFee) || 0 },
      { feeType: 'Library Fee', amount: Number(plan.libraryFee) || 0 },
      { feeType: 'Transport Fee', amount: Number(plan.transportFee) || 0 },
      { feeType: 'Hostel Fee', amount: Number(plan.hostelFee) || 0 }
    ].filter(f => f.amount > 0);

    const totalAmount = feesList.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    await FeeStructure.findOneAndUpdate(
      {
        collegeId,
        academicYear,
        course,
        department,
        semester: semesterNumber
      },
      {
        collegeId,
        academicYear,
        course,
        department,
        semester: semesterNumber,
        fees: feesList,
        totalAmount
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('Failed to sync FeePlan to FeeStructure:', err);
  }
};

// Get fee plans
router.get(
  '/',
  protect,
  authorize('Admin', 'Principal', 'Accounts'),
  collegeScope,
  async (req, res) => {
    try {
      const query = {
        collegeId: req.collegeId || req.user?.collegeId || 'unassigned_college'
      };

      const andConditions = [];

      if (req.query.departmentId || req.query.departmentName) {
        const deptVal = String(req.query.departmentId || req.query.departmentName).trim();
        andConditions.push({
          $or: [
            { departmentId: deptVal },
            { departmentName: deptVal },
            { departmentName: new RegExp(`^${deptVal.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
          ]
        });
      }

      if (req.query.courseId || req.query.courseName) {
        const cVal = String(req.query.courseId || req.query.courseName).trim();
        andConditions.push({
          $or: [
            { courseId: cVal },
            { courseName: cVal },
            { courseName: new RegExp(`^${cVal.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
          ]
        });
      }

      if (req.query.semester) {
        const semVal = String(req.query.semester).trim();
        const semVariants = [
          semVal,
          semVal.replace('1stYear-Sem-I', 'Sem 1'),
          semVal.replace('1stYear-Sem-II', 'Sem 2'),
          semVal.replace('2ndYear-Sem-III', 'Sem 3'),
          semVal.replace('2ndYear-Sem-IV', 'Sem 4'),
          semVal.replace('3rdYear-Sem-V', 'Sem 5'),
          semVal.replace('3rdYear-Sem-VI', 'Sem 6'),
          semVal.replace('4thYear-Sem-VII', 'Sem 7'),
          semVal.replace('4thYear-Sem-VIII', 'Sem 8'),
          'Sem 1',
          'All'
        ];
        andConditions.push({
          semester: { $in: Array.from(new Set(semVariants)) }
        });
      }

      if (andConditions.length > 0) {
        query.$and = andConditions;
      }

      const plans = await FeePlan.find(query).sort({ createdAt: -1 });

      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Create fee plan
router.post(
  '/',
  protect,
  authorize('Admin', 'Principal', 'Accounts'),
  collegeScope,
  async (req, res) => {
    try {
      const collegeId =
        req.collegeId || req.user?.collegeId || 'unassigned_college';

      const plan = await FeePlan.create({
        ...req.body,
        collegeId
      });

      // Synchronize with FeeStructure
      await syncPlanToStructure(collegeId, plan);

      req.app.get('io')?.emit('dataUpdated', {
        module: 'feePlans',
        action: 'created'
      });
      req.app.get('io')?.emit('dataUpdated', {
        module: 'feeStructure',
        action: 'created'
      });

      res.status(201).json(plan);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

// Update fee plan
router.put(
  '/:id',
  protect,
  authorize('Admin', 'Principal', 'Accounts'),
  collegeScope,
  async (req, res) => {
    try {
      const collegeId =
        req.collegeId ||
        req.user?.collegeId ||
        'unassigned_college';

      const plan = await FeePlan.findOneAndUpdate(
        {
          _id: req.params.id,
          collegeId
        },
        req.body,
        { new: true, runValidators: true }
      );

      if (!plan) {
        return res.status(404).json({ message: 'Fee plan not found' });
      }

      // Synchronize with FeeStructure
      await syncPlanToStructure(collegeId, plan);

      req.app.get('io')?.emit('dataUpdated', {
        module: 'feePlans',
        action: 'updated'
      });
      req.app.get('io')?.emit('dataUpdated', {
        module: 'feeStructure',
        action: 'updated'
      });

      res.json(plan);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

// Delete fee plan
router.delete(
  '/:id',
  protect,
  authorize('Admin', 'Principal', 'Accounts'),
  collegeScope,
  async (req, res) => {
    try {
      const collegeId =
        req.collegeId ||
        req.user?.collegeId ||
        'unassigned_college';

      const plan = await FeePlan.findOneAndDelete({
        _id: req.params.id,
        collegeId
      });

      if (!plan) {
        return res.status(404).json({ message: 'Fee plan not found' });
      }

      // Also clean up matching FeeStructure if any
      const course = plan.courseName || plan.courseId;
      const department = plan.departmentName || plan.departmentId;
      const semesterNumber = parseInt(String(plan.semester).replace(/\D/g, '')) || 1;
      await FeeStructure.findOneAndDelete({
        collegeId,
        course,
        department,
        semester: semesterNumber
      });

      req.app.get('io')?.emit('dataUpdated', {
        module: 'feePlans',
        action: 'deleted'
      });
      req.app.get('io')?.emit('dataUpdated', {
        module: 'feeStructure',
        action: 'deleted'
      });

      res.json({ message: 'Fee plan deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
