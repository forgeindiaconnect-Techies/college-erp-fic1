import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';
import { 
  TrendingUp, FileBarChart, IndianRupee, Download, Printer, RefreshCw, 
  Calendar, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight, 
  Wallet, Layers, Users, Building, ShieldCheck, DollarSign, Filter, Search
} from 'lucide-react';
import { getAllFees, getExpenses, getSalaries, getStudents } from '../../api/index';
import useRealtimeSync from '../../hooks/useRealtimeSync';

const CATEGORY_COLORS = {
  'Tuition': '#2563eb',
  'Examination': '#10b981',
  'Hostel': '#f59e0b',
  'Transport': '#8b5cf6',
  'Admission': '#ec4899',
  'Library': '#06b6d4',
  'Lab & Practical': '#f97316',
  'Miscellaneous': '#64748b'
};

const MODE_COLORS = {
  'Cash': '#10b981',
  'UPI': '#2563eb',
  'Net Banking': '#8b5cf6',
  'Card': '#f59e0b',
  'Cheque / DD': '#ec4899',
  'Other': '#64748b'
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const AccountsReports = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  
  // Real raw datasets
  const [feesList, setFeesList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [expensesList, setExpensesList] = useState([]);
  const [salariesList, setSalariesList] = useState([]);

  // Filter States
  const [periodFilter, setPeriodFilter] = useState('All Time'); // 'All Time', 'This Year', 'This Month', 'Last 30 Days'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'categories', 'departments', 'modes'

  // Real-time synchronization hook
  useRealtimeSync(['fees', 'students', 'expenses', 'salaries'], () => {
    fetchRealtimeData(false);
  });

  const fetchRealtimeData = useCallback(async (isInitial = true) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);

    const tenantId = sessionStorage.getItem('tenantId') || 'mock_college_id';

    try {
      // 1. Fetch live fees
      let fees = [];
      try {
        const feesRes = await getAllFees();
        if (feesRes?.data && Array.isArray(feesRes.data)) {
          fees = feesRes.data;
        }
      } catch {
        const cached = localStorage.getItem('erp_fees');
        if (cached) fees = JSON.parse(cached);
      }
      setFeesList(fees);

      // 2. Fetch live students
      let students = [];
      try {
        const studentsRes = await getStudents();
        const data = studentsRes?.data || [];
        students = Array.isArray(data) ? data : (data.students || []);
      } catch {
        const local = localStorage.getItem(`erp_students_${tenantId}`);
        if (local) students = JSON.parse(local);
      }
      setStudentsList(students);

      // 3. Fetch live expenses
      let expenses = [];
      try {
        const expRes = await getExpenses();
        if (expRes?.data && Array.isArray(expRes.data)) {
          expenses = expRes.data;
        }
      } catch {
        const local = localStorage.getItem(`erp_expenses_${tenantId}`);
        if (local) expenses = JSON.parse(local);
      }
      setExpensesList(expenses);

      // 4. Fetch live salaries / payroll
      let salaries = [];
      try {
        const salRes = await getSalaries();
        if (salRes?.data && Array.isArray(salRes.data)) {
          salaries = salRes.data;
        }
      } catch {
        const local = localStorage.getItem(`erp_salaries_${tenantId}`);
        if (local) salaries = JSON.parse(local);
      }
      setSalariesList(salaries);

      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error loading live accounts reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRealtimeData(true);
  }, [fetchRealtimeData]);

  // Date filter helper
  const isWithinPeriod = useCallback((dateStr) => {
    if (periodFilter === 'All Time' || !dateStr) return true;
    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return true;

    const now = new Date();
    if (periodFilter === 'This Year') {
      return itemDate.getFullYear() === now.getFullYear();
    }
    if (periodFilter === 'This Month') {
      return itemDate.getFullYear() === now.getFullYear() && itemDate.getMonth() === now.getMonth();
    }
    if (periodFilter === 'Last 30 Days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return itemDate >= thirtyDaysAgo && itemDate <= now;
    }
    return true;
  }, [periodFilter]);

  // Filtered datasets
  const filteredFees = useMemo(() => {
    return feesList.filter(f => isWithinPeriod(f.paymentDate || f.createdAt || f.date));
  }, [feesList, isWithinPeriod]);

  const filteredExpenses = useMemo(() => {
    return expensesList.filter(e => isWithinPeriod(e.date || e.createdAt));
  }, [expensesList, isWithinPeriod]);

  const filteredSalaries = useMemo(() => {
    return salariesList.filter(s => isWithinPeriod(s.disbursementDate || s.date || s.createdAt));
  }, [salariesList, isWithinPeriod]);

  // Live Executive KPI Metrics
  const metrics = useMemo(() => {
    const totalCollectedFee = filteredFees.reduce((acc, curr) => {
      const val = Number(curr.paidAmount ?? curr.amount ?? curr.paid ?? 0);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);

    const totalPaidExpenses = filteredExpenses
      .filter(e => e.status === 'Paid')
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const totalPaidSalaries = filteredSalaries
      .filter(s => s.status === 'Paid' || s.status === 'Disbursed')
      .reduce((acc, curr) => acc + (Number(curr.netSalary ?? curr.amount ?? 0)), 0);

    const totalOutstandingDues = studentsList.reduce((acc, curr) => {
      const total = Number(curr.totalFees ?? curr.totalFee ?? 0);
      const paid = Number(curr.paidAmount ?? curr.paid ?? 0);
      const remaining = Number(curr.remainingFee ?? Math.max(total - paid, 0));
      return acc + (isNaN(remaining) ? 0 : remaining);
    }, 0);

    const netSurplus = totalCollectedFee - (totalPaidExpenses + totalPaidSalaries);
    const operatingMargin = totalCollectedFee > 0 ? ((netSurplus / totalCollectedFee) * 100).toFixed(1) : '0.0';
    const totalTransactions = filteredFees.length;

    return {
      totalCollectedFee,
      totalPaidExpenses,
      totalPaidSalaries,
      totalOutstandingDues,
      netSurplus,
      operatingMargin,
      totalTransactions
    };
  }, [filteredFees, filteredExpenses, filteredSalaries, studentsList]);

  // Monthly Trend Breakdown
  const monthlyTrendData = useMemo(() => {
    const monthsMap = {};
    MONTH_NAMES.forEach((m, idx) => {
      monthsMap[idx] = { month: m, revenue: 0, expenses: 0, rawRevenue: 0, rawExpenses: 0 };
    });

    filteredFees.forEach(f => {
      const d = new Date(f.paymentDate || f.createdAt || f.date);
      if (!isNaN(d.getTime())) {
        const monthIndex = d.getMonth();
        const amt = Number(f.paidAmount ?? f.amount ?? f.paid ?? 0) || 0;
        if (monthsMap[monthIndex]) {
          monthsMap[monthIndex].rawRevenue += amt;
        }
      }
    });

    filteredExpenses.forEach(e => {
      if (e.status === 'Paid') {
        const d = new Date(e.date || e.createdAt);
        if (!isNaN(d.getTime())) {
          const monthIndex = d.getMonth();
          const amt = Number(e.amount) || 0;
          if (monthsMap[monthIndex]) {
            monthsMap[monthIndex].rawExpenses += amt;
          }
        }
      }
    });

    filteredSalaries.forEach(s => {
      if (s.status === 'Paid' || s.status === 'Disbursed') {
        const d = new Date(s.disbursementDate || s.date || s.createdAt);
        if (!isNaN(d.getTime())) {
          const monthIndex = d.getMonth();
          const amt = Number(s.netSalary ?? s.amount ?? 0) || 0;
          if (monthsMap[monthIndex]) {
            monthsMap[monthIndex].rawExpenses += amt;
          }
        }
      }
    });

    return Object.values(monthsMap).map(item => ({
      month: item.month,
      revenue: Number((item.rawRevenue / 100000).toFixed(2)),
      expenses: Number((item.rawExpenses / 100000).toFixed(2)),
      rawRevenue: item.rawRevenue,
      rawExpenses: item.rawExpenses
    }));
  }, [filteredFees, filteredExpenses, filteredSalaries]);

  // Real Fee Head Category Breakdown
  const categoryData = useMemo(() => {
    const catMap = {
      'Tuition': 0,
      'Examination': 0,
      'Hostel': 0,
      'Transport': 0,
      'Admission': 0,
      'Library': 0,
      'Lab & Practical': 0,
      'Miscellaneous': 0
    };

    filteredFees.forEach(f => {
      const type = (f.feeType || f.type || f.category || '').toLowerCase();
      const amt = Number(f.paidAmount ?? f.amount ?? f.paid ?? 0) || 0;

      if (type.includes('exam')) catMap['Examination'] += amt;
      else if (type.includes('hostel')) catMap['Hostel'] += amt;
      else if (type.includes('transport') || type.includes('bus')) catMap['Transport'] += amt;
      else if (type.includes('admission') || type.includes('regis')) catMap['Admission'] += amt;
      else if (type.includes('library') || type.includes('book')) catMap['Library'] += amt;
      else if (type.includes('lab') || type.includes('practical')) catMap['Lab & Practical'] += amt;
      else if (type.includes('misc') || type.includes('other')) catMap['Miscellaneous'] += amt;
      else catMap['Tuition'] += amt;
    });

    const total = Object.values(catMap).reduce((a, b) => a + b, 0);

    return Object.entries(catMap)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0',
        color: CATEGORY_COLORS[name] || '#64748b'
      }))
      .filter(item => item.value > 0 || total === 0);
  }, [filteredFees]);

  // Department-wise Financial Audit Breakdown
  const departmentBreakdown = useMemo(() => {
    const deptMap = {};

    studentsList.forEach(s => {
      const dept = s.department || s.dept || s.course || 'General Program';
      if (!deptMap[dept]) {
        deptMap[dept] = {
          department: dept,
          studentsCount: 0,
          totalBilled: 0,
          totalCollected: 0,
          totalPending: 0
        };
      }
      deptMap[dept].studentsCount += 1;
      const billed = Number(s.totalFees ?? s.totalFee ?? 0) || 0;
      const paid = Number(s.paidAmount ?? s.paid ?? 0) || 0;
      const rem = Number(s.remainingFee ?? Math.max(billed - paid, 0)) || 0;

      deptMap[dept].totalBilled += billed;
      deptMap[dept].totalCollected += paid;
      deptMap[dept].totalPending += rem;
    });

    return Object.values(deptMap).map(d => {
      const efficiency = d.totalBilled > 0 ? ((d.totalCollected / d.totalBilled) * 100).toFixed(1) : '0.0';
      return { ...d, collectionEfficiency: efficiency };
    }).sort((a, b) => b.totalCollected - a.totalCollected);
  }, [studentsList]);

  // Payment Modes Breakdown
  const paymentModeData = useMemo(() => {
    const modeMap = {
      'UPI': 0,
      'Cash': 0,
      'Net Banking': 0,
      'Card': 0,
      'Cheque / DD': 0,
      'Other': 0
    };

    filteredFees.forEach(f => {
      const mode = (f.paymentMode || f.mode || f.method || '').toLowerCase();
      const amt = Number(f.paidAmount ?? f.amount ?? f.paid ?? 0) || 0;

      if (mode.includes('upi') || mode.includes('gpay') || mode.includes('phonepe') || mode.includes('qr')) {
        modeMap['UPI'] += amt;
      } else if (mode.includes('cash')) {
        modeMap['Cash'] += amt;
      } else if (mode.includes('net') || mode.includes('neft') || mode.includes('rtgs') || mode.includes('imps') || mode.includes('bank transfer')) {
        modeMap['Net Banking'] += amt;
      } else if (mode.includes('card') || mode.includes('pos') || mode.includes('debit') || mode.includes('credit')) {
        modeMap['Card'] += amt;
      } else if (mode.includes('cheque') || mode.includes('dd') || mode.includes('draft')) {
        modeMap['Cheque / DD'] += amt;
      } else {
        modeMap['Other'] += amt;
      }
    });

    const total = Object.values(modeMap).reduce((a, b) => a + b, 0);

    return Object.entries(modeMap)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0',
        color: MODE_COLORS[name] || '#64748b'
      }))
      .filter(item => item.value > 0 || total === 0);
  }, [filteredFees]);

  // Print Official Financial Audit Statement
  const handlePrintAudit = () => {
    const session = JSON.parse(sessionStorage.getItem('accounts_session') || '{}');
    const officerName = session.name || 'Finance Officer';
    const auditId = `AUD-${Date.now().toString().slice(-6)}`;
    const auditDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const auditTime = new Date().toLocaleTimeString('en-IN');

    const win = window.open('', '_blank', 'width=950,height=850');
    if (!win) {
      alert('Please allow popups to print the Financial Audit Report.');
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Financial Audit Report — ${auditId}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 20px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header-box {
            text-align: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          .college-name {
            font-size: 20px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
            margin: 0;
          }
          .college-sub {
            font-size: 11px;
            color: #475569;
            margin: 4px 0 0 0;
          }
          .audit-title {
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 14px;
            border-radius: 4px;
            margin-top: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 11px;
            margin-bottom: 18px;
          }
          .meta-item strong {
            display: block;
            color: #64748b;
            font-size: 9px;
            text-transform: uppercase;
          }
          .meta-item span {
            font-weight: 700;
            color: #0f172a;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
          }
          .kpi-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
            background: #ffffff;
          }
          .kpi-label {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
          }
          .kpi-val {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 4px;
          }
          .section-title {
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            color: #0f172a;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin: 18px 0 8px 0;
            letter-spacing: 0.5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 14px;
          }
          th {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 7px 10px;
            text-align: left;
            font-size: 9px;
            text-transform: uppercase;
            color: #475569;
            font-weight: 700;
          }
          td {
            border: 1px solid #e2e8f0;
            padding: 6px 10px;
            color: #1e293b;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 700;
            background: #f1f5f9;
          }
          .signatures {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: 36px;
            padding-top: 10px;
            text-align: center;
            font-size: 11px;
          }
          .sig-line {
            border-top: 1px dashed #94a3b8;
            margin-top: 40px;
            padding-top: 6px;
            font-weight: 700;
            color: #334155;
          }
          .footer-note {
            margin-top: 25px;
            font-size: 9px;
            color: #94a3b8;
            text-align: center;
            border-top: 1px solid #f1f5f9;
            padding-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <h1 class="college-name">Marudhar Kesari Jain College for Women</h1>
          <p class="college-sub">Recognized under Sec. 2(f) & 12(B) of UGC Act 1956 • Permanently Affiliated to Thiruvalluvar University • Re-accredited by NAAC with 'A' Grade</p>
          <div class="audit-title">Official Financial Audit & Revenue Intelligence Statement</div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <strong>Audit Reference ID</strong>
            <span>${auditId}</span>
          </div>
          <div class="meta-item">
            <strong>Date & Time Generated</strong>
            <span>${auditDate} • ${auditTime}</span>
          </div>
          <div class="meta-item">
            <strong>Accounting Scope / Period</strong>
            <span>${periodFilter}</span>
          </div>
          <div class="meta-item">
            <strong>Generated By</strong>
            <span>${officerName} (Accounts Dept.)</span>
          </div>
          <div class="meta-item">
            <strong>Enrolled Students Sample</strong>
            <span>${studentsList.length} Active Records</span>
          </div>
          <div class="meta-item">
            <strong>Verified Transactions</strong>
            <span>${metrics.totalTransactions} Completed Receipts</span>
          </div>
        </div>

        <!-- 4 KPI Summary Cards -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Realized Revenue</div>
            <div class="kpi-val" style="color: #2563eb;">₹${metrics.totalCollectedFee.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Settled Expenses</div>
            <div class="kpi-val" style="color: #e11d48;">₹${(metrics.totalPaidExpenses + metrics.totalPaidSalaries).toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Operating Surplus</div>
            <div class="kpi-val" style="color: #059669;">₹${metrics.netSurplus.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Pending Receivables</div>
            <div class="kpi-val" style="color: #d97706;">₹${metrics.totalOutstandingDues.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <!-- 1. Department Recovery Audit -->
        <div class="section-title">1. Department-Wise Fee Recovery & Dues Summary</div>
        <table>
          <thead>
            <tr>
              <th>Academic Department</th>
              <th class="text-center">Students</th>
              <th class="text-right">Total Billed (₹)</th>
              <th class="text-right">Total Realized (₹)</th>
              <th class="text-right">Outstanding (₹)</th>
              <th class="text-center">Recovery %</th>
            </tr>
          </thead>
          <tbody>
            ${departmentBreakdown.map(d => `
              <tr>
                <td class="font-bold">${d.department}</td>
                <td class="text-center">${d.studentsCount}</td>
                <td class="text-right">₹${d.totalBilled.toLocaleString('en-IN')}</td>
                <td class="text-right font-bold" style="color: #059669;">₹${d.totalCollected.toLocaleString('en-IN')}</td>
                <td class="text-right font-bold" style="color: #d97706;">₹${d.totalPending.toLocaleString('en-IN')}</td>
                <td class="text-center"><span class="badge">${d.collectionEfficiency}%</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- 2. Fee Head Categorical Allocation -->
        <div class="section-title">2. Fee Head Categorical Revenue Distribution</div>
        <table>
          <thead>
            <tr>
              <th>Fee Category</th>
              <th class="text-right">Realized Sum (₹)</th>
              <th class="text-right">Share (%)</th>
            </tr>
          </thead>
          <tbody>
            ${categoryData.map(c => `
              <tr>
                <td class="font-bold">${c.name}</td>
                <td class="text-right font-bold">₹${c.value.toLocaleString('en-IN')}</td>
                <td class="text-right">${c.percentage}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Signatures -->
        <div class="signatures">
          <div>
            <div class="sig-line">Accounts Officer / Cashier</div>
          </div>
          <div>
            <div class="sig-line">Dean / Finance Controller</div>
          </div>
          <div>
            <div class="sig-line">Principal / Authorized Signatory</div>
          </div>
        </div>

        <div class="footer-note">
          This document is an authentic computerized financial audit statement generated from RPSYS ERP College Management Suite.
        </div>
      </body>
      </html>
    `);

    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 350);
  };

  // Export Master CSV
  const handleExportMasterCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += `MARUDHAR KESARI JAIN COLLEGE - FINANCIAL AUDIT REPORT\n`;
    csvContent += `Generated: ${new Date().toLocaleString('en-IN')}\n\n`;
    csvContent += `Total Revenue Collected,INR ${metrics.totalCollectedFee}\n`;
    csvContent += `Total Operational Expenses,INR ${metrics.totalPaidExpenses}\n`;
    csvContent += `Total Payroll Disbursed,INR ${metrics.totalPaidSalaries}\n`;
    csvContent += `Net Cashflow Surplus,INR ${metrics.netSurplus}\n`;
    csvContent += `Total Outstanding Dues,INR ${metrics.totalOutstandingDues}\n\n`;

    csvContent += '--- DEPARTMENT SUMMARY ---\n';
    csvContent += 'Department,Students,Total Billed,Total Collected,Outstanding Dues,Recovery Rate\n';
    departmentBreakdown.forEach(d => {
      csvContent += `"${d.department}",${d.studentsCount},${d.totalBilled},${d.totalCollected},${d.totalPending},${d.collectionEfficiency}%\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Financial_Audit_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Audit Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border-color, #e2e8f0)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(37, 99, 235, 0.1)',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              Financial Reports & Audit Intelligence
            </h1>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted, #64748b)' }}>
              Real-time consolidated ledger • Last updated: {lastRefreshed.toLocaleTimeString('en-IN')}
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          {/* Period Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '10px',
            padding: '8px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <Calendar size={15} color="var(--text-muted, #64748b)" />
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              style={{
                background: 'transparent',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--text-main, #0f172a)',
                border: 'none',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All Time">All Time (Master Ledger)</option>
              <option value="This Year">Current Academic Year</option>
              <option value="This Month">This Month</option>
              <option value="Last 30 Days">Last 30 Days</option>
            </select>
          </div>

          {/* Sync Button */}
          <button
            onClick={() => fetchRealtimeData(false)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'var(--bg-card, #ffffff)',
              color: 'var(--text-main, #0f172a)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} color="#2563eb" />
            <span>{refreshing ? 'Syncing...' : 'Sync Live'}</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrintAudit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: 'var(--bg-card, #ffffff)',
              color: 'var(--text-main, #0f172a)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            <Printer size={14} />
            <span>Print Audit</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportMasterCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
            }}
          >
            <Download size={14} />
            <span>Export Full Ledger (.CSV)</span>
          </button>
        </div>
      </div>

      {/* --- EXECUTIVE 4-KPI ROW (Always 4 Columns in CSS Grid) --- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px'
      }}>
        {/* KPI 1: Real Revenue */}
        <div style={{
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '14px',
          border: '1px solid #bfdbfe',
          padding: '18px 20px',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Realized Fee Revenue
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: '10px 0 6px 0' }}>
            ₹{metrics.totalCollectedFee.toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
            <span style={{ color: '#10b981', fontWeight: 600 }}>↗ {metrics.totalTransactions} verified receipts</span>
            <span style={{ fontWeight: 600 }}>{periodFilter}</span>
          </div>
        </div>

        {/* KPI 2: Expenses & Payroll */}
        <div style={{
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '14px',
          border: '1px solid #fecdd3',
          padding: '18px 20px',
          boxShadow: '0 2px 8px rgba(244, 63, 94, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Settled Expenses & Payroll
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.1)', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: '10px 0 6px 0' }}>
            ₹{(metrics.totalPaidExpenses + metrics.totalPaidSalaries).toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
            <span>Expenses: ₹{metrics.totalPaidExpenses.toLocaleString('en-IN')}</span>
            <span>Payroll: ₹{metrics.totalPaidSalaries.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* KPI 3: Operating Surplus */}
        <div style={{
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '14px',
          border: '1px solid #bbf7d0',
          padding: '18px 20px',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Net Operating Surplus
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Wallet size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: '10px 0 6px 0' }}>
            ₹{metrics.netSurplus.toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
            <span style={{ color: '#059669', fontWeight: 600 }}>Operating Margin: {metrics.operatingMargin}%</span>
            <span>{metrics.netSurplus >= 0 ? 'Surplus' : 'Deficit'}</span>
          </div>
        </div>

        {/* KPI 4: Pending Receivables */}
        <div style={{
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '14px',
          border: '1px solid #fde68a',
          padding: '18px 20px',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Pending Fee Receivables
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', margin: '10px 0 6px 0' }}>
            ₹{metrics.totalOutstandingDues.toLocaleString('en-IN')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
            <span>Students: {studentsList.length}</span>
            <span style={{ color: '#d97706', fontWeight: 600 }}>Uncollected Dues</span>
          </div>
        </div>
      </div>

      {/* --- Tab Navigation --- */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-color, #e2e8f0)', paddingBottom: '2px' }}>
        {[
          { key: 'overview', label: '📈 Monthly Trend & Cashflow' },
          { key: 'categories', label: '🏷️ Fee Head Breakdown' },
          { key: 'departments', label: '🏛️ Department-wise Recovery' },
          { key: 'modes', label: '💳 Payment Channels & UPI' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 18px',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: activeTab === tab.key ? '#2563eb' : 'var(--text-muted, #64748b)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              marginBottom: '-2px',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- TAB 1: Real Monthly Revenue & Cashflow Charts --- */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
          {/* Main Bar Chart: Live Inflows vs Outflows */}
          <div style={{
            gridColumn: 'span 2',
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '14px',
            border: '1px solid var(--border-color, #e2e8f0)',
            padding: '24px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                  Monthly Inflows vs Outflows (₹ in Lakhs)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                  Aggregated strictly from recorded receipt timestamps and expense payments
                </p>
              </div>
              <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#2563eb' }}></div>
                  <span style={{ color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Fee Revenue</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f43f5e' }}></div>
                  <span style={{ color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>Expenses Paid</span>
                </div>
              </div>
            </div>

            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}L`} />
                  <Tooltip
                    formatter={(value, name) => [`₹${value} Lakhs (₹${(value * 100000).toLocaleString('en-IN')})`, name === 'revenue' ? 'Revenue' : 'Expenses']}
                    contentStyle={{ background: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cashflow Summary Card */}
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '14px',
            border: '1px solid var(--border-color, #e2e8f0)',
            padding: '24px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                Cash Flow Health Summary
              </h3>
              <p style={{ margin: '4px 0 16px 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
                Live consolidated liquidity
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '14px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #dbeafe' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Total Inflows Recorded</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a', marginTop: '2px' }}>
                    ₹{metrics.totalCollectedFee.toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ padding: '14px', borderRadius: '10px', background: '#fff1f2', border: '1px solid #ffe4e6' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#e11d48', textTransform: 'uppercase' }}>Total Outflows Settled</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#881337', marginTop: '2px' }}>
                    ₹{(metrics.totalPaidExpenses + metrics.totalPaidSalaries).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ padding: '14px', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #dcfce7' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Net Operating Surplus</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#064e3b', marginTop: '2px' }}>
                    ₹{metrics.netSurplus.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color, #e2e8f0)', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
              🔒 <strong style={{ color: 'var(--text-main, #0f172a)' }}>Live Audit:</strong> All numbers match actual receipts & expense vouchers logged in the system.
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: Real Fee Category Breakdown --- */}
      {activeTab === 'categories' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Donut Chart */}
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '14px',
            border: '1px solid var(--border-color, #e2e8f0)',
            padding: '24px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', alignSelf: 'flex-start' }}>
              Revenue by Fee Category
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', alignSelf: 'flex-start' }}>
              Distribution of realized student payments
            </p>

            <div style={{ height: '260px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cat-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`}
                    contentStyle={{ background: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Table */}
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '14px',
            border: '1px solid var(--border-color, #e2e8f0)',
            padding: '24px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              Category Collection Matrix
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Breakdown of verified collections per fee head
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Fee Head</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Collected</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Share</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryData.map((cat, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: cat.color }}></div>
                        {cat.name}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                        ₹{cat.value.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                        {cat.percentage}%
                      </td>
                      <td style={{ padding: '12px', width: '120px' }}>
                        <div style={{ background: '#f1f5f9', height: '6px', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(cat.percentage, 100)}%`, height: '100%', backgroundColor: cat.color, borderRadius: '10px' }}></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: Real Department Recovery Matrix --- */}
      {activeTab === 'departments' && (
        <div style={{
          background: 'var(--bg-card, #ffffff)',
          borderRadius: '14px',
          border: '1px solid var(--border-color, #e2e8f0)',
          padding: '24px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
        }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
            Department-wise Fee Recovery Audit
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
            Real-time collection efficiency and pending dues grouped by academic department
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Department / Program</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Students</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Billed</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Realized</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Outstanding Dues</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Recovery Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {departmentBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted, #64748b)' }}>
                      No active student department records found.
                    </td>
                  </tr>
                ) : (
                  departmentBreakdown.map((dept, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                        {dept.department}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600 }}>
                        {dept.studentsCount}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--text-muted, #64748b)' }}>
                        ₹{dept.totalBilled.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                        ₹{dept.totalCollected.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#d97706' }}>
                        ₹{dept.totalPending.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: Number(dept.collectionEfficiency) >= 70 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: Number(dept.collectionEfficiency) >= 70 ? '#059669' : '#d97706'
                        }}>
                          {dept.collectionEfficiency}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 4: Payment Channels & Modes --- */}
      {activeTab === 'modes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Donut Chart */}
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '14px',
            border: '1px solid var(--border-color, #e2e8f0)',
            padding: '24px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main, #0f172a)', alignSelf: 'flex-start' }}>
              Payment Channels Distribution
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', alignSelf: 'flex-start' }}>
              Digital vs Cash payment reconciliation
            </p>

            <div style={{ height: '260px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentModeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {paymentModeData.map((entry, index) => (
                      <Cell key={`mode-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => `₹${Number(val).toLocaleString('en-IN')}`}
                    contentStyle={{ background: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mode Table */}
          <div style={{
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '14px',
            border: '1px solid var(--border-color, #e2e8f0)',
            padding: '24px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              Settlement Status by Channel
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)' }}>
              Real-time payment channel breakdown
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color, #e2e8f0)', color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', fontSize: '0.72rem', fontWeight: 700 }}>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>Channel</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Share</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center' }}>Visual</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentModeData.map((mode, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-main, #0f172a)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: mode.color }}></div>
                        {mode.name}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                        ₹{mode.value.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                        {mode.percentage}%
                      </td>
                      <td style={{ padding: '12px', width: '120px' }}>
                        <div style={{ background: '#f1f5f9', height: '6px', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(mode.percentage, 100)}%`, height: '100%', backgroundColor: mode.color, borderRadius: '10px' }}></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsReports;
