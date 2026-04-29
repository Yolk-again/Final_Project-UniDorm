"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ToastType = "success" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "admin">("student");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    studentId: "",
    adminId: "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null,
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (role === "student" && !formData.studentId) {
      newErrors.studentId = "Please enter student ID";
    }

    if (role === "admin" && !formData.adminId) {
      newErrors.adminId = "Please enter admin ID";
    }

    if (!formData.password) {
      newErrors.password = "Please enter password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload =
        role === "student"
          ? {
              role: "student",
              studentId: formData.studentId,
              password: formData.password,
            }
          : {
              role: "admin",
              adminId: formData.adminId,
              password: formData.password,
            };

      const res = await fetch("http://localhost:3001/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (
        !res.ok ||
        data.message === "User not found" ||
        data.message === "Invalid password"
      ) {
        setErrors((prev) => ({
          ...prev,
          form: data.message || "Login failed",
        }));
        return;
      }

      localStorage.setItem("loggedInUser", JSON.stringify(data.user));
      localStorage.setItem("loggedInRole", data.user.role);
      sessionStorage.setItem("loggedInUser", JSON.stringify(data.user));
      sessionStorage.setItem("loggedInRole", data.user.role);

      document.cookie = `user=${encodeURIComponent(
        JSON.stringify(data.user),
      )}; path=/; max-age=86400`;

      showToast("Log in successful!", "success");

      setTimeout(() => {
        if (data.user?.role === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/rooms");
        }
      }, 900);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 px-6 py-10">
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-xl ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <p className="text-sm font-semibold">{toast.message}</p>
        </div>
      )}

      <div className="grid w-full max-w-6xl items-center gap-12 md:grid-cols-2">
        <div className="space-y-6">
          <p className="text-sm font-semibold tracking-[0.25em] text-blue-600 uppercase">
            Unidorm
          </p>

          <h1 className="text-5xl font-bold leading-tight text-slate-900">
            Welcome back to
            <span className="block text-blue-600">your dorm system</span>
          </h1>

          <p className="max-w-md text-base leading-7 text-slate-600">
            Log in to access your personalized dashboard, manage your bookings,
            and continue where you left off.
          </p>

          <div className="grid gap-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Student and admin access
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Secure sign in
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              Fast navigation to your dashboard
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/60 bg-white/80 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Login</h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose your role and sign in.
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
                setErrors({});
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                {role === "student" ? "Student ID Number" : "Admin ID Number"}
              </label>
              <input
                type="text"
                required
                placeholder={
                  role === "student" ? "Student ID Number" : "Admin ID Number"
                }
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-black outline-none transition focus:border-blue-500 focus:shadow-sm"
                value={
                  role === "student" ? formData.studentId : formData.adminId
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    [role === "student" ? "studentId" : "adminId"]:
                      e.target.value,
                  })
                }
              />
              {(errors.studentId || errors.adminId) && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  {errors.studentId || errors.adminId}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Password
              </label>

              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Password"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-black outline-none transition focus:border-blue-500 focus:shadow-sm"
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
                  {showPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 3l18 18" />
                      <path d="M10.58 10.58A2 2 0 0 0 13.42 13.42" />
                      <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c5 0 9.27 3.11 11 7-0.72 1.61-1.7 3.07-2.88 4.24" />
                      <path d="M6.61 6.61C3.91 8.29 2.17 10.67 1 12c1.73 3.89 6 7 11 7 1.31 0 2.57-.19 3.75-.53" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>

              {errors.password && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded-2xl bg-blue-600 py-3.5 font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-80"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : `Login as ${role === "student" ? "Student" : "Admin"}`}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-5 text-center">
            <p className="text-sm text-slate-500">
              Don&apos;t have an account yet?{" "}
              <button
                onClick={() => router.push("/register")}
                className="font-semibold text-blue-600 hover:underline"
              >
                Register
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}