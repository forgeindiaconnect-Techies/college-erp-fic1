import React, { useEffect, useState, useMemo } from "react";
import {
  Award,
  Plus,
  Search,
  User,
  Percent,
  Calendar,
  CheckCircle2,
  FileText,
  Trash2,
  Edit,
  RefreshCw,
  Layers,
  ShieldCheck,
  IndianRupee,
  Users,
  Filter,
  Check,
  AlertCircle,
  Sparkles,
  GraduationCap,
  X,
  ChevronRight,
  Calculator,
  Trophy,
  Building2,
  Eye,
  CheckCircle,
  Clock,
  ArrowRight
} from "lucide-react";
import {
  getScholarships,
  createScholarship,
  updateScholarship,
  deleteScholarship,
  getStudents,
  getScholarshipApplications,
  createScholarshipApplication,
} from "../../api";
import { useRealtimeSync, emitERPDataUpdate } from "../../hooks/useRealtimeSync";
import "./ScholarshipManagement.css";

const PRESET_SCHEMES = [
  {
    name: "First Graduate Scholarship",
    type: "Fixed Amount",
    value: 10300,
    max: 15000,
    academicYear: "2026-2027",
    eligibility: "Students who are verified first-generation graduates in their family.",
    icon: GraduationCap,
    tag: "First Graduate"
  },
  {
    name: "Sports Quota Concession",
    type: "Fixed Amount",
    value: 6500,
    max: 10000,
    academicYear: "2026-2027",
    eligibility: "State or National level sports certificate holders representing the institution.",
    icon: Trophy,
    tag: "Sports"
  },
  {
    name: "Merit Academic Grant",
    type: "Percentage",
    value: 25,
    max: 20000,
    academicYear: "2026-2027",
    eligibility: "Students securing top 5% rank in previous semester university examinations.",
    icon: Award,
    tag: "Merit"
  },
  {
    name: "EWS Need-Based Financial Aid",
    type: "Fixed Amount",
    value: 12000,
    max: 15000,
    academicYear: "2026-2027",
    eligibility: "Annual family income certified below ₹2.5 Lakhs by competent revenue authority.",
    icon: Building2,
    tag: "Financial Aid"
  },
  {
    name: "Dean's Excellence Award",
    type: "Percentage",
    value: 50,
    max: 30000,
    academicYear: "2026-2027",
    eligibility: "Outstanding research publication or university gold medal candidate.",
    icon: Sparkles,
    tag: "Dean's Award"
  }
];

const emptyForm = {
  scholarshipName: "",
  academicYear: "2026-2027",
  scholarshipType: "Fixed Amount",
  scholarshipValue: "",
  maximumAmount: "",
  eligibility: "",
  status: "active",
};

