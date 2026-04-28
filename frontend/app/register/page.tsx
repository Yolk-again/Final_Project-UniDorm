"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STUDENT_PREFIX = "68306130";
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "admin">("student");
  const [loading, setLoading] = useState(false);
  const [generatedAdminId, setGeneratedAdminId] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    gender: "",
    name: "",
    email: "",
    studentId: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  const normalizeDigits = (value: string) => value.replace(/\D/g, "").slice(0, 10);

  const passwordChecks = [
    { label: "At least 8 characters", met: formData.password.length >= 8 },
    { label: "One lowercase letter", met: /[a-z]/.test(formData.password) },
    { label: "One uppercase letter", met: /[A-Z]/.test(formData.password) },
    { label: "One symbol", met: /[^A-Za-z0-9]/.test(formData.password) },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Please enter the name";

    if (!formData.email.trim()) {
      newErrors.email = "Please enter email address";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Please enter a valid email format";
      }
    }

    if (!formData.password) {
      newErrors.password = "Please enter the password";
    } else if (!PASSWORD_REGEX.test(formData.password)) {
      newErrors.password =
        "Password must be at least 8 characters and include 1 lowercase letter, 1 uppercase letter, and 1 symbol";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (role === "student") {
      if (!formData.gender) newErrors.gender = "Please select the gender";

      if (!formData.studentId) {
        newErrors.studentId = "Please enter the student ID";
      } else if (
        !new RegExp(`^${STUDENT_PREFIX}\\d{2}$`).test(formData.studentId)
      ) {
        newErrors.studentId = `Student ID must start with ${STUDENT_PREFIX} and end with exactly 2 digits`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If we already have a generated Admin ID, we just redirect to login
    if (role === "admin" && generatedAdminId) {
      router.replace("/login");
      return;
    }

    setSuccessMessage("");
    setGeneratedAdminId("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload =
        role === "student"
          ? {
              role: "student",
              gender: formData.gender,
              name: formData.name,
              email: formData.email,
              studentId: formData.studentId,
              password: formData.password,
            }
          : {
              role: "admin",
              name: formData.name,
              email: formData.email,
              password: formData.password,
            };

      const res = await fetch("http://localhost:3001/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const message = Array.isArray(data?.message)
        ? data.message.join(", ")
        : data?.message;

      if (!res.ok) {
        setErrors((prev) => ({
          ...prev,
          form: message || "Registration failed",
        }));
        return;
      }

      if (role === "admin" && data?.adminId) {
        setGeneratedAdminId(String(data.adminId));
        setSuccessMessage(
          `Registration successful. Your admin ID is ${data.adminId}. Click the button below to continue to login.`,
        );
      } else {
        setSuccessMessage("Registration successful. Redirecting to login...");
        redirectTimer.current = setTimeout(() => {
          router.replace("/login");
        }, 1200);
      }
    } catch (error) {
      console.error(error);
      setErrors((prev) => ({
        ...prev,
        form: "Something went wrong",
      }));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-2xl border bg-white px-4 py-3 text-black placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:shadow-sm";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 px-6 py-10">
      <div className="grid w-full max-w-6xl items-center gap-12 md:grid-cols-2">
        <div className="space-y-6">
          <p className="text-sm font-semibold tracking-[0.25em] text-blue-600 uppercase">
            Unidorm
          </p>

          <h1 className="text-5xl font-bold leading-tight text-slate-900">
            Create your
            <span className="block text-blue-600">account today</span>
          </h1>

          <p className="max-w-md text-base leading-7 text-slate-600">
            Register as a student or administrator to manage dorm rooms,
            bookings, and system access efficiently.
          </p>
        </div>

        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Create Your Account
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose your role and register.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Home
            </button>
          </div>

          <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setRole("student");
                setGeneratedAdminId("");
                setErrors({});
                setSuccessMessage("");
              }}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                role === "student"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => {
                setRole("admin");
                setErrors({});
                setSuccessMessage("");
              }}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                role === "admin"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              Admin
            </button>
          </div>

          {errors.form && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errors.form}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {role === "student" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Gender
                </label>
                <div className="flex gap-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="gender"
                      value="Boy"
                      className="h-4 w-4"
                      checked={formData.gender === "Boy"}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value })
                      }
                    />
                    Male
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="gender"
                      value="Girl"
                      className="h-4 w-4"
                      checked={formData.gender === "Girl"}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value })
                      }
                    />
                    Female
                  </label>
                </div>
                {errors.gender && (
                  <p className="mt-1 text-xs font-medium text-red-500">
                    {errors.gender}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                className={`${inputClass} ${
                  errors.name ? "border-red-400" : "border-slate-200"
                }`}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
              {errors.name && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Email Address
              </label>
              <input
                type="text"
                placeholder="Enter your email address"
                className={`${inputClass} ${
                  errors.email ? "border-red-400" : "border-slate-200"
                }`}
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              {errors.email && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  {errors.email}
                </p>
              )}
            </div>

            {role === "student" && (
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Student ID Number
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="68306130XX"
                  className={`${inputClass} ${
                    errors.studentId ? "border-red-400" : "border-slate-200"
                  }`}
                  value={formData.studentId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      studentId: normalizeDigits(e.target.value),
                    })
                  }
                />
                {errors.studentId && (
                  <p className="mt-1 text-xs font-medium text-red-500">
                    {errors.studentId}
                  </p>
                )}
              </div>
            )}

            {role === "admin" && (
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Admin ID
                </label>
                <input
                  type="text"
                  readOnly
                  value={generatedAdminId || "Auto-generated after you click the button"}
                  className={`${inputClass} cursor-not-allowed bg-slate-50 text-slate-700 font-bold`}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {generatedAdminId 
                    ? "Successfully generated! Use this ID to log in."
                    : "Click “Get Admin ID” to create your admin account and receive the ID."
                  }
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Password
              </label>

              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className={`${inputClass} ${
                    errors.password ? "border-red-400" : "border-slate-200"
                  } pr-12`}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "📘" : "📖"}
                </button>
              </div>

              {errors.password && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  {errors.password}
                </p>
              )}

              <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                {passwordChecks.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        item.met ? "text-emerald-600" : "text-slate-400"
                      }`}
                    >
                      {item.met ? "✓" : "○"}
                    </span>
                    <span
                      className={
                        item.met ? "text-emerald-700" : "text-slate-500"
                      }
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Confirm Password
              </label>

              <div className="relative mt-1">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  className={`${inputClass} ${
                    errors.confirmPassword ? "border-red-400" : "border-slate-200"
                  } pr-12`}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? "📘" : "📖"}
                </button>
              </div>

              {errors.confirmPassword && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              className={`mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-80 ${
                generatedAdminId 
                  ? "bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700" 
                  : "bg-blue-600 shadow-blue-200 hover:bg-blue-700"
              }`}
              disabled={loading}
            >
              {loading && (
                <svg
                  className="h-5 w-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
                  />
                </svg>
              )}
              <span>
                {loading
                  ? "Registering..."
                  : role === "admin"
                    ? generatedAdminId ? "Register As Admin" : "Get Admin ID"
                    : "Register Now"}
              </span>
            </button>

            <div className="mt-8 border-t border-slate-200 pt-5 text-center">
              <p className="text-sm text-slate-500">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Login
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}