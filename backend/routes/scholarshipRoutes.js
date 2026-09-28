import express from "express";
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
