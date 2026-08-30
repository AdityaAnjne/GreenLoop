import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "./api";
import { Eye, EyeOff, Recycle, Mail, Lock, UserCircle2 } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import vegetableBg from "../images/Backgroundimage.png";
import {
  getDashboardRoute,
  isAdminRole,
  isValidFrontendRole,
  FRONTEND_ROLE_OPTIONS,
} from "../constants/roles";

const Login = ({ setUser }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!role) {
      setFormError("Please select your role to continue.");
      return;
    }
    setLoading(true);

    try {
      const user = await loginUser(email, password, role);
      setUser(user);

      if (!user.role) {
        throw new Error("No role received from backend");
      }

      if (isAdminRole(user.role)) {
        navigate("/admin/dashboard");
        return;
      }

      if (!isValidFrontendRole(user.role)) {
        throw new Error(`Invalid user role: ${user.role}`);
      }

      const dashboardPath = getDashboardRoute(user.role);
      if (!dashboardPath) {
        throw new Error("Invalid user role - no dashboard found");
      }

      navigate(dashboardPath);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div
      className={`min-h-screen flex relative overflow-hidden transition-colors duration-300 ${
        isDark ? "bg-slate-950" : "bg-emerald-950"
      }`}
    >
      {/* Left panel — real photo with a bold brand-colored overlay + loop rings */}
      <div
        className="hidden lg:flex lg:w-2/5 relative overflow-hidden items-center justify-center p-12"
        style={{
          backgroundImage:
            `linear-gradient(160deg, rgba(6,78,59,0.65) 0%, rgba(4,58,44,0.75) 55%, rgba(2,30,22,0.85) 100%), url(${vegetableBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Decorative concentric loop rings, layered over the photo */}
        <div className="absolute -left-24 -top-24 w-96 h-96 border-[3px] border-emerald-300/25 rounded-full" />
        <div className="absolute -left-10 -top-10 w-72 h-72 border-[3px] border-harvest-400/30 rounded-full" />
        <div className="absolute -right-32 -bottom-32 w-[28rem] h-[28rem] border-[3px] border-emerald-300/20 rounded-full" />
        <div className="absolute -right-16 -bottom-16 w-64 h-64 border-[3px] border-harvest-400/25 rounded-full" />

        <div className="relative z-10 text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-8 bg-gradient-to-br from-harvest-400 to-harvest-600 shadow-[0_8px_24px_rgba(232,163,23,0.4)]">
            <Recycle size={30} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-extrabold mb-3 text-white tracking-tight">
            GreenLoop
          </h1>
          <p className="text-emerald-200 text-base mb-10 leading-relaxed">
            Every harvest, tracked in a closed loop — from soil to doorstep.
          </p>
          <div className="space-y-3 text-left">
            {[
              "Real-time farm to table tracking",
              "Transparent supply chain",
              "Quality assurance with AI",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl px-4 py-3 bg-white/5 border border-white/10"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-harvest-400 flex-shrink-0" />
                <p className="text-emerald-50 text-sm">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div
        className={`w-full lg:w-3/5 flex items-center justify-center p-6 sm:p-12 ${
          isDark ? "bg-slate-950" : "bg-gray-50"
        }`}
      >
        <div className="w-full max-w-md">
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="lg:hidden inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 bg-gradient-to-br from-emerald-500 to-emerald-700">
                <Recycle size={22} className="text-white" strokeWidth={2.5} />
              </div>
              <h2
                className={`text-2xl font-extrabold tracking-tight ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                Welcome back
              </h2>
              <p
                className={`text-sm mt-1 ${
                  isDark ? "text-slate-400" : "text-gray-500"
                }`}
              >
                Sign in to your GreenLoop account
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm border transition ${
                isDark
                  ? "bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
              aria-label="Toggle light/dark mode"
            >
              {isDark ? "🌙" : "☀️"}
            </button>
          </div>

          <form
            onSubmit={handleLogin}
            className={`rounded-2xl p-7 border ${
              isDark
                ? "bg-slate-900 border-slate-800"
                : "bg-white border-gray-100 shadow-sm"
            }`}
          >
            {/* Email */}
            <div className="mb-4">
              <label
                className={`block text-xs font-bold uppercase tracking-wide mb-2 ${
                  isDark ? "text-slate-400" : "text-gray-500"
                }`}
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                    isDark ? "text-slate-500" : "text-gray-400"
                  }`}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                  className={`w-full pl-11 pr-4 py-3 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition border ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-4">
              <label
                className={`block text-xs font-bold uppercase tracking-wide mb-2 ${
                  isDark ? "text-slate-400" : "text-gray-500"
                }`}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 ${
                    isDark ? "text-slate-500" : "text-gray-400"
                  }`}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className={`w-full pl-11 pr-11 py-3 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition border ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                    isDark
                      ? "text-slate-500 hover:text-emerald-400"
                      : "text-gray-400 hover:text-emerald-600"
                  }`}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="mb-2">
              <label
                className={`block text-xs font-bold uppercase tracking-wide mb-2 ${
                  isDark ? "text-slate-400" : "text-gray-500"
                }`}
              >
                Role
              </label>
              <div className="relative">
                <UserCircle2
                  size={18}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none ${
                    isDark ? "text-slate-500" : "text-gray-400"
                  }`}
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  className={`w-full pl-11 pr-4 py-3 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition border appearance-none ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-gray-50 border-gray-200 text-gray-900"
                  }`}
                >
                  <option value="">Choose your role</option>
                  {FRONTEND_ROLE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <p
                className={`mt-2 text-xs ${
                  isDark ? "text-slate-500" : "text-gray-400"
                }`}
              >
                Admin is backend-only and cannot be selected here.
              </p>
            </div>

            <div className="flex justify-end mb-5">
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_6px_16px_rgba(15,159,116,0.35)]"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            {formError && (
              <div
                className={`mt-4 text-sm font-medium text-center ${
                  isDark ? "text-red-300" : "text-red-600"
                }`}
              >
                {formError}
              </div>
            )}
          </form>

          <p
            className={`text-center text-sm mt-6 ${
              isDark ? "text-slate-400" : "text-gray-500"
            }`}
          >
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-emerald-600 hover:text-emerald-700 font-bold"
            >
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;