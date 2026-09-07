import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Layers, Calendar, Settings, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Hash, Award, Clock, User } from 'lucide-react';
import {
  getDepartments,
  getStaff,
  getSubjects,
  getCourses,
  getSemesters,
  getSections,
  getAcademicYears,
  createCourse,
  deleteCourse,
  createSemester,
  deleteSemester,
  createSection,
  updateSection,
  deleteSection
} from '../../api/index';
import './AcademicStructure.css';

const DEFAULT_DEPARTMENTS = [
  'Computer Science Engineering',
  'Information Technology',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Artificial Intelligence & Data Science',
  'Artificial Intelligence & Machine Learning',
  'Cyber Security',
  'Biomedical Engineering',
  'Aeronautical Engineering',
  'Automobile Engineering',
  'Robotics Engineering',
  'Chemical Engineering',
  'Biotechnology Engineering'
];

const DEFAULT_SUBJECTS = [
  { id: 'SUB001', code: 'CS301', name: 'Data Structures', dept: 'Computer Science Engineering', sem: 'Semester 3', teacher: 'Dr. Ananya Rao', credits: 4, workload: 4 },
  { id: 'SUB002', code: 'CS302', name: 'DBMS', dept: 'Computer Science Engineering', sem: 'Semester 3', teacher: 'Dr. Agila', credits: 4, workload: 4 },
  { id: 'SUB003', code: 'CS401', name: 'Operating Systems', dept: 'Computer Science Engineering', sem: 'Semester 4', teacher: 'Dr. Agila', credits: 4, workload: 4 },
  { id: 'SUB004', code: 'CYB301', name: 'Introduction to Cyber Security', dept: 'Cyber Security', sem: 'Semester 3', teacher: 'Dr. Vaideeswari', credits: 4, workload: 4 },
  { id: 'SUB005', code: 'CYB302', name: 'Computer Networks', dept: 'Cyber Security', sem: 'Semester 3', teacher: 'Dr. Vaideeswari', credits: 4, workload: 4 },
];

const DEFAULT_SEMESTERS = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];

