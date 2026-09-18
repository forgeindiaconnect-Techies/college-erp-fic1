import React, { useState, useEffect, useMemo } from "react";
import {
  Award,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Percent,
  IndianRupee,
  Layers,
  Building2,
  BookOpen,
  Calendar,
  AlertCircle,
  Check,
  ChevronRight,
  FileSpreadsheet,
  X,
  GraduationCap,
  Trophy,
  Landmark,
  Briefcase,
  Globe,
  Shield,
  Star,
  ShieldCheck,
  Receipt,
  Sliders,
  Sparkles
} from "lucide-react";
import {
  getQuotas,
  createQuota,
  updateQuota,
  deleteQuota,
  getDepartments,
  getFeeStructures,
  getCourses
} from "../../api/index";
import useRealtimeSync from "../../hooks/useRealtimeSync";

const PRESET_QUOTAS = [
  { name: "General Quota", icon: GraduationCap, color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe", tag: "General" },
  { name: "Government Quota", icon: Landmark, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", tag: "Government" },
  { name: "Management Quota", icon: Briefcase, color: "#d97706", bg: "#fffbeb", border: "#fde68a", tag: "Management" },
  { name: "Sports Quota", icon: Trophy, color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd", tag: "Sports" },
  { name: "NRI Quota", icon: Globe, color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", tag: "NRI" },
  { name: "Minority Quota", icon: ShieldCheck, color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4", tag: "Minority" },
  { name: "Special Quota", icon: Star, color: "#e11d48", bg: "#fff1f2", border: "#fecdd3", tag: "Special" },
  { name: "Merit Scholarship Quota", icon: Award, color: "#9333ea", bg: "#faf5ff", border: "#e9d5ff", tag: "Merit" },
  { name: "Defence / Ex-Servicemen Quota", icon: Shield, color: "#dc2626", bg: "#fef2f2", border: "#fecaca", tag: "Defence" }
];

const ACADEMIC_YEARS = [
  "2026-2027",
  "2025-2026",
  "2027-2028",
  "2028-2029",
  "2024-2025"
];

const QuotaManagement = () => {
  const [quotasList, setQuotasList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [feeStructuresList, setFeeStructuresList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Drawer / Modal State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("All");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [selectedQuotaFilter, setSelectedQuotaFilter] = useState("All");

  // Form State
  const [form, setForm] = useState({
    quotaName: "Sports Quota",
    department: "",
    departmentName: "",
    course: "",
    courseName: "",
    discountType: "fixed", // 'fixed' | 'percentage'
    discountValue: "10000",
    academicYear: "2026-2027",
    status: "active"
  });

  const [normalFee, setNormalFee] = useState(50000);
  const [discountAmount, setDiscountAmount] = useState(10000);
  const [finalFee, setFinalFee] = useState(40000);

  // Confirmation Modal State
  const [confirmation, setConfirmation] = useState({
    open: false,
    title: "",
    message: "",
    action: null
  });

  const openConfirmation = ({ title, message, action }) => {
    setConfirmation({ open: true, title, message, action });
  };

  const closeConfirmation = () => {
    setConfirmation({ open: false, title: "", message: "", action: null });
  };

  const handleConfirmAction = async () => {
    if (!confirmation.action) {
      closeConfirmation();
      return;
    }
    try {
      await confirmation.action();
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      closeConfirmation();
    }
  };

  // Helper to determine baseline normal fee based on Course or Department
  const calculateBaselineFee = (deptId, deptName, courseId, courseName, fees = feeStructuresList) => {
    if (!fees || fees.length === 0) return 50000;

    // 1. Try finding exact match by Course
    if (courseId || courseName) {
      const matchedByCourse = fees.find(fs => {
        const fsCourse = fs.course;
        if (!fsCourse) return false;
        const fsCourseName = typeof fsCourse === "object" ? fsCourse.name : fsCourse;
        const fsCourseId = typeof fsCourse === "object" ? fsCourse._id || fsCourse.id : fsCourse;
        return (
          String(fsCourseId) === String(courseId) ||
          String(fsCourseName).toLowerCase() === String(courseName).toLowerCase() ||
          String(fsCourse).toLowerCase() === String(courseName).toLowerCase()
        );
      });
      if (matchedByCourse) {
        return Number(matchedByCourse.totalFee || matchedByCourse.tuitionFee || 0);
      }
    }

    // 2. Try finding match by Department
    if (deptId || deptName) {
      const matchedByDept = fees.find(fs => {
        const fsDept = fs.department || (typeof fs.course === "object" ? fs.course?.name : fs.course);
        return (
          String(fsDept) === String(deptId) ||
          String(fsDept).toLowerCase() === String(deptName).toLowerCase()
        );
      });
      if (matchedByDept) {
        return Number(matchedByDept.totalFee || matchedByDept.tuitionFee || 0);
      }
    }

    return 50000;
  };

  // Fetch data
  const loadData = async () => {
    try {
      setLoading(true);
      const [quotasRes, deptsRes, coursesRes, feesRes] = await Promise.allSettled([
        getQuotas(),
        getDepartments(),
        getCourses(),
        getFeeStructures()
      ]);

      if (quotasRes.status === "fulfilled" && quotasRes.value?.data) {
        const qList = quotasRes.value.data.quotas || quotasRes.value.data.data || quotasRes.value.data || [];
        setQuotasList(Array.isArray(qList) ? qList : []);
      }

      let loadedDepts = [];
      if (deptsRes.status === "fulfilled" && deptsRes.value?.data) {
        loadedDepts = deptsRes.value.data.departments || deptsRes.value.data.data || (Array.isArray(deptsRes.value.data) ? deptsRes.value.data : []);
        setDepartmentsList(loadedDepts);
      }

      let loadedCourses = [];
      if (coursesRes.status === "fulfilled" && coursesRes.value?.data) {
        loadedCourses = coursesRes.value.data.courses || coursesRes.value.data.data || (Array.isArray(coursesRes.value.data) ? coursesRes.value.data : []);
        setCoursesList(loadedCourses);
      }

      let loadedFees = [];
      if (feesRes.status === "fulfilled" && feesRes.value?.data) {
        loadedFees = feesRes.value.data.feeStructures || feesRes.value.data.data || (Array.isArray(feesRes.value.data) ? feesRes.value.data : []);
        setFeeStructuresList(loadedFees);
      }

      // Default select first department and course if form is uninitialized
      if (!form.department && loadedDepts.length > 0) {
        const firstDept = loadedDepts[0];
        const deptId = firstDept._id || firstDept.id || firstDept.code;
        const deptName = firstDept.name || firstDept.departmentName || firstDept.code;

        // Find available courses for first department
        const deptCourses = loadedCourses.filter(c => {
          const cDept = c.departmentId || c.department || "";
          return (
            String(cDept) === String(firstDept._id) ||
            String(cDept) === String(firstDept.id) ||
            String(cDept) === String(firstDept.code) ||
            String(cDept).toLowerCase() === String(deptName).toLowerCase()
          );
        });

        const firstCourse = deptCourses[0];
        const courseId = firstCourse ? (firstCourse._id || firstCourse.id || firstCourse.code) : "";
        const courseName = firstCourse ? (firstCourse.name || firstCourse.courseName || firstCourse.title) : "";

        const normal = calculateBaselineFee(deptId, deptName, courseId, courseName, loadedFees);

        setForm(prev => ({
          ...prev,
          department: deptId,
          departmentName: deptName,
          course: courseId,
          courseName: courseName
        }));
        setNormalFee(normal);
      }
    } catch (err) {
      console.error("Failed to load quota management data:", err);
      setErrorMsg("Failed to load quota configuration data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time synchronization
  useRealtimeSync(loadData, ["quotas", "feeStructure", "departments", "courses"]);

  // Automatically Recalculate Final Fee via useEffect
  useEffect(() => {
    const fee = Number(normalFee) || 0;
    const value = Number(form.discountValue) || 0;

    let discount = 0;
    if (form.discountType === "fixed") {
      discount = value;
    } else if (form.discountType === "percentage") {
      discount = (fee * value) / 100;
    }

    if (discount > fee) {
      discount = fee;
    }

    setDiscountAmount(discount);
    setFinalFee(Math.max(0, fee - discount));
  }, [normalFee, form.discountType, form.discountValue]);

  // Filtered courses available for selected department in form
  const formAvailableCourses = useMemo(() => {
    if (!form.department) return coursesList;
    const selDept = departmentsList.find(
      d => String(d._id || d.id || d.code) === String(form.department) ||
           String(d.name || d.departmentName).toLowerCase() === String(form.departmentName).toLowerCase()
    );
    if (!selDept) return coursesList;

    const filtered = coursesList.filter(c => {
      const cDept = c.departmentId || c.department || "";
      return (
        String(cDept) === String(selDept._id) ||
        String(cDept) === String(selDept.id) ||
        String(cDept) === String(selDept.code) ||
        String(cDept).toLowerCase() === String(selDept.name || "").toLowerCase()
      );
    });

    return filtered.length > 0 ? filtered : coursesList;
  }, [form.department, form.departmentName, coursesList, departmentsList]);

  // Handle Department Change & Update Courses + Baseline Fee
  const handleDepartmentChange = (e) => {
    const departmentId = e.target.value;
    const selectedDept = departmentsList.find(d => String(d._id || d.id || d.code) === String(departmentId));
    const deptName = selectedDept ? (selectedDept.name || selectedDept.departmentName || selectedDept.code) : departmentId;

    // Find courses for this department
    const deptCourses = coursesList.filter(c => {
      if (!selectedDept) return true;
      const cDept = c.departmentId || c.department || "";
      return (
        String(cDept) === String(selectedDept._id) ||
        String(cDept) === String(selectedDept.id) ||
        String(cDept) === String(selectedDept.code) ||
        String(cDept).toLowerCase() === String(deptName).toLowerCase()
      );
    });

    const firstCourse = deptCourses[0];
    const courseId = firstCourse ? (firstCourse._id || firstCourse.id || firstCourse.code) : "";
    const courseName = firstCourse ? (firstCourse.name || firstCourse.courseName || firstCourse.title) : "";

    const newFee = calculateBaselineFee(departmentId, deptName, courseId, courseName, feeStructuresList);

    setForm(prev => ({
      ...prev,
      department: departmentId,
      departmentName: deptName,
      course: courseId,
      courseName: courseName
    }));
    setNormalFee(newFee);
  };

  // Handle Course Change
  const handleCourseChange = (e) => {
    const courseId = e.target.value;
    const selectedCourse = coursesList.find(c => String(c._id || c.id || c.code) === String(courseId) || String(c.name) === String(courseId));
    const courseName = selectedCourse ? (selectedCourse.name || selectedCourse.courseName || selectedCourse.title) : (courseId ? courseId : "All Courses");

    const newFee = calculateBaselineFee(form.department, form.departmentName, courseId, courseName, feeStructuresList);

    setForm(prev => ({
      ...prev,
      course: courseId,
      courseName: courseName
    }));
    setNormalFee(newFee);
  };

  const handleOpenAddDrawer = () => {
    setEditingQuota(null);
    setSuccessMsg("");
    setErrorMsg("");

    const defaultDept = departmentsList[0];
    const defaultDeptId = defaultDept ? (defaultDept._id || defaultDept.id || defaultDept.code) : "";
    const defaultDeptName = defaultDept ? (defaultDept.name || defaultDept.departmentName || defaultDept.code) : "";

    const deptCourses = coursesList.filter(c => {
      if (!defaultDept) return true;
      const cDept = c.departmentId || c.department || "";
      return (
        String(cDept) === String(defaultDept._id) ||
        String(cDept) === String(defaultDept.id) ||
        String(cDept) === String(defaultDept.code) ||
        String(cDept).toLowerCase() === String(defaultDeptName).toLowerCase()
      );
    });

    const firstCourse = deptCourses[0];
    const defaultCourseId = firstCourse ? (firstCourse._id || firstCourse.id || firstCourse.code) : "";
    const defaultCourseName = firstCourse ? (firstCourse.name || firstCourse.courseName || firstCourse.title) : "";

    const baseline = calculateBaselineFee(defaultDeptId, defaultDeptName, defaultCourseId, defaultCourseName, feeStructuresList);

    setForm({
      quotaName: "Sports Quota",
      department: defaultDeptId,
      departmentName: defaultDeptName,
      course: defaultCourseId,
      courseName: defaultCourseName,
      discountType: "fixed",
      discountValue: "10000",
      academicYear: "2026-2027",
      status: "active"
    });
    setNormalFee(baseline);
    setDiscountAmount(10000);
    setFinalFee(Math.max(0, baseline - 10000));
    setDrawerOpen(true);
  };

  const handleSelectPreset = (preset) => {
    setForm(prev => ({
      ...prev,
      quotaName: preset.name
    }));
  };

  const handleSaveQuota = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!form.quotaName.trim()) {
      setErrorMsg("Please provide a quota rule title");
      return;
    }

    if (!form.department) {
      setErrorMsg("Please choose an applicable department");
      return;
    }

    const fee = Number(normalFee) || 0;
    const discountVal = Number(form.discountValue);

    if (fee <= 0) {
      setErrorMsg("No baseline fee found for this department/course. Please configure a Fee Structure first.");
      return;
    }

    if (form.discountValue === "" || isNaN(discountVal)) {
      setErrorMsg("Please enter a valid concession value");
      return;
    }

    if (discountVal < 0) {
      setErrorMsg("Concession value cannot be negative");
      return;
    }

    if (form.discountType === "percentage" && discountVal > 100) {
      setErrorMsg("Percentage concession cannot exceed 100%");
      return;
    }

    if (discountAmount > fee) {
      setErrorMsg("Concession amount cannot exceed baseline fee");
      return;
    }

    try {
      setSaving(true);
      const quotaPayload = {
        quotaName: form.quotaName.trim(),
        department: form.department,
        departmentName: form.departmentName,
        course: form.course || "",
        courseName: form.courseName || "",
        discountType: form.discountType,
        discountValue: discountVal,
        normalFee: fee,
        discountAmount: Number(discountAmount),
        finalFee: Number(finalFee),
        academicYear: form.academicYear,
        status: form.status
      };

      if (editingQuota) {
        await updateQuota(editingQuota._id, quotaPayload);
        setSuccessMsg(`Quota "${form.quotaName}" updated.`);
      } else {
        await createQuota(quotaPayload);
        setSuccessMsg(`Quota "${form.quotaName}" added.`);
      }

      setDrawerOpen(false);
      setEditingQuota(null);
      await loadData();
    } catch (err) {
      console.error("Save quota error:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Failed to save quota rule");
    } finally {
      setSaving(false);
    }
  };

  const handleEditQuota = (quota) => {
    setEditingQuota(quota);
    setSuccessMsg("");
    setErrorMsg("");

    setForm({
      quotaName: quota.quotaName || "",
      department: quota.department?._id || quota.department || "",
      departmentName: quota.departmentName || "",
      course: quota.course?._id || quota.course || "",
      courseName: quota.courseName || (typeof quota.course === "object" ? quota.course?.name : "") || "",
      discountType: quota.discountType || "fixed",
      discountValue: quota.discountValue !== undefined ? quota.discountValue : 0,
      academicYear: quota.academicYear || "2026-2027",
      status: quota.status || "active"
    });
    setNormalFee(quota.normalFee || 0);
    setDiscountAmount(quota.discountAmount || 0);
    setFinalFee(quota.finalFee || (quota.normalFee || 0));

    setDrawerOpen(true);
  };

  const handleDeleteQuota = (quota) => {
    openConfirmation({
      title: "Revoke Quota Rule",
      message: `Are you sure you want to revoke "${quota.quotaName}" for ${quota.departmentName || "this department"}?`,
      action: async () => {
        try {
          await deleteQuota(quota._id);
          setSuccessMsg("Quota rule removed.");
          if (editingQuota && editingQuota._id === quota._id) {
            setDrawerOpen(false);
            setEditingQuota(null);
          }
          await loadData();
        } catch (err) {
          console.error("Delete quota error:", err);
          setErrorMsg(err.response?.data?.message || "Failed to delete quota rule");
        }
      }
    });
  };

  const handleToggleStatus = async (quota) => {
    const newStatus = quota.status === "active" ? "inactive" : "active";
    try {
      await updateQuota(quota._id, { status: newStatus });
      setSuccessMsg(`Status changed to ${newStatus}.`);
      await loadData();
    } catch (err) {
      console.error("Status toggle error:", err);
      setErrorMsg("Failed to update status");
    }
  };

  // Filtered List
  const filteredQuotas = useMemo(() => {
    return quotasList.filter((item) => {
      const term = searchQuery.toLowerCase().trim();
      const qName = (item.quotaName || "").toLowerCase();
      const dName = (item.departmentName || (typeof item.department === "object" ? item.department?.name : item.department) || "").toLowerCase();
      const cName = (item.courseName || (typeof item.course === "object" ? item.course?.name : item.course) || "").toLowerCase();
      const yName = (item.academicYear || "").toLowerCase();

      const matchesSearch = !term || qName.includes(term) || dName.includes(term) || cName.includes(term) || yName.includes(term);

      const matchesDept =
        selectedDeptFilter === "All" ||
        String(item.department) === String(selectedDeptFilter) ||
        String(item.departmentName).toLowerCase() === String(selectedDeptFilter).toLowerCase();

      const matchesCourse =
        selectedCourseFilter === "All" ||
        String(item.course) === String(selectedCourseFilter) ||
        String(item.courseName).toLowerCase() === String(selectedCourseFilter).toLowerCase();

      const matchesStatus =
        selectedStatusFilter === "All" ||
        String(item.status).toLowerCase() === String(selectedStatusFilter).toLowerCase();

      const matchesQuota =
        selectedQuotaFilter === "All" ||
        qName.includes(selectedQuotaFilter.toLowerCase());

      return matchesSearch && matchesDept && matchesCourse && matchesStatus && matchesQuota;
    });
  }, [quotasList, searchQuery, selectedDeptFilter, selectedCourseFilter, selectedStatusFilter, selectedQuotaFilter]);

  // ERP Metrics Calculation
  const metrics = useMemo(() => {
    const totalRules = quotasList.length;
    const activeRules = quotasList.filter(q => q.status === "active").length;
    const uniqueDepts = new Set(quotasList.map(q => q.departmentName || q.department).filter(Boolean)).size;
    const avgDiscount = totalRules > 0
      ? Math.round(
          quotasList.reduce((sum, q) => {
            const fee = Number(q.normalFee || 0);
            const discVal = Number(q.discountValue || 0);
            const amt = q.discountType === "percentage" ? (fee * discVal) / 100 : discVal;
            return sum + amt;
          }, 0) / totalRules
        )
      : 0;

    return { totalRules, activeRules, uniqueDepts, avgDiscount };
  }, [quotasList]);

  // CSV Export
  const handleExportCSV = () => {
    if (filteredQuotas.length === 0) {
      alert("No quota records available to export.");
      return;
    }
    const headers = [
      "Quota Name",
      "Department",
      "Course",
      "Baseline Normal Fee (INR)",
      "Concession Type",
      "Concession Value",
      "Discount Amount (INR)",
      "Net Payable Fee (INR)",
      "Academic Year",
      "Status"
    ];

    const rows = filteredQuotas.map((q) => {
      const isPct = q.discountType === "percentage";
      const discAmt = isPct ? ((q.normalFee * q.discountValue) / 100) : q.discountValue;
      return [
        `"${q.quotaName || ""}"`,
        `"${q.departmentName || q.department || ""}"`,
        `"${q.courseName || q.course || "All Courses"}"`,
        Number(q.normalFee || 0),
        `"${q.discountType || "fixed"}"`,
        Number(q.discountValue || 0),
        Number(discAmt || 0),
        Number(q.finalFee || (q.normalFee - discAmt) || 0),
        `"${q.academicYear || ""}"`,
        `"${q.status || "active"}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Quota_Tariffs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getQuotaMeta = (name = "") => {
    const lower = name.toLowerCase();
    const matched = PRESET_QUOTAS.find(p => lower.includes(p.tag.toLowerCase()));
    if (matched) return matched;
    return { name, icon: Award, color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe", tag: "Standard" };
  };

  const isFiltered = searchQuery || selectedDeptFilter !== "All" || selectedCourseFilter !== "All" || selectedQuotaFilter !== "All" || selectedStatusFilter !== "All";

  return (
    <div style={{ padding: "20px 24px", maxWidth: "1600px", margin: "0 auto", color: "#0f172a", fontFamily: "inherit" }}>
      
      {/* ── Top Header Bar ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          padding: "16px 20px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #4f46e5, #3730a3)",
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 3px 8px rgba(79, 70, 229, 0.22)"
            }}
          >
            <Award size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "18px", fontWeight: "800", margin: 0, color: "#0f172a", letterSpacing: "-0.3px" }}>
                Quota Management
              </h1>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#059669",
                  fontSize: "11px",
                  fontWeight: "700"
                }}
              >
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                Live Sync
              </span>
            </div>
            <p style={{ margin: "1px 0 0", fontSize: "12px", color: "#64748b" }}>
              Define fee concessions and quota reduction rules across departments and academic courses
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={handleOpenAddDrawer}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: "#4f46e5",
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(79, 70, 229, 0.2)",
              transition: "background 0.15s ease"
            }}
          >
            <Plus size={16} />
            Add Quota Rule
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              fontWeight: "600",
              fontSize: "12.5px",
              cursor: "pointer"
            }}
          >
            <FileSpreadsheet size={15} color="#059669" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            title="Refresh from server"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#475569",
              fontWeight: "600",
              fontSize: "12.5px",
              cursor: "pointer"
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} color="#4f46e5" />
          </button>
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
          marginBottom: "16px"
        }}
      >
        <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Total Quotas</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>{metrics.totalRules}</div>
          </div>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Layers size={18} />
          </div>
        </div>

        <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Active Rules</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#059669", marginTop: "2px" }}>{metrics.activeRules}</div>
          </div>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Departments Covered</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>{metrics.uniqueDepts}</div>
          </div>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#eff6ff", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={18} />
          </div>
        </div>

        <div style={{ background: "#ffffff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Avg Concession</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>₹{metrics.avgDiscount.toLocaleString("en-IN")}</div>
          </div>
          <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#fff7ed", color: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IndianRupee size={18} />
          </div>
        </div>
      </div>

      {/* ── Alerts ── */}
      {successMsg && (
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: "10px 14px", borderRadius: "8px", marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px", fontWeight: "600" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={16} color="#059669" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg("")} style={{ background: "transparent", border: "none", color: "#065f46", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 14px", borderRadius: "8px", marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "13px", fontWeight: "600" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={16} color="#dc2626" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg("")} style={{ background: "transparent", border: "none", color: "#991b1b", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Main Data Grid Card ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          overflow: "hidden"
        }}
      >
        {/* Streamlined Single Filter Toolbar */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc",
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", flex: "1 1 500px" }}>
            {/* Search Input */}
            <div style={{ position: "relative", minWidth: "200px", flex: "1 1 200px", maxWidth: "300px" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "9px", color: "#94a3b8" }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search quota, dept, course..."
                style={{
                  width: "100%",
                  padding: "7px 10px 7px 30px",
                  borderRadius: "7px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12.5px",
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#ffffff"
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{ position: "absolute", right: "8px", top: "7px", background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Department Filter */}
            <select
              value={selectedDeptFilter}
              onChange={e => setSelectedDeptFilter(e.target.value)}
              style={{
                padding: "7px 10px",
                borderRadius: "7px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                background: "#ffffff",
                fontWeight: "600",
                color: "#334155",
                outline: "none"
              }}
            >
              <option value="All">All Departments</option>
              {departmentsList.map(d => (
                <option key={d._id || d.id || d.code} value={d.name || d.departmentName || d.code}>
                  {d.name || d.departmentName || d.code}
                </option>
              ))}
            </select>

            {/* Course Filter */}
            <select
              value={selectedCourseFilter}
              onChange={e => setSelectedCourseFilter(e.target.value)}
              style={{
                padding: "7px 10px",
                borderRadius: "7px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                background: "#ffffff",
                fontWeight: "600",
                color: "#334155",
                outline: "none"
              }}
            >
              <option value="All">All Courses</option>
              {coursesList.map(c => (
                <option key={c._id || c.id || c.code} value={c.name || c.courseName || c.title || c.code}>
                  {c.name || c.courseName || c.title || c.code}
                </option>
              ))}
            </select>

            {/* Quota Category Filter */}
            <select
              value={selectedQuotaFilter}
              onChange={e => setSelectedQuotaFilter(e.target.value)}
              style={{
                padding: "7px 10px",
                borderRadius: "7px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                background: "#ffffff",
                fontWeight: "600",
                color: "#334155",
                outline: "none"
              }}
            >
              <option value="All">All Quotas</option>
              {PRESET_QUOTAS.map(p => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              style={{
                padding: "7px 10px",
                borderRadius: "7px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                background: "#ffffff",
                fontWeight: "600",
                color: "#334155",
                outline: "none"
              }}
            >
              <option value="All">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedDeptFilter("All");
                  setSelectedCourseFilter("All");
                  setSelectedQuotaFilter("All");
                  setSelectedStatusFilter("All");
                }}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#ef4444",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer"
                }}
              >
                Clear
              </button>
            )}
          </div>

          <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
            {filteredQuotas.length} {filteredQuotas.length === 1 ? "Record" : "Records"}
          </div>
        </div>

        {/* Full-Width Table */}
        <div style={{ width: "100%", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: "700", color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Quota Name</th>
                <th style={{ padding: "10px 16px", textAlign: "left", fontWeight: "700", color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Department & Course</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: "700", color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Baseline Fee</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: "700", color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Concession</th>
                <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: "700", color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Net Payable</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: "700", color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Year</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: "700", color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</th>
                <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: "700", color: "#475569", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredQuotas.length > 0 ? (
                filteredQuotas.map((item, index) => {
                  const isActive = item.status === "active";
                  const isPercentage = item.discountType === "percentage";
                  const discValue = Number(item.discountValue || 0);
                  const normalVal = Number(item.normalFee || 0);
                  const calculatedDiscAmt = isPercentage ? Math.round((normalVal * discValue) / 100) : discValue;
                  const computedFinal = Number(item.finalFee || Math.max(0, normalVal - calculatedDiscAmt));
                  const meta = getQuotaMeta(item.quotaName);
                  const IconComp = meta.icon || Award;
                  const deptDisplay = item.departmentName || (typeof item.department === "object" ? item.department?.name : item.department) || "All Departments";
                  const courseDisplay = item.courseName || (typeof item.course === "object" ? item.course?.name : item.course);

                  return (
                    <tr
                      key={item._id || index}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.1s ease",
                        background: index % 2 === 0 ? "#ffffff" : "#fafbfc"
                      }}
                    >
                      {/* Quota Name */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div
                            style={{
                              width: "26px",
                              height: "26px",
                              borderRadius: "6px",
                              background: meta.bg,
                              color: meta.color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: `1px solid ${meta.border}`
                            }}
                          >
                            <IconComp size={14} />
                          </div>
                          <div>
                            <span style={{ fontWeight: "700", color: "#0f172a" }}>{item.quotaName}</span>
                          </div>
                        </div>
                      </td>

                      {/* Department & Course */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: "700", color: "#1e293b", fontSize: "12.5px" }}>
                            <Building2 size={13} color="#64748b" />
                            <span>{deptDisplay}</span>
                          </div>
                          {courseDisplay ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11.5px", color: "#4f46e5", fontWeight: "600" }}>
                              <BookOpen size={11} color="#6366f1" />
                              <span>{courseDisplay}</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>All Courses</span>
                          )}
                        </div>
                      </td>

                      {/* Baseline Normal Fee */}
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "600", color: "#64748b" }}>
                        ₹{normalVal.toLocaleString("en-IN")}
                      </td>

                      {/* Concession */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "5px",
                            background: "#fee2e2",
                            color: "#b91c1c",
                            fontWeight: "700",
                            fontSize: "11.5px"
                          }}
                        >
                          - {isPercentage ? `${discValue}% (₹${calculatedDiscAmt.toLocaleString("en-IN")})` : `₹${discValue.toLocaleString("en-IN")}`}
                        </span>
                      </td>

                      {/* Final Net Payable Fee */}
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "800", color: "#059669", fontSize: "13.5px" }}>
                        ₹{computedFinal.toLocaleString("en-IN")}
                      </td>

                      {/* Academic Year */}
                      <td style={{ padding: "12px 16px", textAlign: "center", fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                        {item.academicYear}
                      </td>

                      {/* Status Toggle */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          style={{
                            padding: "2px 8px",
                            borderRadius: "12px",
                            border: "none",
                            fontSize: "11px",
                            fontWeight: "700",
                            cursor: "pointer",
                            background: isActive ? "#dcfce7" : "#f1f5f9",
                            color: isActive ? "#15803d" : "#64748b",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                          title="Toggle status"
                        >
                          {isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          {isActive ? "Active" : "Inactive"}
                        </button>
                      </td>

                      {/* Action Buttons */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => handleEditQuota(item)}
                            title="Edit rule"
                            style={{
                              padding: "5px 7px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              color: "#4f46e5",
                              cursor: "pointer"
                            }}
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuota(item)}
                            title="Delete rule"
                            style={{
                              padding: "5px 7px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              background: "#ffffff",
                              color: "#ef4444",
                              cursor: "pointer"
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", color: "#94a3b8" }}>
                      <Award size={22} />
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#334155" }}>
                      No Quota Rules Found
                    </div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "3px" }}>
                      {isFiltered ? "Try resetting search or filters." : "Click 'Add Quota Rule' above to create one."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Slide-Over Configuration Drawer ── */}
      {drawerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            justifyContent: "flex-end",
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(2px)"
          }}
        >
          {/* Backdrop Click */}
          <div
            style={{ position: "absolute", inset: 0 }}
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Container */}
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "460px",
              height: "100%",
              background: "#ffffff",
              boxShadow: "-8px 0 25px rgba(0,0,0,0.15)",
              display: "flex",
              flexDirection: "column",
              zIndex: 10000,
              overflowY: "auto"
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#f8fafc"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#4f46e5", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Award size={16} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>
                    {editingQuota ? "Edit Quota Rule" : "New Quota Rule"}
                  </h3>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    Set discount matrix & departmental target
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Drawer Form Body */}
            <form onSubmit={handleSaveQuota} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
              
              {/* Category Presets */}
              <div>
                <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#475569", marginBottom: "6px", textTransform: "uppercase" }}>
                  Category Preset
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {PRESET_QUOTAS.map((preset) => {
                    const isSelected = form.quotaName.toLowerCase().includes(preset.tag.toLowerCase());
                    const IconComp = preset.icon;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "5px 9px",
                          borderRadius: "6px",
                          fontSize: "11.5px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.1s ease",
                          background: isSelected ? preset.color : "#ffffff",
                          color: isSelected ? "#ffffff" : "#475569",
                          border: `1px solid ${isSelected ? preset.color : "#cbd5e1"}`
                        }}
                      >
                        <IconComp size={12} />
                        {preset.tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quota Rule Name */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "5px" }}>
                  Quota Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.quotaName}
                  onChange={(e) => setForm({ ...form, quotaName: e.target.value })}
                  placeholder="e.g. Sports Quota"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "7px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Department & Course Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {/* Department Selector */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "5px" }}>
                    Department *
                  </label>
                  <select
                    value={form.department}
                    onChange={handleDepartmentChange}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12.5px",
                      background: "#ffffff",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  >
                    <option value="">-- Choose Department --</option>
                    {departmentsList.map((d) => (
                      <option key={d._id || d.id || d.code} value={d._id || d.id || d.code}>
                        {d.name || d.departmentName || d.code}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Course Selector */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "5px" }}>
                    Course
                  </label>
                  <select
                    value={form.course}
                    onChange={handleCourseChange}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12.5px",
                      background: "#ffffff",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  >
                    <option value="">All Courses in Department</option>
                    {formAvailableCourses.map((c) => (
                      <option key={c._id || c.id || c.code} value={c._id || c.id || c.code}>
                        {c.name || c.courseName || c.title || c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Baseline Normal Fee indicator */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Baseline Normal Fee:</span>
                <span style={{ fontSize: "13px", fontWeight: "800", color: "#0f172a" }}>₹{Number(normalFee || 0).toLocaleString("en-IN")}</span>
              </div>

              {/* Discount Structure */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                  Concession Type & Value *
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, discountType: "fixed" })}
                    style={{
                      padding: "7px",
                      borderRadius: "6px",
                      border: form.discountType === "fixed" ? "2px solid #4f46e5" : "1px solid #cbd5e1",
                      background: form.discountType === "fixed" ? "#eef2ff" : "#ffffff",
                      color: form.discountType === "fixed" ? "#4338ca" : "#64748b",
                      fontWeight: "700",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px"
                    }}
                  >
                    <IndianRupee size={13} /> Flat (₹)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, discountType: "percentage" })}
                    style={{
                      padding: "7px",
                      borderRadius: "6px",
                      border: form.discountType === "percentage" ? "2px solid #4f46e5" : "1px solid #cbd5e1",
                      background: form.discountType === "percentage" ? "#eef2ff" : "#ffffff",
                      color: form.discountType === "percentage" ? "#4338ca" : "#64748b",
                      fontWeight: "700",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px"
                    }}
                  >
                    <Percent size={13} /> Percentage (%)
                  </button>
                </div>

                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    min="0"
                    max={form.discountType === "percentage" ? 100 : normalFee}
                    required
                    value={form.discountValue}
                    onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                    placeholder={form.discountType === "percentage" ? "e.g. 25" : "e.g. 10000"}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                  <span style={{ position: "absolute", right: "12px", top: "8px", fontSize: "12px", fontWeight: "700", color: "#64748b" }}>
                    {form.discountType === "percentage" ? "%" : "₹"}
                  </span>
                </div>
              </div>

              {/* Calculation Ledger Voucher */}
              <div
                style={{
                  background: "#0f172a",
                  borderRadius: "9px",
                  padding: "14px 16px",
                  color: "#ffffff"
                }}
              >
                <div style={{ fontSize: "10.5px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  Fee Summary Preview
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#cbd5e1", marginBottom: "4px" }}>
                  <span>Baseline Fee:</span>
                  <span>₹{Number(normalFee || 0).toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", color: "#f87171", marginBottom: "8px" }}>
                  <span>Concession Deduction:</span>
                  <span>- ₹{Number(discountAmount || 0).toLocaleString("en-IN")}</span>
                </div>
                <div style={{ borderTop: "1px dashed #334155", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "#ffffff" }}>Net Payable:</span>
                  <span style={{ fontSize: "16px", fontWeight: "800", color: "#34d399" }}>
                    ₹{Number(finalFee || 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Academic Year & Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "5px" }}>
                    Academic Year
                  </label>
                  <select
                    value={form.academicYear}
                    onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12.5px",
                      background: "#ffffff",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  >
                    {ACADEMIC_YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "5px" }}>
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12.5px",
                      background: "#ffffff",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: "auto", paddingTop: "12px", display: "flex", gap: "8px" }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#4f46e5",
                    color: "#ffffff",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="spin" /> Saving...
                    </>
                  ) : editingQuota ? (
                    <>
                      <Check size={14} /> Update Rule
                    </>
                  ) : (
                    <>
                      <Plus size={14} /> Save Rule
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  disabled={saving}
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#475569",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {confirmation.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "400px",
              background: "#ffffff",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 15px 25px rgba(0, 0, 0, 0.15)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Trash2 size={16} />
              </div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: "15px", color: "#1e293b" }}>
                {confirmation.title}
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>
              {confirmation.message}
            </p>

            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={closeConfirmation}
                style={{
                  padding: "7px 14px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  background: "#f8fafc",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAction}
                style={{
                  padding: "7px 16px",
                  borderRadius: "6px",
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotaManagement;
