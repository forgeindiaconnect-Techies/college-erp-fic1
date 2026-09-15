import express from 'express';
import FeePlan from '../models/FeePlan.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';

const router = express.Router();

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
  authorize('Admin', 'Principal'),
  collegeScope,
  async (req, res) => {
    try {
      const collegeId =
        req.collegeId || req.user?.collegeId || 'unassigned_college';

      const plan = await FeePlan.create({
        ...req.body,
        collegeId
      });

      req.app.get('io')?.emit('dataUpdated', {
        module: 'feePlans',
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
  authorize('Admin', 'Principal'),
  collegeScope,
  async (req, res) => {
    try {
      const plan = await FeePlan.findOneAndUpdate(
        {
          _id: req.params.id,
          collegeId:
            req.collegeId ||
            req.user?.collegeId ||
            'unassigned_college'
        },
        req.body,
        { new: true, runValidators: true }
      );

      if (!plan) {
        return res.status(404).json({ message: 'Fee plan not found' });
      }

      req.app.get('io')?.emit('dataUpdated', {
        module: 'feePlans',
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
  authorize('Admin', 'Principal'),
  collegeScope,
  async (req, res) => {
    try {
      const plan = await FeePlan.findOneAndDelete({
        _id: req.params.id,
        collegeId:
          req.collegeId ||
          req.user?.collegeId ||
          'unassigned_college'
      });

      if (!plan) {
        return res.status(404).json({ message: 'Fee plan not found' });
      }

      req.app.get('io')?.emit('dataUpdated', {
        module: 'feePlans',
        action: 'deleted'
      });

      res.json({ message: 'Fee plan deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
