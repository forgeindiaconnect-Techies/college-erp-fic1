import express from "express";
import {
  getQuotas,
  getQuotaById,
  createQuota,
  updateQuota,
  deleteQuota,
} from "../controllers/quotaController.js";
import { protect, authorize, collegeScope } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, collegeScope, getQuotas);
router.get("/:id", protect, collegeScope, getQuotaById);

router.post(
  "/",
  protect,
  authorize("Admin", "Sub Admin", "Principal", "Accounts", "Super Admin"),
  collegeScope,
  createQuota
);

router.put(
  "/:id",
  protect,
  authorize("Admin", "Sub Admin", "Principal", "Accounts", "Super Admin"),
  collegeScope,
  updateQuota
);

router.delete(
  "/:id",
  protect,
  authorize("Admin", "Sub Admin", "Principal", "Accounts", "Super Admin"),
  collegeScope,
  deleteQuota
);

export default router;
