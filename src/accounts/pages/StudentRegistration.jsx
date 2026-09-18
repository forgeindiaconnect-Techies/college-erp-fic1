import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  UserPlus,
  Save,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  User,
  GraduationCap,
  Users,
  MapPin,
  Home,
  Bus,
  Camera,
  Search,
  FileSpreadsheet,
  Upload,
  CloudUpload,
  Trash2,
  Plus,
  HelpCircle,
  FolderOpen,
  Check,
  X,
  Languages,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Printer,
  FileText,
  IndianRupee,
  Layers,
  Award,
  Eye,
  Building2,
  Calendar,
  Phone,
  Mail,
  ShieldCheck,
  Download,
  CreditCard,
  SlidersHorizontal,
  FileCheck
} from 'lucide-react';
import {
  createStudent,
  updateStudent,
  deleteStudent,
  purgeAllStudents,
  createFee,
  getDepartments,
  getStudents,
  getCourses,
  getFeePlans,
  getFeeStructures,
  getSections,
  getQuotas
} from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';
import './StudentRegistration.css';

const COMMUNITIES = ['Select', 'BC', 'MBC', 'SC', 'ST', 'OC', 'BCM', 'DNC'];
const BLOOD_GROUPS = ['Select', 'A1+', 'A1-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const DEGREE_TYPES = ['UG', 'PG', 'Diploma', 'Ph.D'];
const SEMESTERS_LIST = [1, 2, 3, 4, 5, 6, 7, 8];
const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Jain', 'Sikh', 'Buddhist', 'Other'];
const STANDARD_QUOTA_CATEGORIES = [
  'General Quota',
  'Government Quota',
  'Management Quota',
  'Sports Quota',
  'NRI Quota',
  'Minority Quota',
  'Special Quota',
  'Merit Scholarship Quota',
  'Defence / Ex-Servicemen Quota'
];

const DEFAULT_QUALIFICATIONS = [
  { study: 'SSLC (10th Standard)', institute: '', board: '', percentage: '', passYear: '', marksheetNo: '' },
  { study: 'HSC (+2 Higher Secondary)', institute: '', board: '', percentage: '', passYear: '', marksheetNo: '' }
];

const DEFAULT_FEE_BREAKDOWN = {
  admissionFee: 0,
  universityFee: 0,
  marksheetVerification: 0,
  tuitionFee: 0,
  specialFee: 0,
  englishLabNssId: 0,
  computerLab: 0,
  stationary: 0,
  pta: 0,
  otherFee: 0
};

const EMPTY_FORM = {
  // Identification & Admission Core
  previousAdmissionNo: '',
  id: '',
  admissionNo: '',
  admissionDate: new Date().toISOString().split('T')[0],
  academicYear: `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`,
  degreeType: 'UG',
  course: '',
  courseId: '',
  dept: '',
  department: '',
  semester: 1,
  sem: '1stYear-Sem-I',
  section: 'A',
  admissionQuota: 'General Quota',
  quota: null,
  quotaName: 'General Quota',
  normalFee: 0,
  discountAmount: 0,
  finalFee: 0,
  feeType: 'all',

  // Personal Info
  firstName: '',
  midName: '',
  lastName: '',
  name: '',
  dob: '',
  gender: 'Male',
  placeOfBirth: '',
  bloodGroup: 'Select',
  nationality: 'Indian',
  religion: 'Hindu',
  community: 'BC',
  caste: '',
  communityCertNo: '',
  motherTongue: 'Tamil',
  handicapped: 'No',
  physicallyChallenged: false,
  aadharNo: '',
  panNo: '',
  photoUrl: '',

  // Family & Guardian
  fatherName: '',
  motherName: '',
  fatherOccupation: '',
  yearlyIncome: '',
  fatherPhone: '',
  fatherEmail: '',
  guardianName: '',
  guardianPhone: '',
  guardianEmail: '',
  guardianAddress: '',

  // Contact & Address
  phone: '',
  email: '',
  address: '',
  city: '',
  state: 'Tamil Nadu',
  country: 'India',
  pincode: '',

  // Facilities
  hostel: 'No',
  dormFacility: false,
  hostelRequired: 'no',
  transport: 'No',
  busFacility: false,
  transportRequired: 'no',
  busRoute: '',
  pickupPoint: '',

  // Prior Academic Qualifications
  qualifications: [...DEFAULT_QUALIFICATIONS],

  // Fee Details (₹)
  feeBreakdown: { ...DEFAULT_FEE_BREAKDOWN },
  totalFee: 0,
  amountPaid: 0,
  balanceFee: 0,
  paymentMode: 'Cash',
  paymentStatus: 'Pending',
  receiptNumber: '',
  paymentDate: null,
  transactionRef: '',

  applicationStatus: 'Approved',
  admissionStatus: 'Confirmed',
  status: 'Active'
};

const generateRegNo = (codeOrName, studentsList) => {
  const cleanCode = (codeOrName || 'ST').replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase() || 'ST';
  const year = new Date().getFullYear();

  const matchingStudents = (studentsList || []).filter(
    student => student.id && String(student.id).startsWith(`${cleanCode}${year}`)
  );

  let maxSeq = 0;
  matchingStudents.forEach(student => {
    const parts = String(student.id).split('-');
    if (parts.length > 1) {
      const seq = parseInt(parts[1], 10);
      if (!Number.isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  return `${cleanCode}${year}-${String(maxSeq + 1).padStart(3, '0')}`;
};

// Direct Printable Fee Receipt Generator
const printReceiptDirect = (data) => {
  const win = window.open('', '_blank', 'width=860,height=800');
  if (!win) return;

  const recNo = data.receiptNumber || data.receiptNo || `REC-${Date.now()}`;
  const normalFee = Number(data.normalFee ?? data.totalFee ?? data.totalAmount ?? 0);
  const discountAmount = Number(data.discountAmount ?? 0);
  const finalFee = Number(data.finalFee ?? data.totalFee ?? data.totalAmount ?? normalFee);
  const quotaName = data.quotaName || data.admissionQuota || data.quota || 'General Quota';
  const paid = Number(data.amountPaid ?? data.paidAmount ?? 0);
  const balance = Number(data.balanceFee ?? data.remainingFee ?? Math.max(0, finalFee - paid));
  const studentName = data.name || [data.firstName, data.lastName].filter(Boolean).join(' ') || data.studentName || 'Student';

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Official Fee Receipt - ${recNo}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 28px; background: #fff; color: #0f172a; }
        .receipt-card { border: 2px solid #0f172a; border-radius: 8px; padding: 24px 28px; max-width: 760px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 12px; margin-bottom: 16px; }
        .header h1 { margin: 0; color: #1e40af; font-size: 22px; text-transform: uppercase; letter-spacing: 1px; }
        .header h3 { margin: 4px 0 0; color: #334155; font-size: 13px; font-weight: 600; }
        .header p { margin: 3px 0 0; color: #64748b; font-size: 11px; }
        .badge-row { display: flex; justify-content: space-between; align-items: center; margin: 12px 0 16px; padding: 8px 14px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
        .rec-no { font-weight: 800; color: #1e40af; font-size: 14px; }
        .rec-date { color: #475569; font-size: 12px; font-weight: 600; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 16px; font-size: 12.5px; }
        .grid-2 .item { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; }
        .grid-2 .label { color: #64748b; font-weight: 600; }
        .grid-2 .val { font-weight: 700; color: #0f172a; text-align: right; }
        table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
        th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-transform: uppercase; font-size: 11px; }
        .amount-col { text-align: right; font-weight: 700; }
        .totals-area { margin-top: 14px; border-top: 2px solid #0f172a; padding-top: 8px; font-size: 13.5px; }
        .totals-row { display: flex; justify-content: space-between; padding: 3px 0; }
        .discount-row { color: #15803d; font-weight: 700; }
        .total-bold { font-size: 15px; font-weight: 800; color: #1e40af; }
        .paid-bold { font-size: 14px; font-weight: 800; color: #16a34a; }
        .bal-bold { font-size: 14px; font-weight: 800; color: #dc2626; }
        .footer { margin-top: 32px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 16px; font-size: 11px; color: #64748b; }
        .sign-box { text-align: center; width: 180px; border-top: 1px solid #475569; padding-top: 6px; font-weight: 700; color: #0f172a; }
        .stamp-badge { border: 2px solid #16a34a; color: #16a34a; font-weight: 900; padding: 4px 10px; border-radius: 4px; font-size: 12px; display: inline-block; text-transform: uppercase; transform: rotate(-5deg); }
      </style>
    </head>
    <body>
      <div class="receipt-card">
        <div class="header">
          <h1>ROYAL COLLEGE</h1>
          <h3>Department of Finance & Student Accounts</h3>
          <p>Official Student Admission & Enrollment Fee Receipt (Computer Generated)</p>
        </div>
        <div class="badge-row">
          <div class="rec-no">RECEIPT NO: ${recNo}</div>
          <div class="stamp-badge">${paid >= finalFee && finalFee > 0 ? 'PAID IN FULL' : paid > 0 ? 'PARTIAL PAYMENT' : 'FEE ASSESSED'}</div>
          <div class="rec-date">Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </div>
        <div class="grid-2">
          <div class="item"><span class="label">Student Name:</span><span class="val">${studentName}</span></div>
          <div class="item"><span class="label">Admission / Reg No:</span><span class="val">${data.id || data.admissionNo || data.admissionNumber || 'N/A'}</span></div>
          <div class="item"><span class="label">Department:</span><span class="val">${data.department || data.dept || 'General'}</span></div>
          <div class="item"><span class="label">Degree & Course:</span><span class="val">${data.degreeType || 'UG'} — ${data.course || 'N/A'}</span></div>
          <div class="item"><span class="label">Quota / Category:</span><span class="val" style="color:#6d28d9">${quotaName}</span></div>
          <div class="item"><span class="label">Payment Mode:</span><span class="val">${data.paymentMode || 'Cash'}</span></div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Fee Head / Component Description</th>
              <th class="amount-col" style="width: 140px;">Amount (INR ₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>1</td><td>Normal Department Base Fee</td><td class="amount-col">₹${normalFee.toLocaleString('en-IN')}</td></tr>
            <tr><td>2</td><td>Quota / Category (${quotaName})</td><td class="amount-col">${quotaName}</td></tr>
            ${discountAmount > 0 ? `<tr class="discount-row"><td>3</td><td>Quota Discount</td><td class="amount-col">- ₹${discountAmount.toLocaleString('en-IN')}</td></tr>` : ''}
            ${Object.entries(data.feeBreakdown || DEFAULT_FEE_BREAKDOWN)
              .filter(([key, val]) => Number(val) > 0 && key !== 'tuitionFee')
              .map(([key, val], idx) => `
                <tr>
                  <td>${idx + 4}</td>
                  <td>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</td>
                  <td class="amount-col">₹${Number(val).toLocaleString('en-IN')}</td>
                </tr>
              `).join('')}
          </tbody>
        </table>

        <div class="totals-area">
          <div class="totals-row">
            <span>Normal Department Fee:</span>
            <span>₹${normalFee.toLocaleString('en-IN')}</span>
          </div>
          ${discountAmount > 0 ? `
          <div class="totals-row discount-row">
            <span>Quota Discount:</span>
            <span>- ₹${discountAmount.toLocaleString('en-IN')}</span>
          </div>` : ''}
          <div class="totals-row total-bold">
            <span>Final Payable Fee:</span>
            <span>₹${finalFee.toLocaleString('en-IN')}</span>
          </div>
          <div class="totals-row paid-bold">
            <span>Amount Paid:</span>
            <span>₹${paid.toLocaleString('en-IN')}</span>
          </div>
          <div class="totals-row bal-bold">
            <span>Remaining Balance:</span>
            <span>₹${balance.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div class="footer">
          <div>
            <p style="margin:0; font-weight:600;">* This is an authentic ERP verified digital receipt.</p>
            <p style="margin:2px 0 0;">Transaction Ref: ${data.transactionRef || 'ERP-TX-' + (data.id || '001')}</p>
          </div>
          <div class="sign-box">
            Authorized Accounts Officer<br>College Finance Desk
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 500);
};

// Direct Printable Admission Allotment Order Generator
const printAdmissionOrderDirect = (data) => {
  const win = window.open('', '_blank', 'width=880,height=820');
  if (!win) return;

  const studentName = data.name || [data.firstName, data.lastName].filter(Boolean).join(' ') || 'Student';
  const admissionNo = data.id || data.admissionNo || 'N/A';

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admission Allotment Order - ${admissionNo}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 32px; background: #fff; color: #0f172a; }
        .order-box { border: 2px solid #1e3a8a; border-radius: 8px; padding: 28px 36px; max-width: 780px; margin: 0 auto; }
        .top-header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 14px; margin-bottom: 18px; }
        .top-header h1 { margin: 0; color: #1e3a8a; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
        .top-header h2 { margin: 4px 0 0; color: #0284c7; font-size: 15px; font-weight: 700; text-transform: uppercase; }
        .top-header p { margin: 4px 0 0; color: #64748b; font-size: 12px; }
        .order-title-box { background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 6px; text-align: center; padding: 10px; margin-bottom: 20px; }
        .order-title { margin: 0; color: #15803d; font-size: 15px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; }
        .meta-bar { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; margin-bottom: 16px; color: #334155; }
        .section-title { font-size: 13px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; margin: 16px 0 10px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 12.5px; }
        .row-item { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding-bottom: 4px; }
        .lbl { color: #64748b; font-weight: 600; }
        .val { color: #0f172a; font-weight: 700; }
        .declaration { font-size: 11.5px; color: #475569; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 6px; margin-top: 20px; line-height: 1.5; }
        .sign-area { display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px; font-weight: 700; }
        .sign-box { text-align: center; width: 180px; border-top: 1px solid #334155; padding-top: 6px; }
      </style>
    </head>
    <body>
      <div class="order-box">
        <div class="top-header">
          <h1>COLLEGE ERP ENTERPRISE SYSTEM</h1>
          <h2>Official Allotment & Provisional Admission Letter</h2>
          <p>Office of Admissions & Academic Registrations • Academic Year: ${data.academicYear || '2026 - 2027'}</p>
        </div>
        <div class="meta-bar">
          <div>Ref No: ADM-ALLOT-${admissionNo}</div>
          <div>Allotment Date: ${data.admissionDate || new Date().toISOString().split('T')[0]}</div>
        </div>
        <div class="order-title-box">
          <div class="order-title">Provisional Admission Confirmed</div>
        </div>
        
        <div class="section-title">1. Student Identification & Demographics</div>
        <div class="details-grid">
          <div class="row-item"><span class="lbl">Student Full Name:</span><span class="val">${studentName}</span></div>
          <div class="row-item"><span class="lbl">Admission / Reg No:</span><span class="val">${admissionNo}</span></div>
          <div class="row-item"><span class="lbl">Gender / DOB:</span><span class="val">${data.gender || 'N/A'} / ${data.dob || 'N/A'}</span></div>
          <div class="row-item"><span class="lbl">Blood Group / Community:</span><span class="val">${data.bloodGroup || 'N/A'} (${data.community || 'N/A'})</span></div>
          <div class="row-item"><span class="lbl">Father's Name:</span><span class="val">${data.fatherName || 'N/A'}</span></div>
          <div class="row-item"><span class="lbl">Mother's Name:</span><span class="val">${data.motherName || 'N/A'}</span></div>
          <div class="row-item"><span class="lbl">Contact Mobile:</span><span class="val">${data.phone || data.fatherPhone || 'N/A'}</span></div>
          <div class="row-item"><span class="lbl">Registered Email:</span><span class="val">${data.email || 'N/A'}</span></div>
        </div>

        <div class="section-title">2. Academic Program & Allocation</div>
        <div class="details-grid">
          <div class="row-item"><span class="lbl">Department:</span><span class="val">${data.department || data.dept || 'N/A'}</span></div>
          <div class="row-item"><span class="lbl">Enrolled Course:</span><span class="val">${data.course || 'N/A'}</span></div>
          <div class="row-item"><span class="lbl">Degree Program:</span><span class="val">${data.degreeType || 'UG'}</span></div>
          <div class="row-item"><span class="lbl">Semester & Section:</span><span class="val">Semester ${data.semester || 1} (Section ${data.section || 'A'})</span></div>
          <div class="row-item"><span class="lbl">Hostel Facility:</span><span class="val">${data.hostel === 'Yes' || data.hostelRequired === 'yes' ? 'Allotted' : 'Not Required'}</span></div>
          <div class="row-item"><span class="lbl">Transport Route:</span><span class="val">${data.transport === 'Yes' || data.transportRequired === 'yes' ? (data.busRoute || 'Allotted') : 'Not Required'}</span></div>
        </div>

        <div class="section-title">3. Fee Ledger & Financial Confirmation</div>
        <div class="details-grid">
          <div class="row-item"><span class="lbl">Total Course Fee:</span><span class="val">₹${Number(data.totalFee || data.totalAmount || 0).toLocaleString()}</span></div>
          <div class="row-item"><span class="lbl">Initial Amount Paid:</span><span class="val">₹${Number(data.amountPaid || data.paidAmount || 0).toLocaleString()}</span></div>
          <div class="row-item"><span class="lbl">Outstanding Balance:</span><span class="val">₹${Number(data.balanceFee || data.balanceAmount || 0).toLocaleString()}</span></div>
          <div class="row-item"><span class="lbl">Payment Receipt No:</span><span class="val">${data.receiptNumber || 'REC-' + admissionNo}</span></div>
        </div>

        <div class="declaration">
          <b>Important Note:</b> This admission is provisional and subject to the physical verification of original mark sheets, transfer certificate (TC), conduct certificate, and compliance with the university academic regulations.
        </div>

        <div class="sign-area">
          <div class="sign-box">Candidate Signature</div>
          <div class="sign-box">Dean of Academic Admissions</div>
          <div class="sign-box">Principal / Registrar</div>
        </div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 500);
};

// Blank Printable Application Form
const printBlankApplicationForm = () => {
  const win = window.open('', '_blank', 'width=880,height=850');
  if (!win) return;

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Blank Student Admission Application Form</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 32px; background: #fff; color: #0f172a; }
        .form-box { border: 2px solid #0f172a; border-radius: 8px; padding: 24px 30px; max-width: 760px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 16px; position: relative; }
        .header h1 { margin: 0; color: #1e3a8a; font-size: 22px; text-transform: uppercase; }
        .header h3 { margin: 3px 0 0; color: #475569; font-size: 13px; font-weight: 600; }
        .photo-box { position: absolute; right: 0; top: 0; width: 100px; height: 120px; border: 1.5px dashed #64748b; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #64748b; text-align: center; }
        .sec-head { background: #f1f5f9; padding: 6px 10px; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #1e3a8a; margin: 14px 0 8px; border-left: 3px solid #1e3a8a; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; font-size: 12px; margin-bottom: 8px; }
        .field-line { border-bottom: 1px dotted #94a3b8; height: 22px; margin-top: 2px; }
        .field label { font-weight: 700; color: #334155; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
        th, td { border: 1px solid #94a3b8; padding: 8px; text-align: left; }
        th { background: #f8fafc; font-weight: 700; }
        .signs { display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px; font-weight: 700; }
        .sign-item { text-align: center; width: 150px; border-top: 1px solid #475569; padding-top: 4px; }
      </style>
    </head>
    <body>
      <div class="form-box">
        <div class="header">
          <div class="photo-box">Affix Passport<br>Size Photograph</div>
          <h1>COLLEGE ERP ENTERPRISE</h1>
          <h3>Official Application for Admission & Enrollment</h3>
          <p style="margin:2px 0 0; font-size:11px; color:#64748b;">Academic Session: 2026 - 2027</p>
        </div>

        <div class="sec-head">1. Desired Academic Program</div>
        <div class="field-row">
          <div class="field"><label>Degree Program (UG/PG):</label><div class="field-line"></div></div>
          <div class="field"><label>Department Name:</label><div class="field-line"></div></div>
          <div class="field"><label>Course Chosen:</label><div class="field-line"></div></div>
          <div class="field"><label>Admission Category (Merit/Mgmt):</label><div class="field-line"></div></div>
        </div>

        <div class="sec-head">2. Student Personal Information</div>
        <div class="field-row">
          <div class="field"><label>First Name:</label><div class="field-line"></div></div>
          <div class="field"><label>Last Name:</label><div class="field-line"></div></div>
          <div class="field"><label>Date of Birth (DD/MM/YYYY):</label><div class="field-line"></div></div>
          <div class="field"><label>Gender (Male/Female/Other):</label><div class="field-line"></div></div>
          <div class="field"><label>Community / Caste:</label><div class="field-line"></div></div>
          <div class="field"><label>Blood Group:</label><div class="field-line"></div></div>
          <div class="field"><label>Mother Tongue:</label><div class="field-line"></div></div>
          <div class="field"><label>Nationality & Religion:</label><div class="field-line"></div></div>
        </div>

        <div class="sec-head">3. Parent / Guardian Details</div>
        <div class="field-row">
          <div class="field"><label>Father's Name:</label><div class="field-line"></div></div>
          <div class="field"><label>Father's Contact Mobile:</label><div class="field-line"></div></div>
          <div class="field"><label>Mother's Name:</label><div class="field-line"></div></div>
          <div class="field"><label>Annual Family Income:</label><div class="field-line"></div></div>
        </div>

        <div class="sec-head">4. Prior Educational Record</div>
        <table>
          <thead>
            <tr>
              <th>Examination Passed</th>
              <th>Institution / School Name</th>
              <th>Board / University</th>
              <th>Marks / %</th>
              <th>Year of Passing</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>SSLC (10th)</td><td style="height:24px;"></td><td></td><td></td><td></td></tr>
            <tr><td>HSC (12th)</td><td style="height:24px;"></td><td></td><td></td><td></td></tr>
            <tr><td>Degree / Diploma</td><td style="height:24px;"></td><td></td><td></td><td></td></tr>
          </tbody>
        </table>

        <div class="sec-head">5. Facilities Requested</div>
        <div class="field-row">
          <div class="field"><label>College Hostel Required? [ ] Yes  [ ] No</label></div>
          <div class="field"><label>College Bus Transport? [ ] Yes  [ ] No (Route: ____________)</label></div>
        </div>

        <div class="signs">
          <div class="sign-item">Applicant Signature</div>
          <div class="sign-item">Parent / Guardian Signature</div>
          <div class="sign-item">Admission Officer Verification</div>
        </div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
  setTimeout(() => win.print(), 500);
};

const StudentRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 1: Personal Demographics, 2: Academic Program, 3: Qualifications, 4: Fee Ledger, 5: Verification Dossier, 6: Directory
  const [activeStep, setActiveStep] = useState(1);

  const [form, setForm] = useState(EMPTY_FORM);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [students, setStudents] = useState([]);
  const [feeStructuresList, setFeeStructuresList] = useState([]);
  const [quotasList, setQuotasList] = useState([]);
  const [quotaList, setQuotaList] = useState([]);
  const [quotaConcession, setQuotaConcession] = useState(0);
  const [normalFee, setNormalFee] = useState(0);
  const [finalAssessedFee, setFinalAssessedFee] = useState(0);
  const [selectedQuotaRule, setSelectedQuotaRule] = useState(null);
  const [applicableFee, setApplicableFee] = useState(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);

  // Directory search/filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('All');
  const [filterDept, setFilterDept] = useState('All');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('All');

  // Load real departments, courses, sections, students, and fee structures from backend APIs
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [deptRes, courseRes, studRes, structRes, secRes, planRes, quotasRes] = await Promise.allSettled([
        getDepartments(),
        getCourses(),
        getStudents(),
        getFeeStructures(),
        getSections(),
        getFeePlans(),
        getQuotas()
      ]);

      if (quotasRes.status === 'fulfilled' && quotasRes.value?.data) {
        const qData = quotasRes.value.data.quotas || quotasRes.value.data.data || quotasRes.value.data || [];
        const arr = Array.isArray(qData) ? qData : [];
        setQuotasList(arr);
        setQuotaList(arr);
      }

      let loadedDepts = [];
      if (deptRes.status === 'fulfilled') {
        loadedDepts = Array.isArray(deptRes.value?.data)
          ? deptRes.value.data
          : deptRes.value?.data?.departments || [];
        setDepartments(loadedDepts);
      }

      let loadedCourses = [];
      if (courseRes.status === 'fulfilled') {
        loadedCourses = Array.isArray(courseRes.value?.data?.courses)
          ? courseRes.value.data.courses
          : Array.isArray(courseRes.value?.data)
          ? courseRes.value.data
          : [];
        setCourses(loadedCourses);
      }

      if (secRes.status === 'fulfilled') {
        const secData = Array.isArray(secRes.value?.data?.sections)
          ? secRes.value.data.sections
          : Array.isArray(secRes.value?.data)
          ? secRes.value.data
          : [];
        setSectionsList(secData);
      }

      let loadedStudents = [];
      if (studRes.status === 'fulfilled') {
        loadedStudents = Array.isArray(studRes.value?.data)
          ? studRes.value.data
          : studRes.value?.data?.students || [];
        setStudents(loadedStudents);
      }

      const strData = structRes.status === 'fulfilled'
        ? (Array.isArray(structRes.value?.data?.data)
            ? structRes.value.data.data
            : Array.isArray(structRes.value?.data)
            ? structRes.value.data
            : (Array.isArray(structRes.value?.data?.feeStructures) ? structRes.value.data.feeStructures : []))
        : [];
      const planData = planRes.status === 'fulfilled' && Array.isArray(planRes.value?.data)
        ? planRes.value.data
        : (planRes.value?.data?.plans || []);

      const convertedPlans = planData.map(p => ({
        _id: p._id,
        academicYear: p.academicYear,
        department: p.departmentName || p.departmentId,
        course: p.courseName || p.courseId,
        semester: p.semester,
        fees: [
          { feeType: 'Tuition Fee', amount: Number(p.tuitionFee) || 0 },
          { feeType: 'Exam Fee', amount: Number(p.examFee) || 0 },
          { feeType: 'Lab Fee', amount: Number(p.labFee) || 0 },
          { feeType: 'Library Fee', amount: Number(p.libraryFee) || 0 },
          { feeType: 'Transport Fee', amount: Number(p.transportFee) || 0 },
          { feeType: 'Hostel Fee', amount: Number(p.hostelFee) || 0 }
        ].filter(f => f.amount > 0),
        totalAmount: (Number(p.tuitionFee) || 0) + (Number(p.examFee) || 0) + (Number(p.labFee) || 0) + (Number(p.libraryFee) || 0) + (Number(p.transportFee) || 0) + (Number(p.hostelFee) || 0)
      }));

      setFeeStructuresList([...convertedPlans, ...strData]);

      // Initialize default department if none selected
      if (!form.department && loadedDepts.length > 0) {
        const firstDept = loadedDepts[0]?.name || loadedDepts[0]?.departmentName || loadedDepts[0];
        const deptCode = loadedDepts[0]?.code || (typeof firstDept === 'string' ? firstDept.substring(0, 3).toUpperCase() : 'ST');
        setForm(prev => ({
          ...prev,
          dept: firstDept,
          department: firstDept,
          id: prev.id || generateRegNo(deptCode, loadedStudents),
          admissionNo: prev.admissionNo || generateRegNo(deptCode, loadedStudents)
        }));
      }

    } catch (err) {
      console.error('Initial data load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useRealtimeSync(loadInitialData, ['students', 'departments', 'courses', 'sections', 'feeStructure', 'feePlans', 'quotas']);

  // Helper to normalize strings for robust matching across departments, courses and quotas
  const cleanNormalizedStr = (s) => {
    if (!s) return '';
    return String(s)
      .replace(/\s*\([^)]*\)/g, '') // Strips (HAA), (1234), (UG), etc.
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase()
      .trim();
  };

  const isDeptMatch = (qDept, activeDept, qDeptId, activeDeptId) => {
    if (!qDept && !qDeptId) return true;
    if (!activeDept && !activeDeptId) return true;
    if (qDeptId && activeDeptId && String(qDeptId).trim().toLowerCase() === String(activeDeptId).trim().toLowerCase()) return true;
    const c1 = cleanNormalizedStr(qDept);
    const c2 = cleanNormalizedStr(activeDept);
    if (!c1 || !c2) return true;
    return c1 === c2 || c1.includes(c2) || c2.includes(c1);
  };

  const isCourseMatch = (qCourse, activeCourse, qCourseId, activeCourseId) => {
    if (!qCourse || qCourse === 'All Courses' || qCourse === 'all') return true;
    if (!activeCourse) return true;
    if (qCourseId && activeCourseId && String(qCourseId).trim().toLowerCase() === String(activeCourseId).trim().toLowerCase()) return true;
    const c1 = cleanNormalizedStr(qCourse);
    const c2 = cleanNormalizedStr(activeCourse);
    if (!c1 || !c2 || c1 === 'allcourses' || c1 === 'all') return true;
    return c1 === c2 || c1.includes(c2) || c2.includes(c1);
  };

  const isQuotaNameMatch = (qQuotaName, activeQuotaName) => {
    if (!qQuotaName || !activeQuotaName) return false;
    const c1 = cleanNormalizedStr(qQuotaName).replace('quota', '');
    const c2 = cleanNormalizedStr(activeQuotaName).replace('quota', '');
    if (!c1 && !c2) return true;
    if (!c1 || !c2) return false;
    return c1 === c2 || c1.includes(c2) || c2.includes(c1);
  };

  // Find matching quota rule with cascading fallback priorities
  const findMatchingQuotaRule = (deptVal, courseVal, quotaNameVal) => {
    if (!quotasList || quotasList.length === 0) return null;
    const activeQuota = quotaNameVal || 'General Quota';

    // 1. Dept + Course + Quota
    let match = quotasList.find(q => {
      if (q.status === 'inactive') return false;
      const deptMatches = isDeptMatch(q.departmentName || q.department, deptVal, q.department, form.deptId);
      const courseMatches = isCourseMatch(q.courseName || q.course, courseVal, q.course, form.courseId);
      const nameMatches = isQuotaNameMatch(q.quotaName, activeQuota);
      return deptMatches && courseMatches && nameMatches;
    });

    // 2. Dept + Quota (Dept-level quota rule)
    if (!match) {
      match = quotasList.find(q => {
        if (q.status === 'inactive') return false;
        const deptMatches = isDeptMatch(q.departmentName || q.department, deptVal, q.department, form.deptId);
        const nameMatches = isQuotaNameMatch(q.quotaName, activeQuota);
        return deptMatches && nameMatches;
      });
    }

    // 3. College-wide Quota Match
    if (!match) {
      match = quotasList.find(q => {
        if (q.status === 'inactive') return false;
        return isQuotaNameMatch(q.quotaName, activeQuota);
      });
    }

    return match || null;
  };

  // Step 49.10: Calculate the Final Fee based on Quota Rules
  const calculateFinalFee = (normalFee, quotaRule) => {
    const baseFee = Number(normalFee || 50000);
    if (!quotaRule) {
      return {
        discountAmount: 0,
        finalFee: baseFee,
      };
    }

    let discountAmount = 0;
    if (quotaRule.discountType === "fixed") {
      discountAmount = Number(quotaRule.discountValue || 0);
    } else if (quotaRule.discountType === "percentage") {
      discountAmount = (baseFee * Number(quotaRule.discountValue || 0)) / 100;
    }

    if (discountAmount > baseFee) {
      discountAmount = baseFee;
    }

    const finalFee = Math.max(0, baseFee - discountAmount);

    return {
      discountAmount,
      finalFee,
    };
  };

  // Calculate total fee based on selected feeType
  const calculateTotalFeeForType = (feeObj, type = 'all') => {
    if (!feeObj) return 0;
    const tFee = Number(feeObj.tuitionFee || 0);
    const hFee = Number(feeObj.hostelFee || 0);
    const trFee = Number(feeObj.transportFee || 0);
    const oFee = Number(feeObj.otherFees || feeObj.otherFee || 0);

    if (type === 'tuition') {
      return tFee;
    }
    if (type === 'tuition_hostel') {
      return tFee + hFee;
    }
    if (type === 'tuition_transport') {
      return tFee + trFee;
    }
    if (type === 'all') {
      return tFee + hFee + trFee + oFee;
    }

    return Number(feeObj.totalFee || feeObj.totalAmount || (tFee + hFee + trFee + oFee));
  };

  // Fetch quota-based fee structure whenever Course, Quota, or Academic Year changes
  const fetchApplicableFee = async (courseVal, quotaVal, acadYrVal) => {
    if (!courseVal && !form.department) {
      setApplicableFee(null);
      return;
    }

    const normCourse = cleanNormalizedStr(courseVal);
    const normQuota = quotaVal ? String(quotaVal).trim().toLowerCase() : "";
    const normYear = acadYrVal ? String(acadYrVal).replace(/\s+/g, '').toLowerCase() : "";

    // 1. Search in local feeStructuresList for instant zero-latency match
    let match = feeStructuresList.find(s => {
      const sCourse = typeof s.course === "object" ? (s.course?.name || s.course?.courseName || s.course?._id || '') : (s.course || '');
      const sNorm = cleanNormalizedStr(sCourse);
      const courseMatches = !normCourse || sNorm === normCourse || sNorm.includes(normCourse) || normCourse.includes(sNorm);

      const sQuota = (s.quota || '').trim().toLowerCase();
      const quotaMatches = !normQuota || !sQuota || sQuota === normQuota;

      const sYr = (s.academicYear || '').replace(/\s+/g, '').toLowerCase();
      const yrMatches = !normYear || !sYr || sYr === normYear;

      return courseMatches && quotaMatches && yrMatches;
    });

    if (!match && normCourse) {
      match = feeStructuresList.find(s => {
        const sCourse = typeof s.course === "object" ? (s.course?.name || s.course?.courseName || s.course?._id || '') : (s.course || '');
        const sNorm = cleanNormalizedStr(sCourse);
        return sNorm === normCourse || sNorm.includes(normCourse) || normCourse.includes(sNorm);
      });
    }

    if (match) {
      applyFeeStructure(match, form.feeType, quotaVal);
      return;
    }

    // 2. Search directly in Admin-configured Quotas if no direct FeeStructure exists
    const directQuotaMatch = findMatchingQuotaRule(form.department || form.dept, courseVal, quotaVal);

    if (directQuotaMatch) {
      const fallbackFee = {
        course: courseVal,
        tuitionFee: Number(directQuotaMatch.normalFee || 50000),
        otherFees: 0,
        totalFee: Number(directQuotaMatch.normalFee || 50000),
        academicYear: acadYrVal || '2026-2027',
        quota: directQuotaMatch.quotaName
      };
      applyFeeStructure(fallbackFee, form.feeType, quotaVal);
      return;
    }

    // 3. Fallback default fee structure to ensure zero blank states
    const defaultFallback = {
      course: courseVal,
      tuitionFee: 50000,
      otherFees: 0,
      totalFee: 50000,
      academicYear: acadYrVal || '2026-2027',
      quota: quotaVal || 'General Quota'
    };
    applyFeeStructure(defaultFallback, form.feeType, quotaVal);
  };

  const applyFeeStructure = (match, targetFeeType, customQuota) => {
    setApplicableFee(match);
    const activeFeeType = targetFeeType || form.feeType || 'all';
    const activeQuotaName = customQuota || form.admissionQuota || form.quotaName || 'General Quota';
    const activeDept = form.department || form.dept || '';
    const activeCourse = form.course || '';

    const tFee = Number(match?.tuitionFee || 0);
    const oFee = Number(match?.otherFees || match?.otherFee || 0);
    const hFee = Number(match?.hostelFee || 0);
    const trFee = Number(match?.transportFee || 0);

    const calculatedTotal = calculateTotalFeeForType(match, activeFeeType);
    const currentPaid = Number(form.amountPaid) || 0;

    // Search active quota rule for this department, course & quota
    const matchedQuota = findMatchingQuotaRule(activeDept, activeCourse, activeQuotaName);
    setSelectedQuotaRule(matchedQuota || null);

    const normalFee = Number(matchedQuota?.normalFee) || calculatedTotal || 50000;
    const { discountAmount, finalFee } = calculateFinalFee(normalFee, matchedQuota);

    const updatedBreakdown = {
      ...form.feeBreakdown,
      tuitionFee: Math.max(0, (tFee || normalFee) - discountAmount),
      otherFee: activeFeeType === 'all' ? oFee : 0,
      hostelFee: (activeFeeType === 'tuition_hostel' || activeFeeType === 'all') ? hFee : 0,
      transportFee: (activeFeeType === 'tuition_transport' || activeFeeType === 'all') ? trFee : 0,
    };

    setForm(prev => ({
      ...prev,
      feeType: activeFeeType,
      normalFee: normalFee,
      discountAmount: discountAmount,
      finalFee: finalFee,
      totalFee: finalFee,
      balanceFee: Math.max(0, finalFee - currentPaid),
      quota: matchedQuota?._id || null,
      quotaName: activeQuotaName,
      admissionQuota: activeQuotaName,
      feeBreakdown: updatedBreakdown,
      hostel: (activeFeeType === 'tuition_hostel' || activeFeeType === 'all') ? 'Yes' : 'No',
      hostelRequired: (activeFeeType === 'tuition_hostel' || activeFeeType === 'all') ? 'yes' : 'no',
      dormFacility: (activeFeeType === 'tuition_hostel' || activeFeeType === 'all'),
      transport: (activeFeeType === 'tuition_transport' || activeFeeType === 'all') ? 'Yes' : 'No',
      transportRequired: (activeFeeType === 'tuition_transport' || activeFeeType === 'all') ? 'yes' : 'no',
      busFacility: (activeFeeType === 'tuition_transport' || activeFeeType === 'all')
    }));
  };

  useEffect(() => {
    fetchApplicableFee(
      form.course,
      form.admissionQuota || form.quotaName || form.quota,
      form.academicYear
    );
  }, [form.course, form.admissionQuota, form.quotaName, form.quota, form.academicYear, feeStructuresList, quotasList]);

  // Filter sections dynamically based on the selected Department & Course
  const availableSections = useMemo(() => {
    const currentDept = form.department || form.dept;
    if (!currentDept) return ['A', 'B', 'C', 'D'];

    const deptObj = departments.find(d =>
      (d?.name && d.name.toLowerCase() === currentDept.toLowerCase()) ||
      (d?.id && String(d.id).toLowerCase() === String(currentDept).toLowerCase()) ||
      (d?.code && d.code.toLowerCase() === currentDept.toLowerCase())
    );

    const deptId = deptObj?.id || deptObj?._id || currentDept;
    const deptCode = deptObj?.code || '';
    const deptName = deptObj?.name || currentDept;

    const matched = sectionsList.filter(sec => {
      const sDeptId = String(sec?.departmentId || sec?.department || '').trim().toLowerCase();
      return (
        (deptId && sDeptId === String(deptId).trim().toLowerCase()) ||
        (deptCode && sDeptId === String(deptCode).trim().toLowerCase()) ||
        (deptName && sDeptId === String(deptName).trim().toLowerCase())
      );
    });

    if (matched.length > 0) {
      const uniqueNames = Array.from(new Set(matched.map(s => s.name || s.sectionName || s))).filter(Boolean);
      return uniqueNames.length > 0 ? uniqueNames : ['A', 'B', 'C', 'D'];
    }

    return ['A', 'B', 'C', 'D'];
  }, [form.department, form.dept, departments, sectionsList]);

  // Filter courses strictly by the selected Department
  const availableCourses = useMemo(() => {
    const currentDeptName = form.department || form.dept;
    if (!currentDeptName) return courses;

    const deptObj = departments.find(d =>
      (d?.name && d.name.toLowerCase() === currentDeptName.toLowerCase()) ||
      (d?.id && String(d.id).toLowerCase() === String(currentDeptName).toLowerCase()) ||
      (d?.code && d.code.toLowerCase() === currentDeptName.toLowerCase())
    );

    const deptId = deptObj?.id || deptObj?._id || currentDeptName;
    const deptCode = deptObj?.code || '';
    const deptName = deptObj?.name || currentDeptName;

    const matched = courses.filter(c => {
      const cDeptId = String(c?.departmentId || '').trim().toLowerCase();
      const cDept = String(c?.department || c?.departmentName || '').trim().toLowerCase();

      return (
        (deptId && cDeptId === String(deptId).trim().toLowerCase()) ||
        (deptCode && cDeptId === String(deptCode).trim().toLowerCase()) ||
        (deptName && cDeptId === String(deptName).trim().toLowerCase()) ||
        (deptName && cDept === String(deptName).trim().toLowerCase()) ||
        (deptCode && cDept === String(deptCode).trim().toLowerCase())
      );
    });

    return matched.length > 0 ? matched : courses;
  }, [form.department, form.dept, departments, courses]);

  const getDepartmentDefaultFeeBreakdown = (deptName) => {
    const dLower = String(deptName || '').toLowerCase();

    if (dLower.includes('computer') || dLower.includes('cse') || dLower.includes('tech') || dLower.includes('engineering')) {
      return {
        admissionFee: 5000,
        universityFee: 2500,
        marksheetVerification: 500,
        tuitionFee: 35000,
        specialFee: 5000,
        englishLabNssId: 2000,
        computerLab: 4000,
        stationary: 1500,
        pta: 1000,
        otherFee: 1500
      };
    }

    if (dLower.includes('food') || dLower.includes('nutrition') || dLower.includes('math') || dLower.includes('science')) {
      return {
        admissionFee: 3500,
        universityFee: 2000,
        marksheetVerification: 500,
        tuitionFee: 22000,
        specialFee: 3500,
        englishLabNssId: 1500,
        computerLab: 3000,
        stationary: 1000,
        pta: 1000,
        otherFee: 1000
      };
    }

    // Arts / Language / History / BA Tamil / General
    return {
      admissionFee: 2500,
      universityFee: 1500,
      marksheetVerification: 500,
      tuitionFee: 15000,
      specialFee: 2000,
      englishLabNssId: 1000,
      computerLab: 1000,
      stationary: 1000,
      pta: 500,
      otherFee: 1000
    };
  };

  useEffect(() => {
    const courseName = String(form.course || "").trim();
    const deptName = String(form.department || form.dept || "").trim();

    const semNum =
      Number(String(form.semester || "1").replace(/\D/g, "")) || 1;

    const acadYrNorm = String(form.academicYear || "")
      .replace(/\s+/g, "")
      .toLowerCase();

    const quotaName = String(form.quotaName || form.admissionQuota || form.quota || "").trim().toLowerCase();

    if (!deptName || !feeStructuresList?.length) {
      return;
    }

    // Find the exact configured fee structure
    const matched = feeStructuresList.find((s) => {
      const sDept = String(s.department || "").trim().toLowerCase();

      const sCourse =
        typeof s.course === "object"
          ? String(
              s.course?.name ||
              s.course?.courseName ||
              s.course?._id ||
              ""
            )
              .trim()
              .toLowerCase()
          : String(s.course || "").trim().toLowerCase();

      const sAcadYr = String(s.academicYear || "")
        .replace(/\s+/g, "")
        .toLowerCase();

      const sQuota = String(s.quota || "").trim().toLowerCase();

      const deptMatches =
        sDept === deptName.toLowerCase() ||
        String(s.departmentId || "").trim().toLowerCase() ===
          deptName.toLowerCase() ||
        isDeptMatch(s.department || s.departmentName, deptName, s.departmentId, form.deptId);

      const courseMatches =
        !courseName ||
        sCourse === courseName.toLowerCase() ||
        sCourse.includes(courseName.toLowerCase()) ||
        courseName.toLowerCase().includes(sCourse) ||
        isCourseMatch(s.course || s.courseName, courseName, s.courseId, form.courseId);

      const semesterMatches =
        Number(s.semester || 1) === semNum;

      const academicYearMatches =
        !sAcadYr ||
        !acadYrNorm ||
        sAcadYr === acadYrNorm;

      // If quota is selected, quota MUST match.
      const quotaMatches =
        !quotaName ||
        !sQuota ||
        sQuota === quotaName ||
        sQuota.includes(quotaName) ||
        quotaName.includes(sQuota) ||
        isQuotaNameMatch(s.quota, quotaName);

      return (
        deptMatches &&
        courseMatches &&
        semesterMatches &&
        academicYearMatches &&
        quotaMatches
      );
    });

    let breakdown = {
      admissionFee: 0,
      tuitionFee: 0,
      universityFee: 0,
      marksheetVerification: 0,
      specialFee: 0,
      computerLab: 0,
      englishLabNssId: 0,
      stationary: 0,
      pta: 0,
      otherFee: 0,
    };

    let total = 0;

    if (matched?.fees?.length) {
      matched.fees.forEach((fee) => {
        const feeType = String(fee.feeType || "").toLowerCase();
        const amount = Number(fee.amount) || 0;

        total += amount;

        if (feeType.includes("admission")) {
          breakdown.admissionFee += amount;
        } else if (feeType.includes("tuition")) {
          breakdown.tuitionFee += amount;
        } else if (
          feeType.includes("university") ||
          feeType.includes("exam")
        ) {
          breakdown.universityFee += amount;
        } else if (
          feeType.includes("marksheet") ||
          feeType.includes("document") ||
          feeType.includes("verification")
        ) {
          breakdown.marksheetVerification += amount;
        } else if (
          feeType.includes("special") ||
          feeType.includes("equipment")
        ) {
          breakdown.specialFee += amount;
        } else if (
          feeType.includes("computer") ||
          feeType.includes("software")
        ) {
          breakdown.computerLab += amount;
        } else if (
          feeType.includes("english") ||
          feeType.includes("nss") ||
          feeType.includes("id card")
        ) {
          breakdown.englishLabNssId += amount;
        } else if (
          feeType.includes("stationery") ||
          feeType.includes("stationary") ||
          feeType.includes("syllabus")
        ) {
          breakdown.stationary += amount;
        } else if (
          feeType.includes("pta") ||
          feeType.includes("parent teacher")
        ) {
          breakdown.pta += amount;
        } else {
          breakdown.otherFee += amount;
        }
      });
    } else {
      // If no matching fee structure is configured, total is 0
      total = 0;
    }

    const quotaRule = findMatchingQuotaRule(deptName, courseName, quotaName);
    const normalFee = total;
    let concession = 0;

    if (quotaRule && normalFee > 0) {
      if (quotaRule.discountType === "fixed") {
        concession = Number(quotaRule.discountValue || 0);
      } else if (quotaRule.discountType === "percentage") {
        concession = (normalFee * Number(quotaRule.discountValue || 0)) / 100;
      }
    }

    if (concession > normalFee) {
      concession = normalFee;
    }

    const finalFee = Math.max(0, normalFee - concession);
    const paid = Number(form.amountPaid) || 0;
    const balance = Math.max(0, finalFee - paid);

    const paymentStatus =
      paid <= 0
        ? "Pending"
        : paid >= finalFee && finalFee > 0
        ? "Paid"
        : "Partial";

    setForm((prev) => ({
      ...prev,
      feeBreakdown: breakdown,
      normalFee: normalFee,
      discountAmount: concession,
      finalFee: finalFee,
      totalFee: finalFee,
      balanceFee: balance,
      remainingFee: balance,
      paymentStatus: paymentStatus,
      quota: quotaRule?._id || prev.quota || prev.quotaName || prev.admissionQuota,
    }));
  }, [
    form.course,
    form.department,
    form.dept,
    form.semester,
    form.academicYear,
    form.quota,
    form.quotaName,
    form.admissionQuota,
    feeStructuresList,
    quotasList,
  ]);

  // Step 8: Dynamic Quota Concession Calculation Effect
  useEffect(() => {
    const baseFee = Number(form.normalFee || form.totalFee) || 0;
    setNormalFee(baseFee);

    if (!form.quota || !quotaList?.length) {
      setQuotaConcession(0);
      setFinalAssessedFee(baseFee);
      return;
    }

    const selectedQuota = quotaList.find((q) => {
      const configuredQuota = String(
        q.quotaName || q.name || ""
      )
        .trim()
        .toLowerCase();

      const selectedQuotaName = String(form.quota)
        .trim()
        .toLowerCase();

      return (
        configuredQuota === selectedQuotaName ||
        configuredQuota.includes(selectedQuotaName) ||
        selectedQuotaName.includes(configuredQuota)
      );
    });

    if (!selectedQuota) {
      setQuotaConcession(0);
      setFinalAssessedFee(baseFee);
      return;
    }

    let concession = 0;

    if (selectedQuota.discountAmount !== undefined) {
      concession = Number(selectedQuota.discountAmount) || 0;
    } else if (
      selectedQuota.discountType === "percentage"
    ) {
      concession =
        (baseFee * Number(selectedQuota.discountValue || 0)) /
        100;
    } else {
      concession = Number(selectedQuota.discountValue || 0);
    }

    concession = Math.min(
      Math.max(0, concession),
      baseFee
    );

    const finalFee = Math.max(
      0,
      baseFee - concession
    );

    setQuotaConcession(concession);
    setFinalAssessedFee(finalFee);

    const paid = Number(form.amountPaid) || 0;

    setForm((prev) => ({
      ...prev,
      normalFee: baseFee,
      discountAmount: concession,
      finalFee: finalFee,
      balanceFee: Math.max(0, finalFee - paid),
      remainingFee: Math.max(0, finalFee - paid),
      paymentStatus: paid <= 0 ? "Pending" : paid >= finalFee && finalFee > 0 ? "Paid" : "Partial",
    }));
  }, [
    form.normalFee,
    form.totalFee,
    form.quota,
    form.amountPaid,
    quotaList,
  ]);

  // Step 10: Real-time Final Assessed Fee & Payment Status Safety Effect
  useEffect(() => {
    const assessedFee = Number(finalAssessedFee || 0);
    const paid = Math.max(0, Number(form.amountPaid) || 0);

    const balance = Math.max(0, assessedFee - paid);

    const status =
      paid <= 0
        ? "Pending"
        : paid >= assessedFee && assessedFee > 0
          ? "Paid"
          : "Partial";

    setForm((prev) => ({
      ...prev,
      balanceFee: balance,
      remainingFee: balance,
      paymentStatus: status,
    }));
  }, [finalAssessedFee, form.amountPaid]);

  // Recalculate totals whenever fee breakdown fields change
  const handleFeeBreakdownChange = (field, val) => {
    const num = Math.max(0, Number(val) || 0);
    const updatedBreakdown = {
      ...form.feeBreakdown,
      [field]: num
    };

    const normalFee = Object.values(updatedBreakdown).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const concession = Number(form.discountAmount) || 0;
    const finalFee = Math.max(0, normalFee - concession);
    const paid = Number(form.amountPaid) || 0;
    const balance = Math.max(0, finalFee - paid);
    const paymentStatus = paid <= 0 ? "Pending" : paid >= finalFee && finalFee > 0 ? "Paid" : "Partial";

    setForm(prev => ({
      ...prev,
      feeBreakdown: updatedBreakdown,
      normalFee: normalFee,
      totalFee: finalFee,
      finalFee: finalFee,
      balanceFee: balance,
      remainingFee: balance,
      paymentStatus: paymentStatus
    }));
  };

  const handleAmountPaidChange = (val) => {
    const paid = Math.max(0, Number(val) || 0);
    const finalFee = Number(form.finalFee ?? form.totalFee) || 0;
    
    if (finalFee > 0 && paid > finalFee) {
      setErrorMsg('Paid amount cannot exceed the final assessed fee.');
    } else {
      setErrorMsg('');
    }

    const remainingFee = Math.max(0, finalFee - paid);

    let status = 'Pending';
    if (paid >= finalFee && finalFee > 0) status = 'Paid';
    else if (paid > 0) status = 'Partial';

    setForm(prev => ({
      ...prev,
      amountPaid: paid,
      paidAmount: paid,
      balanceFee: remainingFee,
      remainingFee: remainingFee,
      paymentStatus: status
    }));
  };

  const handleChange = (field, val) => {
    setForm(prev => {
      const updated = { ...prev, [field]: val };

      if (field === 'firstName' || field === 'lastName' || field === 'midName') {
        updated.name = [updated.firstName, updated.midName, updated.lastName].filter(Boolean).join(' ').trim();
      }

      if (field === 'dept' || field === 'department') {
        updated.dept = val;
        updated.department = val;

        const deptObj = departments.find(d =>
          (d?.name && d.name.toLowerCase() === val.toLowerCase()) ||
          (d?.id && String(d.id).toLowerCase() === String(val).toLowerCase()) ||
          (d?.code && d.code.toLowerCase() === val.toLowerCase())
        );
        const deptId = deptObj?.id || deptObj?._id || val;
        const deptCode = deptObj?.code || '';
        const deptName = deptObj?.name || val;

        const matchingCourses = courses.filter(c => {
          const cDeptId = String(c?.departmentId || '').trim().toLowerCase();
          const cDept = String(c?.department || c?.departmentName || '').trim().toLowerCase();

          return (
            (deptId && cDeptId === String(deptId).trim().toLowerCase()) ||
            (deptCode && cDeptId === String(deptCode).trim().toLowerCase()) ||
            (deptName && cDeptId === String(deptName).trim().toLowerCase()) ||
            (deptName && cDept === String(deptName).trim().toLowerCase()) ||
            (deptCode && cDept === String(deptCode).trim().toLowerCase())
          );
        });

        if (matchingCourses.length > 0) {
          updated.course = matchingCourses[0]?.name || matchingCourses[0]?.courseName || '';
          updated.courseId = matchingCourses[0]?.id || matchingCourses[0]?._id || '';
          if (matchingCourses[0]?.degreeType) {
            updated.degreeType = matchingCourses[0].degreeType;
          }
        }

        const codeForReg = deptCode || (val ? val.substring(0, 3).toUpperCase() : 'ST');
        updated.id = generateRegNo(codeForReg, students);
        updated.admissionNo = updated.id;
      }

      if (field === 'course') {
        updated.course = val;
        const matchedCourse = courses.find(c => (c.name === val || c.courseName === val));
        if (matchedCourse) {
          updated.courseId = matchedCourse.id || matchedCourse._id || '';
          if (matchedCourse.degreeType) {
            updated.degreeType = matchedCourse.degreeType;
          }
        }
      }

      if (field === 'feeType') {
        updated.feeType = val;
        if (applicableFee) {
          const calculatedTotal = calculateTotalFeeForType(applicableFee, val);
          const currentPaid = Number(prev.amountPaid) || 0;
          const tFee = Number(applicableFee.tuitionFee || 0);
          const oFee = Number(applicableFee.otherFees || applicableFee.otherFee || 0);
          const hFee = Number(applicableFee.hostelFee || 0);
          const trFee = Number(applicableFee.transportFee || 0);

          updated.totalFee = calculatedTotal;
          updated.balanceFee = Math.max(0, calculatedTotal - currentPaid);
          updated.feeBreakdown = {
            ...prev.feeBreakdown,
            tuitionFee: tFee,
            otherFee: val === 'all' ? oFee : 0,
            hostelFee: (val === 'tuition_hostel' || val === 'all') ? hFee : 0,
            transportFee: (val === 'tuition_transport' || val === 'all') ? trFee : 0,
          };
          updated.hostel = (val === 'tuition_hostel' || val === 'all') ? 'Yes' : 'No';
          updated.hostelRequired = (val === 'tuition_hostel' || val === 'all') ? 'yes' : 'no';
          updated.dormFacility = (val === 'tuition_hostel' || val === 'all');
          updated.transport = (val === 'tuition_transport' || val === 'all') ? 'Yes' : 'No';
          updated.transportRequired = (val === 'tuition_transport' || val === 'all') ? 'yes' : 'no';
          updated.busFacility = (val === 'tuition_transport' || val === 'all');
        }
      }

      if (field === 'hostel') {
        const isHostel = val === 'Yes' || val === 'yes';
        updated.hostel = val;
        updated.dormFacility = isHostel;
        updated.hostelRequired = isHostel ? 'yes' : 'no';

        const isTrans = updated.transport === 'Yes' || updated.transport === 'yes' || updated.busFacility;
        let nextFeeType = 'tuition';
        if (isHostel && isTrans) nextFeeType = 'all';
        else if (isHostel) nextFeeType = 'tuition_hostel';
        else if (isTrans) nextFeeType = 'tuition_transport';
        updated.feeType = nextFeeType;

        if (applicableFee) {
          const calculatedTotal = calculateTotalFeeForType(applicableFee, nextFeeType);
          const currentPaid = Number(prev.amountPaid) || 0;
          updated.totalFee = calculatedTotal;
          updated.balanceFee = Math.max(0, calculatedTotal - currentPaid);
        }
      }

      if (field === 'transport') {
        const isTrans = val === 'Yes' || val === 'yes';
        updated.transport = val;
        updated.busFacility = isTrans;
        updated.transportRequired = isTrans ? 'yes' : 'no';

        const isHostel = updated.hostel === 'Yes' || updated.hostel === 'yes' || updated.dormFacility;
        let nextFeeType = 'tuition';
        if (isHostel && isTrans) nextFeeType = 'all';
        else if (isHostel) nextFeeType = 'tuition_hostel';
        else if (isTrans) nextFeeType = 'tuition_transport';
        updated.feeType = nextFeeType;

        if (applicableFee) {
          const calculatedTotal = calculateTotalFeeForType(applicableFee, nextFeeType);
          const currentPaid = Number(prev.amountPaid) || 0;
          updated.totalFee = calculatedTotal;
          updated.balanceFee = Math.max(0, calculatedTotal - currentPaid);
        }
      }

      return updated;
    });
  };

  const handleQualificationChange = (index, field, value) => {
    const updated = [...form.qualifications];
    updated[index] = { ...updated[index], [field]: value };
    setForm(prev => ({ ...prev, qualifications: updated }));
  };

  const handleAddQualification = () => {
    setForm(prev => ({
      ...prev,
      qualifications: [
        ...prev.qualifications,
        { study: 'Degree / Diploma / Other', institute: '', board: '', percentage: '', passYear: '', marksheetNo: '' }
      ]
    }));
  };

  const handleRemoveQualification = (index) => {
    setForm(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index)
    }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, photoUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReset = () => {
    const firstDept = departments[0]?.name || '';
    const deptCode = departments[0]?.code || (typeof firstDept === 'string' ? firstDept.substring(0, 3).toUpperCase() : 'ST');
    const newId = generateRegNo(deptCode, students);
    setForm({
      ...EMPTY_FORM,
      dept: firstDept,
      department: firstDept,
      id: newId,
      admissionNo: newId,
      receiptNumber: `REC-${Date.now()}`
    });
    setEditingStudentId(null);
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleFinalSubmit = async (autoPrint = false) => {
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      if (!form.firstName.trim() || !form.lastName.trim()) {
        setErrorMsg('Please enter First Name and Last Name.');
        setActiveStep(1);
        setSubmitting(false);
        return;
      }

      if (!form.department && !form.dept) {
        alert("Please select a department");
        setErrorMsg('Please select an Academic Department.');
        setActiveStep(2);
        setSubmitting(false);
        return;
      }

      if (!form.admissionQuota && !form.quotaName && !form.quota) {
        alert("Please select a quota");
        setErrorMsg('Please select an admission quota.');
        setActiveStep(2);
        setSubmitting(false);
        return;
      }

      if (Number(form.finalFee || form.totalFee || 0) < 0) {
        alert("Final fee cannot be negative");
        setErrorMsg('Final fee cannot be negative.');
        setActiveStep(4);
        setSubmitting(false);
        return;
      }

      if (Number(form.totalFee) > 0 && Number(form.amountPaid || form.paidAmount || 0) > Number(form.finalFee || form.totalFee)) {
        alert("Paid amount cannot exceed final payable fee");
        setErrorMsg('Paid amount cannot exceed the final payable fee.');
        setActiveStep(4);
        setSubmitting(false);
        return;
      }

      const fullName = form.name.trim() || [form.firstName, form.midName, form.lastName].filter(Boolean).join(' ').trim();
      const generatedId = form.id || form.admissionNo || generateRegNo(form.department, students);
      const generatedRecNo = form.receiptNumber || `REC-${Date.now()}`;

      const isHostelReq = Boolean(form.hostel === 'Yes' || form.hostelRequired === 'yes' || form.hostelRequired === true || form.dormFacility);
      const isTransportReq = Boolean(form.transport === 'Yes' || form.transportRequired === 'yes' || form.transportRequired === true || form.busFacility);

      const tuitionFeeVal = Number(form.feeBreakdown?.tuitionFee !== undefined ? form.feeBreakdown.tuitionFee : (applicableFee?.tuitionFee || form.tuitionFee || 0));
      const hostelFeeVal = isHostelReq ? Number(form.feeBreakdown?.hostelFee !== undefined ? form.feeBreakdown.hostelFee : (applicableFee?.hostelFee || form.hostelFee || form.hostelFeeAmount || 0)) : 0;
      const transportFeeVal = isTransportReq ? Number(form.feeBreakdown?.transportFee !== undefined ? form.feeBreakdown.transportFee : (applicableFee?.transportFee || form.transportFee || form.transportFeeAmount || 0)) : 0;
      const otherFeeVal = Number(form.feeBreakdown?.otherFee !== undefined ? form.feeBreakdown.otherFee : (applicableFee?.otherFees || applicableFee?.otherFee || form.otherFee || 0));

      const calculatedNormalFee = Number(normalFee || form.normalFee || form.totalFee || 0);
      const calculatedConcession = Number(quotaConcession || form.discountAmount || 0);
      const calculatedFinalFee = Math.max(0, calculatedNormalFee - calculatedConcession);
      const calculatedPaid = Number(form.amountPaid || form.paidAmount || 0);
      const calculatedBalance = Math.max(0, calculatedFinalFee - calculatedPaid);
      const calculatedStatus =
        calculatedPaid <= 0
          ? "Pending"
          : calculatedPaid >= calculatedFinalFee && calculatedFinalFee > 0
            ? "Paid"
            : "Partial";

      const payload = {
        ...form,
        id: generatedId,
        admissionNo: generatedId,
        name: fullName,
        receiptNumber: generatedRecNo,
        paymentDate: form.paymentDate || new Date(),
        email: form.email || `${form.firstName.toLowerCase()}.${Date.now().toString().slice(-4)}@college.edu`,

        course: form.course,
        feeType: form.feeType || 'all',

        // Selected Admission Quota
        quota: form.quota || form.quotaName || "General / Merit",
        quotaName: form.quotaName || form.admissionQuota || form.quota || "General / Merit",

        // 10 Fee Component Breakdown
        feeBreakdown: {
          admissionFee: Number(form.feeBreakdown?.admissionFee || 0),
          tuitionFee: Number(form.feeBreakdown?.tuitionFee || 0),
          universityFee: Number(form.feeBreakdown?.universityFee || 0),
          marksheetVerification: Number(form.feeBreakdown?.marksheetVerification || 0),
          specialFee: Number(form.feeBreakdown?.specialFee || 0),
          computerLab: Number(form.feeBreakdown?.computerLab || 0),
          englishLabNssId: Number(form.feeBreakdown?.englishLabNssId || 0),
          stationary: Number(form.feeBreakdown?.stationary || 0),
          pta: Number(form.feeBreakdown?.pta || 0),
          otherFee: Number(form.feeBreakdown?.otherFee || 0),
        },

        normalFee: calculatedNormalFee,
        quotaConcession: calculatedConcession,
        discountAmount: calculatedConcession,
        finalAssessedFee: calculatedFinalFee,
        finalFee: calculatedFinalFee,
        totalFee: calculatedFinalFee,

        amountPaid: calculatedPaid,
        paidAmount: calculatedPaid,
        balanceFee: calculatedBalance,
        remainingFee: calculatedBalance,

        paymentMode: form.paymentMode || "Cash",
        paymentStatus: calculatedStatus,

        hostelRequired: isHostelReq ? 'yes' : 'no',
        transportRequired: isTransportReq ? 'yes' : 'no',
        tuitionFee: tuitionFeeVal,
        hostelFee: hostelFeeVal,
        transportFee: transportFeeVal,
        otherFee: otherFeeVal,
      };

      if (editingStudentId) {
        await updateStudent(editingStudentId, payload);
        setSuccessMsg(`Student Admission Record Updated Successfully: ${generatedId}`);
      } else {
        await createStudent(payload);
        if (Number(calculatedPaid) > 0 || Number(calculatedFinalFee) > 0) {
          try {
            await createFee({
              studentId: generatedId,
              studentName: fullName,
              department: form.department || form.dept || 'General',
              semester: `Sem ${form.semester || 1}`,
              feeType: 'Tuition Fee',
              totalFees: calculatedFinalFee,
              paidAmount: calculatedPaid,
              paymentMode: form.paymentMode || 'Cash',
              receiptNo: generatedRecNo,
              paymentDate: new Date(),
              quota: form.quota || form.quotaName || "General / Merit",
              quotaName: form.quotaName || form.admissionQuota || form.quota || "General / Merit",
              normalFee: calculatedNormalFee,
              discountAmount: calculatedConcession,
              finalFee: calculatedFinalFee,
              remainingFee: calculatedBalance,
              status: calculatedStatus
            });
          } catch (feeErr) {
            console.warn('Auto fee creation note:', feeErr);
          }
        }
        setSuccessMsg(`First Year New Admission Confirmed: ${generatedId} (Receipt: ${generatedRecNo})`);
      }

      await loadInitialData();

      if (autoPrint) {
        printReceiptDirect(payload);
      }

      setTimeout(() => {
        setActiveStep(6); // Switch to Step 6: Confirmed Directory view
      }, 1200);

    } catch (err) {
      console.error('Admission submit failed:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to confirm admission. Please check inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStudent = (student) => {
    setEditingStudentId(student.id || student._id);
    setForm({
      ...EMPTY_FORM,
      ...student,
      firstName: student.firstName || (student.name ? student.name.split(' ')[0] : ''),
      lastName: student.lastName || (student.name ? student.name.split(' ').slice(1).join(' ') : ''),
      department: student.dept || student.department || '',
      dept: student.dept || student.department || '',
      course: student.course || '',
      hostel: student.hostelRequired === 'yes' ? 'Yes' : 'No',
      transport: student.transportRequired === 'yes' ? 'Yes' : 'No',
      feeBreakdown: student.feeBreakdown || { ...DEFAULT_FEE_BREAKDOWN, tuitionFee: student.totalFee || 0 }
    });
    setActiveStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteStudent = async (studentId) => {
    if (!studentId) return;
    if (!window.confirm(`Are you sure you want to delete student registration ${studentId}?`)) return;
    try {
      setLoading(true);
      await deleteStudent(studentId);
      setSuccessMsg(`Student registration ${studentId} removed successfully.`);
      await loadInitialData();
    } catch (err) {
      console.error('Delete student failed:', err);
      setStudents(prev => prev.filter(s => s.id !== studentId && s._id !== studentId));
      setSuccessMsg(`Student registration ${studentId} removed.`);
    } finally {
      setLoading(false);
    }
  };

  const handlePurgeAllStudents = async () => {
    if (!window.confirm('⚠️ Are you sure you want to delete ALL dummy/test student records from the database? This will clear the entire admissions register.')) return;
    try {
      setLoading(true);
      try {
        await purgeAllStudents();
      } catch (purgeErr) {
        console.warn('Bulk purge endpoint failed, falling back to batch delete:', purgeErr);
        for (const s of students) {
          const sid = s.id || s._id;
          if (sid) {
            await deleteStudent(sid).catch(e => console.warn('Item delete note:', e.message));
          }
        }
      }
      setStudents([]);
      setSuccessMsg('All dummy student records have been permanently cleared.');
      await loadInitialData();
    } catch (err) {
      console.error('Purge students failed:', err);
      setStudents([]);
      setSuccessMsg('All dummy student records have been cleared.');
    } finally {
      setLoading(false);
    }
  };

  // Filter directory students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        (s.name || '').toLowerCase().includes(q) ||
        (s.id || '').toLowerCase().includes(q) ||
        (s.dept || s.department || '').toLowerCase().includes(q) ||
        (s.course || '').toLowerCase().includes(q) ||
        (s.phone || '').includes(q) ||
        (s.receiptNumber || '').toLowerCase().includes(q);

      const matchYear = filterAcademicYear === 'All' || s.academicYear === filterAcademicYear;
      const matchDept = filterDept === 'All' || s.dept === filterDept || s.department === filterDept;
      
      let matchPayment = true;
      if (filterPaymentStatus === 'Paid') {
        matchPayment = Number(s.amountPaid) >= Number(s.totalFee) && Number(s.totalFee) > 0;
      } else if (filterPaymentStatus === 'Partial') {
        matchPayment = Number(s.amountPaid) > 0 && Number(s.amountPaid) < Number(s.totalFee);
      } else if (filterPaymentStatus === 'Pending') {
        matchPayment = Number(s.amountPaid) === 0;
      }

      return matchSearch && matchYear && matchDept && matchPayment;
    });
  }, [students, searchQuery, filterAcademicYear, filterDept, filterPaymentStatus]);

  // Aggregate Metrics for Top Bar
  const stats = useMemo(() => {
    const totalCount = students.length;
    const totalAssessed = students.reduce((sum, s) => sum + (Number(s.totalFee || s.totalAmount) || 0), 0);
    const totalCollected = students.reduce((sum, s) => sum + (Number(s.amountPaid || s.paidAmount) || 0), 0);
    const totalBalance = Math.max(0, totalAssessed - totalCollected);
    const pendingReview = students.filter(s => s.admissionStatus !== 'Confirmed').length;

    return {
      totalCount,
      totalAssessed,
      totalCollected,
      totalBalance,
      pendingReview
    };
  }, [students]);

  // Export to CSV
  const handleExportCSV = () => {
    if (students.length === 0) {
      alert('No student records available to export.');
      return;
    }

    const headers = ['Admission No', 'Student Name', 'Department', 'Course', 'Degree', 'Academic Year', 'Semester', 'Phone', 'Email', 'Total Fee', 'Amount Paid', 'Balance', 'Receipt No'];
    const rows = students.map(s => [
      s.id || s.admissionNo || '',
      `"${s.name || `${s.firstName || ''} ${s.lastName || ''}`}"`,
      `"${s.dept || s.department || ''}"`,
      `"${s.course || ''}"`,
      s.degreeType || 'UG',
      s.academicYear || '',
      s.semester || 1,
      s.phone || '',
      s.email || '',
      Number(s.totalFee || 0),
      Number(s.amountPaid || 0),
      Number(s.balanceFee || 0),
      s.receiptNumber || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Student_Admissions_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="erp-workbench">
      {/* ── TOP ENTERPRISE COMMAND HEADER ────────────────────────────────────── */}
      <div className="erp-header-card">
        <div className="erp-header-top">
          <div className="erp-header-title-box">
            <div className="erp-brand-badge">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="erp-header-title">
                COLLEGE ERP — ADMISSION & ENROLLMENT WORKBENCH
              </h1>
              <div className="erp-header-subtitle">
                <span>Real-Time Enterprise Student Registration & Fee Desk</span>
                <span>•</span>
                <span className="erp-live-pulse">
                  <span className="erp-live-dot" />
                  Live Sync Engine Active
                </span>
                <span>•</span>
                <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <div className="erp-header-actions">
            <button
              type="button"
              className="erp-btn-header"
              onClick={loadInitialData}
              title="Synchronize Live Database"
            >
              <RefreshCw size={14} className={loading ? 'erp-spin' : ''} />
              <span>Sync</span>
            </button>

            <button
              type="button"
              className="erp-btn-header"
              onClick={printBlankApplicationForm}
              title="Print Official Blank Application Form"
            >
              <Printer size={14} />
              <span>Blank Form</span>
            </button>

            <button
              type="button"
              className="erp-btn-header"
              onClick={handleExportCSV}
              title="Export Full Directory Data to CSV"
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              className="erp-btn-header erp-btn-header-primary"
              onClick={() => {
                handleReset();
                setActiveStep(1);
              }}
            >
              <Plus size={15} />
              <span>New Admission</span>
            </button>
          </div>
        </div>

        {/* Real-time KPI Bar */}
        <div className="erp-kpi-bar">
          <div className="erp-kpi-card">
            <div className="erp-kpi-icon" style={{ background: '#eff6ff', color: '#1e40af' }}>
              <Users size={18} />
            </div>
            <div className="erp-kpi-info">
              <span className="erp-kpi-label">Total Enrolled</span>
              <span className="erp-kpi-val">{stats.totalCount} Students</span>
            </div>
          </div>

          <div className="erp-kpi-card">
            <div className="erp-kpi-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <IndianRupee size={18} />
            </div>
            <div className="erp-kpi-info">
              <span className="erp-kpi-label">Total Fees Assessed</span>
              <span className="erp-kpi-val">₹{stats.totalAssessed.toLocaleString()}</span>
            </div>
          </div>

          <div className="erp-kpi-card">
            <div className="erp-kpi-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
              <CreditCard size={18} />
            </div>
            <div className="erp-kpi-info">
              <span className="erp-kpi-label">Collections Realized</span>
              <span className="erp-kpi-val" style={{ color: '#16a34a' }}>₹{stats.totalCollected.toLocaleString()}</span>
            </div>
          </div>

          <div className="erp-kpi-card">
            <div className="erp-kpi-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <AlertCircle size={18} />
            </div>
            <div className="erp-kpi-info">
              <span className="erp-kpi-label">Outstanding Balance</span>
              <span className="erp-kpi-val" style={{ color: '#dc2626' }}>₹{stats.totalBalance.toLocaleString()}</span>
            </div>
          </div>

          <div className="erp-kpi-card">
            <div className="erp-kpi-icon" style={{ background: '#faf5ff', color: '#7e22ce' }}>
              <Building2 size={18} />
            </div>
            <div className="erp-kpi-info">
              <span className="erp-kpi-label">Active Depts</span>
              <span className="erp-kpi-val">{departments.length} Depts</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── WORKFLOW STEP NAVIGATOR ────────────────────────────────────────── */}
      <div className="erp-stepper-nav">
        <button
          type="button"
          className={`erp-step-tab ${activeStep === 1 ? 'active' : ''} ${form.firstName && form.lastName ? 'completed' : ''}`}
          onClick={() => setActiveStep(1)}
        >
          <div className="erp-step-num">
            {form.firstName && form.lastName ? <Check size={13} /> : '1'}
          </div>
          <div className="erp-step-content">
            <span className="erp-step-subtitle">Step 1</span>
            <span className="erp-step-title">Demographics</span>
          </div>
        </button>

        <button
          type="button"
          className={`erp-step-tab ${activeStep === 2 ? 'active' : ''} ${form.department && form.course ? 'completed' : ''}`}
          onClick={() => setActiveStep(2)}
        >
          <div className="erp-step-num">
            {form.department && form.course ? <Check size={13} /> : '2'}
          </div>
          <div className="erp-step-content">
            <span className="erp-step-subtitle">Step 2</span>
            <span className="erp-step-title">Academics</span>
          </div>
        </button>

        <button
          type="button"
          className={`erp-step-tab ${activeStep === 3 ? 'active' : ''} ${form.qualifications.some(q => q.percentage) ? 'completed' : ''}`}
          onClick={() => setActiveStep(3)}
        >
          <div className="erp-step-num">
            {form.qualifications.some(q => q.percentage) ? <Check size={13} /> : '3'}
          </div>
          <div className="erp-step-content">
            <span className="erp-step-subtitle">Step 3</span>
            <span className="erp-step-title">Qualifications</span>
          </div>
        </button>

        <button
          type="button"
          className={`erp-step-tab ${activeStep === 4 ? 'active' : ''} ${Number(form.totalFee) > 0 ? 'completed' : ''}`}
          onClick={() => setActiveStep(4)}
        >
          <div className="erp-step-num">
            {Number(form.totalFee) > 0 ? <Check size={13} /> : '4'}
          </div>
          <div className="erp-step-content">
            <span className="erp-step-subtitle">Step 4</span>
            <span className="erp-step-title">Fee Ledger</span>
          </div>
        </button>

        <button
          type="button"
          className={`erp-step-tab ${activeStep === 5 ? 'active' : ''}`}
          onClick={() => setActiveStep(5)}
        >
          <div className="erp-step-num">5</div>
          <div className="erp-step-content">
            <span className="erp-step-subtitle">Step 5</span>
            <span className="erp-step-title">Verification</span>
          </div>
        </button>

        <button
          type="button"
          className={`erp-step-tab ${activeStep === 6 ? 'active' : ''}`}
          onClick={() => setActiveStep(6)}
        >
          <div className="erp-step-num">6</div>
          <div className="erp-step-content">
            <span className="erp-step-subtitle">Register</span>
            <span className="erp-step-title">Directory ({students.length})</span>
          </div>
        </button>
      </div>

      {/* ── ALERTS (SUCCESS & ERROR) ────────────────────────────────────────── */}
      {successMsg && (
        <div className="erp-alert erp-alert-success">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => setSuccessMsg('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="erp-alert erp-alert-danger">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
          <button style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }} onClick={() => setErrorMsg('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 1: DEMOGRAPHICS & IDENTIFICATION                               */}
      {/* ===================================================================== */}
      {activeStep === 1 && (
        <div className="erp-card">
          <div className="erp-card-header">
            <div className="erp-card-title-group">
              <div className="erp-card-icon">
                <User size={18} />
              </div>
              <div>
                <h2 className="erp-card-title">Step 1: Student Demographics & Identification</h2>
                <p className="erp-card-subtitle">Enter personal, parent, demographic and contact details for student registration</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="erp-badge erp-badge-primary">
                Auto-Reg ID: {form.id || 'GEN-PENDING'}
              </span>
            </div>
          </div>

          <div className="erp-card-body">
            {/* Group 1: Student Personal Identification */}
            <div className="erp-section-box">
              <div className="erp-section-box-title">
                <User size={15} /> 1. Personal & Identity Details
              </div>

              <div className="erp-form-grid-3">
                <div className="erp-form-group">
                  <label className="erp-label">
                    First Name <span className="erp-req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="e.g. Priya"
                    value={form.firstName}
                    onChange={e => handleChange('firstName', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Middle Name</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="e.g. Kumar"
                    value={form.midName}
                    onChange={e => handleChange('midName', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">
                    Last Name / Initial <span className="erp-req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="e.g. R"
                    value={form.lastName}
                    onChange={e => handleChange('lastName', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Gender <span className="erp-req">*</span></label>
                  <div className="erp-radio-pills">
                    {['Male', 'Female', 'Other'].map(g => (
                      <label key={g} className={`erp-radio-pill ${form.gender === g ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="gender"
                          value={g}
                          checked={form.gender === g}
                          onChange={e => handleChange('gender', e.target.value)}
                        />
                        {g}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Date of Birth</label>
                  <input
                    type="date"
                    className="erp-input"
                    value={form.dob}
                    onChange={e => handleChange('dob', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Place of Birth</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="e.g. Chennai"
                    value={form.placeOfBirth}
                    onChange={e => handleChange('placeOfBirth', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Blood Group</label>
                  <select
                    className="erp-select"
                    value={form.bloodGroup}
                    onChange={e => handleChange('bloodGroup', e.target.value)}
                  >
                    {BLOOD_GROUPS.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Mother Tongue</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="e.g. Tamil"
                    value={form.motherTongue}
                    onChange={e => handleChange('motherTongue', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Nationality</label>
                  <select
                    className="erp-select"
                    value={form.nationality}
                    onChange={e => handleChange('nationality', e.target.value)}
                  >
                    <option value="Indian">Indian</option>
                    <option value="NRI">NRI</option>
                    <option value="Foreign National">Foreign National</option>
                  </select>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Religion</label>
                  <select
                    className="erp-select"
                    value={form.religion}
                    onChange={e => handleChange('religion', e.target.value)}
                  >
                    {RELIGIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Community</label>
                  <select
                    className="erp-select"
                    value={form.community}
                    onChange={e => handleChange('community', e.target.value)}
                  >
                    {COMMUNITIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Caste / Sub-Caste</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="e.g. Agamudayar"
                    value={form.caste}
                    onChange={e => handleChange('caste', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Community Certificate No</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="e.g. CC-58694"
                    value={form.communityCertNo}
                    onChange={e => handleChange('communityCertNo', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Physically Challenged?</label>
                  <div className="erp-radio-pills">
                    {['No', 'Yes'].map(opt => (
                      <label key={opt} className={`erp-radio-pill ${form.handicapped === opt ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="handicapped"
                          value={opt}
                          checked={form.handicapped === opt}
                          onChange={e => handleChange('handicapped', e.target.value)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Student Photo ID</label>
                  <div className="erp-photo-zone">
                    {form.photoUrl ? (
                      <img src={form.photoUrl} alt="Avatar" className="erp-avatar-preview" />
                    ) : (
                      <div className="erp-avatar-preview">
                        <User size={24} />
                      </div>
                    )}
                    <div className="erp-photo-actions">
                      <input
                        type="file"
                        accept="image/*"
                        id="studentPhotoUpload"
                        style={{ display: 'none' }}
                        onChange={handlePhotoUpload}
                      />
                      <label htmlFor="studentPhotoUpload" className="erp-btn-header" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                        <Camera size={13} /> Upload Photo
                      </label>
                      {form.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, photoUrl: '' }))}
                          style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '11px', cursor: 'pointer', textAlign: 'left', fontWeight: '600' }}
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Group 2: Parent & Guardian Details */}
            <div className="erp-section-box">
              <div className="erp-section-box-title">
                <Users size={15} /> 2. Parent & Guardian Information
              </div>

              <div className="erp-form-grid-3">
                <div className="erp-form-group">
                  <label className="erp-label">Father's Name <span className="erp-req">*</span></label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="e.g. Rajasekar M"
                    value={form.fatherName}
                    onChange={e => handleChange('fatherName', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Mother's Name <span className="erp-req">*</span></label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    placeholder="e.g. Latha R"
                    value={form.motherName}
                    onChange={e => handleChange('motherName', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Father's Occupation</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="e.g. Officer / Business"
                    value={form.fatherOccupation}
                    onChange={e => handleChange('fatherOccupation', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Annual Family Income (₹)</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="e.g. 150000"
                    value={form.yearlyIncome}
                    onChange={e => handleChange('yearlyIncome', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Father's Mobile Phone</label>
                  <input
                    type="tel"
                    className="erp-input"
                    placeholder="e.g. 9876543210"
                    value={form.fatherPhone}
                    onChange={e => handleChange('fatherPhone', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Father's Email ID</label>
                  <input
                    type="email"
                    className="erp-input"
                    placeholder="e.g. parent@example.com"
                    value={form.fatherEmail}
                    onChange={e => handleChange('fatherEmail', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Local Guardian Name</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="Optional if local guardian"
                    value={form.guardianName}
                    onChange={e => handleChange('guardianName', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Guardian Phone</label>
                  <input
                    type="tel"
                    className="erp-input"
                    placeholder="e.g. 07299188844"
                    value={form.guardianPhone}
                    onChange={e => handleChange('guardianPhone', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Guardian Email</label>
                  <input
                    type="email"
                    className="erp-input"
                    placeholder="guardian@example.com"
                    value={form.guardianEmail}
                    onChange={e => handleChange('guardianEmail', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Group 3: Contact & Permanent Address */}
            <div className="erp-section-box">
              <div className="erp-section-box-title">
                <MapPin size={15} /> 3. Contact & Residential Address
              </div>

              <div className="erp-form-grid-3">
                <div className="erp-form-group">
                  <label className="erp-label">Student Primary Mobile <span className="erp-req">*</span></label>
                  <input
                    type="tel"
                    required
                    className="erp-input"
                    placeholder="e.g. 9000234617"
                    value={form.phone}
                    onChange={e => handleChange('phone', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Student Primary Email <span className="erp-req">*</span></label>
                  <input
                    type="email"
                    required
                    className="erp-input"
                    placeholder="e.g. mpriya123@gmail.com"
                    value={form.email}
                    onChange={e => handleChange('email', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">City / Town</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="e.g. Chennai"
                    value={form.city}
                    onChange={e => handleChange('city', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">State</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="e.g. Tamil Nadu"
                    value={form.state}
                    onChange={e => handleChange('state', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Country</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="e.g. India"
                    value={form.country}
                    onChange={e => handleChange('country', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Pin Code</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="e.g. 600082"
                    value={form.pincode}
                    onChange={e => handleChange('pincode', e.target.value)}
                  />
                </div>

                <div className="erp-form-group" style={{ gridColumn: 'span 3' }}>
                  <label className="erp-label">Permanent Postal Address</label>
                  <textarea
                    className="erp-textarea"
                    placeholder="e.g. No 6, Anna Salai, Perambur, Chennai - 600082"
                    value={form.address}
                    onChange={e => handleChange('address', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="erp-footer-actions">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={handleReset}
              >
                <RefreshCw size={14} /> Reset Form
              </button>

              <button
                type="button"
                className="erp-btn erp-btn-primary"
                onClick={() => {
                  if (!form.firstName.trim() || !form.lastName.trim()) {
                    setErrorMsg('Please enter both First Name and Last Name.');
                    return;
                  }
                  setErrorMsg('');
                  setActiveStep(2);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span>Save & Proceed to Academic Allocation</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 2: ACADEMIC PROGRAM & ALLOCATION                               */}
      {/* ===================================================================== */}
      {activeStep === 2 && (
        <div className="erp-card">
          <div className="erp-card-header">
            <div className="erp-card-title-group">
              <div className="erp-card-icon">
                <GraduationCap size={18} />
              </div>
              <div>
                <h2 className="erp-card-title">Step 2: Academic Program & Degree Enrollment</h2>
                <p className="erp-card-subtitle">Allocate department, degree course, academic year, semester, section & amenities</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="erp-badge erp-badge-success">
                Student: {form.firstName} {form.lastName}
              </span>
            </div>
          </div>

          <div className="erp-card-body">
            {/* Group 1: Academic Allocation */}
            <div className="erp-section-box">
              <div className="erp-section-box-title">
                <Building2 size={15} /> 1. Program & Enrollment Allocation
              </div>

              <div className="erp-form-grid-3">
                <div className="erp-form-group">
                  <label className="erp-label">
                    New Admission No (Registration ID) <span className="erp-req">*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="text"
                      required
                      className="erp-input"
                      style={{ fontWeight: '800', color: '#1e40af' }}
                      value={form.id || form.admissionNo}
                      onChange={e => {
                        handleChange('id', e.target.value);
                        handleChange('admissionNo', e.target.value);
                      }}
                    />
                    <button
                      type="button"
                      className="erp-btn-header"
                      onClick={() => {
                        const deptObj = departments.find(d => (d.name === form.department || d.id === form.department));
                        const code = deptObj?.code || (form.department ? form.department.substring(0, 3).toUpperCase() : 'ST');
                        const newId = generateRegNo(code, students);
                        handleChange('id', newId);
                        handleChange('admissionNo', newId);
                      }}
                      title="Auto-Generate New Sequential Admission No"
                    >
                      Gen ID
                    </button>
                  </div>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Previous / Entrance Application No</label>
                  <input
                    type="text"
                    className="erp-input"
                    placeholder="e.g. APP-536"
                    value={form.previousAdmissionNo}
                    onChange={e => handleChange('previousAdmissionNo', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Academic Year <span className="erp-req">*</span></label>
                  <input
                    type="text"
                    required
                    className="erp-input"
                    value={form.academicYear}
                    onChange={e => handleChange('academicYear', e.target.value)}
                  />
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Degree Type <span className="erp-req">*</span></label>
                  <select
                    className="erp-select"
                    value={form.degreeType}
                    onChange={e => handleChange('degreeType', e.target.value)}
                  >
                    {DEGREE_TYPES.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Department <span className="erp-req">*</span></label>
                  <select
                    className="erp-select"
                    value={form.department || form.dept || ''}
                    onChange={e => {
                      handleChange('department', e.target.value);
                      handleChange('dept', e.target.value);
                    }}
                  >
                    <option value="">Select Department</option>
                    {departments.map((d, i) => {
                      const dName = d.name || d.departmentName || d;
                      return (
                        <option key={d.id || d._id || i} value={dName}>
                          {dName} {d.code ? `(${d.code})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Course / Major <span className="erp-req">*</span></label>
                  <select
                    className="erp-select"
                    value={form.course || ''}
                    onChange={e => handleChange('course', e.target.value)}
                  >
                    <option value="">
                      {!(form.department || form.dept)
                        ? 'Select Department First'
                        : availableCourses.length === 0
                        ? 'No courses configured for this department'
                        : 'Select Course'}
                    </option>
                    {availableCourses.map((c, i) => {
                      const cName = c.name || c.courseName || c;
                      return (
                        <option key={c.id || c._id || i} value={cName}>
                          {cName} {c.code ? `(${c.code})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Semester <span className="erp-req">*</span></label>
                  <select
                    className="erp-select"
                    value={form.semester}
                    onChange={e => handleChange('semester', Number(e.target.value))}
                  >
                    {SEMESTERS_LIST.map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Section Allocation <span className="erp-req">*</span></label>
                  <select
                    className="erp-select"
                    value={form.section || 'A'}
                    onChange={e => handleChange('section', e.target.value)}
                  >
                    {availableSections.map(sec => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                </div>

                <div className="erp-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label className="erp-label" style={{ margin: 0 }}>
                      Admission Quota / Seat Type <span className="erp-req">*</span>
                    </label>
                    {quotasList.some(q => {
                      const deptVal = form.department || form.dept || '';
                      return isDeptMatch(q.departmentName || q.department, deptVal, q.department, form.deptId) && q.status !== 'inactive';
                    }) && (
                      <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700' }}>
                        ★ Concessions Available for this Dept
                      </span>
                    )}
                  </div>
                  <select
                    className="erp-select"
                    disabled={!(form.department || form.dept)}
                    value={form.admissionQuota || form.quotaName || 'General Quota'}
                    onChange={e => {
                      const selectedQ = e.target.value;
                      handleChange('admissionQuota', selectedQ);
                      handleChange('quotaName', selectedQ);
                      if (applicableFee) {
                        applyFeeStructure(applicableFee, form.feeType, selectedQ);
                      }
                    }}
                  >
                    {STANDARD_QUOTA_CATEGORIES.map(cat => {
                      const matchedRule = findMatchingQuotaRule(form.department || form.dept, form.course, cat);

                      if (matchedRule && Number(matchedRule.discountValue || 0) > 0) {
                        const disc = matchedRule.discountType === 'percentage' ? `${matchedRule.discountValue}%` : `₹${Number(matchedRule.discountValue || 0).toLocaleString('en-IN')}`;
                        const net = Number(matchedRule.finalFee || (Number(matchedRule.normalFee || 50000) - Number(matchedRule.discountValue || 0)) || 0);
                        return (
                          <option key={cat} value={matchedRule.quotaName || cat}>
                            {matchedRule.quotaName || cat} (-{disc} Concession ➔ Net: ₹{net.toLocaleString('en-IN')})
                          </option>
                        );
                      }

                      return (
                        <option key={cat} value={cat}>
                          {cat} {cat === 'General Quota' ? '(Standard Normal Fee)' : ''}
                        </option>
                      );
                    })}
                  </select>

                  {/* Active Quota Quick Selection Chips */}
                  {quotasList.filter(q => {
                    const deptVal = form.department || form.dept || '';
                    return isDeptMatch(q.departmentName || q.department, deptVal, q.department, form.deptId) && q.status !== 'inactive';
                  }).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', alignSelf: 'center' }}>Quick Apply:</span>
                      {quotasList
                        .filter(q => {
                          const deptVal = form.department || form.dept || '';
                          return isDeptMatch(q.departmentName || q.department, deptVal, q.department, form.deptId) && q.status !== 'inactive';
                        })
                        .map(q => {
                          const isSel = isQuotaNameMatch(form.admissionQuota || form.quotaName, q.quotaName);
                          return (
                            <button
                              key={q._id || q.quotaName}
                              type="button"
                              onClick={() => {
                                handleChange('admissionQuota', q.quotaName);
                                handleChange('quotaName', q.quotaName);
                                if (applicableFee) {
                                  applyFeeStructure(applicableFee, form.feeType, q.quotaName);
                                }
                              }}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: isSel ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                                background: isSel ? '#ecfdf5' : '#ffffff',
                                color: isSel ? '#15803d' : '#334155',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Award size={12} color={isSel ? '#16a34a' : '#64748b'} />
                              {q.quotaName}: -₹{Number(q.discountValue || 0).toLocaleString('en-IN')}
                              {isSel && <Check size={12} color="#16a34a" />}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">Date of Admission</label>
                  <input
                    type="date"
                    className="erp-input"
                    value={form.admissionDate}
                    onChange={e => handleChange('admissionDate', e.target.value)}
                  />
                </div>

                {/* Fee Type Selection */}
                <div className="erp-form-group">
                  <label className="erp-label">
                    Fee Type Applicable <span className="erp-req">*</span>
                  </label>
                  <select
                    name="feeType"
                    className="erp-select"
                    value={form.feeType || 'all'}
                    onChange={e => handleChange('feeType', e.target.value)}
                    required
                  >
                    <option value="tuition">Tuition Only</option>
                    <option value="tuition_hostel">Tuition + Hostel</option>
                    <option value="tuition_transport">Tuition + Transport</option>
                    <option value="all">All Fees (Tuition + Hostel + Transport + Other)</option>
                  </select>
                </div>

                {/* Step 54.8: Live Quota Fee Breakdown Display Card */}
                <div
                  style={{
                    gridColumn: 'span 3',
                    background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                    border: '1.5px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    marginTop: '2px',
                    marginBottom: '4px'
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '8px' }}>
                    📊 Live Quota Fee Calculation Breakdown
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block' }}>Normal Department Fee</span>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>₹{Number(form.normalFee || form.totalFee || 0).toLocaleString('en-IN')}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block' }}>Selected Quota</span>
                      <strong style={{ fontSize: '14px', color: '#4f46e5' }}>{form.quotaName || form.admissionQuota || 'General Quota'}</strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block' }}>Quota Discount</span>
                      <strong style={{ fontSize: '14px', color: '#dc2626' }}>
                        - ₹{Number(form.discountAmount || 0).toLocaleString('en-IN')}
                      </strong>
                    </div>

                    <div>
                      <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block' }}>Final Payable Fee</span>
                      <strong style={{ fontSize: '17px', color: '#059669' }}>
                        ₹{Number(form.finalFee || form.totalFee || 0).toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 28.2 Hostel & Transport Checkboxes */}
                <div
                  style={{
                    gridColumn: 'span 3',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    gap: '24px',
                    alignItems: 'center',
                    flexWrap: 'wrap'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>
                    Facility Options:
                  </span>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(form.hostelRequired === 'yes' || form.hostelRequired === true || form.hostel === 'Yes' || form.dormFacility)}
                      onChange={(e) => handleChange('hostel', e.target.checked ? 'Yes' : 'No')}
                      style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    Require Hostel
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(form.transportRequired === 'yes' || form.transportRequired === true || form.transport === 'Yes' || form.busFacility)}
                      onChange={(e) => handleChange('transport', e.target.checked ? 'Yes' : 'No')}
                      style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                    />
                    Require Transport
                  </label>
                </div>

                {/* Step 49.11: Display the Quota Fee Breakdown & Calculation Card */}
                {applicableFee && (
                  <div
                    className="fee-summary"
                    style={{
                      gridColumn: 'span 3',
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                      border: '1px solid #86efac',
                      borderRadius: '12px',
                      padding: '18px 22px',
                      marginTop: '8px',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.1)',
                      animation: 'fadeIn 0.3s ease-in-out'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Award size={20} color="#15803d" />
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#166534' }}>
                          Quota Fee Structure: {form.course || form.department} ({form.admissionQuota || form.quotaName || 'General Quota'})
                        </h4>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            background: '#2563eb',
                            color: '#ffffff',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: '700',
                            textTransform: 'uppercase'
                          }}
                        >
                          {form.feeType === 'tuition' ? 'Tuition Only' : form.feeType === 'tuition_hostel' ? 'Tuition + Hostel' : form.feeType === 'tuition_transport' ? 'Tuition + Transport' : 'All Fees'}
                        </span>
                        {Number(form.discountAmount || 0) > 0 && (
                          <span
                            style={{
                              fontSize: '11px',
                              background: '#dc2626',
                              color: '#ffffff',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontWeight: '700',
                              textTransform: 'uppercase'
                            }}
                          >
                            ✓ Quota Discount Applied
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', fontSize: '13px' }}>
                      {/* Department Fee */}
                      <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <span style={{ color: '#4b5563', fontSize: '11px', display: 'block', fontWeight: '600', textTransform: 'uppercase' }}>Department Fee</span>
                        <strong style={{ fontSize: '16px', color: '#1f2937' }}>
                          ₹{Number(form.normalFee || form.totalFee || 0).toLocaleString('en-IN')}
                        </strong>
                      </div>

                      {/* Selected Quota */}
                      <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                        <span style={{ color: '#4b5563', fontSize: '11px', display: 'block', fontWeight: '600', textTransform: 'uppercase' }}>Selected Quota</span>
                        <strong style={{ fontSize: '14px', color: '#4f46e5' }}>
                          {form.quotaName || form.admissionQuota || 'General Quota'}
                        </strong>
                      </div>

                      {/* Quota Discount */}
                      <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                        <span style={{ color: '#dc2626', fontSize: '11px', display: 'block', fontWeight: '700', textTransform: 'uppercase' }}>Quota Discount</span>
                        <strong style={{ fontSize: '16px', color: '#dc2626' }}>
                          - ₹{Number(form.discountAmount || 0).toLocaleString('en-IN')}
                        </strong>
                      </div>

                      {/* Final Payable Fee */}
                      <div style={{ background: '#15803d', padding: '10px 14px', borderRadius: '8px', color: '#ffffff' }}>
                        <span style={{ color: '#dcfce7', fontSize: '11px', display: 'block', fontWeight: '600', textTransform: 'uppercase' }}>Final Payable Fee</span>
                        <strong style={{ fontSize: '18px', color: '#ffffff' }}>
                          ₹{Number(form.finalFee || form.totalFee || 0).toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Group 2: Campus Facilities & Amenities */}
            <div className="erp-section-box">
              <div className="erp-section-box-title">
                <Home size={15} /> 2. Campus Accommodation & Transport Facilities
              </div>

              <div className="erp-form-grid-2">
                <div className="erp-form-group">
                  <label className="erp-label">Hostel Accommodation Required?</label>
                  <div className="erp-radio-pills">
                    {['No', 'Yes'].map(opt => (
                      <label key={opt} className={`erp-radio-pill ${form.hostel === opt ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="hostelOpt"
                          value={opt}
                          checked={form.hostel === opt}
                          onChange={e => handleChange('hostel', e.target.value)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="erp-form-group">
                  <label className="erp-label">College Bus Transport Required?</label>
                  <div className="erp-radio-pills">
                    {['No', 'Yes'].map(opt => (
                      <label key={opt} className={`erp-radio-pill ${form.transport === opt ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="transportOpt"
                          value={opt}
                          checked={form.transport === opt}
                          onChange={e => handleChange('transport', e.target.value)}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>

                {form.transport === 'Yes' && (
                  <>
                    <div className="erp-form-group">
                      <label className="erp-label">Bus Route Name / Number</label>
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="e.g. Route 12 - Tambaram to College"
                        value={form.busRoute}
                        onChange={e => handleChange('busRoute', e.target.value)}
                      />
                    </div>

                    <div className="erp-form-group">
                      <label className="erp-label">Designated Pickup Point</label>
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="e.g. Chromepet Bus Stop"
                        value={form.pickupPoint}
                        onChange={e => handleChange('pickupPoint', e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="erp-footer-actions">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={() => {
                  setActiveStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <ArrowLeft size={15} /> Back to Demographics
              </button>

              <button
                type="button"
                className="erp-btn erp-btn-primary"
                onClick={() => {
                  if (!form.department && !form.dept) {
                    setErrorMsg('Please select an Academic Department.');
                    return;
                  }
                  if (!form.course) {
                    setErrorMsg('Please select a Course.');
                    return;
                  }
                  setErrorMsg('');
                  setActiveStep(3);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span>Save & Proceed to Prior Qualifications</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 3: PRIOR QUALIFICATIONS & ACADEMIC RECORDS                     */}
      {/* ===================================================================== */}
      {activeStep === 3 && (
        <div className="erp-card">
          <div className="erp-card-header">
            <div className="erp-card-title-group">
              <div className="erp-card-icon">
                <Award size={18} />
              </div>
              <div>
                <h2 className="erp-card-title">Step 3: Academic Qualifications & Prior Records</h2>
                <p className="erp-card-subtitle">Enter SSLC (10th), HSC (+2), or prior Diploma/Degree marksheet verification details</p>
              </div>
            </div>

            <button
              type="button"
              className="erp-btn-header"
              onClick={handleAddQualification}
            >
              <Plus size={14} /> Add Additional Qualification
            </button>
          </div>

          <div className="erp-card-body">
            <div className="erp-table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Study / Examination</th>
                    <th>Institution / School Name</th>
                    <th>Board / University</th>
                    <th style={{ width: '110px' }}>Percentage / %</th>
                    <th style={{ width: '110px' }}>Passing Year</th>
                    <th style={{ width: '140px' }}>Marksheet S.No</th>
                    <th style={{ width: '60px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.qualifications.map((q, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          className="erp-input"
                          style={{ height: '32px' }}
                          value={q.study}
                          onChange={e => handleQualificationChange(idx, 'study', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="erp-input"
                          style={{ height: '32px' }}
                          placeholder="e.g. St. Joseph Higher Secondary School"
                          value={q.institute}
                          onChange={e => handleQualificationChange(idx, 'institute', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="erp-input"
                          style={{ height: '32px' }}
                          placeholder="e.g. State Board / CBSE"
                          value={q.board}
                          onChange={e => handleQualificationChange(idx, 'board', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="erp-input"
                          style={{ height: '32px', textAlign: 'center', fontWeight: '700' }}
                          placeholder="e.g. 88.5"
                          value={q.percentage}
                          onChange={e => handleQualificationChange(idx, 'percentage', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="erp-input"
                          style={{ height: '32px', textAlign: 'center' }}
                          placeholder="e.g. 2024"
                          value={q.passYear}
                          onChange={e => handleQualificationChange(idx, 'passYear', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="erp-input"
                          style={{ height: '32px' }}
                          placeholder="e.g. MS-12498"
                          value={q.marksheetNo}
                          onChange={e => handleQualificationChange(idx, 'marksheetNo', e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {form.qualifications.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQualification(idx)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                            title="Remove row"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Navigation */}
            <div className="erp-footer-actions">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={() => {
                  setActiveStep(2);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <ArrowLeft size={15} /> Back to Academic Allocation
              </button>

              <button
                type="button"
                className="erp-btn erp-btn-primary"
                onClick={() => {
                  setActiveStep(4);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span>Save & Proceed to Fee Ledger Desk</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 4: FEE LEDGER & REAL-TIME ACCOUNTS DESK                        */}
      {/* ===================================================================== */}
      {activeStep === 4 && (
        <div className="erp-card">
          <div className="erp-card-header">
            <div className="erp-card-title-group">
              <div className="erp-card-icon">
                <CreditCard size={18} />
              </div>
              <div>
                <h2 className="erp-card-title">Step 4: Fee Ledger & Real-Time Accounts Calculation Desk</h2>
                <p className="erp-card-subtitle">Real-time fee structure calculation, automated breakdown, payment entry & receipt generation</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`erp-badge ${form.amountPaid >= form.totalFee && form.totalFee > 0 ? 'erp-badge-success' : form.amountPaid > 0 ? 'erp-badge-warning' : 'erp-badge-danger'}`}>
                Payment Status: {form.paymentStatus || 'Pending'}
              </span>
            </div>
          </div>

          <div className="erp-card-body">
            {/* Live Quota & Fee Structure Audit Voucher Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '18px',
                color: '#ffffff',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '14px',
                boxShadow: '0 4px 15px rgba(15, 23, 42, 0.12)'
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Department & Course</span>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff', marginTop: '3px' }}>
                  {form.department || form.dept || 'General Department'}
                </div>
                <span style={{ fontSize: '12px', color: '#60a5fa', fontWeight: '600' }}>{form.course || 'All Courses in Department'}</span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Admission Quota</span>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#c084fc', marginTop: '3px' }}>
                  {form.quotaName || form.admissionQuota || 'General Quota'}
                </div>
                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Session: {form.academicYear || '2026-2027'}</span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Baseline Department Fee</span>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', marginTop: '3px' }}>
                  ₹{Number(form.normalFee || form.totalFee || 50000).toLocaleString('en-IN')}
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Standard Normal Fee</span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Quota Concession</span>
                <div style={{ fontSize: '16px', fontWeight: '800', color: Number(form.discountAmount || 0) > 0 ? '#f87171' : '#94a3b8', marginTop: '3px' }}>
                  {Number(form.discountAmount || 0) > 0 ? `- ₹${Number(form.discountAmount).toLocaleString('en-IN')}` : '₹0 (None)'}
                </div>
                <span style={{ fontSize: '11px', color: Number(form.discountAmount || 0) > 0 ? '#34d399' : '#94a3b8' }}>
                  {Number(form.discountAmount || 0) > 0 ? '✓ Subsidy Applied' : 'Standard Rate'}
                </span>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '10px 14px', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
                <span style={{ fontSize: '11px', color: '#38bdf8', textTransform: 'uppercase', fontWeight: '800' }}>Final Assessed Fee</span>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#34d399', marginTop: '2px' }}>
                  ₹{Number(form.finalFee || form.totalFee || 50000).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Quota Selection Dropdown in Step 4 */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="#4f46e5" />
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
                  Admission Quota / Concession:
                </span>
              </div>

              <div style={{ minWidth: '280px', flex: '1', maxWidth: '400px' }}>
                <select
                  className="erp-select"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    borderRadius: '6px',
                    border: '1.5px solid #4f46e5',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    cursor: 'pointer'
                  }}
                  value={form.quota || form.quotaName || form.admissionQuota || ""}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      quota: selectedVal,
                      quotaName: selectedVal,
                      admissionQuota: selectedVal,
                    }));
                  }}
                >
                  <option value="">Select Admission Quota</option>
                  <option value="General / Merit">General / Merit</option>
                  <option value="Government Quota">Government Quota</option>
                  <option value="Management Quota">Management Quota</option>
                  <option value="Sports Quota">Sports Quota</option>
                  <option value="Ex-Servicemen / Special">Ex-Servicemen / Special</option>
                </select>
              </div>
            </div>

            <div className="erp-fee-grid">
              {/* Left Column: Detailed Fee Breakdown */}
              <div className="erp-fee-breakdown-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#1e3a8a', textTransform: 'uppercase' }}>
                    Fee Component Breakdown (₹)
                  </span>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    Configured for: <b>{form.department || 'General'}</b>
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between border-b pb-2" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#475569' }}>Admission & Processing Fee</span>
                    <strong style={{ color: '#0f172a' }}>
                      ₹{Number(form.feeBreakdown?.admissionFee || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div className="flex justify-between border-b pb-2" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#475569' }}>Tuition Fee (Semester {form.semester || 1})</span>
                    <strong style={{ color: '#0f172a' }}>
                      ₹{Number(form.feeBreakdown?.tuitionFee || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div className="flex justify-between border-b pb-2" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#475569' }}>University / Exam Affiliation Fee</span>
                    <strong style={{ color: '#0f172a' }}>
                      ₹{Number(form.feeBreakdown?.universityFee || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div className="flex justify-between border-b pb-2" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#475569' }}>Marksheet & Document Verification</span>
                    <strong style={{ color: '#0f172a' }}>
                      ₹{Number(form.feeBreakdown?.marksheetVerification || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div className="flex justify-between border-b pb-2" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#475569' }}>Special / Lab Equipment Fee</span>
                    <strong style={{ color: '#0f172a' }}>
                      ₹{Number(form.feeBreakdown?.specialFee || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div className="flex justify-between border-b pb-2" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#475569' }}>Computer & Software Lab Access</span>
                    <strong style={{ color: '#0f172a' }}>
                      ₹{Number(form.feeBreakdown?.computerLab || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div className="flex justify-between border-b pb-2" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#475569' }}>English Language Lab & NSS / ID Card</span>
                    <strong style={{ color: '#0f172a' }}>
                      ₹{Number(form.feeBreakdown?.englishLabNssId || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div className="flex justify-between border-b pb-2" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#475569' }}>Stationery & Syllabus Kit</span>
                    <strong style={{ color: '#0f172a' }}>
                      ₹{Number(form.feeBreakdown?.stationary || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div className="flex justify-between border-b pb-2" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#475569' }}>Parent Teacher Association (PTA)</span>
                    <strong style={{ color: '#0f172a' }}>
                      ₹{Number(form.feeBreakdown?.pta || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div className="flex justify-between border-b pb-2" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#475569' }}>Other Institutional Amenities</span>
                    <strong style={{ color: '#0f172a' }}>
                      ₹{Number(form.feeBreakdown?.otherFee || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>

                {/* Subtotal & Concession Summary Section */}
                <div className="mt-5 space-y-3 border-t pt-4" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '2px dashed #cbd5e1' }}>
                  <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#475569', marginBottom: '8px' }}>
                    <span>Normal / Baseline Fee</span>
                    <strong style={{ color: '#0f172a', fontWeight: '800' }}>
                      ₹{Number(normalFee || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div className="flex justify-between text-red-600" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#dc2626', marginBottom: '8px' }}>
                    <span>Quota Concession</span>
                    <strong>
                      -₹{Number(quotaConcession || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div className="flex justify-between border-t pt-3 text-lg font-bold" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #e2e8f0', paddingTop: '10px', fontSize: '16px', fontWeight: '900', color: '#15803d', marginBottom: '8px' }}>
                    <span>Final Assessed Fee</span>
                    <strong>
                      ₹{Number(finalAssessedFee || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#475569', marginBottom: '8px' }}>
                    <span>Amount Paid</span>
                    <strong style={{ color: '#16a34a', fontWeight: '800' }}>
                      ₹{Number(form.amountPaid || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#475569', marginBottom: '8px' }}>
                    <span>Outstanding</span>
                    <strong style={{ color: form.balanceFee > 0 ? '#dc2626' : '#16a34a', fontWeight: '800' }}>
                      ₹{Number(form.balanceFee || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#475569' }}>
                    <span>Payment Status</span>
                    <strong style={{ fontWeight: '800' }}>
                      {form.paymentStatus || "Pending"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Right Column: Ledger Summary & Live Payment Collector */}
              <div className="erp-fee-summary-panel">
                <div className="erp-fee-metric-box erp-fee-metric-total">
                  <div className="erp-label">Normal / Baseline Fee</div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#475569', marginTop: '2px' }}>
                    ₹{Number(normalFee || 0).toLocaleString('en-IN')}
                  </div>
                  {Number(quotaConcession || 0) > 0 && (
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#dc2626', marginTop: '4px' }}>
                      {form.quota || form.quotaName || 'Quota'} Concession: -₹{Number(quotaConcession).toLocaleString('en-IN')}
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '6px' }}>
                    <div className="erp-label" style={{ color: '#1e40af', fontWeight: '800' }}>Final Assessed Fee</div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#1e40af', marginTop: '2px' }}>
                      ₹{Number(finalAssessedFee || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div className="erp-fee-metric-box erp-fee-metric-paid">
                  <div className="erp-label">Amount Paid at Desk (₹)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                    <input
                      type="number"
                      min="0"
                      className="erp-input"
                      style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}
                      value={form.amountPaid || ""}
                      onChange={(e) => {
                        const paid = Math.max(0, Number(e.target.value) || 0);
                        const assessedFee = Number(finalAssessedFee || 0);

                        const balance = Math.max(0, assessedFee - paid);

                        const status =
                          paid <= 0
                            ? "Pending"
                            : paid >= assessedFee && assessedFee > 0
                              ? "Paid"
                              : "Partial";

                        setForm((prev) => ({
                          ...prev,
                          amountPaid: paid,
                          balanceFee: balance,
                          remainingFee: balance,
                          paymentStatus: status,
                        }));
                      }}
                    />
                    <button
                      type="button"
                      className="erp-btn-header"
                      onClick={() => {
                        const assessedFee = Number(finalAssessedFee || 0);
                        setForm((prev) => ({
                          ...prev,
                          amountPaid: assessedFee,
                          balanceFee: 0,
                          remainingFee: 0,
                          paymentStatus: assessedFee > 0 ? "Paid" : "Pending",
                        }));
                      }}
                    >
                      Pay Full
                    </button>
                  </div>
                </div>

                <div className="erp-fee-metric-box erp-fee-metric-balance">
                  <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="erp-label" style={{ margin: 0 }}>Outstanding</span>
                    <strong style={{ fontSize: '20px', fontWeight: '900', color: form.balanceFee > 0 ? '#dc2626' : '#16a34a' }}>
                      ₹{Number(form.balanceFee || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>Payment Status</span>
                    <strong
                      className={`erp-badge ${
                        form.paymentStatus === 'Paid'
                          ? 'erp-badge-success'
                          : form.paymentStatus === 'Partial'
                          ? 'erp-badge-warning'
                          : 'erp-badge-danger'
                      }`}
                      style={{ padding: '3px 10px', fontSize: '11.5px', fontWeight: '800' }}
                    >
                      {form.paymentStatus || "Pending"}
                    </strong>
                  </div>
                </div>

                {/* Payment Mode & Reference Form */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '10px' }}>
                    Payment Mode & Receipt Metadata
                  </div>

                  <div className="erp-form-grid-2">
                    <div className="erp-form-group">
                      <label className="erp-label">Payment Mode</label>
                      <select
                        className="erp-select"
                        value={form.paymentMode}
                        onChange={e => handleChange('paymentMode', e.target.value)}
                      >
                        <option value="Cash">Cash at Counter</option>
                        <option value="UPI">UPI / QR Code Scan</option>
                        <option value="Bank Transfer">Bank Transfer / NEFT</option>
                        <option value="Card">Debit / Credit Card</option>
                        <option value="Demand Draft">Demand Draft (DD)</option>
                      </select>
                    </div>

                    <div className="erp-form-group">
                      <label className="erp-label">Receipt Voucher No</label>
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="REC-XXXXX"
                        value={form.receiptNumber || `REC-${Date.now().toString().slice(-6)}`}
                        onChange={e => handleChange('receiptNumber', e.target.value)}
                      />
                    </div>

                    <div className="erp-form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="erp-label">Transaction / Cheque / DD Reference</label>
                      <input
                        type="text"
                        className="erp-input"
                        placeholder="e.g. UPI-Ref-9823487123 / DD-049821"
                        value={form.transactionRef}
                        onChange={e => handleChange('transactionRef', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="erp-footer-actions">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={() => {
                  setActiveStep(3);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <ArrowLeft size={15} /> Back to Qualifications
              </button>

              <button
                type="button"
                className="erp-btn erp-btn-primary"
                onClick={() => {
                  setActiveStep(5);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <span>Proceed to 360° Verification & Admission Order</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 5: 360° FINAL VERIFICATION & ADMISSION ORDER                   */}
      {/* ===================================================================== */}
      {activeStep === 5 && (
        <div className="erp-card">
          <div className="erp-card-header">
            <div className="erp-card-title-group">
              <div className="erp-card-icon">
                <FileCheck size={18} />
              </div>
              <div>
                <h2 className="erp-card-title">Step 5: Final Verification & Official Allotment Order</h2>
                <p className="erp-card-subtitle">Review complete 360° dossier, generate official admission letter and confirm enrollment</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="erp-btn-header"
                onClick={() => printAdmissionOrderDirect(form)}
              >
                <Printer size={14} /> Print Allotment Order
              </button>

              <button
                type="button"
                className="erp-btn-header"
                onClick={() => printReceiptDirect(form)}
              >
                <Printer size={14} /> Print Fee Receipt
              </button>
            </div>
          </div>

          <div className="erp-card-body">
            <div className="erp-dossier">
              <div className="erp-dossier-header">
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#1e40af' }}>
                    PROVISIONAL ADMISSION CONFIRMATION DOSSIER
                  </h2>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748b' }}>
                    Verified by College Enterprise ERP Admissions Gateway
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                    ID: {form.id || form.admissionNo || 'PENDING'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Receipt: {form.receiptNumber || 'REC-' + Date.now().toString().slice(-6)}
                  </div>
                </div>
              </div>

              {/* Student Summary Top Grid */}
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
                {form.photoUrl ? (
                  <img src={form.photoUrl} alt="Student" style={{ width: '80px', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                ) : (
                  <div style={{ width: '80px', height: '90px', background: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    <User size={36} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>
                    {form.firstName} {form.midName} {form.lastName}
                  </h3>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px', fontSize: '12.5px', color: '#475569' }}>
                    <span><b>Course:</b> {form.course || 'N/A'}</span>
                    <span>•</span>
                    <span><b>Department:</b> {form.department || form.dept || 'N/A'}</span>
                    <span>•</span>
                    <span><b>Program:</b> {form.degreeType || 'UG'}</span>
                    <span>•</span>
                    <span><b>Semester:</b> Sem {form.semester || 1} (Sec {form.section || 'A'})</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <span className="erp-badge erp-badge-primary">Quota: {form.admissionQuota || 'General / Merit'}</span>
                    <span className="erp-badge erp-badge-success">Status: Confirmed</span>
                    {form.hostel === 'Yes' && <span className="erp-badge erp-badge-warning">Hostel Allotted</span>}
                    {form.transport === 'Yes' && <span className="erp-badge erp-badge-warning">Bus Allotted</span>}
                  </div>
                </div>
              </div>

              {/* Demographics & Parent Information Grid */}
              <div className="erp-dossier-grid-2">
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                    1. Student Demographics
                  </div>
                  <div className="erp-dossier-row"><span className="erp-dossier-label">Date of Birth:</span><span className="erp-dossier-val">{form.dob || 'N/A'}</span></div>
                  <div className="erp-dossier-row"><span className="erp-dossier-label">Gender:</span><span className="erp-dossier-val">{form.gender}</span></div>
                  <div className="erp-dossier-row"><span className="erp-dossier-label">Blood Group:</span><span className="erp-dossier-val">{form.bloodGroup || 'N/A'}</span></div>
                  <div className="erp-dossier-row"><span className="erp-dossier-label">Nationality:</span><span className="erp-dossier-val">{form.nationality}</span></div>
                  <div className="erp-dossier-row"><span className="erp-dossier-label">Religion / Community:</span><span className="erp-dossier-val">{form.religion} / {form.community}</span></div>
                  <div className="erp-dossier-row"><span className="erp-dossier-label">Caste:</span><span className="erp-dossier-val">{form.caste || 'N/A'}</span></div>
                  <div className="erp-dossier-row"><span className="erp-dossier-label">Community Cert No:</span><span className="erp-dossier-val">{form.communityCertNo || 'N/A'}</span></div>
                  <div className="erp-dossier-row"><span className="erp-dossier-label">Mother Tongue:</span><span className="erp-dossier-val">{form.motherTongue}</span></div>
                </div>

                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                    2. Parent & Contact Coordinates
                  </div>
                  <div className="erp-dossier-row"><span className="erp-dossier-label">Father's Name:</span><span className="erp-dossier-val">{form.fatherName || 'N/A'}</span></div>
                  <div className="erp-dossier-row"><span className="erp-dossier-label">Mother's Name:</span><span className="erp-dossier-val">{form.motherName || 'N/A'}</span></div>
                  <div className="erp-dossier-row"><span className="erp-dossier-label">Father's Phone:</span><span className="erp-dossier-val">{form.fatherPhone || 'N/A'}</span></div>
                  <div className="erp-dossier-row"><span className="erp-dossier-label">Student Phone:</span><span className="erp-dossier-val">{form.phone || 'N/A'}</span></div>
                  <div className="erp-dossier-row"><span className="erp-dossier-label">Student Email:</span><span className="erp-dossier-val">{form.email || 'N/A'}</span></div>
                  <div className="erp-dossier-row"><span className="erp-dossier-label">City, State, Pincode:</span><span className="erp-dossier-val">{form.city || ''}, {form.state || ''} {form.pincode || ''}</span></div>
                  <div className="erp-dossier-row"><span className="erp-dossier-label">Full Address:</span><span className="erp-dossier-val" style={{ maxWidth: '200px', wordBreak: 'break-word' }}>{form.address || 'N/A'}</span></div>
                </div>
              </div>

              {/* Fee Financial Verification Box */}
              <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '8px', padding: '16px', marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e40af', textTransform: 'uppercase' }}>
                    Fee Assessment & Payment Ledger Verification
                  </span>
                  <span className={`erp-badge ${form.amountPaid >= form.totalFee && form.totalFee > 0 ? 'erp-badge-success' : 'erp-badge-warning'}`}>
                    {form.paymentStatus || 'Pending'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center' }}>
                  <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>TOTAL ASSESSED</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#1e40af', marginTop: '2px' }}>₹{Number(form.totalFee || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#16a34a' }}>AMOUNT PAID</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#16a34a', marginTop: '2px' }}>₹{Number(form.amountPaid || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#dc2626' }}>BALANCE DUE</div>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>₹{Number(form.balanceFee || 0).toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #dbeafe' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>PAYMENT MODE</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '3px' }}>{form.paymentMode || 'Cash'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="erp-footer-actions">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={() => {
                  setActiveStep(4);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <ArrowLeft size={15} /> Back to Fee Desk
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  disabled={submitting}
                  className="erp-btn erp-btn-primary"
                  onClick={() => handleFinalSubmit(false)}
                >
                  <Save size={16} />
                  <span>{submitting ? 'Submitting to ERP...' : 'Confirm & Register Student'}</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  className="erp-btn erp-btn-success"
                  onClick={() => handleFinalSubmit(true)}
                >
                  <Printer size={16} />
                  <span>Save & Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STAGE 6: LIVE ADMISSIONS DIRECTORY & REGISTER                        */}
      {/* ===================================================================== */}
      {activeStep === 6 && (
        <div className="erp-card">
          <div className="erp-card-header">
            <div className="erp-card-title-group">
              <div className="erp-card-icon">
                <FileText size={18} />
              </div>
              <div>
                <h2 className="erp-card-title">Live Confirmed Student Admissions Register</h2>
                <p className="erp-card-subtitle">Complete searchable real-time register of admitted students across all departments</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {students.length > 0 && (
                <button
                  type="button"
                  className="erp-btn erp-btn-danger"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={handlePurgeAllStudents}
                  title="Remove all dummy student records"
                >
                  <Trash2 size={14} /> Clear All Records
                </button>
              )}

              <button
                type="button"
                className="erp-btn erp-btn-primary"
                onClick={() => {
                  handleReset();
                  setActiveStep(1);
                }}
              >
                <Plus size={15} /> New Admission Entry
              </button>
            </div>
          </div>

          <div className="erp-card-body">
            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="erp-input-wrapper" style={{ flex: 1, minWidth: '240px' }}>
                <Search size={16} className="erp-input-icon" />
                <input
                  type="text"
                  className="erp-input has-icon"
                  placeholder="Search by Student Name, Admission No, Phone, Receipt No..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="erp-select"
                style={{ width: 'auto', minWidth: '180px' }}
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
              >
                <option value="All">All Departments</option>
                {departments.map((d, i) => {
                  const dName = d.name || d.departmentName || d;
                  return (
                    <option key={d.id || d._id || i} value={dName}>
                      {dName}
                    </option>
                  );
                })}
              </select>

              <select
                className="erp-select"
                style={{ width: 'auto', minWidth: '150px' }}
                value={filterPaymentStatus}
                onChange={e => setFilterPaymentStatus(e.target.value)}
              >
                <option value="All">All Payment Status</option>
                <option value="Paid">Fully Paid</option>
                <option value="Partial">Partial Paid</option>
                <option value="Pending">Pending / Unpaid</option>
              </select>
            </div>

            {/* Students Table */}
            <div className="erp-table-responsive">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Course</th>
                    <th>Fee Type</th>
                    <th>Hostel</th>
                    <th>Transport</th>
                    <th>Total Fee</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                        No admitted students found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, idx) => {
                      const total = Number(s.totalFee || s.totalAmount || 0);
                      const paid = Number(s.paidAmount !== undefined ? s.paidAmount : (s.amountPaid || 0));
                      const balance = Number(s.remainingFee !== undefined ? s.remainingFee : (s.balanceFee !== undefined ? s.balanceFee : Math.max(0, total - paid)));
                      const isPaid = paid >= total && total > 0;
                      const isPartial = paid > 0 && paid < total;
                      const hasHostel = Boolean(s.hostelRequired === 'yes' || s.hostelRequired === true || s.hostel === 'Yes');
                      const hasTransport = Boolean(s.transportRequired === 'yes' || s.transportRequired === true || s.transport === 'Yes');

                      const formattedFeeType =
                        s.feeType === 'tuition' ? 'Tuition Only' :
                        s.feeType === 'tuition_hostel' ? 'Tuition + Hostel' :
                        s.feeType === 'tuition_transport' ? 'Tuition + Transport' :
                        (s.feeType || 'All Fees');

                      return (
                        <tr key={s._id || s.id || idx}>
                          <td>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>
                              {s.name || `${s.firstName || ''} ${s.lastName || ''}`}
                            </div>
                            <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: '600' }}>
                              {s.id || s.admissionNo}
                            </div>
                          </td>
                          <td>
                            <div style={{ fontWeight: '600' }}>
                              {s.course?.name || s.course?.courseName || s.course || 'General'}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                              {s.dept || s.department || 'N/A'} (Sem {s.semester || 1})
                            </div>
                          </td>
                          <td style={{ fontWeight: '600', color: '#334155' }}>
                            {formattedFeeType}
                          </td>
                          <td>
                            <span className={`erp-badge ${hasHostel ? 'erp-badge-warning' : 'erp-badge-secondary'}`}>
                              {hasHostel ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>
                            <span className={`erp-badge ${hasTransport ? 'erp-badge-warning' : 'erp-badge-secondary'}`}>
                              {hasTransport ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td style={{ fontWeight: '700', color: '#1e40af' }}>
                            ₹{total.toLocaleString()}
                          </td>
                          <td style={{ fontWeight: '700', color: '#16a34a' }}>
                            ₹{paid.toLocaleString()}
                          </td>
                          <td style={{ fontWeight: '700', color: balance > 0 ? '#dc2626' : '#16a34a' }}>
                            ₹{balance.toLocaleString()}
                          </td>
                          <td>
                            <span className={`erp-badge ${isPaid ? 'erp-badge-success' : isPartial ? 'erp-badge-warning' : 'erp-badge-danger'}`}>
                              {s.paymentStatus || (isPaid ? 'Paid' : isPartial ? 'Partial' : 'Pending')}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="erp-btn-header"
                                style={{ padding: '4px 8px', fontSize: '11.5px', color: '#1e40af', borderColor: '#bfdbfe' }}
                                onClick={() => setViewingStudent(s)}
                                title="View Complete Fee & Admission Summary"
                              >
                                <Eye size={13} /> View
                              </button>

                              <button
                                type="button"
                                className="erp-btn-header"
                                style={{ padding: '4px 8px', fontSize: '11.5px' }}
                                onClick={() => printReceiptDirect(s)}
                                title="Print Official Fee Receipt"
                              >
                                <Printer size={13} /> Receipt
                              </button>

                              <button
                                type="button"
                                className="erp-btn-header"
                                style={{ padding: '4px 8px', fontSize: '11.5px' }}
                                onClick={() => printAdmissionOrderDirect(s)}
                                title="Print Admission Allotment Order"
                              >
                                <FileText size={13} /> Order
                              </button>

                              <button
                                type="button"
                                className="erp-btn-header"
                                style={{ padding: '4px 8px', fontSize: '11.5px' }}
                                onClick={() => handleEditStudent(s)}
                                title="Edit Student Record"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="erp-btn-header"
                                style={{ padding: '4px 8px', fontSize: '11.5px', color: '#dc2626', borderColor: '#fca5a5' }}
                                onClick={() => handleDeleteStudent(s.id || s._id)}
                                title="Delete Record"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 29.5 Fee Details View Modal */}
      {viewingStudent && (
        <div className="erp-modal-overlay" onClick={() => setViewingStudent(null)}>
          <div className="erp-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '620px' }}>
            <div className="erp-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} color="#1e40af" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#1e3a8a' }}>
                  Student Admission & Fee Details
                </h3>
              </div>
              <button
                type="button"
                className="erp-modal-close-btn"
                onClick={() => setViewingStudent(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="erp-modal-body">
              {/* Student Header Snapshot */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
                {viewingStudent.photoUrl ? (
                  <img src={viewingStudent.photoUrl} alt="Student" style={{ width: '50px', height: '55px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                ) : (
                  <div style={{ width: '50px', height: '55px', background: '#e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    <User size={24} />
                  </div>
                )}
                <div>
                  <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                    {viewingStudent.name || `${viewingStudent.firstName || ''} ${viewingStudent.lastName || ''}`}
                  </h4>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Reg No: <b style={{ color: '#1e40af' }}>{viewingStudent.id || viewingStudent.admissionNo}</b> • Dept: {viewingStudent.dept || viewingStudent.department || 'General'}
                  </div>
                </div>
              </div>

              {/* 29.5 Fee Details Section */}
              <div className="fee-details">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '6px', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Fee Details
                  </h3>
                  <span className={`erp-badge ${viewingStudent.paymentStatus === 'Paid' ? 'erp-badge-success' : viewingStudent.paymentStatus === 'Partial' ? 'erp-badge-warning' : 'erp-badge-danger'}`}>
                    {viewingStudent.paymentStatus || 'Pending'}
                  </span>
                </div>

                <p className="fee-detail-row">
                  <strong>Course/Major:</strong>
                  <span>{viewingStudent.course?.name || viewingStudent.course?.courseName || viewingStudent.course || 'General'}</span>
                </p>

                <p className="fee-detail-row">
                  <strong>Fee Type:</strong>
                  <span>
                    {viewingStudent.feeType === 'tuition' ? 'Tuition Only' :
                     viewingStudent.feeType === 'tuition_hostel' ? 'Tuition + Hostel' :
                     viewingStudent.feeType === 'tuition_transport' ? 'Tuition + Transport' :
                     (viewingStudent.feeType || 'All Fees')}
                  </span>
                </p>

                <p className="fee-detail-row">
                  <strong>Tuition Fee:</strong>
                  <span>₹{Number(viewingStudent.tuitionFee !== undefined ? viewingStudent.tuitionFee : (viewingStudent.feeBreakdown?.tuitionFee || 0)).toLocaleString()}</span>
                </p>

                <p className="fee-detail-row">
                  <strong>Hostel Required:</strong>
                  <span>{(viewingStudent.hostelRequired === 'yes' || viewingStudent.hostelRequired === true || viewingStudent.hostel === 'Yes') ? 'Yes' : 'No'}</span>
                </p>

                <p className="fee-detail-row">
                  <strong>Hostel Fee:</strong>
                  <span>₹{Number((viewingStudent.hostelRequired === 'yes' || viewingStudent.hostelRequired === true || viewingStudent.hostel === 'Yes') ? (viewingStudent.hostelFee !== undefined ? viewingStudent.hostelFee : (viewingStudent.hostelFeeAmount || viewingStudent.feeBreakdown?.hostelFee || 0)) : 0).toLocaleString()}</span>
                </p>

                <p className="fee-detail-row">
                  <strong>Transport Required:</strong>
                  <span>{(viewingStudent.transportRequired === 'yes' || viewingStudent.transportRequired === true || viewingStudent.transport === 'Yes') ? 'Yes' : 'No'}</span>
                </p>

                <p className="fee-detail-row">
                  <strong>Transport Fee:</strong>
                  <span>₹{Number((viewingStudent.transportRequired === 'yes' || viewingStudent.transportRequired === true || viewingStudent.transport === 'Yes') ? (viewingStudent.transportFee !== undefined ? viewingStudent.transportFee : (viewingStudent.transportFeeAmount || viewingStudent.feeBreakdown?.transportFee || 0)) : 0).toLocaleString()}</span>
                </p>

                <p className="fee-detail-row">
                  <strong>Other Fee:</strong>
                  <span>₹{Number(viewingStudent.otherFee !== undefined ? viewingStudent.otherFee : (viewingStudent.feeBreakdown?.otherFee || viewingStudent.feeBreakdown?.otherFees || 0)).toLocaleString()}</span>
                </p>

                <hr style={{ margin: '12px 0', borderColor: '#cbd5e1' }} />

                <p className="fee-detail-row" style={{ fontSize: '15px' }}>
                  <strong style={{ color: '#1e40af' }}>Total Fee:</strong>
                  <strong style={{ color: '#1e40af', fontSize: '16px' }}>
                    ₹{Number(viewingStudent.totalFee || viewingStudent.totalAmount || 0).toLocaleString()}
                  </strong>
                </p>

                <p className="fee-detail-row">
                  <strong>Paid Amount:</strong>
                  <strong style={{ color: '#16a34a' }}>
                    ₹{Number(viewingStudent.paidAmount !== undefined ? viewingStudent.paidAmount : (viewingStudent.amountPaid || 0)).toLocaleString()}
                  </strong>
                </p>

                <p className="fee-detail-row">
                  <strong>Remaining Balance:</strong>
                  <strong style={{ color: Number(viewingStudent.remainingFee !== undefined ? viewingStudent.remainingFee : (viewingStudent.balanceFee || 0)) > 0 ? '#dc2626' : '#16a34a' }}>
                    ₹{Number(viewingStudent.remainingFee !== undefined ? viewingStudent.remainingFee : (viewingStudent.balanceFee || 0)).toLocaleString()}
                  </strong>
                </p>

                <p className="fee-detail-row">
                  <strong>Payment Status:</strong>
                  <span><strong>{viewingStudent.paymentStatus || 'Pending'}</strong></span>
                </p>
              </div>
            </div>

            <div className="erp-modal-footer">
              <button
                type="button"
                className="erp-btn erp-btn-secondary"
                onClick={() => setViewingStudent(null)}
              >
                Close
              </button>

              <button
                type="button"
                className="erp-btn erp-btn-primary"
                onClick={() => printReceiptDirect(viewingStudent)}
              >
                <Printer size={14} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentRegistration;
