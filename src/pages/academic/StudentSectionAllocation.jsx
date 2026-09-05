import React, { useEffect, useMemo, useState } from "react";
import {
  getStudents,
  getDepartments,
  getCourses,
  getSemesters,
  getSections,
  getAcademicYears,
  allocateStudentsToSection
} from "../../api/index";

import "./StudentSectionAllocation.css";

const StudentSectionAllocation = () => {
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    departmentId: "",
    courseId: "",
    semesterId: "",
    sectionId: "",
    academicYearId: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [
          studentResponse,
          departmentResponse,
          courseResponse,
          semesterResponse,
          sectionResponse,
          yearResponse
        ] = await Promise.all([
          getStudents(),
          getDepartments(),
          getCourses(),
          getSemesters(),
          getSections(),
          getAcademicYears()
        ]);

        const studentData = Array.isArray(studentResponse.data)
          ? studentResponse.data
          : studentResponse.data?.students || [];

        const departmentData = Array.isArray(departmentResponse.data)
          ? departmentResponse.data
          : departmentResponse.data?.departments || [];

        const courseData = Array.isArray(courseResponse.data)
          ? courseResponse.data
          : courseResponse.data?.courses || [];

        const semesterData = Array.isArray(semesterResponse.data)
          ? semesterResponse.data
          : semesterResponse.data?.semesters || [];

        const sectionData = Array.isArray(sectionResponse.data)
          ? sectionResponse.data
          : sectionResponse.data?.sections || [];

        const yearData = Array.isArray(yearResponse.data)
          ? yearResponse.data
          : yearResponse.data?.academicYears || [];

        setStudents(studentData);
        setDepartments(departmentData);
        setCourses(courseData);
        setSemesters(semesterData);
        setSections(sectionData);
        setAcademicYears(yearData);
      } catch (error) {
        console.error("Failed to load allocation data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredCourses = useMemo(
    () =>
      Array.isArray(courses)
        ? courses.filter(
            (course) => course.departmentId === form.departmentId
          )
        : [],
    [courses, form.departmentId]
  );

  const filteredSemesters = useMemo(
    () =>
      Array.isArray(semesters)
        ? semesters.filter(
            (semester) => semester.courseId === form.courseId
          )
        : [],
    [semesters, form.courseId]
  );

  const filteredSections = useMemo(
    () =>
      Array.isArray(sections)
        ? sections.filter(
            (section) =>
              section.semesterId === form.semesterId &&
              section.status !== "Inactive"
          )
        : [],
    [sections, form.semesterId]
  );

  const selectedDepartment = useMemo(
    () =>
      Array.isArray(departments)
        ? departments.find(
            (department) =>
              (department.id || department._id) === form.departmentId
          )
        : null,
    [departments, form.departmentId]
  );

  const selectedCourse = useMemo(
    () =>
      Array.isArray(courses)
        ? courses.find(
            (course) => (course.id || course._id) === form.courseId
          )
        : null,
    [courses, form.courseId]
  );

  const selectedSemester = useMemo(
    () =>
      Array.isArray(semesters)
        ? semesters.find(
            (semester) =>
              (semester.id || semester._id) === form.semesterId
          )
        : null,
    [semesters, form.semesterId]
  );

  const selectedSection = useMemo(
    () =>
      Array.isArray(sections)
        ? sections.find(
            (section) => (section.id || section._id) === form.sectionId
          )
        : null,
    [sections, form.sectionId]
  );

  const eligibleStudents = useMemo(() => {
    if (!form.departmentId || !selectedDepartment || !Array.isArray(students)) return [];

    return students.filter(
      (student) =>
        student.departmentId === form.departmentId ||
        student.dept === selectedDepartment.name
    );
  }, [
    students,
    form.departmentId,
    selectedDepartment
  ]);

  const toggleStudent = (studentId) => {
    setSelectedStudents((current) =>
      current.includes(studentId)
        ? current.filter((id) => id !== studentId)
        : [...current, studentId]
    );
  };

  const toggleAllStudents = () => {
    const allIds = eligibleStudents.map(
      (student) => student.id || student._id
    );

    setSelectedStudents(
      selectedStudents.length === allIds.length ? [] : allIds
    );
  };

  const handleAllocation = async () => {
    if (
      !form.departmentId ||
      !form.courseId ||
      !form.semesterId ||
      !form.sectionId
    ) {
      alert(
        "Select department, course, semester and section"
      );
      return;
    }

    if (selectedStudents.length === 0) {
      alert("Select at least one student");
      return;
    }

    try {
      setSaving(true);

      const semesterName =
        selectedSemester?.name ||
        `Semester ${selectedSemester?.semesterNumber || ""}`;

      await allocateStudentsToSection({
        studentIds: selectedStudents,
        departmentId: form.departmentId,
        departmentName: selectedDepartment?.name,
        courseId: form.courseId,
        semesterId: form.semesterId,
        semesterName,
        sectionId: form.sectionId,
        sectionName: selectedSection?.name,
        academicYearId: form.academicYearId || null
      });

      setStudents((current) =>
        current.map((student) =>
          selectedStudents.includes(student.id || student._id)
            ? {
                ...student,
                departmentId: form.departmentId,
                dept: selectedDepartment?.name,
                courseId: form.courseId,
                semesterId: form.semesterId,
                sem: semesterName,
                sectionId: form.sectionId,
                section: selectedSection?.name,
                academicYearId: form.academicYearId || null
              }
            : student
        )
      );

      setSelectedStudents([]);
      alert("Students allocated successfully");
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          "Unable to allocate students"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="student-section-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Student to Section Allocation</h1>
          <p>
            Allocate students to their department, course, semester
            and section.
          </p>
        </div>
      </div>

      <div className="allocation-panel glass-card">
        <div className="allocation-filters">
          <div className="form-group">
            <label>Academic Year</label>
            <select
              value={form.academicYearId}
              onChange={(event) =>
                setForm({
                  ...form,
                  academicYearId: event.target.value
                })
              }
            >
              <option value="">Select Academic Year</option>

              {academicYears.map((year) => (
                <option
                  key={year._id || year.id}
                  value={year._id || year.id}
                >
                  {year.year}
                  {year.isActive ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Department</label>
            <select
              value={form.departmentId}
              onChange={(event) => {
                setForm({
                  ...form,
                  departmentId: event.target.value,
                  courseId: "",
                  semesterId: "",
                  sectionId: ""
                });
                setSelectedStudents([]);
              }}
            >
              <option value="">Select Department</option>

              {departments.map((department) => (
                <option
                  key={department.id || department._id}
                  value={department.id || department._id}
                >
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Course</label>
            <select
              value={form.courseId}
              disabled={!form.departmentId}
              onChange={(event) =>
                setForm({
                  ...form,
                  courseId: event.target.value,
                  semesterId: "",
                  sectionId: ""
                })
              }
            >
              <option value="">Select Course</option>

              {filteredCourses.map((course) => (
                <option
                  key={course.id || course._id}
                  value={course.id || course._id}
                >
                  {course.name} ({course.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Semester</label>
            <select
              value={form.semesterId}
              disabled={!form.courseId}
              onChange={(event) =>
                setForm({
                  ...form,
                  semesterId: event.target.value,
                  sectionId: ""
                })
              }
            >
              <option value="">Select Semester</option>

              {filteredSemesters.map((semester) => (
                <option
                  key={semester.id || semester._id}
                  value={semester.id || semester._id}
                >
                  {semester.name ||
                    `Semester ${semester.semesterNumber}`}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Section</label>
            <select
              value={form.sectionId}
              disabled={!form.semesterId}
              onChange={(event) =>
                setForm({
                  ...form,
                  sectionId: event.target.value
                })
              }
            >
              <option value="">Select Section</option>

              {filteredSections.map((section) => (
                <option
                  key={section.id || section._id}
                  value={section.id || section._id}
                >
                  Section {section.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="allocation-table-header">
          <div>
            <h2>Student List</h2>
            <p>
              Select students and allocate them to the chosen section.
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={handleAllocation}
            disabled={saving || selectedStudents.length === 0}
          >
            {saving
              ? "Allocating..."
              : `Allocate ${selectedStudents.length} Student(s)`}
          </button>
        </div>

        <div className="table-container allocation-table">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      eligibleStudents.length > 0 &&
                      selectedStudents.length === eligibleStudents.length
                    }
                    onChange={toggleAllStudents}
                  />
                </th>
                <th>Student ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Current Semester</th>
                <th>Current Section</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="allocation-message">
                    Loading students...
                  </td>
                </tr>
              ) : !form.departmentId ? (
                <tr>
                  <td colSpan="7" className="allocation-message">
                    Select a department to view students.
                  </td>
                </tr>
              ) : eligibleStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="allocation-message">
                    No students found in this department.
                  </td>
                </tr>
              ) : (
                eligibleStudents.map((student) => {
                  const studentId = student.id || student._id;

                  return (
                    <tr key={studentId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(studentId)}
                          onChange={() => toggleStudent(studentId)}
                        />
                      </td>

                      <td>{student.id || "—"}</td>
                      <td><strong>{student.name}</strong></td>
                      <td>{student.dept || "—"}</td>
                      <td>{student.sem || "Not allocated"}</td>
                      <td>
                        {student.section
                          ? `Section ${student.section}`
                          : "Not allocated"}
                      </td>
                      <td>{student.status || "Active"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentSectionAllocation;
