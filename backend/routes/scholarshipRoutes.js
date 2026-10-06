import express from "express";
import { protect, collegeScope } from "../middleware/authMiddleware.js";
const router = express.Router();

import {
  getScholarships,
  getScholarshipById,
  createScholarship,
  updateScholarship,
  deleteScholarship,
} from "../controllers/scholarshipController.js";

import {
  getScholarshipApplications,
  createScholarshipApplication,
} from "../controllers/scholarshipApplicationController.js";

// Apply multi-tenant protection to all scholarship endpoints
router.use(protect, collegeScope);

// Scholarship applications
router.get("/applications", getScholarshipApplications);
router.post("/applications", createScholarshipApplication);

// Get all scholarships
router.get("/", getScholarships);

// Get one scholarship
router.get("/:id", getScholarshipById);

// Create scholarship
router.post("/", createScholarship);

// Update scholarship
router.put("/:id", updateScholarship);

// Delete scholarship
router.delete("/:id", deleteScholarship);

export default router;
