import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import Document from '../models/Document.js';
import { protect, authorize, collegeScope } from '../middleware/authMiddleware.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const privateDir = path.resolve(__dirname, '../private-documents');

fs.mkdirSync(privateDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, privateDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'];
    const isImageOrPdf = file.mimetype?.startsWith('image/') || file.mimetype === 'application/pdf' || file.mimetype === 'application/msword';
    
    if (validExtensions.includes(ext) || isImageOrPdf) {
      return cb(null, true);
    }
    cb(new Error('Invalid file format. Please upload a PDF, Image (JPG, PNG, WEBP), or Document file.'));
  }
});

const allowedRoles = [
  'Admin', 'Sub Admin', 'Principal', 'Accounts', 'HOD', 'Staff', 'Student'
];

function tenantFilter(req) {
  if (req.user?.role === 'Super Admin') return {};
  const collegeId = req.collegeId || req.user?.tenantId || req.user?.collegeId;
  if (collegeId && collegeId !== 'unassigned_college' && collegeId !== 'mock_college_id') {
    return { collegeId };
  }
  return {};
}

// List actual document records for the current college.
router.get('/', protect, authorize(...allowedRoles, 'Super Admin'), collegeScope, async (req, res) => {
  try {
    const filter = tenantFilter(req);
    const role = String(req.user?.role || '').toLowerCase();
    const canManageAll = ['admin', 'sub admin', 'principal', 'accounts', 'super admin'].includes(role);

    if (!canManageAll || req.query.my === 'true') {
      const ids = [
        String(req.user?.referenceId || ''),
        String(req.user?._id || ''),
        String(req.user?.regNo || req.user?.registerNo || req.user?.studentId || ''),
        String(req.user?.staffId || '')
      ].filter(Boolean);

      const userName = String(req.user?.name || req.user?.fullName || '').trim();

      const userOrFilters = [];
      if (ids.length > 0) userOrFilters.push({ personId: { $in: ids } });
      if (userName) userOrFilters.push({ personName: { $regex: new RegExp(`^${userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });

      if (userOrFilters.length > 0) {
        filter.$or = userOrFilters;
      }
    }

    if (req.query.category && req.query.category !== 'All') filter.category = req.query.category;
    if (req.query.status && req.query.status !== 'All') filter.status = req.query.status;
    if (req.query.department && req.query.department !== 'All') filter.department = req.query.department;

    const documents = await Document.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, documents });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Endpoint specifically for Students, Staff, and HODs to retrieve their compliance checklist
router.get('/my', protect, authorize(...allowedRoles), collegeScope, async (req, res) => {
  try {
    const filter = tenantFilter(req);
    const ids = [
      String(req.user?.referenceId || ''),
      String(req.user?._id || ''),
      String(req.user?.regNo || req.user?.registerNo || req.user?.studentId || ''),
      String(req.user?.staffId || '')
    ].filter(Boolean);

    const userName = String(req.user?.name || req.user?.fullName || '').trim();

    const userOrFilters = [];
    if (ids.length > 0) userOrFilters.push({ personId: { $in: ids } });
    if (userName) userOrFilters.push({ personName: { $regex: new RegExp(`^${userName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });

    if (userOrFilters.length > 0) {
      filter.$or = userOrFilters;
    }

    const documents = await Document.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, documents });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Accounts creates a required-document entry before a file is submitted.
router.post('/requirements', protect, authorize('Admin', 'Sub Admin', 'Principal', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const { personId, personName, category, department, documentType } = req.body;
    if (!personId || !personName || !documentType ||
        !['Student', 'Staff', 'HOD'].includes(category)) {
      return res.status(400).json({ message: 'Person ID, name, category and document type are required.' });
    }

    const scope = tenantFilter(req);
    const collegeId = scope.collegeId || req.user?.tenantId || req.user?.collegeId || req.body.collegeId || 'COL002-8379189';

    const existing = await Document.findOne({
      personId, category, documentType
    });
    if (existing) return res.status(409).json({ message: 'This document requirement already exists.' });

    const document = await Document.create({
      collegeId, personId, personName, category,
      department: department || '',
      documentType,
      status: 'Pending Submission',
      storedFileName: '',
      originalFileName: '',
      mimeType: '',
      fileSize: 0
    });
    res.status(201).json({ success: true, document });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Upload a file to an existing requirement.
router.post('/:id/upload', protect, authorize(...allowedRoles), collegeScope, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file selected. Please choose a document or image to upload.' });

    const filter = tenantFilter(req);
    const document = await Document.findOne({ _id: req.params.id, ...filter });
    if (!document) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Document requirement not found for this college.' });
    }

    const role = String(req.user?.role || '').toLowerCase();
    const canManageAll = ['admin', 'sub admin', 'principal', 'accounts', 'super admin'].includes(role);
    
    const possibleUserIds = [
      String(req.user?.referenceId || ''),
      String(req.user?._id || ''),
      String(req.user?.regNo || req.user?.registerNo || req.user?.studentId || ''),
      String(req.user?.staffId || '')
    ].filter(Boolean);

    const userName = String(req.user?.name || req.user?.fullName || '').trim().toLowerCase();
    const docPersonName = String(document.personName || '').trim().toLowerCase();

    const matchesUser = possibleUserIds.includes(String(document.personId)) || (userName && userName === docPersonName);

    if (!canManageAll && !matchesUser) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'You can upload documents only for your own account.' });
    }

    if (document.storedFileName) {
      const oldPath = path.join(privateDir, path.basename(document.storedFileName));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    document.storedFileName = req.file.filename;
    document.originalFileName = path.basename(req.file.originalname);
    document.mimeType = req.file.mimetype || 'application/octet-stream';
    document.fileSize = req.file.size;
    document.status = 'Submitted';
    document.submittedAt = new Date();
    document.verifiedBy = '';
    document.verifiedAt = null;

    // Optional Cloudinary sync for persistent cloud storage
    try {
      const cldRes = await uploadToCloudinary(req.file.path, {
        folder: `college_erp/documents/${document.collegeId || 'common'}`,
        resourceType: 'auto',
      });
      if (cldRes?.secure_url) {
        document.cloudinaryUrl = cldRes.secure_url;
        document.cloudinaryPublicId = cldRes.public_id || '';
      }
    } catch (cldErr) {
      console.warn('Cloudinary upload warning:', cldErr.message);
    }

    await document.save();

    res.json({ success: true, document });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(400).json({ message: error.message });
  }
});

// Verify or reject a submitted document.
router.patch('/:id/status', protect, authorize('Admin', 'Sub Admin', 'Principal', 'Accounts'), collegeScope, async (req, res) => {
  try {
    const { status, remarks = '' } = req.body;
    if (!['Verified', 'Rejected', 'Pending Submission'].includes(status)) {
      return res.status(400).json({ message: 'Invalid document status.' });
    }

    const document = await Document.findOne({
      _id: req.params.id, ...tenantFilter(req)
    });
    if (!document) return res.status(404).json({ message: 'Document not found.' });
    if (status === 'Verified' && !document.storedFileName) {
      return res.status(400).json({ message: 'A file must be uploaded before verification.' });
    }

    document.status = status;
    document.remarks = String(remarks).slice(0, 1000);
    document.verifiedBy = status === 'Verified' ? String(req.user?.name || req.user?.email || req.user?._id || '') : '';
    document.verifiedAt = status === 'Verified' ? new Date() : null;
    await document.save();
    res.json({ success: true, document });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// View/download through an authenticated endpoint; files are not public.
router.get('/:id/file', protect, authorize(...allowedRoles, 'Super Admin'), collegeScope, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id, ...tenantFilter(req)
    }).lean();
    if (!document || !document.storedFileName) {
      return res.status(404).json({ message: 'Uploaded file not found.' });
    }

    const filePath = path.join(privateDir, path.basename(document.storedFileName));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Stored file is missing.' });
    }

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(document.originalFileName)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(filePath);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
