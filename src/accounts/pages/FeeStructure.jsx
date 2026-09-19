import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Plus,
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
  Layers3,
  Award,
  Building2,
  Filter,
  GraduationCap,
  Copy,
  ChevronRight,
  FileSpreadsheet,
  Eye,
  ShieldCheck,
  Sliders,
  DollarSign,
  Cpu,
  Bookmark
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

const ACADEMIC_YEARS = [
  "2026-2027",
  "2025-2026",
  "2027-2028",
  "2028-2029",
  "2024-2025"
];

const SEMESTER_OPTIONS = [
  "Sem 1",
  "Sem 2",
  "Sem 3",
  "Sem 4",
  "Sem 5",
  "Sem 6",
  "Sem 7",
  "Sem 8",
  "Annual"
];

const FeeStructure = () => {
  // Modal State for Zero-Scroll Configurator Dialog
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);

  const [form, setForm] = useState({
    academicYear: "2026-2027",
    department: "",
    course: "",
    semester: "Sem 1",

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
  const [courseFilter, setCourseFilter] = useState("All");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");

  // Accounts vs Admin Role Awareness
  const isAdmin = typeof window !== "undefined" && (
    window.location.pathname.startsWith("/admin") ||
    (Boolean(sessionStorage.getItem("admin_session")) && !window.location.pathname.startsWith("/accounts"))
  );

  // Detail Modal for View-Only / Breakdown Inspection
  const [selectedDetailFee, setSelectedDetailFee] = useState(null);

  // Confirmation Modal
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

  // Helper for itemized fee extraction
  const extractBreakdownFromFee = (fee) => {
    if (!fee) return null;
    let admissionFee = Number(fee.admissionFee || 0);
    let tuitionFee = Number(fee.tuitionFee || 0);
    let universityFee = Number(fee.universityFee || 0);
    let marksheetVerification = Number(fee.marksheetVerification || 0);
    let specialFee = Number(fee.specialFee || 0);
    let computerLab = Number(fee.computerLab || 0);
    let englishLabNssId = Number(fee.englishLabNssId || 0);
    let stationary = Number(fee.stationary || 0);
    let pta = Number(fee.pta || 0);
    let otherFee = Number(fee.otherFee || fee.otherFees || 0);
    let transportFee = Number(fee.transportFee || 0);
    let hostelFee = Number(fee.hostelFee || 0);

    if (Array.isArray(fee.fees) && fee.fees.length > 0) {
      fee.fees.forEach((f) => {
        const type = (f.feeType || "").toLowerCase();
        const amt = Number(f.amount || 0);
        if (type.includes("admission")) admissionFee = amt;
        else if (type.includes("tuition")) tuitionFee = amt;
        else if (type.includes("exam") || type.includes("univ")) universityFee = amt;
        else if (type.includes("mark") || type.includes("verif")) marksheetVerification = amt;
        else if (type.includes("special")) specialFee = amt;
        else if (type.includes("computer")) computerLab = amt;
        else if (type.includes("english") || type.includes("nss") || type.includes("id")) englishLabNssId = amt;
        else if (type.includes("station")) stationary = amt;
        else if (type.includes("pta")) pta = amt;
        else if (type.includes("transport")) transportFee = amt;
        else if (type.includes("hostel")) hostelFee = amt;
        else otherFee = amt;
      });
    }

    const coreSubtotal = admissionFee + tuitionFee + universityFee + marksheetVerification;
    const labSubtotal = specialFee + computerLab + englishLabNssId;
    const amenitiesSubtotal = stationary + pta + otherFee;

    const total = Number(
      fee.totalFee ||
      fee.totalAmount ||
      (coreSubtotal + labSubtotal + amenitiesSubtotal)
    );

    return {
      admissionFee,
      tuitionFee,
      universityFee,
      marksheetVerification,
      specialFee,
      computerLab,
      englishLabNssId,
      stationary,
      pta,
      otherFee,
      transportFee,
      hostelFee,
      coreSubtotal,
      labSubtotal,
      amenitiesSubtotal,
      total,
    };
  };

  // Live Category Subtotals for Form
  const formCoreTotal = useMemo(() => {
    return (
      Number(form.admissionFee || 0) +
      Number(form.tuitionFee || 0) +
      Number(form.universityFee || 0) +
      Number(form.marksheetVerification || 0)
    );
  }, [form.admissionFee, form.tuitionFee, form.universityFee, form.marksheetVerification]);

  const formLabTotal = useMemo(() => {
    return (
      Number(form.specialFee || 0) +
      Number(form.computerLab || 0) +
      Number(form.englishLabNssId || 0)
    );
  }, [form.specialFee, form.computerLab, form.englishLabNssId]);

  const formAmenitiesTotal = useMemo(() => {
    return (
      Number(form.stationary || 0) +
      Number(form.pta || 0) +
      Number(form.otherFee || 0)
    );
  }, [form.stationary, form.pta, form.otherFee]);

  const formGrandTotal = useMemo(() => {
    return formCoreTotal + formLabTotal + formAmenitiesTotal;
  }, [formCoreTotal, formLabTotal, formAmenitiesTotal]);

  const activeComponentsCount = useMemo(() => {
    const fields = [
      form.admissionFee,
      form.tuitionFee,
      form.universityFee,
      form.marksheetVerification,
      form.specialFee,
      form.computerLab,
      form.englishLabNssId,
      form.stationary,
      form.pta,
      form.otherFee
    ];
    return fields.filter(v => Number(v) > 0).length;
  }, [form]);

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
    const currentDeptName = String(form.department || "").trim().toLowerCase();
    if (!currentDeptName) return coursesList || [];

    const deptObj = (departmentsList || []).find((d) => {
      const dName = String(d?.name || d?.departmentName || "").trim().toLowerCase();
      const dCode = String(d?.code || "").trim().toLowerCase();
      const dId = String(d?.id || "").trim().toLowerCase();
      const dMongoId = String(d?._id || "").trim().toLowerCase();
      return (
        dName === currentDeptName ||
        dCode === currentDeptName ||
        dId === currentDeptName ||
        dMongoId === currentDeptName
      );
    });

    const validDeptIdentifiers = new Set();
    validDeptIdentifiers.add(currentDeptName);
    if (deptObj) {
      if (deptObj.id) validDeptIdentifiers.add(String(deptObj.id).trim().toLowerCase());
      if (deptObj._id) validDeptIdentifiers.add(String(deptObj._id).trim().toLowerCase());
      if (deptObj.code) validDeptIdentifiers.add(String(deptObj.code).trim().toLowerCase());
      if (deptObj.name) validDeptIdentifiers.add(String(deptObj.name).trim().toLowerCase());
      if (deptObj.departmentName) validDeptIdentifiers.add(String(deptObj.departmentName).trim().toLowerCase());
    }

    return (coursesList || []).filter((c) => {
      if (!c) return false;
      const courseDeptIdentifiers = [
        c.departmentId,
        typeof c.department === "object" ? c.department?._id : null,
        typeof c.department === "object" ? c.department?.id : null,
        typeof c.department === "object" ? c.department?.name : (typeof c.department === "string" ? c.department : null),
        typeof c.department === "object" ? c.department?.code : null,
        c.departmentName,
      ]
        .filter(Boolean)
        .map((v) => String(v).trim().toLowerCase());

      return courseDeptIdentifiers.some((id) => validDeptIdentifiers.has(id));
    });
  }, [form.department, coursesList, departmentsList]);

  const handleOpenAddModal = () => {
    setEditingFee(null);
    setForm({
      academicYear: "2026-2027",
      department: "",
      course: "",
      semester: "Sem 1",
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
    setModalOpen(true);
  };

  const handleEditFee = (fee) => {
    setEditingFee(fee);
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

    const savedFees = Array.isArray(fee.fees) ? fee.fees : [];
    const getFeeAmount = (keywords) => {
      const item = savedFees.find((f) => {
        const type = String(f.feeType || "").toLowerCase();
        return keywords.some((keyword) => type.includes(keyword.toLowerCase()));
      });
      return item?.amount ?? "";
    };

    setForm({
      academicYear: fee.academicYear || "2026-2027",
      department: deptVal,
      course: courseVal,
      semester: fee.semester ? `Sem ${fee.semester}` : "Sem 1",
      admissionFee: getFeeAmount(["admission", "processing"]) || (fee.admissionFee ?? ""),
      tuitionFee: getFeeAmount(["tuition"]) || (fee.tuitionFee ?? ""),
      universityFee: getFeeAmount(["university", "exam affiliation", "univ"]) || (fee.universityFee ?? ""),
      marksheetVerification: getFeeAmount(["marksheet", "document verification", "verification"]) || (fee.marksheetVerification ?? ""),
      specialFee: getFeeAmount(["special", "equipment", "lab fee"]) || (fee.specialFee ?? ""),
      computerLab: getFeeAmount(["computer", "software lab"]) || (fee.computerLab ?? ""),
      englishLabNssId: getFeeAmount(["english", "nss", "id card"]) || (fee.englishLabNssId ?? ""),
      stationary: getFeeAmount(["stationery", "stationary", "syllabus kit"]) || (fee.stationary ?? ""),
      pta: getFeeAmount(["pta", "parent teacher"]) || (fee.pta ?? ""),
      otherFee: getFeeAmount(["other", "institutional amenities"]) || (fee.otherFee ?? fee.otherFees ?? ""),
      transportFee: fee.transportFee || "",
      hostelFee: fee.hostelFee || "",
    });

    setModalOpen(true);
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

    const breakdown = extractBreakdownFromFee(fee);

    setForm({
      academicYear: fee.academicYear || "2026-2027",
      department: deptVal,
      course: courseVal,
      semester: fee.semester ? `Sem ${fee.semester}` : "Sem 1",
      admissionFee: breakdown.admissionFee || "",
      tuitionFee: breakdown.tuitionFee || "",
      universityFee: breakdown.universityFee || "",
      marksheetVerification: breakdown.marksheetVerification || "",
      specialFee: breakdown.specialFee || "",
      computerLab: breakdown.computerLab || "",
      englishLabNssId: breakdown.englishLabNssId || "",
      stationary: breakdown.stationary || "",
      pta: breakdown.pta || "",
      otherFee: breakdown.otherFee || "",
      transportFee: breakdown.transportFee || "",
      hostelFee: breakdown.hostelFee || "",
    });

    setModalOpen(true);
  };

  const isMatchingCourse = (feeCourse, formCourse) => {
    if (!feeCourse || !formCourse) return false;
    const fName = typeof feeCourse === "object" ? (feeCourse.name || feeCourse.courseName || feeCourse._id) : feeCourse;
    const targetName = typeof formCourse === "object" ? (formCourse.name || formCourse.courseName || formCourse._id) : formCourse;
    return String(fName).trim().toLowerCase() === String(targetName).trim().toLowerCase();
  };

  const findDuplicateStructure = (
    course,
    academicYear,
    department = null,
    semester = null,
    excludeId = null
  ) => {
    if (!course) return null;

    return feeStructuresList.find((fee) => {
      if (excludeId && String(fee._id) === String(excludeId)) {
        return false;
      }

      const sameCourse = isMatchingCourse(fee.course, course);

      const sameYear =
        !academicYear ||
        !fee.academicYear ||
        String(fee.academicYear).trim() === String(academicYear).trim();

      const sameDept =
        !department ||
        !fee.department ||
        String(fee.department).trim().toLowerCase() === String(department).trim().toLowerCase();

      const sameSemester =
        !semester ||
        !fee.semester ||
        Number(String(fee.semester).replace(/\D/g, "") || fee.semester) === Number(String(semester).replace(/\D/g, "") || semester);

      return sameCourse && sameYear && sameDept && sameSemester;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    if (!form.course) {
      setErrorMsg("Please select a Course / Program.");
      setSaving(false);
      return;
    }

    if (!form.tuitionFee || Number(form.tuitionFee) <= 0) {
      setErrorMsg("Tuition Fee is mandatory and must be greater than zero.");
      setSaving(false);
      return;
    }

    const existingFee = findDuplicateStructure(
      form.course,
      form.academicYear,
      form.department,
      form.semester,
      editingFee?._id
    );

    if (existingFee) {
      setErrorMsg(
        `A Fee Structure already exists for ${form.department || 'this department'} • ${form.course} • ${form.academicYear} • ${form.semester}. Please edit the existing entry.`
      );
      setSaving(false);
      return;
    }

    try {
      const feeItems = [
        { feeType: "Admission & Processing Fee", amount: Number(form.admissionFee || 0) },
        { feeType: "Tuition Fee", amount: Number(form.tuitionFee || 0) },
        { feeType: "University / Exam Affiliation Fee", amount: Number(form.universityFee || 0) },
        { feeType: "Marksheet & Document Verification", amount: Number(form.marksheetVerification || 0) },
        { feeType: "Special / Lab Equipment Fee", amount: Number(form.specialFee || 0) },
        { feeType: "Computer & Software Lab Access", amount: Number(form.computerLab || 0) },
        { feeType: "English Language Lab & NSS / ID Card", amount: Number(form.englishLabNssId || 0) },
        { feeType: "Stationery & Syllabus Kit", amount: Number(form.stationary || 0) },
        { feeType: "Parent Teacher Association (PTA)", amount: Number(form.pta || 0) },
        { feeType: "Other Institutional Amenities", amount: Number(form.otherFee || 0) },
      ];

      const totalFee = feeItems.reduce((sum, item) => sum + item.amount, 0);

      const payload = {
        academicYear: form.academicYear,
        department: form.department,
        course: form.course,
        semester: Number(String(form.semester || "1").replace(/\D/g, "")) || 1,
        tuitionFee: Number(form.tuitionFee || 0),
        otherFees: Number(totalFee - Number(form.tuitionFee || 0)),
        fees: feeItems,
        totalFee,
        totalAmount: totalFee,
      };

      let response;
      if (editingFee) {
        response = await updateFeeStructure(editingFee._id, payload);
      } else {
        response = await createFeeStructure(payload);
      }

      if (response.data && response.data.success !== false) {
        setSuccessMsg(
          editingFee
            ? "Tariff schedule updated successfully in College ERP!"
            : "New Fee Structure Master schedule saved successfully!"
        );

        setModalOpen(false);
        setEditingFee(null);
        setForm({
          academicYear: form.academicYear,
          department: "",
          course: "",
          semester: "Sem 1",
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
        throw new Error(response.data?.message || "Failed to save fee structure");
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

  const handleDeleteFeeStructure = (feeStructureId) => {
    openConfirmation({
      title: "Delete Fee Structure Schedule",
      message: "Are you sure you want to delete this baseline fee schedule? This will remove the official tariff template for this course and semester.",
      action: async () => {
        try {
          await deleteFeeStructure(feeStructureId);
          setSuccessMsg("Fee structure schedule deleted successfully!");
          loadData();
        } catch (err) {
          console.error("Delete failed:", err);
          setErrorMsg("Failed to delete fee structure");
        }
      },
    });
  };

  const availableFilterCourses = useMemo(() => {
    const currentDeptName = String(deptFilter || "").trim().toLowerCase();
    if (!currentDeptName || currentDeptName === "all") return coursesList || [];

    const deptObj = (departmentsList || []).find((d) => {
      const dName = String(d?.name || d?.departmentName || "").trim().toLowerCase();
      const dCode = String(d?.code || "").trim().toLowerCase();
      const dId = String(d?.id || "").trim().toLowerCase();
      const dMongoId = String(d?._id || "").trim().toLowerCase();
      return (
        dName === currentDeptName ||
        dCode === currentDeptName ||
        dId === currentDeptName ||
        dMongoId === currentDeptName
      );
    });

    const validDeptIdentifiers = new Set();
    validDeptIdentifiers.add(currentDeptName);
    if (deptObj) {
      if (deptObj.id) validDeptIdentifiers.add(String(deptObj.id).trim().toLowerCase());
      if (deptObj._id) validDeptIdentifiers.add(String(deptObj._id).trim().toLowerCase());
      if (deptObj.code) validDeptIdentifiers.add(String(deptObj.code).trim().toLowerCase());
      if (deptObj.name) validDeptIdentifiers.add(String(deptObj.name).trim().toLowerCase());
      if (deptObj.departmentName) validDeptIdentifiers.add(String(deptObj.departmentName).trim().toLowerCase());
    }

    return (coursesList || []).filter((c) => {
      if (!c) return false;
      const courseDeptIdentifiers = [
        c.departmentId,
        typeof c.department === "object" ? c.department?._id : null,
        typeof c.department === "object" ? c.department?.id : null,
        typeof c.department === "object" ? c.department?.name : (typeof c.department === "string" ? c.department : null),
        typeof c.department === "object" ? c.department?.code : null,
        c.departmentName,
      ]
        .filter(Boolean)
        .map((v) => String(v).trim().toLowerCase());

      return courseDeptIdentifiers.some((id) => validDeptIdentifiers.has(id));
    });
  }, [coursesList, departmentsList, deptFilter]);

  // Filtered Fee Structures
  const filteredStructures = useMemo(() => {
    return feeStructuresList.filter((item) => {
      const term = searchQuery.toLowerCase().trim();
      const courseName = typeof item.course === "object" ? item.course?.name || item.course?.courseName || "" : item.course || "";
      const deptName = item.department || "";
      const year = item.academicYear || "";
      const semStr = item.semester ? `Sem ${item.semester}` : "";

      const matchesSearch =
        !term ||
        courseName.toLowerCase().includes(term) ||
        deptName.toLowerCase().includes(term) ||
        year.toLowerCase().includes(term) ||
        semStr.toLowerCase().includes(term);

      const matchesDept =
        deptFilter === "All" ||
        deptName.trim().toLowerCase() === deptFilter.trim().toLowerCase() ||
        (deptName && deptFilter && (deptName.toLowerCase().includes(deptFilter.toLowerCase()) || deptFilter.toLowerCase().includes(deptName.toLowerCase())));

      const matchesCourse =
        courseFilter === "All" ||
        courseName.trim().toLowerCase() === courseFilter.trim().toLowerCase() ||
        (courseName && courseFilter && (courseName.toLowerCase().includes(courseFilter.toLowerCase()) || courseFilter.toLowerCase().includes(courseName.toLowerCase())));

      const matchesSem =
        semesterFilter === "All" ||
        semStr.toLowerCase() === semesterFilter.toLowerCase() ||
        String(item.semester || "").toLowerCase() === semesterFilter.toLowerCase();

      const matchesYear = yearFilter === "All" || year.trim().toLowerCase() === yearFilter.trim().toLowerCase();

      return matchesSearch && matchesDept && matchesCourse && matchesSem && matchesYear;
    });
  }, [feeStructuresList, searchQuery, deptFilter, courseFilter, semesterFilter, yearFilter]);

  // ERP Metrics
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

  // Export CSV
  const handleExportCSV = () => {
    if (filteredStructures.length === 0) {
      alert("No records to export.");
      return;
    }
    const headers = [
      "Department",
      "Course / Program",
      "Semester",
      "Academic Year",
      "Tuition Fee (INR)",
      "Other Fees (INR)",
      "Total Base Tariff (INR)"
    ];
    const rows = filteredStructures.map((f) => {
      const courseName = typeof f.course === "object" ? f.course?.name || "" : f.course || "";
      const otherAmt = Number(f.totalFee || f.totalAmount || 0) - Number(f.tuitionFee || 0);
      return [
        `"${f.department || ""}"`,
        `"${courseName}"`,
        `"Sem ${f.semester || 1}"`,
        `"${f.academicYear || ""}"`,
        Number(f.tuitionFee || 0),
        otherAmt > 0 ? otherAmt : 0,
        Number(f.totalFee || f.totalAmount || 0)
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ERP_Fee_Structures_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: "24px 32px", maxWidth: "1680px", margin: "0 auto", color: "#1e293b", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      
      {/* ── ERP Breadcrumb & Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "22px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748b", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.6px" }}>
            <span>Finance & Accounts</span>
            <ChevronRight size={13} />
            <span>Fee Management</span>
            <ChevronRight size={13} />
            <span style={{ color: "#2563eb", fontWeight: "700" }}>{isAdmin ? "Fee Structure Master" : "Fee Structure Catalog"}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
                width: "46px",
                height: "46px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 6px 18px rgba(37, 99, 235, 0.28)"
              }}
            >
              <Layers3 size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h1 style={{ fontSize: "22px", fontWeight: "800", margin: 0, color: "#0f172a", letterSpacing: "-0.5px" }}>
                  {isAdmin ? "Fee Structure Master" : "Fee Structure Catalog"}
                </h1>
                {!isAdmin ? (
                  <span
                    style={{
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      padding: "3px 10px",
                      borderRadius: "6px",
                      fontSize: "11.5px",
                      fontWeight: "700",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
                  >
                    <ShieldCheck size={13} />
                    Admin Controlled • View Only
                  </span>
                ) : (
                  <span
                    style={{
                      background: "#f0fdf4",
                      color: "#166534",
                      border: "1px solid #bbf7d0",
                      padding: "3px 10px",
                      borderRadius: "6px",
                      fontSize: "11.5px",
                      fontWeight: "700",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
                  >
                    <CheckCircle2 size={13} />
                    Master ERP Active
                  </span>
                )}
              </div>
              <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#64748b" }}>
                {isAdmin
                  ? "Define official program tariffs, semester breakdown matrices, and baseline billing schedules for student admissions"
                  : "View official base tariffs and component matrices configured by Admin • Automatically loaded in Admissions"}
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                padding: "10px 18px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "13.5px",
                cursor: "pointer",
                border: "none",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                transition: "all 0.15s ease"
              }}
            >
              <Plus size={16} />
              Define Fee Schedule
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "9px 16px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              transition: "all 0.15s ease"
            }}
          >
            <FileSpreadsheet size={16} color="#059669" />
            Export Master CSV
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
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#1e293b",
              fontWeight: "600",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              transition: "all 0.15s ease"
            }}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} color="#2563eb" />
            Sync Records
          </button>
        </div>
      </div>

      {/* ── KPI Metrics Ribbon ── */}
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
            padding: "16px 20px",
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
            padding: "16px 20px",
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
            padding: "16px 20px",
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
            padding: "16px 20px",
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
            <div style={{ fontSize: "11.5px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Average Base Tariff</div>
            <div style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>₹{metrics.avgFee.toLocaleString("en-IN")}</div>
          </div>
        </div>
      </div>

      {/* ── Notification Feedback ── */}
      {successMsg && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            padding: "13px 18px",
            borderRadius: "10px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "13.5px",
            fontWeight: "600",
            boxShadow: "0 2px 6px rgba(16, 185, 129, 0.1)"
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
            padding: "13px 18px",
            borderRadius: "10px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "13.5px",
            fontWeight: "600",
            boxShadow: "0 2px 6px rgba(220, 38, 38, 0.1)"
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

      {/* ── Full-Width Master ERP Table Panel ── */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        {/* Table Header & Multi-filter Bar */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: "14px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
                  Active Tariff Schedules
                </h2>
                <span
                  style={{
                    background: "#eff6ff",
                    color: "#2563eb",
                    padding: "2px 9px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "700"
                  }}
                >
                  {filteredStructures.length} {filteredStructures.length === 1 ? 'Schedule' : 'Schedules'}
                </span>
              </div>
              <p style={{ fontSize: "12.5px", color: "#64748b", margin: "2px 0 0" }}>
                Official base tariffs mapped by department, degree program, and semester
              </p>
            </div>

            {/* Live Search */}
            <div style={{ position: "relative", minWidth: "320px" }}>
              <Search
                size={15}
                color="#94a3b8"
                style={{ position: "absolute", left: "11px", top: "10px" }}
              />
              <input
                type="text"
                placeholder="Search department, course, year..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 34px",
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

          {/* Filter Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              paddingTop: "12px",
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
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setCourseFilter("All");
              }}
              style={{
                padding: "6px 12px",
                borderRadius: "7px",
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
                const dName = d.name || d.departmentName || d;
                return <option key={i} value={dName}>{dName}</option>;
              })}
            </select>

            {/* Course Filter */}
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "7px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                background: "#ffffff",
                color: "#334155",
                fontWeight: "600",
                outline: "none",
                maxWidth: "260px"
              }}
            >
              <option value="All">All Courses</option>
              {availableFilterCourses.map((c, i) => {
                const cName = c.name || c.courseName || c;
                return (
                  <option key={c._id || c.id || i} value={cName}>
                    {cName} {c.code ? `(${c.code})` : ''}
                  </option>
                );
              })}
            </select>

            {/* Semester Filter */}
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "7px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                background: "#ffffff",
                color: "#334155",
                fontWeight: "600",
                outline: "none"
              }}
            >
              <option value="All">All Semesters</option>
              {SEMESTER_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Academic Year Filter */}
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "7px",
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

            {(deptFilter !== "All" || courseFilter !== "All" || semesterFilter !== "All" || yearFilter !== "All" || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setDeptFilter("All");
                  setCourseFilter("All");
                  setSemesterFilter("All");
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
                  padding: "4px 8px"
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
              margin: "24px",
              borderRadius: "14px",
              border: "1px dashed #cbd5e1",
            }}
          >
            <div
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "14px",
                background: "#eff6ff",
                color: "#3b82f6",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "12px"
              }}
            >
              <BookOpen size={26} />
            </div>
            <h3 style={{ fontSize: "16.5px", fontWeight: "800", color: "#1e293b", margin: "0 0 6px 0" }}>
              No Matching Fee Structures Found
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b", margin: 0, maxWidth: "440px", marginInline: "auto" }}>
              {feeStructuresList.length === 0
                ? (isAdmin
                    ? "No fee schedules have been configured yet. Click 'Define Fee Schedule' above to create your first tariff record."
                    : "No fee schedules have been configured yet by the Admin.")
                : "No records match your active search or filter criteria. Click 'Reset Filters' to view all."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto", flex: 1 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "14px 20px", fontWeight: "700", color: "#475569", fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.6px" }}>Department</th>
                  <th style={{ padding: "14px 20px", fontWeight: "700", color: "#475569", fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.6px" }}>Degree Program</th>
                  <th style={{ padding: "14px 20px", fontWeight: "700", color: "#475569", fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.6px" }}>Term / Semester</th>
                  <th style={{ padding: "14px 20px", fontWeight: "700", color: "#475569", fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.6px", textAlign: "right" }}>Tuition Fee</th>
                  <th style={{ padding: "14px 20px", fontWeight: "700", color: "#475569", fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.6px", textAlign: "right" }}>Institutional / Other</th>
                  <th style={{ padding: "14px 20px", fontWeight: "700", color: "#475569", fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.6px", textAlign: "right" }}>Base Tariff</th>
                  <th style={{ padding: "14px 20px", fontWeight: "700", color: "#475569", fontSize: "11.5px", textTransform: "uppercase", letterSpacing: "0.6px", textAlign: "center" }}>Actions</th>
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

                  const breakdown = extractBreakdownFromFee(item);
                  const otherFeesAmt = breakdown.total - breakdown.tuitionFee;

                  return (
                    <tr
                      key={item._id || index}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: index % 2 === 1 ? "#fafcff" : "#ffffff",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Department */}
                      <td style={{ padding: "15px 20px", fontWeight: "600", color: "#334155" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Building2 size={16} color="#64748b" />
                          <span>{deptDisplay || "General / Unassigned"}</span>
                        </div>
                      </td>

                      {/* Course / Program */}
                      <td style={{ padding: "15px 20px", fontWeight: "700", color: "#0f172a" }}>
                        {courseDisplay || "General / All Programs"}
                      </td>

                      {/* Term / Sem */}
                      <td style={{ padding: "15px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              background: "#f1f5f9",
                              color: "#1e293b",
                              border: "1px solid #e2e8f0",
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "700"
                            }}
                          >
                            Sem {item.semester || 1}
                          </span>
                          <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>
                            {item.academicYear}
                          </span>
                        </div>
                      </td>

                      {/* Tuition Fee */}
                      <td style={{ padding: "15px 20px", color: "#1e3a8a", fontWeight: "700", textAlign: "right" }}>
                        ₹{Number(breakdown.tuitionFee || 0).toLocaleString("en-IN")}
                      </td>

                      {/* Other Fees */}
                      <td style={{ padding: "15px 20px", color: "#64748b", fontWeight: "500", textAlign: "right" }}>
                        ₹{Number(otherFeesAmt > 0 ? otherFeesAmt : 0).toLocaleString("en-IN")}
                      </td>

                      {/* Total Tariff */}
                      <td style={{ padding: "15px 20px", fontWeight: "800", color: "#15803d", textAlign: "right" }}>
                        <span style={{ background: "#f0fdf4", padding: "4px 10px", borderRadius: "8px", border: "1px solid #bbf7d0", display: "inline-block", fontSize: "13.5px" }}>
                          ₹{Number(breakdown.total).toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "15px 20px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => setSelectedDetailFee(item)}
                            style={{
                              background: "#eff6ff",
                              border: "1px solid #bfdbfe",
                              color: "#1d4ed8",
                              padding: "6px 10px",
                              borderRadius: "7px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                              fontWeight: "700",
                              transition: "all 0.15s ease",
                            }}
                            title="View Itemized Breakdown"
                          >
                            <Eye size={13} />
                            Ledger
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditFee(item)}
                                style={{
                                  background: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                  color: "#1e40af",
                                  padding: "6px 9px",
                                  borderRadius: "7px",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  transition: "all 0.15s ease",
                                }}
                                title="Edit Schedule"
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
                                  padding: "6px 8px",
                                  borderRadius: "7px",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  transition: "all 0.15s ease",
                                }}
                                title="Clone as Template"
                              >
                                <Copy size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteFeeStructure(item._id)}
                                style={{
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  color: "#dc2626",
                                  padding: "6px 8px",
                                  borderRadius: "7px",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  transition: "all 0.15s ease",
                                }}
                                title="Delete Record"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12.5px",
            color: "#64748b"
          }}
        >
          <span>
            Showing <strong>{filteredStructures.length}</strong> of <strong>{feeStructuresList.length}</strong> total fee schedules
          </span>
          <span style={{ fontWeight: "700", color: "#059669", display: "flex", alignItems: "center", gap: "5px" }}>
            <CheckCircle2 size={14} />
            ERP Real-time Synced
          </span>
        </div>
      </div>

      {/* ── Zero-Scroll 3-Column ERP Configurator Modal Dialog ── */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "1150px",
              background: "#ffffff",
              borderRadius: "18px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 24px",
                background: editingFee ? "linear-gradient(135deg, #065f46, #047857)" : "linear-gradient(135deg, #1e3a8a, #2563eb)",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ background: "rgba(255,255,255,0.2)", padding: "8px", borderRadius: "10px" }}>
                  {editingFee ? <Edit3 size={20} color="#ffffff" /> : <Sliders size={20} color="#ffffff" />}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "17.5px", fontWeight: "800", color: "#ffffff" }}>
                    {editingFee ? "Modify Fee Structure Schedule" : "Define New Fee Structure Schedule"}
                  </h2>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)" }}>
                    {editingFee ? "Updating baseline tariff rates for this degree program" : "Configure baseline tariffs and itemized breakdown without scrolling"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setEditingFee(null);
                }}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  color: "#ffffff",
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: 3-Column Zero-Scroll Layout */}
            <form onSubmit={handleSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.15fr 1.15fr", gap: "20px", alignItems: "stretch" }}>
                
                {/* ── Column 1: Academic & Program Mapping + Live Summary Card ── */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px", fontWeight: "800", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                      <GraduationCap size={14} />
                      <span>1. Academic Mapping</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      {/* Academic Year */}
                      <div>
                        <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "3px" }}>
                          Academic Year <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <select
                          name="academicYear"
                          value={form.academicYear}
                          onChange={handleChange}
                          style={{
                            width: "100%",
                            padding: "7px 9px",
                            borderRadius: "7px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12.5px",
                            background: "#ffffff",
                            outline: "none",
                            color: "#1e293b",
                            fontWeight: "600"
                          }}
                          required
                        >
                          {ACADEMIC_YEARS.map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      {/* Semester */}
                      <div>
                        <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "3px" }}>
                          Semester <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <select
                          name="semester"
                          value={form.semester}
                          onChange={handleChange}
                          style={{
                            width: "100%",
                            padding: "7px 9px",
                            borderRadius: "7px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12.5px",
                            background: "#ffffff",
                            outline: "none",
                            color: "#1e293b",
                            fontWeight: "600"
                          }}
                          required
                        >
                          {SEMESTER_OPTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Department */}
                    <div>
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "3px" }}>
                        Department <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        name="department"
                        value={form.department}
                        onChange={handleDepartmentChange}
                        style={{
                          width: "100%",
                          padding: "7px 9px",
                          borderRadius: "7px",
                          border: "1px solid #cbd5e1",
                          fontSize: "12.5px",
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
                      <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#334155", marginBottom: "3px" }}>
                        Course / Program <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <select
                        name="course"
                        value={form.course}
                        onChange={handleCourseChange}
                        style={{
                          width: "100%",
                          padding: "7px 9px",
                          borderRadius: "7px",
                          border: "1px solid #cbd5e1",
                          fontSize: "12.5px",
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

                  {/* Live Total Badge Card */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, #065f46 0%, #047857 100%)",
                      borderRadius: "12px",
                      padding: "14px 16px",
                      color: "#ffffff",
                      marginTop: "14px",
                      boxShadow: "0 4px 12px rgba(5, 150, 105, 0.2)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "700", color: "#a7f3d0" }}>
                        Computed Base Tariff
                      </span>
                      <Award size={18} color="#a7f3d0" />
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: "900", color: "#ffffff", marginTop: "2px" }}>
                      ₹{formGrandTotal.toLocaleString("en-IN")}
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#d1fae5", marginTop: "2px" }}>
                      {activeComponentsCount} Active Components
                    </div>
                  </div>
                </div>

                {/* ── Column 2: Core Academic & Tuition Components ── */}
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "800", color: "#1e40af", display: "flex", alignItems: "center", gap: "5px" }}>
                      <Bookmark size={14} />
                      2. Core Academic Fees
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#1e40af", background: "#eff6ff", padding: "2px 7px", borderRadius: "6px" }}>
                      Subtotal: ₹{formCoreTotal.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Tuition Fee (Mandatory) */}
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: "700", color: "#0f172a", marginBottom: "3px" }}>
                      Tuition Fee (₹) <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "9px", top: "7px", color: "#2563eb", fontWeight: "700", fontSize: "12px" }}>₹</span>
                      <input
                        type="number"
                        min="0"
                        name="tuitionFee"
                        value={form.tuitionFee}
                        onChange={handleChange}
                        placeholder="e.g. 35000"
                        required
                        style={{
                          width: "100%",
                          padding: "7px 10px 7px 24px",
                          borderRadius: "7px",
                          border: "1.5px solid #93c5fd",
                          fontSize: "13px",
                          outline: "none",
                          boxSizing: "border-box",
                          fontWeight: "700",
                          color: "#1e3a8a",
                          background: "#f0f7ff"
                        }}
                      />
                    </div>
                  </div>

                  {/* Admission Fee */}
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "3px" }}>
                      Admission & Processing Fee (₹)
                    </label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "9px", top: "7px", color: "#94a3b8", fontWeight: "600", fontSize: "12px" }}>₹</span>
                      <input
                        type="number"
                        min="0"
                        name="admissionFee"
                        value={form.admissionFee}
                        onChange={handleChange}
                        placeholder="0"
                        style={{ width: "100%", padding: "7px 10px 7px 24px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "12.5px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                      />
                    </div>
                  </div>

                  {/* University Fee */}
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "3px" }}>
                      University / Exam Affiliation (₹)
                    </label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "9px", top: "7px", color: "#94a3b8", fontWeight: "600", fontSize: "12px" }}>₹</span>
                      <input
                        type="number"
                        min="0"
                        name="universityFee"
                        value={form.universityFee}
                        onChange={handleChange}
                        placeholder="0"
                        style={{ width: "100%", padding: "7px 10px 7px 24px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "12.5px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                      />
                    </div>
                  </div>

                  {/* Marksheet Verification */}
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "3px" }}>
                      Marksheet & Doc Verification (₹)
                    </label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "9px", top: "7px", color: "#94a3b8", fontWeight: "600", fontSize: "12px" }}>₹</span>
                      <input
                        type="number"
                        min="0"
                        name="marksheetVerification"
                        value={form.marksheetVerification}
                        onChange={handleChange}
                        placeholder="0"
                        style={{ width: "100%", padding: "7px 10px 7px 24px", borderRadius: "7px", border: "1px solid #cbd5e1", fontSize: "12.5px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Column 3: Labs, Facilities & Amenities ── */}
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "9px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "800", color: "#0f766e", display: "flex", alignItems: "center", gap: "5px" }}>
                      <Cpu size={14} />
                      3. Labs & Amenities
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#0f766e", background: "#f0fdfa", padding: "2px 7px", borderRadius: "6px" }}>
                      Subtotal: ₹{(formLabTotal + formAmenitiesTotal).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {/* Special Lab */}
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "2px" }}>
                        Special Lab (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        name="specialFee"
                        value={form.specialFee}
                        onChange={handleChange}
                        placeholder="0"
                        style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                      />
                    </div>

                    {/* Computer Lab */}
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "2px" }}>
                        Computer Lab (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        name="computerLab"
                        value={form.computerLab}
                        onChange={handleChange}
                        placeholder="0"
                        style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                      />
                    </div>

                    {/* English / NSS */}
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "2px" }}>
                        English Lab & NSS / ID Card (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        name="englishLabNssId"
                        value={form.englishLabNssId}
                        onChange={handleChange}
                        placeholder="0"
                        style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                      />
                    </div>

                    {/* Stationery */}
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "2px" }}>
                        Stationery / Kit (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        name="stationary"
                        value={form.stationary}
                        onChange={handleChange}
                        placeholder="0"
                        style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                      />
                    </div>

                    {/* PTA */}
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "2px" }}>
                        PTA Fee (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        name="pta"
                        value={form.pta}
                        onChange={handleChange}
                        placeholder="0"
                        style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                      />
                    </div>

                    {/* Other Fee */}
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "2px" }}>
                        Other Institutional Amenities (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        name="otherFee"
                        value={form.otherFee}
                        onChange={handleChange}
                        placeholder="0"
                        style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none", boxSizing: "border-box", fontWeight: "600", color: "#0f172a" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer / Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: "12px",
                  paddingTop: "14px",
                  borderTop: "1px solid #e2e8f0"
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    setEditingFee(null);
                  }}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "8px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "10px 22px",
                    borderRadius: "8px",
                    background: editingFee
                      ? "linear-gradient(135deg, #059669, #047857)"
                      : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: "700",
                    fontSize: "13.5px",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)"
                  }}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={15} className="spin" />
                      Saving Schedule...
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      {editingFee ? "Update Schedule" : "Save Schedule"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Fee Breakdown Detail Inspector Modal ── */}
      {selectedDetailFee && (() => {
        const breakdown = extractBreakdownFromFee(selectedDetailFee);
        const matchedCourse = coursesList.find(
          (c) => String(c._id) === String(selectedDetailFee.course) || String(c.id) === String(selectedDetailFee.course) || c.name === selectedDetailFee.course || c.courseName === selectedDetailFee.course
        );
        const courseTitle = typeof selectedDetailFee.course === "object"
          ? (selectedDetailFee.course?.name || selectedDetailFee.course?.courseName)
          : (matchedCourse?.name || matchedCourse?.courseName || selectedDetailFee.course);
        const deptTitle = selectedDetailFee.department || matchedCourse?.department || "General";

        return (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(15, 23, 42, 0.6)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px"
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "700px",
                background: "#ffffff",
                borderRadius: "18px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                maxHeight: "90vh"
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "20px 24px",
                  background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
                  color: "#ffffff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ background: "rgba(255,255,255,0.2)", padding: "9px", borderRadius: "10px" }}>
                    <Layers3 size={22} color="#ffffff" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#ffffff" }}>
                      {courseTitle}
                    </h2>
                    <span style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.85)" }}>
                      {deptTitle} • {selectedDetailFee.academicYear} • Sem {selectedDetailFee.semester || 1}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDetailFee(null)}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    color: "#ffffff",
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
                {/* Meta summary badges */}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
                  <span style={{ background: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", padding: "6px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: "700" }}>
                    Total Base Tariff: ₹{Number(breakdown.total).toLocaleString("en-IN")}
                  </span>
                  <span style={{ background: "#f8fafc", padding: "6px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", color: "#475569", border: "1px solid #e2e8f0" }}>
                    Tuition Fee: ₹{Number(breakdown.tuitionFee).toLocaleString("en-IN")}
                  </span>
                  <span style={{ background: "#f8fafc", padding: "6px 12px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", color: "#475569", border: "1px solid #e2e8f0" }}>
                    Institutional Facilities: ₹{Number(breakdown.total - breakdown.tuitionFee).toLocaleString("en-IN")}
                  </span>
                </div>

                {/* 10 Breakdown Items Table */}
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "10px 16px", textAlign: "left", color: "#475569", fontWeight: "700", textTransform: "uppercase", fontSize: "11.5px" }}>#</th>
                        <th style={{ padding: "10px 16px", textAlign: "left", color: "#475569", fontWeight: "700", textTransform: "uppercase", fontSize: "11.5px" }}>Fee Component</th>
                        <th style={{ padding: "10px 16px", textAlign: "right", color: "#475569", fontWeight: "700", textTransform: "uppercase", fontSize: "11.5px" }}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Tuition Fee (Core Academic)", val: breakdown.tuitionFee, highlight: true },
                        { label: "Admission & Application Processing Fee", val: breakdown.admissionFee },
                        { label: "University & Exam Affiliation Fee", val: breakdown.universityFee },
                        { label: "Marksheet & Certificate Verification", val: breakdown.marksheetVerification },
                        { label: "Special / Practical Lab Equipment Fee", val: breakdown.specialFee },
                        { label: "Computer Systems & Software Lab Access", val: breakdown.computerLab },
                        { label: "English Language Lab & NSS / ID Card", val: breakdown.englishLabNssId },
                        { label: "Stationery & Academic Syllabus Kit", val: breakdown.stationary },
                        { label: "Parent Teacher Association (PTA)", val: breakdown.pta },
                        { label: "Other Institutional Amenities", val: breakdown.otherFee },
                      ].map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 1 ? "#fafafa" : "#ffffff" }}>
                          <td style={{ padding: "10px 16px", color: "#64748b", fontWeight: "600", width: "40px" }}>{idx + 1}</td>
                          <td style={{ padding: "10px 16px", color: item.highlight ? "#1e40af" : "#1e293b", fontWeight: item.highlight ? "800" : "500" }}>{item.label}</td>
                          <td style={{ padding: "10px 16px", textAlign: "right", color: "#0f172a", fontWeight: "700" }}>₹{Number(item.val || 0).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                      <tr style={{ background: "#f0fdf4", borderTop: "2px solid #86efac" }}>
                        <td style={{ padding: "13px 16px" }}></td>
                        <td style={{ padding: "13px 16px", color: "#166534", fontWeight: "900", fontSize: "14.5px" }}>Total Baseline Academic Tariff</td>
                        <td style={{ padding: "13px 16px", textAlign: "right", color: "#15803d", fontWeight: "900", fontSize: "16px" }}>₹{Number(breakdown.total).toLocaleString("en-IN")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: "16px 24px",
                  background: "#f8fafc",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "flex-end"
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedDetailFee(null)}
                  style={{
                    padding: "9px 22px",
                    borderRadius: "8px",
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  Close Ledger
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
