// Updated Unauthorized component with premium design and clearer navigation handling
import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, LogIn, ArrowLeft } from "lucide-react";

/**
 * Unauthorized page displayed when a user attempts to access a portal without a valid session.
 * The component provides two actions:
 *   1. Back to the appropriate dashboard based on the existing session storage key.
 *   2. Log out / switch role by clearing session storage and navigating to the login page.
 */
const Unauthorized = () => {
  const navigate = useNavigate();

  // Determine the currently active role and redirect accordingly.
  const handleBackToDashboard = () => {
    const roleMap = [
      { key: "admin_session", path: "/admin/dashboard" },
      { key: "hod_session", path: "/hod" },
      { key: "staff_session", path: "/staff/dashboard" },
      { key: "student_session", path: "/student/dashboard" },
      { key: "parent_session", path: "/parent/dashboard" },
      { key: "accounts_session", path: "/accounts/dashboard" },
    ];
    const active = roleMap.find((r) => sessionStorage.getItem(r.key));
    navigate(active ? active.path : "/login");
  };

  // Clear all session data and return to the login screen.
  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-6 transition-colors duration-300">
      <div className="glass-card max-w-md w-full p-8 text-center border-l-4 border-rose-500 shadow-2xl animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-rose-500/10 text-rose-500 rounded-full animate-bounce">
            <ShieldAlert size={48} />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-[var(--text-main)] mb-2 tracking-tight">
          Access Denied
        </h1>
        <p className="text-rose-500 font-semibold mb-4 text-sm tracking-wide">
          ERROR 403 · UNAUTHORIZED PORTAL ACCESS
        </p>
        <p className="text-[var(--text-muted)] mb-8 text-sm leading-relaxed">
          You do not have the required security credentials to access this department dashboard. Direct navigation to foreign portals is restricted.
        </p>
        <div className="space-y-3">
          <button
            onClick={handleBackToDashboard}
            className="w-full flex items-center justify-center gap-2 bg-[#3b82f6] text-white py-3 rounded-xl font-semibold shadow-lg hover:bg-blue-600 active:scale-95 transition-all"
          >
            <ArrowLeft size={18} /> Back to My Dashboard
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-main)] py-3 rounded-xl font-semibold hover:bg-[var(--hover-bg)] active:scale-95 transition-all"
          >
            <LogIn size={18} /> Sign in to Another Role
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
