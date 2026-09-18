import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  X,
  IndianRupee,
  RefreshCw,
  Search,
  BookOpen,
  Tag,
  Calendar,
  Layers3,
  Check,
  Award,
  RotateCcw,
  Building2,
  Filter,
  GraduationCap,
  Copy,
  Download,
  ChevronRight,
  Sparkles,
  TrendingUp,
  FileSpreadsheet
} from "lucide-react";
import {
  getFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  getCourses,
  getDepartments
} from "../../api/index";

import useRealtimeSync from "../../hooks/useRealtimeSync";

const QUOTA_OPTIONS = [
  "General / Merit",
  "Management Quota",
  "Government Quota",
  "Sports Quota",
  "Ex-Servicemen / Special",
  "NRI Quota",
  "Minority Quota"
];

const ACADEMIC_YEARS = [
  "2026-2027",
  "2025-2026",
  "2027-2028",
  "2028-2029",
  "2024-2025"
];

const FeeStructure = () => {
  const [form, setForm] = useState({
    academicYear: "2026-2027",
    department: "",
    course: "",
    semester: "Sem 1",
    quota: "",

    admissionFee: "",
    tuitionFee: "",
    universityFee: "",
    marksheetVerification: "",
    specialFee: "",
    computerLab: "",
    englishLabNssId: "",
    stationary: "",
    pta: "",
    otherFee: "",

    transportFee: "",
    hostelFee: "",
  });

  const [editingFee, setEditingFee] = useState(null);
  const [feeStructuresList, setFeeStructuresList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Table Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [quotaFilter, setQuotaFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");

  // Step 46: Confirmation State & Helpers
  const [confirmation, setConfirmation] = useState({
    open: false,
    title: "",
    message: "",
    action: null,
  });

  const openConfirmation = ({ title, message, action }) => {
    setConfirmation({
      open: true,
      title,
      message,
      action,
    });
  };

  const closeConfirmation = () => {
    setConfirmation({
      open: false,
      title: "",
      message: "",
      action: null,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmation.action) {
      closeConfirmation();
      return;
    }

    try {
      await confirmation.action();
    } catch (err) {
      console.error("Confirmation action error:", err);
    } finally {
      closeConfirmation();
    }
  };

  const totalFee =
    Number(form.admissionFee || 0) +
    Number(form.tuitionFee || 0) +
    Number(form.universityFee || 0) +
    Number(form.marksheetVerification || 0) +
    Number(form.specialFee || 0) +
    Number(form.computerLab || 0) +
    Number(form.englishLabNssId || 0) +
    Number(form.stationary || 0) +
    Number(form.pta || 0) +
    Number(form.otherFee || form.otherFees || 0);

  // Fetch Fee Structures, Courses & Departments
  const loadData = async () => {
    setLoading(true);
    try {
      const [fsRes, coursesRes, deptsRes] = await Promise.allSettled([
        getFeeStructures(),
        getCourses(),
        getDepartments()
      ]);

      if (fsRes.status === "fulfilled" && fsRes.value?.data) {
        const data = Array.isArray(fsRes.value.data)
          ? fsRes.value.data
          : fsRes.value.data.data || [];
        setFeeStructuresList(data);
      }

      let loadedCourses = [];
      if (coursesRes.status === "fulfilled" && coursesRes.value?.data) {
        loadedCourses = Array.isArray(coursesRes.value.data?.courses)
          ? coursesRes.value.data.courses
          : Array.isArray(coursesRes.value.data)
          ? coursesRes.value.data
          : [];
      }
      setCoursesList(loadedCourses);

      let loadedDepts = [];
      if (deptsRes.status === "fulfilled" && deptsRes.value?.data) {
        loadedDepts = Array.isArray(deptsRes.value.data?.data)
          ? deptsRes.value.data.data
          : Array.isArray(deptsRes.value.data)
          ? deptsRes.value.data
          : [];
      }
      setDepartmentsList(loadedDepts);
    } catch (err) {
      console.error("Failed to load fee structures/courses/departments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealtimeSync(loadData, ['feeStructure', 'courses', 'departments']);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDepartmentChange = (e) => {
    const selectedDept = e.target.value;
    setForm((prev) => {
      // Check if current course belongs to the new department
      const currentCourseObj = coursesList.find(
        (c) => (c.name || c.courseName || c) === prev.course
      );
      const isStillValid = currentCourseObj && (
        currentCourseObj.departmentId === selectedDept ||
        currentCourseObj.department === selectedDept ||
        departmentsList.some(d => (d.id === currentCourseObj.departmentId || d._id === currentCourseObj.departmentId || d.name === currentCourseObj.departmentId) && (d.name === selectedDept || d.id === selectedDept))
      );

      return {
        ...prev,
        department: selectedDept,
        course: isStillValid ? prev.course : "",
      };
    });
  };

  const handleCourseChange = (e) => {
    const selectedCourse = e.target.value;
    const foundCourse = coursesList.find(
      (c) => (c.name || c.courseName || c) === selectedCourse || String(c._id) === selectedCourse || String(c.id) === selectedCourse
    );

    let deptName = form.department;
    if (foundCourse && (!deptName || deptName === "")) {
      const matchedDept = departmentsList.find(
        (d) =>
          d.id === foundCourse.departmentId ||
          d._id === foundCourse.departmentId ||
          d.name === foundCourse.departmentId ||
          d.code === foundCourse.departmentId ||
          d.name === foundCourse.department
      );
      if (matchedDept) {
        deptName = matchedDept.name;
      } else if (foundCourse.department) {
        deptName = foundCourse.department;
      } else if (foundCourse.departmentId) {
        deptName = foundCourse.departmentId;
      }
    }

    setForm((prev) => ({
      ...prev,
      course: selectedCourse,
      department: deptName || prev.department,
    }));
  };

  const filteredCourses = useMemo(() => {
    if (!form.department) return coursesList;
    const selectedDeptObj = departmentsList.find(
      (d) => d.name === form.department || d.id === form.department || d._id === form.department
    );

    const filtered = coursesList.filter((c) => {
      if (!c) return false;
      if (c.department === form.department || c.departmentId === form.department) return true;
      if (selectedDeptObj) {
        if (
          c.departmentId === selectedDeptObj.id ||
          c.departmentId === selectedDeptObj._id ||
          c.departmentId === selectedDeptObj.code ||
          c.departmentId === selectedDeptObj.name ||
          c.department === selectedDeptObj.name
        ) {
          return true;
        }
      }
      return false;
    });

    return filtered.length > 0 ? filtered : coursesList;
  }, [form.department, coursesList, departmentsList]);

  const handleEditFee = (fee) => {
    setEditingFee(fee);
    setSuccessMsg("");
    setErrorMsg("");

    // Resolve course name
    let courseVal = "";
    let matchedCourse = null;

    if (typeof fee.course === "object" && fee.course !== null) {
      courseVal =
        fee.course.name ||
        fee.course.courseName ||
        fee.course._id ||
        "";

      matchedCourse = fee.course;
    } else if (fee.course) {
      matchedCourse = coursesList.find(
        (c) =>
          String(c._id) === String(fee.course) ||
          String(c.id) === String(fee.course) ||
          c.name === fee.course ||
          c.courseName === fee.course
      );

      courseVal = matchedCourse
        ? matchedCourse.name || matchedCourse.courseName || matchedCourse._id
        : fee.course;
    }

    // Resolve department name
    let deptVal = fee.department || "";

    if (!deptVal && matchedCourse) {
      const matchedDept = departmentsList.find(
        (d) =>
          d.id === matchedCourse.departmentId ||
          d._id === matchedCourse.departmentId ||
          d.name === matchedCourse.departmentId ||
          d.code === matchedCourse.departmentId ||
          d.name === matchedCourse.department
      );

      deptVal = matchedDept
        ? matchedDept.name
        : matchedCourse.department || matchedCourse.departmentId || "";
    }

    // Read saved fee components
    const savedFees = Array.isArray(fee.fees) ? fee.fees : [];

    const getFeeAmount = (keywords) => {
      const item = savedFees.find((f) => {
        const type = String(f.feeType || "").toLowerCase();

        return keywords.some((keyword) =>
          type.includes(keyword.toLowerCase())
        );
      });

      return item?.amount ?? "";
    };

    setForm({
      academicYear: fee.academicYear || "2026-2027",
      department: deptVal,
      course: courseVal,

      semester: fee.semester
        ? `Sem ${fee.semester}`
        : "Sem 1",

      quota: fee.quota || "",

      admissionFee: getFeeAmount([
        "admission",
        "processing",
      ]) || (fee.admissionFee ?? ""),

      tuitionFee: getFeeAmount([
        "tuition",
      ]) || (fee.tuitionFee ?? ""),

      universityFee: getFeeAmount([
        "university",
        "exam affiliation",
      ]) || (fee.universityFee ?? ""),

      marksheetVerification: getFeeAmount([
        "marksheet",
        "document verification",
        "verification",
      ]) || (fee.marksheetVerification ?? ""),

      specialFee: getFeeAmount([
        "special",
        "equipment",
      ]) || (fee.specialFee ?? ""),

      computerLab: getFeeAmount([
        "computer",
        "software lab",
      ]) || (fee.computerLab ?? ""),

      englishLabNssId: getFeeAmount([
        "english",
        "nss",
        "id card",
      ]) || (fee.englishLabNssId ?? ""),

      stationary: getFeeAmount([
        "stationery",
        "stationary",
        "syllabus kit",
      ]) || (fee.stationary ?? ""),

      pta: getFeeAmount([
        "pta",
        "parent teacher",
      ]) || (fee.pta ?? ""),

      otherFee: getFeeAmount([
        "other",
        "institutional amenities",
      ]) || (fee.otherFee ?? fee.otherFees ?? ""),

      transportFee: fee.transportFee || "",
      hostelFee: fee.hostelFee || "",
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleCloneFee = (fee) => {
    setEditingFee(null);
    setSuccessMsg("");
    setErrorMsg("");

    let courseVal = "";
    let matchedCourse = null;
    if (typeof fee.course === "object" && fee.course !== null) {
      courseVal = fee.course.name || fee.course.courseName || fee.course._id || "";
      matchedCourse = fee.course;
    } else if (fee.course) {
      matchedCourse = coursesList.find(
        (c) =>
          String(c._id) === String(fee.course) ||
          String(c.id) === String(fee.course) ||
          c.name === fee.course ||
          c.courseName === fee.course
      );
      courseVal = matchedCourse ? (matchedCourse.name || matchedCourse.courseName || matchedCourse._id) : fee.course;
    }

    let deptVal = fee.department || "";
    if (!deptVal && matchedCourse) {
      const matchedDept = departmentsList.find(
        (d) =>
          d.id === matchedCourse.departmentId ||
          d._id === matchedCourse.departmentId ||
          d.name === matchedCourse.departmentId ||
          d.code === matchedCourse.departmentId ||
          d.name === matchedCourse.department
      );
      deptVal = matchedDept ? matchedDept.name : (matchedCourse.department || matchedCourse.departmentId || "");
    }

    let admissionFeeVal = fee.admissionFee || "";
    let tuitionFeeVal = fee.tuitionFee || "";
    let universityFeeVal = fee.universityFee || "";
    let marksheetVerificationVal = fee.marksheetVerification || "";
    let specialFeeVal = fee.specialFee || "";
    let computerLabVal = fee.computerLab || "";
    let englishLabNssIdVal = fee.englishLabNssId || "";
    let stationaryVal = fee.stationary || "";
    let ptaVal = fee.pta || "";
    let otherFeeVal = fee.otherFee || fee.otherFees || "";

    if (Array.isArray(fee.fees) && fee.fees.length > 0) {
      fee.fees.forEach(f => {
        const type = (f.feeType || "").toLowerCase();
        const amt = f.amount;
        if (type.includes("admission")) admissionFeeVal = amt;
        else if (type.includes("tuition")) tuitionFeeVal = amt;
        else if (type.includes("exam") || type.includes("univ")) universityFeeVal = amt;
        else if (type.includes("mark") || type.includes("verif")) marksheetVerificationVal = amt;
        else if (type.includes("special")) specialFeeVal = amt;
        else if (type.includes("computer")) computerLabVal = amt;
        else if (type.includes("english") || type.includes("nss") || type.includes("id")) englishLabNssIdVal = amt;
        else if (type.includes("station")) stationaryVal = amt;
        else if (type.includes("pta")) ptaVal = amt;
        else otherFeeVal = amt;
      });
    }

    setForm({
      academicYear: fee.academicYear || "2026-2027",
      department: deptVal,
      course: courseVal,
      semester: fee.semester ? `Sem ${fee.semester}` : "Sem 1",
      quota: "",
      admissionFee: admissionFeeVal,
      tuitionFee: tuitionFeeVal,
      universityFee: universityFeeVal,
      marksheetVerification: marksheetVerificationVal,
      specialFee: specialFeeVal,
      computerLab: computerLabVal,
      englishLabNssId: englishLabNssIdVal,
      stationary: stationaryVal,
      pta: ptaVal,
      otherFee: otherFeeVal,
      transportFee: fee.transportFee || "",
      hostelFee: fee.hostelFee || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingFee(null);
    setForm({
      academicYear: "2026-2027",
      department: "",
      course: "",
      semester: "Sem 1",
      quota: "",
      admissionFee: "",
      tuitionFee: "",
      universityFee: "",
      marksheetVerification: "",
      specialFee: "",
      computerLab: "",
      englishLabNssId: "",
      stationary: "",
      pta: "",
      otherFee: "",
      transportFee: "",
      hostelFee: "",
    });
  };

  const isMatchingCourse = (feeCourse, formCourse) => {
    if (!feeCourse || !formCourse) return false;
    const fName = typeof feeCourse === "object" ? (feeCourse.name || feeCourse.courseName || feeCourse._id) : feeCourse;
    const targetName = typeof formCourse === "object" ? (formCourse.name || formCourse.courseName || formCourse._id) : formCourse;
    return String(fName).trim().toLowerCase() === String(targetName).trim().toLowerCase();
  };

  const findDuplicateStructure = (course, quota, academicYear, department = null, excludeId = null) => {
    if (!course) return null;
    return feeStructuresList.find((fee) => {
      if (excludeId && String(fee._id) === String(excludeId)) {
        return false;
      }
      const sameCourse = isMatchingCourse(fee.course, course);
      const sameQuota = !quota || !fee.quota || String(fee.quota).trim().toLowerCase() === String(quota).trim().toLowerCase();
      const sameYear = !academicYear || !fee.academicYear || String(fee.academicYear).trim() === String(academicYear).trim();
      const sameDept = !department || !fee.department || String(fee.department).trim().toLowerCase() === String(department).trim().toLowerCase();
      return sameCourse && sameQuota && sameYear && sameDept;
    });
  };

  const duplicateFound = findDuplicateStructure(
    form.course,
    form.quota,
    form.academicYear,
    form.department,
    editingFee?._id
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    const existingFee = findDuplicateStructure(
      form.course,
      form.quota,
      form.academicYear,
      form.department,
      editingFee?._id
    );

    if (existingFee) {
      setErrorMsg(
        "A fee structure already exists for this department, course, and quota. Please edit the existing fee structure instead."
      );
      setSaving(false);
      return;
    }

    try {
      // Convert all fee components to numbers
      const feeItems = [
        {
          feeType: "Admission & Processing Fee",
          amount: Number(form.admissionFee || 0),
        },
        {
          feeType: "Tuition Fee",
          amount: Number(form.tuitionFee || 0),
        },
        {
          feeType: "University / Exam Affiliation Fee",
          amount: Number(form.universityFee || 0),
        },
        {
          feeType: "Marksheet & Document Verification",
          amount: Number(form.marksheetVerification || 0),
        },
        {
          feeType: "Special / Lab Equipment Fee",
          amount: Number(form.specialFee || 0),
        },
        {
          feeType: "Computer & Software Lab Access",
          amount: Number(form.computerLab || 0),
        },
        {
          feeType: "English Language Lab & NSS / ID Card",
          amount: Number(form.englishLabNssId || 0),
        },
        {
          feeType: "Stationery & Syllabus Kit",
          amount: Number(form.stationary || 0),
        },
        {
          feeType: "Parent Teacher Association (PTA)",
          amount: Number(form.pta || 0),
        },
        {
          feeType: "Other Institutional Amenities",
          amount: Number(form.otherFee || 0),
        },
      ];

      // Real total from all 10 components
      const totalFee = feeItems.reduce(
        (sum, item) => sum + item.amount,
        0
      );

      const payload = {
        academicYear: form.academicYear,
        department: form.department,
        course: form.course,
        semester: Number(
          String(form.semester || "1").replace(/\D/g, "")
        ) || 1,

        // Selected admission quota
        quota: form.quota,

        // Keep existing fields for compatibility
        tuitionFee: Number(form.tuitionFee || 0),
        otherFees: Number(form.otherFee || 0),

        // Real 10-component fee structure
        fees: feeItems,

        totalFee,
        totalAmount: totalFee,
      };

      let response;

      if (editingFee) {
        response = await updateFeeStructure(
          editingFee._id,
          payload
        );
      } else {
        response = await createFeeStructure(payload);
      }

      if (response.data && response.data.success !== false) {
        setSuccessMsg(
          editingFee
            ? "Fee structure updated successfully!"
            : "Fee structure saved successfully!"
        );

        setEditingFee(null);

        setForm({
          academicYear: form.academicYear,
          department: "",
          course: "",
          semester: "Sem 1",
          quota: "",
          admissionFee: "",
          tuitionFee: "",
          universityFee: "",
          marksheetVerification: "",
          specialFee: "",
          computerLab: "",
          englishLabNssId: "",
          stationary: "",
          pta: "",
          otherFee: "",
          transportFee: "",
          hostelFee: "",
        });

        loadData();
      } else {
        throw new Error(
          response.data?.message ||
            "Failed to save fee structure"
        );
      }
    } catch (error) {
      console.error("Error saving fee structure:", error);

      setErrorMsg(
        error.response?.data?.message ||
          error.message ||
          "Failed to save fee structure"
      );
    } finally {
      setSaving(false);
    }
  };

  // Step 46.6: Use Confirmation Before Deleting a Fee Structure
  const handleDeleteFeeStructure = (feeStructureId) => {
    openConfirmation({
      title: "Delete Fee Structure",
      message: "Are you sure you want to delete this fee structure? This will remove the configured quota tariff.",
      action: async () => {
        try {
          await deleteFeeStructure(feeStructureId);
          setSuccessMsg("Fee structure removed successfully!");
          if (editingFee && editingFee._id === feeStructureId) {
            handleCancelEdit();
          }
          loadData();
        } catch (err) {
          console.error("Delete failed:", err);
          setErrorMsg("Failed to delete fee structure");
        }
      },
    });
  };

  const handleDelete = handleDeleteFeeStructure;

  // Filtered Structures
  const filteredStructures = useMemo(() => {
    return feeStructuresList.filter((item) => {
      const term = searchQuery.toLowerCase().trim();
      const courseName = typeof item.course === "object" ? item.course?.name || "" : item.course || "";
      const deptName = item.department || "";
      const quota = item.quota || "";
      const year = item.academicYear || "";

      const matchesSearch =
        !term ||
        courseName.toLowerCase().includes(term) ||
        deptName.toLowerCase().includes(term) ||
        quota.toLowerCase().includes(term) ||
        year.toLowerCase().includes(term);

      const matchesDept = deptFilter === "All" || deptName.toLowerCase() === deptFilter.toLowerCase();
      const matchesQuota = quotaFilter === "All" || quota.toLowerCase() === quotaFilter.toLowerCase();
      const matchesYear = yearFilter === "All" || year.toLowerCase() === yearFilter.toLowerCase();

      return matchesSearch && matchesDept && matchesQuota && matchesYear;
    });
  }, [feeStructuresList, searchQuery, deptFilter, quotaFilter, yearFilter]);

  // ERP Metrics Calculation
  const metrics = useMemo(() => {
    const totalSchedules = feeStructuresList.length;
    const uniqueDepts = new Set(feeStructuresList.map((f) => f.department).filter(Boolean)).size;
    const uniqueCourses = new Set(
      feeStructuresList.map((f) => (typeof f.course === "object" ? f.course?.name : f.course)).filter(Boolean)
    ).size;
    const avgFee =
      totalSchedules > 0
        ? Math.round(
            feeStructuresList.reduce((acc, f) => acc + Number(f.totalFee || f.totalAmount || 0), 0) / totalSchedules
          )
        : 0;

    return {
      totalSchedules,
      uniqueDepts,
      uniqueCourses,
      avgFee,
    };
  }, [feeStructuresList]);

  // CSV Export for ERP Compliance
  const handleExportCSV = () => {
    if (filteredStructures.length === 0) {
      alert("No records to export.");
      return;
    }
    const headers = ["Department", "Course / Program", "Admission Quota", "Academic Year", "Tuition Fee (INR)", "Other Fees (INR)", "Total Fee (INR)"];
    const rows = filteredStructures.map((f) => {
      const courseName = typeof f.course === "object" ? f.course?.name || "" : f.course || "";
      return [
        `"${f.department || ""}"`,
        `"${courseName}"`,
        `"${f.quota || "General / Merit"}"`,
        `"${f.academicYear || ""}"`,
        Number(f.tuitionFee || 0),
        Number(f.otherFees || 0),
        Number(f.totalFee || f.totalAmount || 0)
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Fee_Structures_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: "1600px", margin: "0 auto", color: "#1e293b", fontFamily: "inherit" }}>
      
      {/* ── Breadcrumb & Title Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b", fontWeight: "600", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            <span>Finance & Accounts</span>
            <ChevronRight size={13} />
            <span>Fee Management</span>
            <ChevronRight size={13} />
            <span style={{ color: "#2563eb" }}>Fee Structure Master</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 6px 16px rgba(37, 99, 235, 0.25)"
              }}
            >
              <Layers3 size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: "22px", fontWeight: "800", margin: 0, color: "#0f172a", letterSpacing: "-0.5px" }}>
                Fee Structure & Quota Master
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>
                Define department tariffs, quota schedules, and automated billing matrices for students
              </p>
            </div>
          </div>
        </div>

        {/* Global ERP Action Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "9px 15px",
              borderRadius: "9px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              transition: "all 0.15s ease"
            }}
          >
            <FileSpreadsheet size={16} color="#059669" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "9px 16px",
              borderRadius: "9px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#1e293b",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              transition: "all 0.15s ease"
            }}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} color="#2563eb" />
            Sync ERP Records
          </button>
        </div>
      </div>

      {/* ── ERP Summary Metric KPI Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "24px"
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "18px 20px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "16px"
          }}
        >
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Configured Schedules</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>{metrics.totalSchedules}</div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "18px 20px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "16px"
          }}
        >
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Departments</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>{metrics.uniqueDepts}</div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "18px 20px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "16px"
          }}
        >
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#fdf2f8", color: "#db2777", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Programs Covered</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>{metrics.uniqueCourses}</div>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "18px 20px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
            display: "flex",
            alignItems: "center",
            gap: "16px"
          }}
        >
          <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IndianRupee size={22} />
          </div>
          <div>
            <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Average Quota Tariff</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>₹{metrics.avgFee.toLocaleString("en-IN")}</div>
          </div>
        </div>
      </div>

      {/* ── Notification Toasts ── */}
      {successMsg && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            padding: "12px 18px",
            borderRadius: "10px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "13.5px",
            fontWeight: "600",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg("")}
            style={{ background: "transparent", border: "none", color: "#065f46", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: "12px 18px",
            borderRadius: "10px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "13.5px",
            fontWeight: "600",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={18} color="#dc2626" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg("")}
            style={{ background: "transparent", border: "none", color: "#991b1b", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Main 2-Column ERP Grid Layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: "24px", alignItems: "start" }}>
        
        {/* ── Left Column: Form Panel ── */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
            overflow: "hidden"
          }}
        >
          {/* Form Header */}
          <div
            style={{
              padding: "18px 22px",
              background: editingFee ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)" : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "8px",
                  background: editingFee ? "#16a34a" : "#2563eb",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
                }}
              >
                {editingFee ? <Edit3 size={17} /> : <Tag size={17} />}
              </div>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
                  {editingFee ? "Edit Quota Tariff" : "Define Fee Schedule"}
                </h2>
                <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                  {editingFee ? "Modifying existing tariff record" : "Create new quota-wise fee entry"}
                </span>
              </div>
            </div>

            {editingFee && (
              <button
                type="button"
                onClick={handleCancelEdit}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#475569",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <X size={13} />
                Cancel
              </button>
            )}
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* Section 1: Academic & Program Details */}
            <div style={{ borderBottom: "1px dashed #e2e8f0", paddingBottom: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                1. Academic & Program Mapping
              </div>

              {/* Academic Year */}
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: "5px" }}>
                  Academic Year <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  name="academicYear"
                  value={form.academicYear}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    background: "#ffffff",
                    outline: "none",
                    color: "#1e293b",
                    fontWeight: "500"
                  }}
                  required
                >
                  {ACADEMIC_YEARS.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: "5px" }}>
                  Department <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  name="department"
                  value={form.department}
                  onChange={handleDepartmentChange}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    background: "#ffffff",
                    outline: "none",
                    color: "#1e293b",
                    fontWeight: "500"
                  }}
                  required
                >
                  <option value="">Select Department</option>
                  {departmentsList.map((d, i) => {
                    const dName = d.name || d;
                    return (
                      <option key={d._id || d.id || i} value={dName}>
                        {dName} {d.code ? `(${d.code})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Course / Program */}
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: "5px" }}>
                  Course / Program <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  name="course"
                  value={form.course}
                  onChange={handleCourseChange}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    background: "#ffffff",
                    outline: "none",
                    color: "#1e293b",
                    fontWeight: "500"
                  }}
                  required
                >
                  <option value="">Select Course / Program</option>
                  {filteredCourses.map((c, i) => {
                    const cName = c.name || c.courseName || c;
                    return (
                      <option key={c._id || c.id || i} value={cName}>
                        {cName} {c.code ? `(${c.code})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Section 2: Quota & Tariff Structure */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                2. Quota & Tariff Structure
              </div>

              {/* Admission Quota */}
              <div>
                <label style={{ display: "block", fontSize: "12.5px", fontWeight: "700", color: "#334155", marginBottom: "5px" }}>
                  Admission Quota <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <select
                  name="quota"
                  value={form.quota}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    background: "#ffffff",
                    outline: "none",
                    color: "#1e293b",
                    fontWeight: "500"
                  }}
                  required
                >
                  <option value="">Select Admission Quota</option>
                  {QUOTA_OPTIONS.map((q) => (
                    <option key={q} value={q}>
                      {q}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duplicate Notice Banner */}
              {duplicateFound && !editingFee && (
                <div
                  style={{
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    color: "#92400e",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <AlertCircle size={15} color="#d97706" style={{ flexShrink: 0 }} />
                    <span>
                      Exists for <strong>{form.course}</strong>{form.department ? ` (${form.department})` : ''}.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEditFee(duplicateFound)}
                    style={{
                      background: "#d97706",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "5px",
                      padding: "4px 8px",
                      fontSize: "11px",
                      fontWeight: "700",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Edit Record
                  </button>
                </div>
              )}

              {/* 10 Detailed Fee Component Inputs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {/* 1. Admission Fee */}
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    Admission & Processing Fee (₹)
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "10px", top: "8px", color: "#64748b", fontWeight: "600", fontSize: "12px" }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      name="admissionFee"
                      value={form.admissionFee}
                      onChange={handleChange}
                      placeholder="0"
                      style={{ width: "100%", padding: "7px 10px 7px 24px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                    />
                  </div>
                </div>

                {/* 2. Tuition Fee */}
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    Tuition Fee (₹) <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "10px", top: "8px", color: "#64748b", fontWeight: "600", fontSize: "12px" }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      name="tuitionFee"
                      value={form.tuitionFee}
                      onChange={handleChange}
                      placeholder="0"
                      required
                      style={{ width: "100%", padding: "7px 10px 7px 24px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                    />
                  </div>
                </div>

                {/* 3. University Fee */}
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    University / Exam Affiliation (₹)
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "10px", top: "8px", color: "#64748b", fontWeight: "600", fontSize: "12px" }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      name="universityFee"
                      value={form.universityFee}
                      onChange={handleChange}
                      placeholder="0"
                      style={{ width: "100%", padding: "7px 10px 7px 24px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                    />
                  </div>
                </div>

                {/* 4. Marksheet Verification */}
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    Marksheet & Doc Verification (₹)
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "10px", top: "8px", color: "#64748b", fontWeight: "600", fontSize: "12px" }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      name="marksheetVerification"
                      value={form.marksheetVerification}
                      onChange={handleChange}
                      placeholder="0"
                      style={{ width: "100%", padding: "7px 10px 7px 24px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                    />
                  </div>
                </div>

                {/* 5. Special / Lab Fee */}
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    Special / Lab Equipment Fee (₹)
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "10px", top: "8px", color: "#64748b", fontWeight: "600", fontSize: "12px" }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      name="specialFee"
                      value={form.specialFee}
                      onChange={handleChange}
                      placeholder="0"
                      style={{ width: "100%", padding: "7px 10px 7px 24px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                    />
                  </div>
                </div>

                {/* 6. Computer Lab */}
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    Computer & Software Lab Access (₹)
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "10px", top: "8px", color: "#64748b", fontWeight: "600", fontSize: "12px" }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      name="computerLab"
                      value={form.computerLab}
                      onChange={handleChange}
                      placeholder="0"
                      style={{ width: "100%", padding: "7px 10px 7px 24px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                    />
                  </div>
                </div>

                {/* 7. English Lab & NSS / ID */}
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    English Lab & NSS / ID Card (₹)
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "10px", top: "8px", color: "#64748b", fontWeight: "600", fontSize: "12px" }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      name="englishLabNssId"
                      value={form.englishLabNssId}
                      onChange={handleChange}
                      placeholder="0"
                      style={{ width: "100%", padding: "7px 10px 7px 24px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                    />
                  </div>
                </div>

                {/* 8. Stationary */}
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    Stationery & Syllabus Kit (₹)
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "10px", top: "8px", color: "#64748b", fontWeight: "600", fontSize: "12px" }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      name="stationary"
                      value={form.stationary}
                      onChange={handleChange}
                      placeholder="0"
                      style={{ width: "100%", padding: "7px 10px 7px 24px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                    />
                  </div>
                </div>

                {/* 9. PTA */}
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    Parent Teacher Association (PTA) (₹)
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "10px", top: "8px", color: "#64748b", fontWeight: "600", fontSize: "12px" }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      name="pta"
                      value={form.pta}
                      onChange={handleChange}
                      placeholder="0"
                      style={{ width: "100%", padding: "7px 10px 7px 24px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                    />
                  </div>
                </div>

                {/* 10. Other Fee */}
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "4px" }}>
                    Other Institutional Amenities (₹)
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: "10px", top: "8px", color: "#64748b", fontWeight: "600", fontSize: "12px" }}>₹</span>
                    <input
                      type="number"
                      min="0"
                      name="otherFee"
                      value={form.otherFee}
                      onChange={handleChange}
                      placeholder="0"
                      style={{ width: "100%", padding: "7px 10px 7px 24px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                    />
                  </div>
                </div>
              </div>

              {/* Computed Total Aggregate Banner */}
              <div
                style={{
                  background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                  border: "1px solid #86efac",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "4px"
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", color: "#166534", fontWeight: "800", display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Live Computed Aggregate Fee
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                    <span style={{ fontSize: "20px", fontWeight: "800", color: "#15803d" }}>
                      ₹{Number(totalFee).toLocaleString("en-IN")}
                    </span>
                    <span style={{ fontSize: "11px", color: "#166534" }}>
                      ({Number(form.tuitionFee || 0).toLocaleString()} + {Number(form.otherFees || 0).toLocaleString()})
                    </span>
                  </div>
                </div>
                <Award size={26} color="#16a34a" />
              </div>
            </div>

            {/* Submit & Reset Buttons */}
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                  background: editingFee
                    ? "linear-gradient(135deg, #10b981, #059669)"
                    : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#ffffff",
                  padding: "11px 18px",
                  borderRadius: "9px",
                  border: "none",
                  fontWeight: "700",
                  fontSize: "13.5px",
                  cursor: "pointer",
                  boxShadow: editingFee
                    ? "0 4px 12px rgba(16, 185, 129, 0.3)"
                    : "0 4px 12px rgba(37, 99, 235, 0.25)",
                  transition: "all 0.15s ease",
                }}
              >
                {saving ? (
                  <>
                    <RefreshCw size={15} className="spin" />
                    {editingFee ? "Updating..." : "Saving..."}
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    {editingFee ? "Update Tariff Record" : "Add Fee Schedule"}
                  </>
                )}
              </button>

              {editingFee && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    background: "#f1f5f9",
                    color: "#475569",
                    padding: "11px 14px",
                    borderRadius: "9px",
                    border: "1px solid #cbd5e1",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={14} />
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── Right Column: Directory Table Panel ── */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }}
        >
          {/* Table Header & Multi-filter Bar */}
          <div
            style={{
              padding: "18px 22px",
              borderBottom: "1px solid #e2e8f0",
              background: "#ffffff",
              display: "flex",
              flexDirection: "column",
              gap: "14px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h2 style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                    Active Fee Schedules
                  </h2>
                  <span
                    style={{
                      background: "#eff6ff",
                      color: "#2563eb",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "700"
                    }}
                  >
                    {filteredStructures.length} {filteredStructures.length === 1 ? 'Record' : 'Records'}
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                  Configured tariffs by department, degree program, and quota category
                </p>
              </div>

              {/* Live Search */}
              <div style={{ position: "relative", minWidth: "260px" }}>
                <Search
                  size={15}
                  color="#94a3b8"
                  style={{ position: "absolute", left: "10px", top: "10px" }}
                />
                <input
                  type="text"
                  placeholder="Search department, course, quota..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 32px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "12.5px",
                    outline: "none",
                    boxSizing: "border-box",
                    background: "#f8fafc"
                  }}
                />
              </div>
            </div>

            {/* Filter Dropdowns Bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                paddingTop: "10px",
                borderTop: "1px solid #f1f5f9"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "700", color: "#475569" }}>
                <Filter size={13} />
                <span>Filters:</span>
              </div>

              {/* Dept Filter */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12px",
                  background: "#ffffff",
                  color: "#334155",
                  fontWeight: "600",
                  outline: "none"
                }}
              >
                <option value="All">All Departments</option>
                {departmentsList.map((d, i) => {
                  const dName = d.name || d;
                  return <option key={i} value={dName}>{dName}</option>;
                })}
              </select>

              {/* Quota Filter */}
              <select
                value={quotaFilter}
                onChange={(e) => setQuotaFilter(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12px",
                  background: "#ffffff",
                  color: "#334155",
                  fontWeight: "600",
                  outline: "none"
                }}
              >
                <option value="All">All Quotas</option>
                {QUOTA_OPTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>

              {/* Academic Year Filter */}
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12px",
                  background: "#ffffff",
                  color: "#334155",
                  fontWeight: "600",
                  outline: "none"
                }}
              >
                <option value="All">All Academic Years</option>
                {ACADEMIC_YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              {(deptFilter !== "All" || quotaFilter !== "All" || yearFilter !== "All" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setDeptFilter("All");
                    setQuotaFilter("All");
                    setYearFilter("All");
                    setSearchQuery("");
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#dc2626",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    padding: "4px 6px"
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Table Content */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#64748b" }}>
              <RefreshCw size={26} className="spin" style={{ marginBottom: "10px", color: "#2563eb" }} />
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "600" }}>Loading fee structures from ERP...</p>
            </div>
          ) : filteredStructures.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px 20px",
                background: "#fafafa",
                margin: "20px",
                borderRadius: "12px",
                border: "1px dashed #cbd5e1",
              }}
            >
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "12px",
                  background: "#eff6ff",
                  color: "#3b82f6",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "12px"
                }}
              >
                <BookOpen size={24} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", margin: "0 0 6px 0" }}>
                No Matching Fee Structures Found
              </h3>
              <p style={{ fontSize: "13px", color: "#64748b", margin: 0, maxWidth: "420px", marginInline: "auto" }}>
                {feeStructuresList.length === 0
                  ? "No fee schedules have been configured yet. Use the form on the left to define your first quota tariff."
                  : "No records match your active search or filter criteria."}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto", flex: 1 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "12px 16px", fontWeight: "700", color: "#475569", fontSize: "12px", textTransform: "uppercase" }}>Department</th>
                    <th style={{ padding: "12px 16px", fontWeight: "700", color: "#475569", fontSize: "12px", textTransform: "uppercase" }}>Program / Course</th>
                    <th style={{ padding: "12px 16px", fontWeight: "700", color: "#475569", fontSize: "12px", textTransform: "uppercase" }}>Quota Category</th>
                    <th style={{ padding: "12px 16px", fontWeight: "700", color: "#475569", fontSize: "12px", textTransform: "uppercase" }}>Year</th>
                    <th style={{ padding: "12px 16px", fontWeight: "700", color: "#475569", fontSize: "12px", textTransform: "uppercase", textAlign: "right" }}>Tuition (₹)</th>
                    <th style={{ padding: "12px 16px", fontWeight: "700", color: "#475569", fontSize: "12px", textTransform: "uppercase", textAlign: "right" }}>Other (₹)</th>
                    <th style={{ padding: "12px 16px", fontWeight: "700", color: "#475569", fontSize: "12px", textTransform: "uppercase", textAlign: "right" }}>Total Fee (₹)</th>
                    <th style={{ padding: "12px 16px", fontWeight: "700", color: "#475569", fontSize: "12px", textTransform: "uppercase", textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStructures.map((item, index) => {
                    const matchedCourse = coursesList.find(
                      (c) => String(c._id) === String(item.course) || String(c.id) === String(item.course) || c.name === item.course || c.courseName === item.course
                    );
                    const courseDisplay = typeof item.course === "object"
                      ? (item.course?.name || item.course?.courseName || item.course?.code)
                      : (matchedCourse?.name || matchedCourse?.courseName || item.course);

                    let deptDisplay = item.department || "";
                    if (!deptDisplay && matchedCourse) {
                      const matchedDept = departmentsList.find(
                        (d) =>
                          d.id === matchedCourse.departmentId ||
                          d._id === matchedCourse.departmentId ||
                          d.name === matchedCourse.departmentId ||
                          d.code === matchedCourse.departmentId ||
                          d.name === matchedCourse.department
                      );
                      deptDisplay = matchedDept ? matchedDept.name : (matchedCourse.department || matchedCourse.departmentId || "");
                    }

                    const isRowEditing = editingFee?._id === item._id;

                    const getQuotaBadgeStyle = (q) => {
                      switch (q) {
                        case "Management Quota":
                          return { bg: "#fef3c7", text: "#92400e", border: "#fde68a" };
                        case "Government Quota":
                          return { bg: "#e0e7ff", text: "#3730a3", border: "#c7d2fe" };
                        case "Sports Quota":
                          return { bg: "#fce7f3", text: "#9d174d", border: "#fbcfe8" };
                        case "NRI Quota":
                          return { bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" };
                        case "Minority Quota":
                          return { bg: "#ccfbf1", text: "#115e59", border: "#99f6e4" };
                        default:
                          return { bg: "#f1f5f9", text: "#334155", border: "#e2e8f0" };
                      }
                    };

                    const badgeStyle = getQuotaBadgeStyle(item.quota);

                    return (
                      <tr
                        key={item._id || index}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: isRowEditing ? "#eff6ff" : (index % 2 === 1 ? "#fafcff" : "#ffffff"),
                          transition: "background 0.15s ease",
                        }}
                      >
                        {/* Department */}
                        <td style={{ padding: "13px 16px", fontWeight: "600", color: "#334155" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <Building2 size={14} color="#64748b" />
                            <span>{deptDisplay || "General / Unassigned"}</span>
                          </div>
                        </td>

                        {/* Course / Program */}
                        <td style={{ padding: "13px 16px", fontWeight: "700", color: isRowEditing ? "#1d4ed8" : "#0f172a" }}>
                          {courseDisplay || "General / All Programs"}
                        </td>

                        {/* Quota */}
                        <td style={{ padding: "13px 16px" }}>
                          <span
                            style={{
                              background: badgeStyle.bg,
                              color: badgeStyle.text,
                              border: `1px solid ${badgeStyle.border}`,
                              padding: "3px 9px",
                              borderRadius: "6px",
                              fontSize: "11.5px",
                              fontWeight: "700",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: badgeStyle.text }}></span>
                            {item.quota || "General / Merit"}
                          </span>
                        </td>

                        {/* Academic Year */}
                        <td style={{ padding: "13px 16px", color: "#64748b", fontWeight: "600", fontSize: "12px" }}>
                          <span style={{ background: "#f8fafc", padding: "2px 7px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                            {item.academicYear}
                          </span>
                        </td>

                        {/* Tuition Fee */}
                        <td style={{ padding: "13px 16px", color: "#334155", fontWeight: "600", textAlign: "right" }}>
                          ₹{Number(item.tuitionFee || 0).toLocaleString("en-IN")}
                        </td>

                        {/* Other Fees */}
                        <td style={{ padding: "13px 16px", color: "#64748b", fontWeight: "500", textAlign: "right" }}>
                          ₹{Number(item.otherFees || 0).toLocaleString("en-IN")}
                        </td>

                        {/* Total Fee */}
                        <td style={{ padding: "13px 16px", fontWeight: "800", color: "#15803d", textAlign: "right" }}>
                          <span style={{ background: "#f0fdf4", padding: "4px 8px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>
                            ₹{Number(item.totalFee || item.totalAmount || 0).toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "13px 16px", textAlign: "center" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                            <button
                              type="button"
                              onClick={() => handleEditFee(item)}
                              style={{
                                background: isRowEditing ? "#2563eb" : "#f1f5f9",
                                border: "1px solid " + (isRowEditing ? "#2563eb" : "#cbd5e1"),
                                color: isRowEditing ? "#ffffff" : "#1e40af",
                                padding: "5px 8px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                fontSize: "11.5px",
                                fontWeight: "700",
                                transition: "all 0.15s ease",
                              }}
                              title="Edit Structure"
                            >
                              <Edit3 size={13} />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCloneFee(item)}
                              style={{
                                background: "#f8fafc",
                                border: "1px solid #cbd5e1",
                                color: "#475569",
                                padding: "5px 8px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                fontSize: "11.5px",
                                fontWeight: "600",
                                transition: "all 0.15s ease",
                              }}
                              title="Clone to Form for Another Quota"
                            >
                              <Copy size={13} />
                              Clone
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(item._id)}
                              style={{
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                                color: "#dc2626",
                                padding: "5px 7px",
                                borderRadius: "6px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                transition: "all 0.15s ease",
                              }}
                              title="Delete Record"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer Summary */}
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid #e2e8f0",
              background: "#f8fafc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
              color: "#64748b"
            }}
          >
            <span>
              Showing <strong>{filteredStructures.length}</strong> of <strong>{feeStructuresList.length}</strong> total fee structures
            </span>
            <span style={{ fontWeight: "600", color: "#334155" }}>
              Live College ERP Sync Active
            </span>
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal ── */}
      {confirmation.open && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '440px',
              background: '#ffffff',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
          >
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: '#1e293b' }}>
              {confirmation.title}
            </h2>

            <p style={{ marginTop: '12px', fontSize: '0.95rem', color: '#64748b', lineHeight: '1.5' }}>
              {confirmation.message}
            </p>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={closeConfirmation}
                style={{
                  padding: '9px 18px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAction}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)'
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeStructure;