const AcademicStructure = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [showCourseForm, setShowCourseForm] = useState(false);

  const [courseForm, setCourseForm] = useState({
    name: "",
    code: "",
    departmentId: "",
    degreeType: "UG",
    durationYears: 4,
    totalSemesters: 8
  });

  const [showSemesterForm, setShowSemesterForm] = useState(false);

  const [semesterForm, setSemesterForm] = useState({
    name: "Semester 1",
    semesterNumber: 1,
    courseId: "",
    departmentId: "",
    academicYearId: "",
    startDate: "",
    endDate: "",
    status: "Upcoming"
  });

  const [showSectionForm, setShowSectionForm] = useState(false);

  const [sectionForm, setSectionForm] = useState({
    name: "A",
    courseId: "",
    departmentId: "",
    semesterId: "",
    academicYearId: "",
    classTeacherId: "",
    roomNumber: "",
    maximumStudents: 60
  });
  const [loading, setLoading] = useState(true);
  const [activeSetupTab, setActiveSetupTab] =
    useState("academic-structure");
  const [expandedDept, setExpandedDept] = useState(null);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [expandedSem, setExpandedSem] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const staffRes = await getStaff().catch(() => ({ data: [] }));
      setStaff(staffRes?.data || []);

      const courseRes = await getCourses().catch(() => ({
        data: { courses: [] }
      }));

      const semesterRes = await getSemesters().catch(() => ({
        data: { semesters: [] }
      }));

      const sectionRes = await getSections().catch(() => ({
        data: { sections: [] }
      }));

      const academicYearRes = await getAcademicYears().catch(() => ({
        data: []
      }));

      setCourses(courseRes?.data?.courses || []);
      setSemesters(semesterRes?.data?.semesters || []);
      setSections(sectionRes?.data?.sections || []);
      setAcademicYears(
        Array.isArray(academicYearRes?.data)
          ? academicYearRes.data
          : academicYearRes?.data?.academicYears || []
      );

      const departmentRes = await getDepartments().catch(() => ({
        data: []
      }));

      const databaseDepartments = Array.isArray(departmentRes?.data)
        ? departmentRes.data
        : [];

      setDepartments(
        databaseDepartments.length > 0
          ? databaseDepartments
          : DEFAULT_DEPARTMENTS
      );

      const subjectRes = await getSubjects().catch(() => ({
        data: []
      }));

      const databaseSubjects = Array.isArray(subjectRes?.data)
        ? subjectRes.data.map((subject) => ({
            id: subject._id,
            code: subject.subjectCode,
            name: subject.subjectName,
            dept: subject.department,
            sem: subject.semester,
            teacher: subject.teacher,
            credits: subject.credits,
            workload: subject.workload,
            departmentId: subject.departmentId || "",
            courseId: subject.courseId || "",
            semesterId: subject.semesterId || "",
            sectionIds: subject.sectionIds || []
          }))
        : [];

      setSubjects(databaseSubjects);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDept = (dept) => {
    if (expandedDept === dept) {
      setExpandedDept(null);
      setExpandedCourse(null);
      setExpandedSem(null);
    } else {
      setExpandedDept(dept);
      setExpandedCourse(null);
      setExpandedSem(null);
    }
  };

  const toggleCourse = (courseId) => {
    setExpandedCourse(
      expandedCourse === courseId ? null : courseId
    );

    setExpandedSem(null);
  };

  const toggleSem = (semId) => {
    setExpandedSem(
      expandedSem === semId ? null : semId
    );
  };

  const handleCourseInput = (event) => {
    const { name, value } = event.target;

    setCourseForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleCreateCourse = async (event) => {
    event.preventDefault();

    try {
      await createCourse({
        ...courseForm,
        durationYears: Number(courseForm.durationYears),
        totalSemesters: Number(courseForm.totalSemesters)
      });

      setCourseForm({
        name: "",
        code: "",
        departmentId: "",
        degreeType: "UG",
        durationYears: 4,
        totalSemesters: 8
      });

      setShowCourseForm(false);
      await fetchData();

      alert("Course created successfully");
    } catch (error) {
      alert(
        error?.response?.data?.message ||
        "Unable to create course"
      );
    }
  };

  const handleDeleteCourse = async (courseId) => {
    const confirmed = window.confirm(
      "Do you want to deactivate this course?"
    );

    if (!confirmed) return;

    try {
      await deleteCourse(courseId);
      await fetchData();

      alert("Course deactivated successfully");
    } catch (error) {
      alert(
        error?.response?.data?.message ||
        "Unable to deactivate course"
      );
    }
  };

  const handleSemesterInput = (event) => {
    const { name, value } = event.target;

    if (name === "courseId") {
      const selectedCourse = courses.find(
        (course) => course.id === value
      );

      setSemesterForm((previous) => ({
        ...previous,
        courseId: value,
        departmentId: selectedCourse?.departmentId || ""
      }));

      return;
    }

    if (name === "semesterNumber") {
      setSemesterForm((previous) => ({
        ...previous,
        semesterNumber: value,
        name: `Semester ${value}`
      }));

      return;
    }

    setSemesterForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleCreateSemester = async (event) => {
    event.preventDefault();

    try {
      await createSemester({
        ...semesterForm,
        semesterNumber: Number(
          semesterForm.semesterNumber
        )
      });

      setSemesterForm({
        name: "Semester 1",
        semesterNumber: 1,
        courseId: "",
        departmentId: "",
        academicYearId: "",
        startDate: "",
        endDate: "",
        status: "Upcoming"
      });

      setShowSemesterForm(false);
      await fetchData();

      alert("Semester created successfully");
    } catch (error) {
      alert(
        error?.response?.data?.message ||
        "Unable to create semester"
      );
    }
  };

  const handleDeleteSemester = async (semesterId) => {
    const confirmed = window.confirm(
      "Do you want to deactivate this semester?"
    );

    if (!confirmed) return;

    try {
      await deleteSemester(semesterId);
      await fetchData();

      alert("Semester deactivated successfully");
    } catch (error) {
      alert(
        error?.response?.data?.message ||
        "Unable to deactivate semester"
      );
    }
  };

  const handleSectionInput = (event) => {
    const { name, value } = event.target;

    if (name === "courseId") {
      const selectedCourse = courses.find(
        (course) => course.id === value
      );

      setSectionForm((previous) => ({
        ...previous,
        courseId: value,
        departmentId: selectedCourse?.departmentId || "",
        semesterId: "",
        academicYearId: ""
      }));

      return;
    }

    if (name === "semesterId") {
      const selectedSemester = semesters.find(
        (semester) => semester.id === value
      );

      setSectionForm((previous) => ({
        ...previous,
        semesterId: value,
        academicYearId:
          selectedSemester?.academicYearId || ""
      }));

      return;
    }

    setSectionForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleCreateSection = async (event) => {
    event.preventDefault();

    try {
      await createSection({
        ...sectionForm,
        maximumStudents: Number(
          sectionForm.maximumStudents
        ),
        classTeacherId:
          sectionForm.classTeacherId || null
      });

      setSectionForm({
        name: "A",
        courseId: "",
        departmentId: "",
        semesterId: "",
        academicYearId: "",
        classTeacherId: "",
        roomNumber: "",
        maximumStudents: 60
      });

      setShowSectionForm(false);
      await fetchData();

      alert("Section created successfully");
    } catch (error) {
      alert(
        error?.response?.data?.message ||
        "Unable to create section"
      );
    }
  };

  const handleDeleteSection = async (sectionId) => {
    const confirmed = window.confirm(
      "Do you want to deactivate this section?"
    );

    if (!confirmed) return;

    try {
      await deleteSection(sectionId);
      await fetchData();

      alert("Section deactivated successfully");
    } catch (error) {
      alert(
        error?.response?.data?.message ||
        "Unable to deactivate section"
      );
    }
  };

  const handleAssignClassTeacher = async (
    sectionId,
    classTeacherId
  ) => {
    try {
      await updateSection(sectionId, {
        classTeacherId: classTeacherId || null
      });

      await fetchData();

      alert("Class Teacher assigned successfully");
    } catch (error) {
      alert(
        error?.response?.data?.message ||
        "Unable to assign Class Teacher"
      );
    }
  };

  const semesterList = semesters && semesters.length > 0
    ? semesters.map(s => (typeof s === 'string' ? s : s.name))
    : DEFAULT_SEMESTERS;

  const academicRows = [];

  departments.forEach((department) => {
    const departmentId =
      typeof department === "string"
        ? department
        : department.id || department._id;

    const departmentName =
      typeof department === "string"
        ? department
        : department.name;

    const departmentCourses = courses.filter(
      (course) =>
        course.departmentId === departmentId ||
        course.departmentId === departmentName
    );

    departmentCourses.forEach((course) => {
      const courseId = course.id || course._id;

      const courseSemesters = semesters.filter(
        (semester) => semester.courseId === courseId
      );

      courseSemesters.forEach((semester) => {
        const semesterId = semester.id || semester._id;

        const semesterSections = sections.filter(
          (section) =>
            section.semesterId === semesterId &&
            section.status !== "Inactive"
        );

        semesterSections.forEach((section) => {
          const sectionId = section.id || section._id;

          const sectionSubjects = subjects.filter(
            (subject) =>
              Array.isArray(subject.sectionIds) &&
              subject.sectionIds.some(
                (id) => String(id) === String(sectionId)
              )
          );

          if (sectionSubjects.length === 0) {
            academicRows.push({
              department,
              departmentName,
              course,
              semester,
              section,
              subject: null
            });
          } else {
            sectionSubjects.forEach((subject) => {
              academicRows.push({
                department,
                departmentName,
                course,
                semester,
                section,
                subject
              });
            });
          }
        });
      });
    });
  });

  return (
    <div className="academic-structure animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Academic Management Module</h1>
          <p className="text-muted">Manage Departments, Semesters, Subjects, and Course Regulations across the institution.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary"><Settings size={18} /> Regulations</button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/admin/subjects')}
          >
            <BookOpen size={18} />
            Add Subject
          </button>
          <button
            type="button"
            className="btn-primary shadow-glow"
            onClick={() => navigate('/admin/departments')}
          >
            <Plus size={18} />
            Add Department
          </button>
        </div>
      </div>



      <div className="structure-grid">
        {/* Left Column: Academic Tree */}
        <div className="glass-card structure-tree">
          <h2 className="section-title"><Layers size={20} className="text-primary" /> Institutional Structure</h2>

          <div className="academic-mapping-table">
            {loading ? (
              <p className="text-muted academic-table-message">
                Loading academic structure...
              </p>
            ) : academicRows.length === 0 ? (
              <p className="text-muted academic-table-message">
                No complete academic mappings available.
              </p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Course</th>
                      <th>Semester</th>
                      <th>Section</th>
                      <th>Room</th>
                      <th>Class Teacher</th>
                      <th>Subject</th>
                      <th>Faculty</th>
                      <th>Credits</th>
                      <th>Hours</th>
                    </tr>
                  </thead>

                  <tbody>
                    {academicRows.map((row, index) => {
                      const sectionId = row.section.id || row.section._id;

                      return (
                        <tr
                          key={`${sectionId}-${row.subject?.id || row.subject?._id || index}`}
                        >
                          <td>
                            <strong>{row.departmentName}</strong>
                          </td>

                          <td>
                            {row.course.name}
                            <div className="academic-cell-code">
                              {row.course.code}
                            </div>
                          </td>

                          <td>
                            {row.semester.name ||
                              `Semester ${row.semester.semesterNumber}`}
                          </td>

                          <td>
                            <span className="academic-section-badge">
                              Section {row.section.name}
                            </span>
                          </td>

                          <td>{row.section.roomNumber || "—"}</td>

                          <td>
                            <select
                              className="academic-teacher-select"
                              value={row.section.classTeacherId || ""}
                              onChange={(event) =>
                                handleAssignClassTeacher(
                                  sectionId,
                                  event.target.value
                                )
                              }
                            >
                              <option value="">Select Teacher</option>

                              {staff
                                .filter((staffMember) => {
                                  const staffDepartment =
                                    staffMember.dept || staffMember.department;

                                  return staffDepartment === row.departmentName;
                                })
                                .map((staffMember) => (
                                  <option
                                    key={staffMember.id || staffMember._id}
                                    value={staffMember.id || staffMember._id}
                                  >
                                    {staffMember.name}
                                  </option>
                                ))}
                            </select>
                          </td>

                          <td>
                            {row.subject ? (
                              <>
                                <strong>{row.subject.code}</strong>
                                <div>{row.subject.name}</div>
                              </>
                            ) : (
                              <span className="text-muted">Not assigned</span>
                            )}
                          </td>

                          <td>{row.subject?.teacher || "—"}</td>
                          <td>{row.subject?.credits ?? "—"}</td>
                          <td>{row.subject?.workload ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="tree-container" style={{ display: "none" }}>
            {loading ? (
              <p className="text-muted" style={{ padding: '2rem', textAlign: 'center' }}>Loading structure...</p>
            ) : (
              departments.map((dept) => {
                const deptName = typeof dept === "string" ? dept : dept.name;
                const deptId = typeof dept === "string" ? dept : dept.id;

                const deptSubjects = subjects.filter((subject) => {
                  const subjectDepartment = subject.dept || "";

                  return (
                    subjectDepartment === deptName ||
                    subjectDepartment.includes(deptName.split(" ")[0])
                  );
                });

                const isDeptExpanded = expandedDept === deptId;
                
                return (
                  <div key={deptId} className="tree-node dept-node">
                    <div className={`node-header ${isDeptExpanded ? 'active' : ''}`} onClick={() => toggleDept(deptId)}>
                      {isDeptExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      <span className="node-title">{deptName}</span>
                      <span className="node-badge">{deptSubjects.length} Subjects</span>
                    </div>
                    
                    {isDeptExpanded && (
                      <div className="node-children">
                        {(() => {
                          const deptCourses = courses.filter(
                            (c) => c.departmentId === deptId || c.departmentId === deptName
                          );

                          if (deptCourses.length === 0) {
                            return (
                              <div className="empty-subject p-4 text-center">
                                <p className="text-muted text-sm">No courses created for this department yet.</p>
                              </div>
                            );
                          }

                          return deptCourses.map((course) => {
                            const isCourseExpanded = expandedCourse === course.id;
                            const courseSemesters = semesters.filter(
                              (sem) => sem.courseId === course.id
                            );

                            return (
                              <div key={course.id} className="tree-node course-node">
                                <div
                                  className={`node-header ${isCourseExpanded ? 'active' : ''}`}
                                  onClick={() => toggleCourse(course.id)}
                                >
                                  {isCourseExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  <span className="node-title">{course.name} ({course.code})</span>
                                  <span className="node-badge outline">{course.totalSemesters} Semesters</span>
                                </div>

                                {isCourseExpanded && (
                                  <div className="node-children">
                                    {courseSemesters.length === 0 ? (
                                      <div className="empty-subject p-3 text-center">
                                        <p className="text-muted text-sm">No semesters created for this course yet.</p>
                                      </div>
                                    ) : (
                                       courseSemesters.map((sem) => {
                                         const semId = sem.id || sem._id;
                                         const semName = sem.name || `Semester ${sem.semesterNumber}`;
                                         const isSemExpanded = expandedSem === semId || expandedSem === sem.id || expandedSem === sem._id;

                                         const semSections = sections.filter(
                                           (section) =>
                                             (section.semesterId === sem.id || section.semesterId === sem._id || section.semesterId === semId) &&
                                             section.status !== "Inactive"
                                         );

                                         return (
                                           <div key={semId} className="tree-node sem-node">
                                             <div
                                               className={`node-header ${isSemExpanded ? 'active' : ''}`}
                                               onClick={() => toggleSem(semId)}
                                               style={{ cursor: 'pointer' }}
                                             >
                                               {isSemExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                               <span className="node-title">{semName}</span>

                                               <span className="node-badge outline">
                                                 {semSections.length} Sections
                                               </span>
                                             </div>

                                             {isSemExpanded && (
                                               <div className="node-children subject-list">
                                                 {semSections.length === 0 ? (
                                                   <div className="empty-subject">
                                                     <p className="text-muted text-sm">
                                                       No sections created for this semester.
                                                     </p>
                                                   </div>
                                                 ) : (
                                                   semSections.map((section) => (
                                                     <div
                                                       key={section.id || section._id}
                                                       className="subject-item"
                                                     >
                                                       <div className="subject-info">
                                                         <span className="subject-code">
                                                           Section
                                                         </span>

                                                         <span className="subject-name">
                                                           Section {section.name}
                                                         </span>
                                                       </div>

                                                       <div className="subject-meta">
                                                         <span className="meta-tag">
                                                           Room: {section.roomNumber || "Not assigned"}
                                                         </span>

                                                         <span className="meta-tag">
                                                           Capacity: {section.maximumStudents}
                                                         </span>
                                                       </div>

                                                       <select
                                                          value={section.classTeacherId || ""}
                                                          onChange={(event) =>
                                                            handleAssignClassTeacher(
                                                              section.id,
                                                              event.target.value
                                                            )
                                                          }
                                                          style={{
                                                            minWidth: "190px",
                                                            padding: "8px 10px",
                                                            border: "1px solid #cbd5e1",
                                                            borderRadius: "8px",
                                                            background: "#ffffff"
                                                          }}
                                                        >
                                                          <option value="">Select Class Teacher</option>

                                                          {staff
                                                            .filter((staffMember) => {
                                                              const selectedDepartment = departments.find(
                                                                (department) =>
                                                                  typeof department !== "string" &&
                                                                  department.id === section.departmentId
                                                              );

                                                              if (!selectedDepartment) return false;

                                                              return (
                                                                staffMember.dept === selectedDepartment.name ||
                                                                staffMember.deptCode === selectedDepartment.code
                                                              );
                                                            })
                                                            .map((staffMember) => (
                                                              <option
                                                                key={staffMember.id}
                                                                value={staffMember.id}
                                                              >
                                                                {staffMember.name}
                                                              </option>
                                                            ))}
                                                        </select>

                                                        <div
                                                          style={{
                                                            width: "100%",
                                                            marginTop: "10px",
                                                            paddingLeft: "12px"
                                                          }}
                                                        >
                                                          <strong className="text-sm">
                                                            Subjects
                                                          </strong>

                                                          {subjects.filter(
                                                            (subject) =>
                                                              Array.isArray(subject.sectionIds) &&
                                                              (subject.sectionIds.includes(section.id) || subject.sectionIds.includes(section._id))
                                                          ).length === 0 ? (
                                                            <p className="text-muted text-sm">
                                                              No subjects assigned to this section.
                                                            </p>
                                                          ) : (
                                                            subjects
                                                              .filter(
                                                                (subject) =>
                                                                  Array.isArray(subject.sectionIds) &&
                                                                  (subject.sectionIds.includes(section.id) || subject.sectionIds.includes(section._id))
                                                              )
                                                              .map((subject) => (
                                                                <div
                                                                  key={subject.id}
                                                                  style={{
                                                                    marginTop: "8px",
                                                                    padding: "8px",
                                                                    border: "1px solid #e2e8f0",
                                                                    borderRadius: "8px"
                                                                  }}
                                                                >
                                                                  <strong>
                                                                    {subject.code} — {subject.name}
                                                                  </strong>

                                                                  <div className="text-muted text-sm">
                                                                    Faculty: {subject.teacher || "Unassigned"} ·{" "}
                                                                    Credits: {subject.credits || 0} ·{" "}
                                                                    Weekly Hours: {subject.workload || 0}
                                                                  </div>
                                                                </div>
                                                              ))
                                                          )}
                                                        </div>
                                                     </div>
                                                   ))
                                                 )}
                                               </div>
                                             )}
                                           </div>
                                         );
                                       })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Quick Stats & Regulations */}
        <div className="structure-sidebar">
          <div className="glass-card stat-overview">
            <h3 className="section-title"><Calendar size={18} className="text-secondary" /> Academic Year</h3>
            <div className="current-year-card">
              <div className="year-title">2026 - 2027 (Odd Semester)</div>
              <div className="year-status text-success">● Active</div>
            </div>
            
            <div className="quick-stats-grid">
              <div className="q-stat">
                <span className="q-label">Departments</span>
                <span className="q-value">{departments.length}</span>
              </div>
              <div className="q-stat">
                <span className="q-label">Total Subjects</span>
                <span className="q-value">{subjects.length}</span>
              </div>
            </div>
          </div>

          <div className="glass-card quick-actions mt-4">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <div>
                <h3 className="section-title">
                  <BookOpen size={18} className="text-primary" />
                  Course Management
                </h3>

                <p className="text-sm text-muted">
                  Create and manage courses under each department.
                </p>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowCourseForm(!showCourseForm)}
              >
                <Plus size={16} />
                {showCourseForm ? "Close" : "Add Course"}
              </button>
            </div>

            {showCourseForm && (
              <form
                className="course-form"
                onSubmit={handleCreateCourse}
                style={{
                  display: "grid",
                  gap: "12px",
                  marginTop: "16px"
                }}
              >
                <input
                  type="text"
                  name="name"
                  value={courseForm.name}
                  onChange={handleCourseInput}
                  placeholder="Course name"
                  required
                />

                <input
                  type="text"
                  name="code"
                  value={courseForm.code}
                  onChange={handleCourseInput}
                  placeholder="Course code"
                  required
                />

                <select
                  name="departmentId"
                  value={courseForm.departmentId}
                  onChange={handleCourseInput}
                  required
                >
                  <option value="">Select Department</option>

                  {departments
                    .filter((department) => typeof department !== "string")
                    .map((department) => (
                      <option
                        key={department.id}
                        value={department.id}
                      >
                        {department.name}
                      </option>
                    ))}
                </select>

                <select
                  name="degreeType"
                  value={courseForm.degreeType}
                  onChange={handleCourseInput}
                  required
                >
                  <option value="UG">Undergraduate</option>
                  <option value="PG">Postgraduate</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Certificate">Certificate</option>
                </select>

                <input
                  type="number"
                  name="durationYears"
                  value={courseForm.durationYears}
                  onChange={handleCourseInput}
                  min="1"
                  max="6"
                  placeholder="Duration in years"
                  required
                />

                <input
                  type="number"
                  name="totalSemesters"
                  value={courseForm.totalSemesters}
                  onChange={handleCourseInput}
                  min="1"
                  max="12"
                  placeholder="Total semesters"
                  required
                />

                <button type="submit" className="btn-primary">
                  Save Course
                </button>
              </form>
            )}

            <div className="management-count">
              <strong>{courses.length}</strong>
              <span>Courses configured</span>
            </div>

            <div className="management-record-list">
              {courses.length === 0 ? (
                <p className="text-sm text-muted">
                  No courses created yet.
                </p>
              ) : (
                courses.map((course) => (
                  <div
                    key={course.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px",
                      marginBottom: "8px",
                      border: "1px solid rgba(148, 163, 184, 0.25)",
                      borderRadius: "8px"
                    }}
                  >
                    <div>
                      <strong>{course.name}</strong>

                      <div className="text-sm text-muted">
                        {course.code} · {course.degreeType} ·{" "}
                        {course.durationYears} Years ·{" "}
                        {course.totalSemesters} Semesters
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-ghost"
                      title="Deactivate course"
                      onClick={() => handleDeleteCourse(course.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-card quick-actions mt-4">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <div>
                <h3 className="section-title">
                  <Calendar size={18} className="text-primary" />
                  Semester Management
                </h3>

                <p className="text-sm text-muted">
                  Create semesters under a selected course.
                </p>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  setShowSemesterForm(!showSemesterForm)
                }
              >
                <Plus size={16} />
                {showSemesterForm ? "Close" : "Add Semester"}
              </button>
            </div>

            {showSemesterForm && (
              <form
                className="course-form"
                onSubmit={handleCreateSemester}
              >
                <select
                  name="courseId"
                  value={semesterForm.courseId}
                  onChange={handleSemesterInput}
                  required
                >
                  <option value="">Select Course</option>

                  {courses
                    .filter((course) => course.status !== "Inactive")
                    .map((course) => (
                      <option
                        key={course.id}
                        value={course.id}
                      >
                        {course.name} ({course.code})
                      </option>
                    ))}
                </select>

                <select
                  name="academicYearId"
                  value={semesterForm.academicYearId}
                  onChange={handleSemesterInput}
                  required
                >
                  <option value="">Select Academic Year</option>

                  {academicYears.map((academicYear) => (
                    <option
                      key={academicYear._id}
                      value={academicYear._id}
                    >
                      {academicYear.year}
                      {academicYear.isActive ? " (Active)" : ""}
                    </option>
                  ))}
                </select>

                <select
                  name="semesterNumber"
                  value={semesterForm.semesterNumber}
                  onChange={handleSemesterInput}
                  required
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                  <option value="4">Semester 4</option>
                  <option value="5">Semester 5</option>
                  <option value="6">Semester 6</option>
                  <option value="7">Semester 7</option>
                  <option value="8">Semester 8</option>
                  <option value="9">Semester 9</option>
                  <option value="10">Semester 10</option>
                  <option value="11">Semester 11</option>
                  <option value="12">Semester 12</option>
                </select>

                <select
                  name="status"
                  value={semesterForm.status}
                  onChange={handleSemesterInput}
                >
                  <option value="Upcoming">Upcoming</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Inactive">Inactive</option>
                </select>

                <input
                  type="date"
                  name="startDate"
                  value={semesterForm.startDate}
                  onChange={handleSemesterInput}
                />

                <input
                  type="date"
                  name="endDate"
                  value={semesterForm.endDate}
                  onChange={handleSemesterInput}
                />

                <button type="submit" className="btn-primary">
                  Save Semester
                </button>
              </form>
            )}

            <div className="management-count">
              <strong>{semesters.length}</strong>
              <span>Semesters configured</span>
            </div>

            <div className="management-record-list">
              {semesters.length === 0 ? (
                <p className="text-sm text-muted">
                  No semesters created yet.
                </p>
              ) : (
                semesters.map((semester) => {
                  const relatedCourse = courses.find(
                    (course) => course.id === semester.courseId
                  );

                  return (
                    <div
                      key={semester.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px",
                        marginBottom: "8px",
                        border:
                          "1px solid rgba(148, 163, 184, 0.25)",
                        borderRadius: "8px"
                      }}
                    >
                      <div>
                        <strong>{semester.name}</strong>

                        <div className="text-sm text-muted">
                          {relatedCourse?.name || "Unknown Course"} ·{" "}
                          {semester.status}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() =>
                          handleDeleteSemester(semester.id)
                        }
                        title="Deactivate semester"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="glass-card quick-actions mt-4">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <div>
                <h3 className="section-title">
                  <Layers size={18} className="text-primary" />
                  Section Management
                </h3>

                <p className="text-sm text-muted">
                  Create sections under a selected semester.
                </p>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  setShowSectionForm(!showSectionForm)
                }
              >
                <Plus size={16} />
                {showSectionForm ? "Close" : "Add Section"}
              </button>
            </div>

            {showSectionForm && (
              <form
                className="course-form"
                onSubmit={handleCreateSection}
              >
                <select
                  name="courseId"
                  value={sectionForm.courseId}
                  onChange={handleSectionInput}
                  required
                >
                  <option value="">Select Course</option>

                  {courses
                    .filter((course) => course.status !== "Inactive")
                    .map((course) => (
                      <option
                        key={course.id}
                        value={course.id}
                      >
                        {course.name} ({course.code})
                      </option>
                    ))}
                </select>

                <select
                  name="semesterId"
                  value={sectionForm.semesterId}
                  onChange={handleSectionInput}
                  required
                  disabled={!sectionForm.courseId}
                >
                  <option value="">Select Semester</option>

                  {semesters
                    .filter(
                      (semester) =>
                        semester.courseId === sectionForm.courseId &&
                        semester.status !== "Inactive"
                    )
                    .map((semester) => (
                      <option
                        key={semester.id}
                        value={semester.id}
                      >
                        {semester.name}
                      </option>
                    ))}
                </select>

                <select
                  name="classTeacherId"
                  value={sectionForm.classTeacherId}
                  onChange={handleSectionInput}
                >
                  <option value="">Select Class Teacher</option>

                  {staff
                    .filter((staffMember) => {
                      const selectedDepartment = departments.find(
                        (department) =>
                          typeof department !== "string" &&
                          department.id === sectionForm.departmentId
                      );

                      if (!selectedDepartment) return false;

                      const sameDepartment =
                        staffMember.dept === selectedDepartment.name ||
                        staffMember.deptCode === selectedDepartment.code;

                      const isActive =
                        !staffMember.status ||
                        staffMember.status === "Active";

                      return sameDepartment && isActive;
                    })
                    .map((staffMember) => (
                      <option
                        key={staffMember.id}
                        value={staffMember.id}
                      >
                        {staffMember.name} —{" "}
                        {staffMember.designation || staffMember.role}
                      </option>
                    ))}
                </select>

                <input
                  type="text"
                  name="name"
                  value={sectionForm.name}
                  onChange={handleSectionInput}
                  placeholder="Section name, for example A"
                  required
                />

                <input
                  type="text"
                  name="roomNumber"
                  value={sectionForm.roomNumber}
                  onChange={handleSectionInput}
                  placeholder="Room number"
                />

                <input
                  type="number"
                  name="maximumStudents"
                  value={sectionForm.maximumStudents}
                  onChange={handleSectionInput}
                  min="1"
                  placeholder="Maximum students"
                  required
                />

                <button type="submit" className="btn-primary">
                  Save Section
                </button>
              </form>
            )}

            <div className="management-count">
              <strong>{sections.length}</strong>
              <span>Sections configured</span>
            </div>

            <div className="management-record-list">
              {sections.length === 0 ? (
                <p className="text-sm text-muted">
                  No sections created yet.
                </p>
              ) : (
                sections.map((section) => {
                  const relatedSemester = semesters.find(
                    (semester) => semester.id === section.semesterId
                  );

                  const relatedCourse = courses.find(
                    (course) => course.id === section.courseId
                  );

                  return (
                    <div
                      key={section.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px",
                        marginBottom: "8px",
                        border:
                          "1px solid rgba(148, 163, 184, 0.25)",
                        borderRadius: "8px"
                      }}
                    >
                      <div>
                        <strong>Section {section.name}</strong>

                        <div className="text-sm text-muted">
                          {relatedCourse?.name || "Unknown Course"} ·{" "}
                          {relatedSemester?.name || "Unknown Semester"} ·{" "}
                          Room {section.roomNumber || "Not assigned"}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() =>
                          handleDeleteSection(section.id)
                        }
                        title="Deactivate section"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="glass-card quick-actions mt-4">
            <h3 className="section-title"><BookOpen size={18} className="text-primary" /> Subject Management</h3>
            <p className="text-sm text-muted mb-4">Centralized subject and curriculum configuration.</p>
            <button
              type="button"
              className="btn-secondary w-full justify-center mb-2"
              onClick={() => navigate("/admin/subjects")}
            >
              <Plus size={16} />
              Add New Subject
            </button>
            <button className="btn-ghost w-full justify-center"><User size={16} /> Assign Faculty</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademicStructure;
