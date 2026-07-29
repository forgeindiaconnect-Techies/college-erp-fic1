import cron from 'node-cron';
import College from '../models/College.js';
import Notification from '../models/Notification.js';

// Run every day at 9:00 AM
export const initCronJobs = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily subscription & trial check...');
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      // 1. Check Trials expiring tomorrow
      const expiringTrials = await College.find({
        subscriptionPlan: 'Trial',
        trialEndDate: { 
          $gte: today, 
          $lte: tomorrow 
        }
      });

      for (const college of expiringTrials) {
        // Find admin user for this college
        // Since Notification model uses recipient (userId) or targetRoles
        // We can target role 'Admin' for the specific tenant
        await Notification.create({
          tenantId: college.tenantId, // we need to add tenantId support to Notification model if not present
          targetRoles: ['Admin'],
          title: 'Trial Expiring Soon',
          message: 'Your free trial expires tomorrow. Please upgrade your plan to continue using the services.',
          type: 'System'
        });
        console.log(`Created trial expiry notification for ${college.tenantId}`);
      }

      // 2. Check Subscriptions expiring in 7 days
      const expiringSubs = await College.find({
        subscriptionPlan: { $ne: 'Trial' },
        trialEndDate: { 
          $gte: today, 
          $lte: nextWeek 
        }
      });

      for (const college of expiringSubs) {
        await Notification.create({
          tenantId: college.tenantId,
          targetRoles: ['Admin'],
          title: 'Subscription Renewal Due',
          message: `Your ${college.subscriptionPlan} subscription expires in 7 days. Please renew to avoid service interruption.`,
          type: 'System'
        });
        console.log(`Created sub expiry notification for ${college.tenantId}`);
      }

      // 3. Process actual expiries and deactivate
      const { calculateSubscriptionStatus } = await import('../utils/subscriptionHelper.js');
      const activeColleges = await College.find({ isActive: true });
      
      for (const college of activeColleges) {
        const liveStatus = calculateSubscriptionStatus(college);
        if (liveStatus.status === 'Expired' && college.subscriptionStatus !== 'Expired') {
          // Deactivate college and mark as expired
          college.isActive = false;
          college.subscriptionStatus = 'Expired';
          await college.save();

          // Notify Admin
          await Notification.create({
            tenantId: college.tenantId,
            targetRoles: ['Admin'],
            title: 'Subscription Expired - Account Deactivated',
            message: `Your subscription has expired. All access has been suspended. Please renew your plan or contact the Super Admin to restore services.`,
            type: 'Error'
          });
          console.log(`Deactivated expired college ${college.tenantId}`);
        }
      }

    } catch (error) {
      console.error('Error in daily subscription cron job:', error);
    }
  });

  // Daily at 9:00 AM to mark LOP (Loss of Pay) for employees who haven't checked in
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily 9:00 AM LOP attendance check...');
    try {
      const User = (await import('../models/User.js')).default;
      const EmployeeAttendance = (await import('../models/EmployeeAttendance.js')).default;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today

      const employeeRoles = ['Principal', 'HOD', 'Staff', 'Accounts', 'Driver'];
      
      // Get all employees
      const employees = await User.find({ role: { $in: employeeRoles } });
      
      for (const emp of employees) {
        // Check if they already have an attendance record for today
        const existingRecord = await EmployeeAttendance.findOne({
          employeeId: emp._id,
          date: { $gte: today }
        });

        if (!existingRecord) {
          // Mark as Absent / LOP
          await EmployeeAttendance.create({
            tenantId: emp.tenantId || 'DEFAULT',
            collegeId: emp.collegeId || 'DEFAULT',
            employeeId: emp._id,
            role: emp.role,
            date: new Date(),
            checkIn: new Date(), // Just setting a time, but status is Absent
            status: 'Absent',
            remarks: 'LOP - Late Check-In Blocked'
          });

          // Create Notification for the user
          await Notification.create({
            tenantId: emp.tenantId,
            collegeId: emp.collegeId,
            recipient: emp._id, // notify the user
            receiverId: emp._id,
            title: 'LOP - Late Check-In',
            message: 'You have not checked in by 9:00 AM. Your attendance has been marked as LOP.',
            category: 'staff',
            type: 'Error'
          });
        }
      }
      console.log('Daily LOP attendance check completed.');
    } catch (error) {
      console.error('Error in LOP cron job:', error);
    }
  });
};
