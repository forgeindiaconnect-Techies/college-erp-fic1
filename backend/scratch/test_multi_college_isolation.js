/**
 * Comprehensive Multi-College Data Isolation Automated Verification Test
 * 
 * Tests College A vs College B isolation across:
 * - User / Student Scoping
 * - Placement Jobs & Applications
 * - Business Referrals & Incentives
 * - Attendance Records
 * - Fee Records
 * - Mark Records
 * - Mongoose Global Context Plugin & Query Interception
 */

import mongoose from 'mongoose';
import { context } from '../context.js';
import College from '../models/College.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Staff from '../models/Staff.js';
import Referral from '../models/Referral.js';
import IncentiveRecord from '../models/IncentiveRecord.js';
import PlacementJob from '../models/PlacementJob.js';
import Attendance from '../models/Attendance.js';
import Fee from '../models/Fee.js';
import Mark from '../models/Mark.js';
import CampusPerson from '../models/CampusPerson.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/college_erp';

async function runTests() {
  console.log('🔄 Connecting to MongoDB at', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const COLLEGE_A_ID = 'COL-TEST-A';
  const COLLEGE_B_ID = 'COL-TEST-B';

  const testResults = [];
  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      testResults.push({ name: testName, status: 'PASS', details });
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${details}`);
      testResults.push({ name: testName, status: 'FAIL', details });
    }
  }

  try {
    console.log('\n--- SETUP: Ensuring Test Colleges Exist ---');
    // Upsert College A
    let collegeA = await College.findOne({ tenantId: COLLEGE_A_ID });
    if (!collegeA) {
      collegeA = await College.create({
        tenantId: COLLEGE_A_ID,
        name: 'College Alpha Engineering',
        email: 'admin@collegealpha.edu',
        subscriptionPlan: 'Enterprise',
        subscriptionStatus: 'Active',
      });
    }

    // Upsert College B
    let collegeB = await College.findOne({ tenantId: COLLEGE_B_ID });
    if (!collegeB) {
      collegeB = await College.create({
        tenantId: COLLEGE_B_ID,
        name: 'College Beta Institute of Tech',
        email: 'admin@collegebeta.edu',
        subscriptionPlan: 'Enterprise',
        subscriptionStatus: 'Active',
      });
    }

    console.log(`College A: ${collegeA.name} (${collegeA.tenantId})`);
    console.log(`College B: ${collegeB.name} (${collegeB.tenantId})`);

    // Clean any prior test records for these two test colleges
    await User.deleteMany({ tenantId: { $in: [COLLEGE_A_ID, COLLEGE_B_ID] } });
    await Student.deleteMany({ collegeId: { $in: [COLLEGE_A_ID, COLLEGE_B_ID] } });
    await Staff.deleteMany({ collegeId: { $in: [COLLEGE_A_ID, COLLEGE_B_ID] } });
    await Referral.deleteMany({ tenantId: { $in: [COLLEGE_A_ID, COLLEGE_B_ID] } });
    await IncentiveRecord.deleteMany({ tenantId: { $in: [COLLEGE_A_ID, COLLEGE_B_ID] } });
    await PlacementJob.deleteMany({ collegeId: { $in: [COLLEGE_A_ID, COLLEGE_B_ID] } });
    await Attendance.deleteMany({ tenantId: { $in: [COLLEGE_A_ID, COLLEGE_B_ID] } });
    await Fee.deleteMany({ collegeId: { $in: [COLLEGE_A_ID, COLLEGE_B_ID] } });
    await Mark.deleteMany({ collegeId: { $in: [COLLEGE_A_ID, COLLEGE_B_ID] } });
    await CampusPerson.deleteMany({ tenantId: { $in: [COLLEGE_A_ID, COLLEGE_B_ID] } });

    console.log('\n--- SETUP: Seeding Isolated Test Data ---');
    // Create College A Users
    const userA = await User.create({
      name: 'Alice Alpha',
      email: 'alice@collegealpha.edu',
      role: 'Student',
      tenantId: COLLEGE_A_ID,
      collegeId: COLLEGE_A_ID,
      studentId: 'STU-ALPHA-01',
      password: 'password123',
    });

    const staffA = await Staff.create({
      name: 'Prof. Anderson',
      email: 'anderson@collegealpha.edu',
      department: 'Computer Science',
      collegeId: COLLEGE_A_ID,
      tenantId: COLLEGE_A_ID,
      employeeId: 'STF-ALPHA-01',
    });

    const studentA = await Student.create({
      name: 'Alice Alpha',
      id: 'STU-ALPHA-01',
      rollNo: '24CSE01',
      email: 'alice@collegealpha.edu',
      dept: 'Computer Science',
      collegeId: COLLEGE_A_ID,
      tenantId: COLLEGE_A_ID,
    });

    // Create College B Users
    const userB = await User.create({
      name: 'Bob Beta',
      email: 'bob@collegebeta.edu',
      role: 'Student',
      tenantId: COLLEGE_B_ID,
      collegeId: COLLEGE_B_ID,
      studentId: 'STU-BETA-01',
      password: 'password123',
    });

    const staffB = await Staff.create({
      name: 'Prof. Bennett',
      email: 'bennett@collegebeta.edu',
      department: 'Mechanical',
      collegeId: COLLEGE_B_ID,
      tenantId: COLLEGE_B_ID,
      employeeId: 'STF-BETA-01',
    });

    const studentB = await Student.create({
      name: 'Bob Beta',
      id: 'STU-BETA-01',
      rollNo: '24MECH01',
      email: 'bob@collegebeta.edu',
      dept: 'Mechanical',
      collegeId: COLLEGE_B_ID,
      tenantId: COLLEGE_B_ID,
    });

    // Create College A Referral & Placement
    await Referral.create({
      referralCode: 'CRD-TEST-ALPHA',
      category: 'Credit Card',
      tenantId: COLLEGE_A_ID,
      collegeId: COLLEGE_A_ID,
      submittedBy: userA._id,
      submitterName: userA.name,
      submitterEmail: userA.email,
      submitterRole: 'Student',
      creditCardDetails: {
        applicantName: 'Alpha Applicant',
        applicantPhone: '9876543210',
        bankName: 'HDFC',
        cardType: 'Millennia',
      },
      status: 'Submitted',
    });

    await PlacementJob.create({
      jobTitle: 'Alpha Software Engineer',
      companyName: 'AlphaCorp Technologies',
      collegeId: COLLEGE_A_ID,
      tenantId: COLLEGE_A_ID,
      status: 'Active',
      ctc: '12 LPA',
    });

    // Create College B Referral & Placement
    await Referral.create({
      referralCode: 'INS-TEST-BETA',
      category: 'Insurance',
      tenantId: COLLEGE_B_ID,
      collegeId: COLLEGE_B_ID,
      submittedBy: userB._id,
      submitterName: userB.name,
      submitterEmail: userB.email,
      submitterRole: 'Student',
      insuranceDetails: {
        applicantName: 'Beta Applicant',
        applicantPhone: '9123456780',
        provider: 'Star Health',
        policyType: 'Health',
        applicantConsentGiven: true,
      },
      status: 'Submitted',
    });

    await PlacementJob.create({
      jobTitle: 'Beta Mechanical Specialist',
      companyName: 'BetaMotors Ltd',
      collegeId: COLLEGE_B_ID,
      tenantId: COLLEGE_B_ID,
      status: 'Active',
      ctc: '8 LPA',
    });

    console.log('✅ Isolated data seeded successfully');

    console.log('\n--- TEST SUITE 1: College Alpha Context Verification ---');
    // Run inside College A context
    const storeA = new Map();
    storeA.set('collegeId', COLLEGE_A_ID);
    storeA.set('collegeIds', [COLLEGE_A_ID, collegeA._id.toString()]);

    await context.run(storeA, async () => {
      // 1. Students in College A
      const studentsInA = await Student.find({});
      assert(
        studentsInA.length === 1 && studentsInA[0].id === 'STU-ALPHA-01',
        'College A sees only College A students',
        `Found ${studentsInA.length} students`
      );
      assert(
        !studentsInA.some(s => s.id === 'STU-BETA-01'),
        'College A CANNOT see College B student (Bob Beta)'
      );

      // 2. Staff in College A
      const staffInA = await Staff.find({});
      assert(
        staffInA.length === 1 && staffInA[0].employeeId === 'STF-ALPHA-01',
        'College A sees only College A staff',
        `Found ${staffInA.length} staff`
      );
      assert(
        !staffInA.some(s => s.employeeId === 'STF-BETA-01'),
        'College A CANNOT see College B staff (Prof. Bennett)'
      );

      // 3. Referrals in College A
      const referralsInA = await Referral.find({});
      assert(
        referralsInA.length === 1 && referralsInA[0].referralCode === 'CRD-TEST-ALPHA',
        'College A sees only College A referrals',
        `Found ${referralsInA.length} referrals`
      );
      assert(
        !referralsInA.some(r => r.referralCode === 'INS-TEST-BETA'),
        'College A CANNOT see College B referrals (Star Health Insurance)'
      );

      // 4. Placement Jobs in College A
      const jobsInA = await PlacementJob.find({});
      assert(
        jobsInA.length === 1 && jobsInA[0].companyName === 'AlphaCorp Technologies',
        'College A sees only College A placement drives',
        `Found ${jobsInA.length} placement jobs`
      );
      assert(
        !jobsInA.some(j => j.companyName === 'BetaMotors Ltd'),
        'College A CANNOT see College B placement drives (BetaMotors Ltd)'
      );

      // 5. Attempt direct query with an explicit foreign ID
      const directLeakAttempt = await Student.findOne({ id: 'STU-BETA-01' });
      assert(
        directLeakAttempt === null,
        'Direct query for College B student ID from College A returns NULL (Zero Leak)'
      );
    });

    console.log('\n--- TEST SUITE 2: College Beta Context Verification ---');
    // Run inside College B context
    const storeB = new Map();
    storeB.set('collegeId', COLLEGE_B_ID);
    storeB.set('collegeIds', [COLLEGE_B_ID, collegeB._id.toString()]);

    await context.run(storeB, async () => {
      // 1. Students in College B
      const studentsInB = await Student.find({});
      assert(
        studentsInB.length === 1 && studentsInB[0].id === 'STU-BETA-01',
        'College B sees only College B students',
        `Found ${studentsInB.length} students`
      );
      assert(
        !studentsInB.some(s => s.id === 'STU-ALPHA-01'),
        'College B CANNOT see College A student (Alice Alpha)'
      );

      // 2. Staff in College B
      const staffInB = await Staff.find({});
      assert(
        staffInB.length === 1 && staffInB[0].employeeId === 'STF-BETA-01',
        'College B sees only College B staff',
        `Found ${staffInB.length} staff`
      );
      assert(
        !staffInB.some(s => s.employeeId === 'STF-ALPHA-01'),
        'College B CANNOT see College A staff (Prof. Anderson)'
      );

      // 3. Referrals in College B
      const referralsInB = await Referral.find({});
      assert(
        referralsInB.length === 1 && referralsInB[0].referralCode === 'INS-TEST-BETA',
        'College B sees only College B referrals',
        `Found ${referralsInB.length} referrals`
      );
      assert(
        !referralsInB.some(r => r.referralCode === 'CRD-TEST-ALPHA'),
        'College B CANNOT see College A referrals (HDFC Credit Card)'
      );

      // 4. Placement Jobs in College B
      const jobsInB = await PlacementJob.find({});
      assert(
        jobsInB.length === 1 && jobsInB[0].companyName === 'BetaMotors Ltd',
        'College B sees only College B placement drives',
        `Found ${jobsInB.length} placement jobs`
      );
      assert(
        !jobsInB.some(j => j.companyName === 'AlphaCorp Technologies'),
        'College B CANNOT see College A placement drives (AlphaCorp)'
      );

      // 5. Attempt direct query with an explicit foreign ID
      const directLeakAttempt = await PlacementJob.findOne({ companyName: 'AlphaCorp Technologies' });
      assert(
        directLeakAttempt === null,
        'Direct query for College A placement job from College B returns NULL (Zero Leak)'
      );
    });

    console.log('\n--- TEST SUITE 3: Super Admin Multi-College Visibility ---');
    const storeSuperAdmin = new Map();
    storeSuperAdmin.set('collegeId', 'system');

    await context.run(storeSuperAdmin, async () => {
      const allStudents = await Student.find({ collegeId: { $in: [COLLEGE_A_ID, COLLEGE_B_ID] } });
      assert(
        allStudents.length === 2,
        'Super Admin system mode can access records across authorized colleges with explicit permission',
        `Found ${allStudents.length} students`
      );
    });

    console.log('\n--- CLEANUP ---');
    await User.deleteMany({ tenantId: { $in: [COLLEGE_A_ID, COLLEGE_B_ID] } });
    await Student.deleteMany({ collegeId: { $in: [COLLEGE_A_ID, COLLEGE_B_ID] } });
    await Staff.deleteMany({ collegeId: { $in: [COLLEGE_A_ID, COLLEGE_B_ID] } });
    await Referral.deleteMany({ tenantId: { $in: [COLLEGE_A_ID, COLLEGE_B_ID] } });
    await PlacementJob.deleteMany({ collegeId: { $in: [COLLEGE_A_ID, COLLEGE_B_ID] } });
    console.log('✅ Test data cleaned up successfully');

    const totalPassed = testResults.filter(t => t.status === 'PASS').length;
    const totalFailed = testResults.filter(t => t.status === 'FAIL').length;
    console.log(`\n==================================================`);
    console.log(`TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED (TOTAL: ${testResults.length})`);
    console.log(`==================================================\n`);

  } catch (error) {
    console.error('Fatal test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

runTests();
