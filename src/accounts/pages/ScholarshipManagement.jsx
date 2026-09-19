import React, { useEffect, useState } from "react";
import {
  getScholarships,
  createScholarship,
  updateScholarship,
  deleteScholarship,
} from "../../api";

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

  const loadScholarships = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getScholarships();

      setScholarships(
        response.data?.data ||
        response.data ||
        []
      );
    } catch (err) {
      console.error(
        "Error loading scholarships:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load scholarships"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScholarships();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      if (!form.scholarshipName.trim()) {
        throw new Error(
          "Scholarship name is required"
        );
      }

      const value =
        Number(form.scholarshipValue || 0);

      if (value < 0) {
        throw new Error(
          "Scholarship value cannot be negative"
        );
      }

      if (
        form.scholarshipType === "Percentage" &&
        value > 100
      ) {
        throw new Error(
          "Percentage scholarship cannot exceed 100%"
        );
      }

      const payload = {
        scholarshipName:
          form.scholarshipName.trim(),

        academicYear:
          form.academicYear.trim(),

        scholarshipType:
          form.scholarshipType,

        scholarshipValue: value,

        maximumAmount:
          Number(form.maximumAmount || 0),

        eligibility:
          form.eligibility.trim(),

        status: form.status,
      };

      if (editingId) {
        await updateScholarship(
          editingId,
          payload
        );

        setMessage(
          "Scholarship updated successfully!"
        );
      } else {
        await createScholarship(payload);

        setMessage(
          "Scholarship created successfully!"
        );
      }

      setForm(emptyForm);
      setEditingId(null);

      await loadScholarships();
    } catch (err) {
      console.error(
        "Error saving scholarship:",
        err
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save scholarship"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (scholarship) => {
    setEditingId(scholarship._id);

    setForm({
      scholarshipName:
        scholarship.scholarshipName || "",

      academicYear:
        scholarship.academicYear || "2026-2027",

      scholarshipType:
        scholarship.scholarshipType ||
        "Fixed Amount",

      scholarshipValue:
        scholarship.scholarshipValue ?? "",

      maximumAmount:
        scholarship.maximumAmount ?? "",

      eligibility:
        scholarship.eligibility || "",

      status:
        scholarship.status || "active",
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this scholarship?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      await deleteScholarship(id);

      setMessage(
        "Scholarship deleted successfully!"
      );

      await loadScholarships();
    } catch (err) {
      console.error(
        "Error deleting scholarship:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to delete scholarship"
      );
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  };

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <h1>Scholarship Management</h1>

      <p>
        Create and manage scholarship schemes
        for students.
      </p>

      {message && (
        <div
          style={{
            padding: "12px",
            marginBottom: "16px",
            borderRadius: "8px",
            background: "#dcfce7",
            color: "#166534",
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "12px",
            marginBottom: "16px",
            borderRadius: "8px",
            background: "#fee2e2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "12px",
          marginBottom: "30px",
        }}
      >
        <h2>
          {editingId
            ? "Edit Scholarship"
            : "Create Scholarship"}
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
          }}
        >
          <div>
            <label>
              Scholarship Name
            </label>

            <input
              name="scholarshipName"
              value={form.scholarshipName}
              onChange={handleChange}
              placeholder="First Graduate Scholarship"
              style={{
                width: "100%",
                padding: "10px",
              }}
            />
          </div>

          <div>
            <label>
              Academic Year
            </label>

            <select
              name="academicYear"
              value={form.academicYear}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
              }}
            >
              <option value="2026-2027">
                2026-2027
              </option>

              <option value="2025-2026">
                2025-2026
              </option>

              <option value="2027-2028">
                2027-2028
              </option>

              <option value="2028-2029">
                2028-2029
              </option>
            </select>
          </div>

          <div>
            <label>
              Scholarship Type
            </label>

            <select
              name="scholarshipType"
              value={form.scholarshipType}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
              }}
            >
              <option value="Fixed Amount">
                Fixed Amount
              </option>

              <option value="Percentage">
                Percentage
              </option>
            </select>
          </div>

          <div>
            <label>
              Scholarship Value
            </label>

            <input
              type="number"
              name="scholarshipValue"
              value={form.scholarshipValue}
              onChange={handleChange}
              min="0"
              max={
                form.scholarshipType ===
                "Percentage"
                  ? "100"
                  : undefined
              }
              placeholder={
                form.scholarshipType ===
                "Percentage"
                  ? "20"
                  : "8000"
              }
              style={{
                width: "100%",
                padding: "10px",
              }}
            />
          </div>

          <div>
            <label>
              Maximum Amount
            </label>

            <input
              type="number"
              name="maximumAmount"
              value={form.maximumAmount}
              onChange={handleChange}
              min="0"
              placeholder="10000"
              style={{
                width: "100%",
                padding: "10px",
              }}
            />
          </div>

          <div>
            <label>
              Status
            </label>

            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "10px",
              }}
            >
              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>
          </div>

          <div
            style={{
              gridColumn: "1 / -1",
            }}
          >
            <label>
              Eligibility
            </label>

            <textarea
              name="eligibility"
              value={form.eligibility}
              onChange={handleChange}
              placeholder="Example: First graduate students"
              rows="3"
              style={{
                width: "100%",
                padding: "10px",
              }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            gap: "10px",
          }}
        >
          <button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : editingId
              ? "Update Scholarship"
              : "Create Scholarship"}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div>
        <h2>
          Scholarship Master
        </h2>

        {loading ? (
          <p>Loading scholarships...</p>
        ) : scholarships.length === 0 ? (
          <p>
            No scholarships created yet.
          </p>
        ) : (
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th>Scholarship</th>
                  <th>Academic Year</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Maximum</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {scholarships.map(
                  (scholarship) => (
                    <tr key={scholarship._id}>
                      <td>
                        {
                          scholarship.scholarshipName
                        }
                      </td>

                      <td>
                        {
                          scholarship.academicYear
                        }
                      </td>

                      <td>
                        {
                          scholarship.scholarshipType
                        }
                      </td>

                      <td>
                        {scholarship.scholarshipType ===
                        "Percentage"
                          ? `${scholarship.scholarshipValue}%`
                          : `₹${Number(
                              scholarship.scholarshipValue ||
                                0
                            ).toLocaleString(
                              "en-IN"
                            )}`}
                      </td>

                      <td>
                        ₹
                        {Number(
                          scholarship.maximumAmount ||
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </td>

                      <td>
                        {
                          scholarship.status
                        }
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() =>
                            handleEdit(
                              scholarship
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              scholarship._id
                            )
                          }
                          style={{
                            marginLeft: "8px",
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