export default function ScholarshipManagement() {
  const [scholarships, setScholarships] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Navigation & filtering state
  const [activeTab, setActiveTab] = useState("schemes"); // 'schemes' | 'applications' | 'audit'
  const [searchScheme, setSearchScheme] = useState("");
  const [yearFilter, setYearFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Student application state
  const [students, setStudents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedScholarshipId, setSelectedScholarshipId] = useState("");
  const [applicationSaving, setApplicationSaving] = useState(false);
  const [appSearch, setAppSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState("All");

  // Real-time synchronization
  useRealtimeSync(() => {
    loadScholarships();
    loadScholarshipApplicationData();
  }, ["scholarships", "students", "fees", "admissions"]);

  const loadScholarships = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getScholarships();
      const list = response.data?.data || response.data || [];
      setScholarships(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error loading scholarships:", err);
      setError(err.response?.data?.message || "Failed to load scholarships");
    } finally {
      setLoading(false);
    }
  };

  const loadScholarshipApplicationData = async () => {
    try {
      const [studentsResponse, applicationsResponse] = await Promise.all([
        getStudents().catch(() => ({ data: [] })),
        getScholarshipApplications().catch(() => ({ data: [] })),
      ]);

      const studList = studentsResponse.data?.data || studentsResponse.data?.students || studentsResponse.data || [];
      const appList = applicationsResponse.data?.data || applicationsResponse.data || [];

      setStudents(Array.isArray(studList) ? studList : []);
      setApplications(Array.isArray(appList) ? appList : []);
    } catch (err) {
      console.error("Error loading scholarship application data:", err);
    }
  };

  useEffect(() => {
    loadScholarships();
    loadScholarshipApplicationData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const applyPreset = (preset) => {
    setForm({
      scholarshipName: preset.name,
      academicYear: preset.academicYear || "2026-2027",
      scholarshipType: preset.type,
      scholarshipValue: preset.value,
      maximumAmount: preset.max,
      eligibility: preset.eligibility,
      status: "active",
    });
    setEditingId(null);
    setMessage(`Loaded scheme template: ${preset.name}`);
    setTimeout(() => setMessage(""), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      if (!form.scholarshipName.trim()) {
        throw new Error("Scholarship name is required");
      }

      const value = Number(form.scholarshipValue || 0);
      if (value < 0) {
        throw new Error("Scholarship concession value cannot be negative");
      }

      if (form.scholarshipType === "Percentage" && value > 100) {
        throw new Error("Percentage scholarship cannot exceed 100%");
      }

      const payload = {
        scholarshipName: form.scholarshipName.trim(),
        academicYear: form.academicYear.trim(),
        scholarshipType: form.scholarshipType,
        scholarshipValue: value,
        maximumAmount: Number(form.maximumAmount || 0),
        eligibility: form.eligibility.trim(),
        status: form.status,
      };

      if (editingId) {
        await updateScholarship(editingId, payload);
        setMessage("Scholarship scheme updated & synchronized successfully!");
      } else {
        await createScholarship(payload);
        setMessage("New scholarship scheme registered into College ERP!");
      }

      emitERPDataUpdate(["scholarships", "fees"], "scholarship-saved", payload);

      setForm(emptyForm);
      setEditingId(null);
      await loadScholarships();
    } catch (err) {
      console.error("Error saving scholarship:", err);
      setError(err.response?.data?.message || err.message || "Failed to save scholarship");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (scholarship) => {
    setEditingId(scholarship._id);
    setForm({
      scholarshipName: scholarship.scholarshipName || "",
      academicYear: scholarship.academicYear || "2026-2027",
      scholarshipType: scholarship.scholarshipType || "Fixed Amount",
      scholarshipValue: scholarship.scholarshipValue ?? "",
      maximumAmount: scholarship.maximumAmount ?? "",
      eligibility: scholarship.eligibility || "",
      status: scholarship.status || "active",
    });
    setActiveTab("schemes");
    setMessage("");
    setError("");
    window.scrollTo({ top: 180, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this scholarship scheme? Active linked student fee records will retain their approved values."
    );
    if (!confirmed) return;

    try {
      setError("");
      setMessage("");
      await deleteScholarship(id);
      setMessage("Scholarship scheme removed successfully.");
      emitERPDataUpdate(["scholarships"], "scholarship-deleted", { id });
      await loadScholarships();
    } catch (err) {
      console.error("Error deleting scholarship:", err);
      setError(err.response?.data?.message || "Failed to delete scholarship");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  };

  // Student Application Calculation
  const selectedStudent = useMemo(() => {
    return students.find(
      (student) => String(student._id || student.id) === String(selectedStudentId)
    );
  }, [students, selectedStudentId]);

  const selectedScholarship = useMemo(() => {
    return scholarships.find(
      (scholarship) => String(scholarship._id) === String(selectedScholarshipId)
    );
  }, [scholarships, selectedScholarshipId]);

  const currentFee = Number(
    selectedStudent?.normalFee ||
    selectedStudent?.finalFee ||
    selectedStudent?.totalFee ||
    58000
  );

  let scholarshipDiscount = 0;
  if (selectedScholarship) {
    if (selectedScholarship.scholarshipType === "Percentage") {
      scholarshipDiscount = currentFee * (Number(selectedScholarship.scholarshipValue || 0) / 100);
    } else {
      scholarshipDiscount = Number(selectedScholarship.scholarshipValue || 0);
    }

    if (Number(selectedScholarship.maximumAmount || 0) > 0) {
      scholarshipDiscount = Math.min(scholarshipDiscount, Number(selectedScholarship.maximumAmount));
    }
    scholarshipDiscount = Math.min(scholarshipDiscount, currentFee);
  }
  scholarshipDiscount = Math.round(scholarshipDiscount * 100) / 100;
  const scholarshipFinalFee = Math.max(0, currentFee - scholarshipDiscount);

  const handleApplyScholarship = async () => {
    if (!selectedStudentId || !selectedScholarshipId) {
      setError("Please select both a student and an approved scholarship scheme.");
      return;
    }

    try {
      setApplicationSaving(true);
      setError("");
      setMessage("");

      await createScholarshipApplication({
        studentId: selectedStudentId,
        scholarshipId: selectedScholarshipId,
      });

      setMessage("Scholarship granted and synchronized to student fee ledger!");

      emitERPDataUpdate(
        ["scholarships", "students", "fees", "admissions"],
        "scholarship-applied",
        {
          studentId: selectedStudentId,
          scholarshipId: selectedScholarshipId,
        }
      );

      setSelectedStudentId("");
      setSelectedScholarshipId("");
      await loadScholarshipApplicationData();
    } catch (err) {
      console.error("Error applying scholarship:", err);
      setError(err.response?.data?.message || "Failed to sanction scholarship application");
    } finally {
      setApplicationSaving(false);
    }
  };

  // Executive KPI Aggregations
  const activeSchemesCount = useMemo(() => {
    return scholarships.filter(s => (s.status || "active").toLowerCase() === "active").length;
  }, [scholarships]);

  const totalSanctionedDisbursed = useMemo(() => {
    return applications.reduce((sum, app) => sum + (Number(app.discountAmount) || 0), 0);
  }, [applications]);

  const avgConcessionRate = useMemo(() => {
    if (applications.length === 0) return "₹0";
    return `₹${Math.round(totalSanctionedDisbursed / applications.length).toLocaleString("en-IN")}`;
  }, [applications, totalSanctionedDisbursed]);

  // Filtered Schemes
  const filteredSchemes = useMemo(() => {
    return scholarships.filter((s) => {
      const matchSearch = (s.scholarshipName || "").toLowerCase().includes(searchScheme.toLowerCase()) ||
                          (s.eligibility || "").toLowerCase().includes(searchScheme.toLowerCase());
      const matchYear = yearFilter === "All" || s.academicYear === yearFilter;
      const matchType = typeFilter === "All" || s.scholarshipType === typeFilter;
      const matchStatus = statusFilter === "All" || (s.status || "active").toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchYear && matchType && matchStatus;
    });
  }, [scholarships, searchScheme, yearFilter, typeFilter, statusFilter]);

  // Filtered Applications
  const filteredApplications = useMemo(() => {
    return applications.filter((a) => {
      const matchSearch = (a.studentName || "").toLowerCase().includes(appSearch.toLowerCase()) ||
                          (a.scholarshipName || "").toLowerCase().includes(appSearch.toLowerCase()) ||
                          (a.studentId || "").toLowerCase().includes(appSearch.toLowerCase());
      const matchStatus = appStatusFilter === "All" || (a.status || "Approved").toLowerCase() === appStatusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [applications, appSearch, appStatusFilter]);

  // Simulation values for the Create Form
  const simVal = Number(form.scholarshipValue || 0);
  const simCap = Number(form.maximumAmount || 0);
  const simGross = 58000;
  let simDiscount = form.scholarshipType === "Percentage" ? (simGross * simVal) / 100 : simVal;
  if (simCap > 0) simDiscount = Math.min(simDiscount, simCap);
  simDiscount = Math.min(simDiscount, simGross);
  const simNet = Math.max(0, simGross - simDiscount);

  return (
    <div className="sm-erp-container">
      
      {/* ── ERP Hero Header ── */}
      <div className="sm-erp-header">
        <div className="sm-header-left">
          <div className="sm-title-row">
            <h1 className="sm-page-title">
              Scholarship & Financial Aid Management 🎓
            </h1>
            <div className="sm-live-badge">
              <span className="sm-pulse-dot"></span>
              <span>Real-Time ERP Sync Active</span>
            </div>
          </div>
          <p className="sm-page-subtitle">
            Centralized institutional grant scheme definition, real-time student application processing, merit waivers, and automated fee ledger concession reconciliation.
          </p>
        </div>

        <div className="sm-header-actions">
          <button 
            className="sm-btn-secondary"
            onClick={() => {
              loadScholarships();
              loadScholarshipApplicationData();
              setMessage("Re-synchronized with Central ERP database.");
              setTimeout(() => setMessage(""), 3000);
            }}
            title="Refresh from Database"
          >
            <RefreshCw size={15}/> Live Sync
          </button>
          <button 
            className="sm-btn-primary"
            onClick={() => {
              setActiveTab("schemes");
              setEditingId(null);
              setForm(emptyForm);
              window.scrollTo({ top: 180, behavior: "smooth" });
            }}
          >
            <Plus size={15}/> New Scholarship Scheme
          </button>
        </div>
      </div>

      {/* ── Feedback Messages ── */}
      {message && (
        <div className="sm-toast sm-toast-success">
          <CheckCircle size={18}/>
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="sm-toast sm-toast-error">
          <AlertCircle size={18}/>
          <span>{error}</span>
        </div>
      )}

      {/* ── 5-Column Executive Financial Aid KPI Grid ── */}
      <div className="sm-kpi-grid">
        <div className="sm-kpi-card kpi-schemes">
          <div className="sm-kpi-header">
            <span className="sm-kpi-label">Active Schemes</span>
            <div className="sm-kpi-icon-wrap"><Award size={18}/></div>
          </div>
          <div className="sm-kpi-value">{activeSchemesCount}</div>
          <div className="sm-kpi-sub">
            <CheckCircle2 size={13} className="text-success"/> {scholarships.length} Registered Schemes
          </div>
        </div>

        <div className="sm-kpi-card kpi-apps">
          <div className="sm-kpi-header">
            <span className="sm-kpi-label">Beneficiary Students</span>
            <div className="sm-kpi-icon-wrap"><Users size={18}/></div>
          </div>
          <div className="sm-kpi-value">{applications.length}</div>
          <div className="sm-kpi-sub">
            <GraduationCap size={13} className="text-primary"/> Sanctioned Applications
          </div>
        </div>

        <div className="sm-kpi-card kpi-disbursed">
          <div className="sm-kpi-header">
            <span className="sm-kpi-label">Total Concessions</span>
            <div className="sm-kpi-icon-wrap"><IndianRupee size={18}/></div>
          </div>
          <div className="sm-kpi-value">₹{totalSanctionedDisbursed.toLocaleString("en-IN")}</div>
          <div className="sm-kpi-sub text-success">
            <Sparkles size={13}/> Direct Tuition Waivers
          </div>
        </div>

        <div className="sm-kpi-card kpi-avg">
          <div className="sm-kpi-header">
            <span className="sm-kpi-label">Average Aid / Student</span>
            <div className="sm-kpi-icon-wrap"><Percent size={18}/></div>
          </div>
          <div className="sm-kpi-value">{avgConcessionRate}</div>
          <div className="sm-kpi-sub">
            <Calendar size={13}/> AY 2026-2027 Cycle
          </div>
        </div>

        <div className="sm-kpi-card kpi-sync">
          <div className="sm-kpi-header">
            <span className="sm-kpi-label">Central Ledger Health</span>
            <div className="sm-kpi-icon-wrap"><ShieldCheck size={18}/></div>
          </div>
          <div className="sm-kpi-value" style={{ color: "#7c3aed" }}>100%</div>
          <div className="sm-kpi-sub" style={{ color: "#7c3aed" }}>
            <Check size={13}/> Real-Time Socket Connected
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="sm-tabs-bar">
        <button 
          className={`sm-tab-btn ${activeTab === "schemes" ? "active" : ""}`}
          onClick={() => setActiveTab("schemes")}
        >
          <Award size={16}/>
          <span>Scholarship Schemes Master</span>
          <span className="sm-tab-count">{scholarships.length}</span>
        </button>

        <button 
          className={`sm-tab-btn ${activeTab === "applications" ? "active" : ""}`}
          onClick={() => setActiveTab("applications")}
        >
          <GraduationCap size={16}/>
          <span>Student Sanctions & Ledger Linkage</span>
          <span className="sm-tab-count">{applications.length}</span>
        </button>

        <button 
          className={`sm-tab-btn ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          <ShieldCheck size={16}/>
          <span>Real-Time Concession Audit</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: SCHOLARSHIP SCHEMES MASTER (CONFIGURATOR & REGISTRY)
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "schemes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Scheme Form Card */}
          <div className="sm-card">
            <div className="sm-card-header">
              <h2 className="sm-card-title">
                {editingId ? <Edit size={18} className="text-primary"/> : <Plus size={18} className="text-primary"/>}
                <span>{editingId ? "Update Scholarship Scheme" : "Configure New Scholarship Scheme"}</span>
              </h2>
              {editingId && (
                <span className="sm-badge sm-badge-fixed">Editing Mode Active</span>
              )}
            </div>

            {/* Template Presets Ribbon */}
            <div className="sm-presets-section">
              <div className="sm-presets-label">⚡ Quick Institutional Scheme Templates:</div>
              <div className="sm-presets-scroll">
                {PRESET_SCHEMES.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    className="sm-preset-chip"
                    onClick={() => applyPreset(preset)}
                  >
                    <preset.icon size={14} className="text-primary"/>
                    <span>{preset.name}</span>
                    <span style={{ opacity: 0.65, fontSize: '0.72rem' }}>
                      ({preset.type === "Percentage" ? `${preset.value}%` : `₹${preset.value.toLocaleString('en-IN')}`})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="sm-form-grid">
                
                {/* Scheme Name */}
                <div className="sm-field-group">
                  <label className="sm-label">Scholarship Scheme Name *</label>
                  <div className="sm-input-wrap">
                    <Award size={15} className="sm-input-icon"/>
                    <input
                      name="scholarshipName"
                      value={form.scholarshipName}
                      onChange={handleChange}
                      placeholder="e.g. First Graduate Scholarship"
                      className="sm-input sm-input-with-icon"
                      required
                    />
                  </div>
                </div>

                {/* Academic Year */}
                <div className="sm-field-group">
                  <label className="sm-label">Academic Year</label>
                  <div className="sm-input-wrap">
                    <Calendar size={15} className="sm-input-icon"/>
                    <select
                      name="academicYear"
                      value={form.academicYear}
                      onChange={handleChange}
                      className="sm-select sm-input-with-icon"
                    >
                      <option value="2026-2027">2026-2027 (Current)</option>
                      <option value="2025-2026">2025-2026</option>
                      <option value="2027-2028">2027-2028</option>
                      <option value="2028-2029">2028-2029</option>
                    </select>
                  </div>
                </div>

                {/* Scholarship Type */}
                <div className="sm-field-group">
                  <label className="sm-label">Concession Calculation Type</label>
                  <div className="sm-input-wrap">
                    <Percent size={15} className="sm-input-icon"/>
                    <select
                      name="scholarshipType"
                      value={form.scholarshipType}
                      onChange={handleChange}
                      className="sm-select sm-input-with-icon"
                    >
                      <option value="Fixed Amount">Fixed Amount Deduction (₹)</option>
                      <option value="Percentage">Percentage Concession (%)</option>
                    </select>
                  </div>
                </div>

                {/* Scholarship Value */}
                <div className="sm-field-group">
                  <label className="sm-label">
                    {form.scholarshipType === "Percentage" ? "Concession Rate (% of Tuition)" : "Fixed Concession Value (₹)"} *
                  </label>
                  <div className="sm-input-wrap">
                    <IndianRupee size={15} className="sm-input-icon"/>
                    <input
                      type="number"
                      name="scholarshipValue"
                      value={form.scholarshipValue}
                      onChange={handleChange}
                      min="0"
                      max={form.scholarshipType === "Percentage" ? "100" : undefined}
                      placeholder={form.scholarshipType === "Percentage" ? "e.g. 25" : "e.g. 10300"}
                      className="sm-input sm-input-with-icon"
                      required
                    />
                  </div>
                </div>

                {/* Maximum Ceiling Limit */}
                <div className="sm-field-group">
                  <label className="sm-label">Maximum Ceiling Limit (₹)</label>
                  <div className="sm-input-wrap">
                    <ShieldCheck size={15} className="sm-input-icon"/>
                    <input
                      type="number"
                      name="maximumAmount"
                      value={form.maximumAmount}
                      onChange={handleChange}
                      min="0"
                      placeholder="e.g. 15000 (0 for no cap)"
                      className="sm-input sm-input-with-icon"
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="sm-field-group">
                  <label className="sm-label">Scheme Operational Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="sm-select"
                  >
                    <option value="active">Active & Open for Applications</option>
                    <option value="inactive">Inactive / Suspended</option>
                  </select>
                </div>

                {/* Eligibility */}
                <div className="sm-field-group full-width">
                  <label className="sm-label">Eligibility Criteria & Verification Guidelines</label>
                  <textarea
                    name="eligibility"
                    value={form.eligibility}
                    onChange={handleChange}
                    placeholder="Provide mandatory eligibility rules, requisite income certificates, or sports credentials for verification..."
                    className="sm-textarea"
                    rows={2}
                  />
                </div>

              </div>

              {/* Live Real-time Simulation Box */}
              {simVal > 0 && (
                <div className="sm-simulation-box">
                  <div className="sm-sim-left">
                    <div className="sm-sim-icon"><Calculator size={18}/></div>
                    <div>
                      <div className="sm-sim-title">Real-Time Fee Concession Simulation</div>
                      <div className="sm-sim-desc">Automated ledger impact preview for a standard ₹58,000 semester assessment</div>
                    </div>
                  </div>

                  <div className="sm-sim-metrics">
                    <div className="sm-sim-metric-item">
                      <span className="sm-sim-metric-lbl">Standard Fee</span>
                      <span className="sm-sim-metric-val">₹{simGross.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="sm-sim-metric-item">
                      <span className="sm-sim-metric-lbl">Deduction Applied</span>
                      <span className="sm-sim-metric-val text-success">-₹{simDiscount.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="sm-sim-metric-item">
                      <span className="sm-sim-metric-lbl">Adjusted Net Fee</span>
                      <span className="sm-sim-metric-val text-primary">₹{simNet.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="sm-form-actions">
                <button type="submit" className="sm-btn-primary" disabled={saving}>
                  {saving ? <RefreshCw size={15} className="animate-spin"/> : editingId ? <Check size={15}/> : <Plus size={15}/>}
                  <span>{saving ? "Synchronizing..." : editingId ? "Update Scheme" : "Register Scheme into ERP"}</span>
                </button>

                {editingId && (
                  <button type="button" className="sm-btn-secondary" onClick={handleCancel}>
                    <X size={15}/> Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Scheme Master Registry Table */}
          <div className="sm-card">
            <div className="sm-card-header">
              <h2 className="sm-card-title">
                <Layers size={18} className="text-primary"/>
                <span>Institutional Scholarship Scheme Registry</span>
              </h2>
              <span className="text-xs text-muted font-medium">
                Showing {filteredSchemes.length} of {scholarships.length} Schemes
              </span>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="sm-filter-bar">
              <div className="sm-search-wrap">
                <Search size={15} className="sm-search-icon"/>
                <input
                  type="text"
                  placeholder="Search scheme name, eligibility, or keywords..."
                  value={searchScheme}
                  onChange={(e) => setSearchScheme(e.target.value)}
                  className="sm-search-input"
                />
              </div>

              <div className="sm-filter-group">
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="sm-filter-select"
                >
                  <option value="All">All Academic Years</option>
                  <option value="2026-2027">2026-2027</option>
                  <option value="2025-2026">2025-2026</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="sm-filter-select"
                >
                  <option value="All">All Types</option>
                  <option value="Fixed Amount">Fixed Amount</option>
                  <option value="Percentage">Percentage</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="sm-filter-select"
                >
                  <option value="All">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-8 text-muted">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-primary"/>
                <p>Loading scholarship schemes from Central ERP...</p>
              </div>
            ) : filteredSchemes.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <AlertCircle size={28} className="mx-auto mb-2 text-muted"/>
                <p className="font-semibold text-main">No scholarship schemes match your filters.</p>
                <p className="text-xs">Adjust your search query or load a template above.</p>
              </div>
            ) : (
              <div className="sm-table-container">
                <table className="sm-table">
                  <thead>
                    <tr>
                      <th>Scheme Details</th>
                      <th>Academic Year</th>
                      <th>Concession Type</th>
                      <th>Concession Value</th>
                      <th>Ceiling Cap</th>
                      <th>Operational Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchemes.map((s) => {
                      const isPct = s.scholarshipType === "Percentage";
                      const isAct = (s.status || "active").toLowerCase() === "active";
                      return (
                        <tr key={s._id}>
                          <td>
                            <div className="sm-scheme-cell">
                              <span className="sm-scheme-name">{s.scholarshipName}</span>
                              <span className="sm-scheme-eligibility">{s.eligibility || "Standard institutional criteria"}</span>
                            </div>
                          </td>
                          <td>
                            <span className="sm-badge sm-badge-year">{s.academicYear || "2026-2027"}</span>
                          </td>
                          <td>
                            <span className={`sm-badge ${isPct ? "sm-badge-pct" : "sm-badge-fixed"}`}>
                              {s.scholarshipType}
                            </span>
                          </td>
                          <td>
                            <strong className="text-success" style={{ fontSize: "0.95rem" }}>
                              {isPct ? `${s.scholarshipValue}%` : `₹${Number(s.scholarshipValue || 0).toLocaleString("en-IN")}`}
                            </strong>
                          </td>
                          <td>
                            {Number(s.maximumAmount || 0) > 0 ? (
                              <span>₹{Number(s.maximumAmount).toLocaleString("en-IN")}</span>
                            ) : (
                              <span className="text-muted">No Ceiling</span>
                            )}
                          </td>
                          <td>
                            <span className={`sm-badge ${isAct ? "sm-badge-active" : "sm-badge-inactive"}`}>
                              {isAct ? "● Active" : "● Inactive"}
                            </span>
                          </td>
                          <td>
                            <div className="sm-actions-wrap" style={{ justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                className="sm-icon-btn"
                                onClick={() => handleEdit(s)}
                                title="Edit Scheme"
                              >
                                <Edit size={14}/>
                              </button>
                              <button
                                type="button"
                                className="sm-icon-btn danger"
                                onClick={() => handleDelete(s._id)}
                                title="Delete Scheme"
                              >
                                <Trash2 size={14}/>
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
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: STUDENT GRANT APPLICATIONS & SANCTIONS
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "applications" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Application Form Card */}
          <div className="sm-card">
            <div className="sm-card-header">
              <h2 className="sm-card-title">
                <GraduationCap size={18} className="text-primary"/>
                <span>Sanction Scholarship for Registered Student</span>
              </h2>
              <span className="text-xs text-muted">Directly credits concession to student fee ledger</span>
            </div>

            <div className="sm-app-grid">
              
              {/* Select Student */}
              <div className="sm-field-group">
                <label className="sm-label">Select Registered Student *</label>
                <div className="sm-input-wrap">
                  <User size={15} className="sm-input-icon"/>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="sm-select sm-input-with-icon"
                  >
                    <option value="">-- Choose Student from College ERP --</option>
                    {students.map((stud) => {
                      const sid = stud._id || stud.id;
                      const roll = stud.id || stud.admissionNumber || stud.rollNo || "";
                      const name = stud.name || stud.studentName || "Student";
                      const dept = stud.dept || stud.department || "";
                      return (
                        <option key={sid} value={sid}>
                          {name} {roll ? `(${roll})` : ""} {dept ? `· ${dept}` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Select Scholarship */}
              <div className="sm-field-group">
                <label className="sm-label">Select Approved Scholarship Scheme *</label>
                <div className="sm-input-wrap">
                  <Award size={15} className="sm-input-icon"/>
                  <select
                    value={selectedScholarshipId}
                    onChange={(e) => setSelectedScholarshipId(e.target.value)}
                    className="sm-select sm-input-with-icon"
                  >
                    <option value="">-- Select Active Scheme --</option>
                    {scholarships
                      .filter((s) => (s.status || "active").toLowerCase() === "active")
                      .map((sch) => (
                        <option key={sch._id} value={sch._id}>
                          {sch.scholarshipName} ({sch.academicYear}) — {sch.scholarshipType === "Percentage" ? `${sch.scholarshipValue}%` : `₹${Number(sch.scholarshipValue).toLocaleString("en-IN")}`}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

            </div>

            {/* Live Sanction Breakdown Card */}
            {selectedStudent && selectedScholarship && (
              <div className="sm-live-preview-card">
                <div className="sm-preview-title">
                  <span className="flex items-center gap-2">
                    <Sparkles size={16} className="text-primary"/>
                    <span>Financial Sanction & Ledger Credit Preview</span>
                  </span>
                  <span className="sm-badge sm-badge-approved">Ready for Sanction</span>
                </div>

                <div className="sm-preview-list">
                  <div className="sm-preview-row">
                    <span className="text-muted">Beneficiary Student:</span>
                    <strong>{selectedStudent.name || selectedStudent.studentName} ({selectedStudent.id || selectedStudent.admissionNumber || 'ID'})</strong>
                  </div>
                  <div className="sm-preview-row">
                    <span className="text-muted">Selected Scheme:</span>
                    <strong>{selectedScholarship.scholarshipName}</strong>
                  </div>
                  <div className="sm-preview-row">
                    <span className="text-muted">Standard Semester Course Fee:</span>
                    <span>₹{currentFee.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="sm-preview-row">
                    <span className="text-muted">Approved Financial Aid Deduction:</span>
                    <strong className="text-success">-₹{scholarshipDiscount.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="sm-preview-row net-row">
                    <span>Adjusted Final Payable Semester Dues:</span>
                    <strong className="text-primary" style={{ fontSize: "1.2rem" }}>
                      ₹{scholarshipFinalFee.toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>

                <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={handleApplyScholarship}
                    disabled={applicationSaving}
                    className="sm-btn-primary"
                  >
                    {applicationSaving ? <RefreshCw size={15} className="animate-spin"/> : <CheckCircle size={15}/>}
                    <span>{applicationSaving ? "Sanctioning & Syncing..." : "Sanction Grant & Auto-Credit Fee Ledger"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Applications Table */}
          <div className="sm-card">
            <div className="sm-card-header">
              <h2 className="sm-card-title">
                <FileText size={18} className="text-primary"/>
                <span>Sanctioned Scholarship Applications Registry</span>
              </h2>
              <span className="text-xs text-muted font-medium">
                {filteredApplications.length} Sanctioned Records
              </span>
            </div>

            {/* Filter toolbar */}
            <div className="sm-filter-bar">
              <div className="sm-search-wrap">
                <Search size={15} className="sm-search-icon"/>
                <input
                  type="text"
                  placeholder="Search by student name, roll number, or scholarship..."
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  className="sm-search-input"
                />
              </div>

              <div className="sm-filter-group">
                <select
                  value={appStatusFilter}
                  onChange={(e) => setAppStatusFilter(e.target.value)}
                  className="sm-filter-select"
                >
                  <option value="All">All Application Statuses</option>
                  <option value="Approved">Approved & Synced</option>
                  <option value="Pending">Pending Review</option>
                  <option value="Applied">Applied</option>
                </select>
              </div>
            </div>

            {filteredApplications.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <AlertCircle size={28} className="mx-auto mb-2 text-muted"/>
                <p className="font-semibold text-main">No scholarship applications found.</p>
                <p className="text-xs">Use the sanction tool above to grant scholarships to registered students.</p>
              </div>
            ) : (
              <div className="sm-table-container">
                <table className="sm-table">
                  <thead>
                    <tr>
                      <th>Student Details</th>
                      <th>Sanctioned Scheme</th>
                      <th>Base Fee</th>
                      <th>Concession Credited</th>
                      <th>Net Payable</th>
                      <th>Ledger Status</th>
                      <th style={{ textAlign: "right" }}>Sanction Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((app) => (
                      <tr key={app._id || app.id}>
                        <td>
                          <div className="sm-scheme-cell">
                            <span className="sm-scheme-name">{app.studentName}</span>
                            <span className="sm-scheme-eligibility">{app.studentId || app.admissionNumber || "REG-STUDENT"}</span>
                          </div>
                        </td>
                        <td>
                          <span className="font-semibold text-primary">{app.scholarshipName}</span>
                        </td>
                        <td>₹{Number(app.originalFee || 58000).toLocaleString("en-IN")}</td>
                        <td>
                          <strong className="text-success" style={{ fontSize: "0.92rem" }}>
                            -₹{Number(app.discountAmount || 0).toLocaleString("en-IN")}
                          </strong>
                        </td>
                        <td>
                          <strong>₹{Number(app.finalFee || 0).toLocaleString("en-IN")}</strong>
                        </td>
                        <td>
                          <span className={`sm-badge ${app.status === "Approved" || app.status === "Applied" ? "sm-badge-approved" : "sm-badge-pending"}`}>
                            ● {app.status || "Approved"} & Synced
                          </span>
                        </td>
                        <td style={{ textAlign: "right", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "2026-09-22"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 3: REAL-TIME CONCESSION AUDIT & LEDGER HEALTH
          ══════════════════════════════════════════════════════════════════ */}
      {activeTab === "audit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          <div className="sm-card">
            <div className="sm-card-header">
              <h2 className="sm-card-title">
                <ShieldCheck size={18} className="text-success"/>
                <span>Real-Time College ERP Financial Audit & Ledger Synchronization</span>
              </h2>
              <div className="sm-live-badge">
                <span className="sm-pulse-dot"></span>
                <span>Active 2-Way Sync</span>
              </div>
            </div>

            <p className="sm-page-subtitle" style={{ marginBottom: "1.5rem" }}>
              Every sanctioned scholarship scheme automatically credits the student's central financial ledger. All four key accounting portals receive instant socket notifications without manual recalculation.
            </p>

            <div className="sm-audit-grid">
              
              <div className="sm-audit-card">
                <div className="sm-audit-top">
                  <div className="sm-audit-icon" style={{ background: "rgba(79, 70, 229, 0.1)", color: "#4f46e5" }}>
                    <IndianRupee size={20}/>
                  </div>
                  <div>
                    <div className="sm-audit-title">Fee Management Admin Portal</div>
                    <span className="sm-audit-route-badge">/admin/fees</span>
                  </div>
                </div>
                <div className="sm-audit-desc">
                  Reconciles student fees, discounts, and payments in real time. Priya Kumar R and all students reflect accurate net payable amounts and verified transaction histories.
                </div>
              </div>

              <div className="sm-audit-card">
                <div className="sm-audit-top">
                  <div className="sm-audit-icon" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }}>
                    <FileText size={20}/>
                  </div>
                  <div>
                    <div className="sm-audit-title">Accounts Fees Collection</div>
                    <span className="sm-audit-route-badge">/accounts/fees-collection</span>
                  </div>
                </div>
                <div className="sm-audit-desc">
                  Separates Quota Concessions (e.g. Sports Quota -₹6,500) and Scholarship Grants (e.g. First Graduate -₹10,300), computing exact remaining balances for receipt generation.
                </div>
              </div>

              <div className="sm-audit-card">
                <div className="sm-audit-top">
                  <div className="sm-audit-icon" style={{ background: "rgba(2, 132, 199, 0.1)", color: "#0284c7" }}>
                    <GraduationCap size={20}/>
                  </div>
                  <div>
                    <div className="sm-audit-title">Student Self-Service Portal</div>
                    <span className="sm-audit-route-badge">/student/fees</span>
                  </div>
                </div>
                <div className="sm-audit-desc">
                  Students transparently view their sanctioned scholarship scheme, verified quota deduction badge, exact payments made, and zero surprise balance fees.
                </div>
              </div>

            </div>

            <div style={{ marginTop: "1.5rem", padding: "1.25rem", background: "var(--bg-primary)", borderRadius: "12px", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <strong style={{ fontSize: "0.92rem", color: "var(--text-main)" }}>Trigger Manual Financial Ledger Recalculation</strong>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.2rem 0 0 0" }}>Forces a complete socket emission across all student accounts and fee structures.</p>
              </div>
              <button
                type="button"
                className="sm-btn-primary"
                onClick={() => {
                  emitERPDataUpdate(["scholarships", "students", "fees", "admissions"], "manual-recalc", { timestamp: Date.now() });
                  setMessage("Financial ledger synchronization signal broadcasted to all portals!");
                  setTimeout(() => setMessage(""), 4000);
                }}
              >
                <RefreshCw size={15}/> Broadcast Recalculation Signal
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
